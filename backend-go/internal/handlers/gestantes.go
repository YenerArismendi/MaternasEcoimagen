package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"backend-go/internal/config"
	"backend-go/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func parseDateString(dateStr string) (time.Time, error) {
	dateStr = strings.TrimSpace(dateStr)
	if dateStr == "" {
		return time.Time{}, nil
	}

	// 1. Probar si es número de serie flotante/entero de Excel (ej. 44561)
	if floatVal, err := strconv.ParseFloat(dateStr, 64); err == nil && floatVal > 1000 && floatVal < 100000 {
		if t, err := excelize.ExcelDateToTime(floatVal, false); err == nil {
			return t, nil
		}
	}

	// 2. Probar múltiples formatos habituales
	layouts := []string{
		"02/01/2006",
		"2/1/2006",
		"02/01/06",
		"2/1/06",
		"02-01-2006",
		"2-1-2006",
		"2006-01-02",
		"2006/01/02",
		"02/01/2006 15:04:05",
		"2006-01-02 15:04:05",
		time.RFC3339,
		"2006-01-02T15:04:05Z07:00",
	}
	for _, l := range layouts {
		if t, err := time.Parse(l, dateStr); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("formato de fecha no reconocido: %s", dateStr)
}

func getStringPtr(val interface{}) *string {
	if val == nil {
		return nil
	}
	str, ok := val.(string)
	if !ok || str == "" {
		return nil
	}
	return &str
}

func GetGestantes(c *gin.Context) {
	userIDVal, exists := c.Get("userId")
	var currentUser models.User
	if exists {
		if uid, ok := userIDVal.(uint); ok {
			config.DB.Preload("IPS").First(&currentUser, uid)
		}
	}

	query := config.DB.Preload("CreadaPor").
		Preload("IPS").
		Preload("Antecedentes").
		Preload("IngresoCPN").
		Preload("Controles").
		Preload("Paraclinicos").
		Preload("EgresoYPosparto").
		Preload("SeguimientosTelef").
		Preload("Eventos").
		Order("created_at desc")

	// Filtrado Multi-tenant: Si el usuario está asignado a una IPS (y no es SUPERADMIN), sólo ve las gestantes de su IPS o creadas por él
	if currentUser.Rol != "SUPERADMIN" && currentUser.Rol != "SUPER_ROOT" && currentUser.IPSID != nil && *currentUser.IPSID > 0 {
		if currentUser.IPS != nil {
			query = query.Where("ips_id = ? OR creada_por_id = ? OR ips_atencion = ? OR codigo_habilitacion_ips = ? OR codigo_habilitacion_ip_s = ?",
				*currentUser.IPSID, currentUser.ID, currentUser.IPS.Nombre, currentUser.IPS.CodigoHabilitacion, currentUser.IPS.CodigoHabilitacion)
		} else {
			query = query.Where("ips_id = ? OR creada_por_id = ?", *currentUser.IPSID, currentUser.ID)
		}
	}

	var gestantes []models.Gestante
	if err := query.Find(&gestantes).Error; err != nil {
		fmt.Println("❌ Error en GetGestantes query:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error obteniendo gestantes: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gestantes)
}

func GetGestanteByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID de gestante inválido"})
		return
	}

	var gestante models.Gestante
	err = config.DB.Preload("CreadaPor").
		Preload("IPS").
		Preload("Antecedentes").
		Preload("IngresoCPN").
		Preload("Controles").
		Preload("Paraclinicos").
		Preload("EgresoYPosparto").
		Preload("SeguimientosTelef").
		Preload("Eventos").
		Preload("Eventos.Prestadores").
		First(&gestante, id).Error

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Gestante no encontrada"})
		return
	}

	c.JSON(http.StatusOK, gestante)
}

func CreateGestante(c *gin.Context) {
	userIDVal, _ := c.Get("userId")
	userID, _ := userIDVal.(uint)

	var currentUser models.User
	if userID > 0 {
		config.DB.Preload("IPS").First(&currentUser, userID)
	}

	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cuerpo JSON inválido", "details": err.Error()})
		return
	}

	nombres, _ := payload["nombres"].(string)
	apellidos, _ := payload["apellidos"].(string)
	tipoIdent, _ := payload["tipoIdentificacion"].(string)
	numIdent, _ := payload["numeroIdentificacion"].(string)

	if nombres == "" || apellidos == "" || numIdent == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nombres, apellidos y número de identificación son obligatorios"})
		return
	}

	if tipoIdent == "" {
		tipoIdent = "CC"
	}

	var fechaNac time.Time
	if fnStr, ok := payload["fechaNacimiento"].(string); ok && fnStr != "" {
		t, err := parseDateString(fnStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Fecha de nacimiento inválida", "details": err.Error()})
			return
		}
		fechaNac = t
	} else {
		fechaNac = time.Now().AddDate(-25, 0, 0)
	}

	telefonoStr := getStringPtr(payload["telefono"])
	if telefonoStr == nil {
		telefonoStr = getStringPtr(payload["telefonoCel1"])
	}

	carpetaEntregada := "NO"
	if ceVal, ok := payload["carpetaEntregada"]; ok {
		if ceBool, isBool := ceVal.(bool); isBool {
			if ceBool {
				carpetaEntregada = "SI"
			}
		} else if ceStr, isStr := ceVal.(string); isStr && (ceStr == "SI" || ceStr == "true") {
			carpetaEntregada = "SI"
		}
	}

	// Manejo de IPS asociada a la gestante
	ipsID := currentUser.IPSID
	ipsAtencion := getStringPtr(payload["ipsAtencion"])
	codigoHabilitacionIPS := getStringPtr(payload["codigoHabilitacionIPS"])

	if currentUser.IPS != nil {
		if ipsAtencion == nil || *ipsAtencion == "" {
			ipsAtencion = &currentUser.IPS.Nombre
		}
		if codigoHabilitacionIPS == nil || *codigoHabilitacionIPS == "" {
			codigoHabilitacionIPS = &currentUser.IPS.CodigoHabilitacion
		}
	}

	gestante := models.Gestante{
		Nombres:                  nombres,
		Apellidos:                apellidos,
		TipoIdentificacion:       tipoIdent,
		NumeroIdentificacion:     numIdent,
		FechaNacimiento:          fechaNac,
		IPSID:                    ipsID,
		IpsAtencion:              ipsAtencion,
		CodigoHabilitacionIPS:    codigoHabilitacionIPS,
		Departamento:             getStringPtr(payload["departamento"]),
		Municipio:                getStringPtr(payload["municipio"]),
		Direccion:                getStringPtr(payload["direccion"]),
		TelefonoCel1:             telefonoStr,
		Etnia:                    getStringPtr(payload["etnia"]),
		IdentidadGenero:          getStringPtr(payload["identidadGenero"]),
		Discapacidad:             getStringPtr(payload["discapacidad"]),
		VictimaViolencia:         getStringPtr(payload["victimaViolencia"]),
		TipoRiesgo:               getStringPtr(payload["tipoRiesgo"]),
		CarpetaEntregada:         &carpetaEntregada,
		CreadaPorID:              userID,
	}

	if err := config.DB.Create(&gestante).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear la gestante", "details": err.Error()})
		return
	}

	// Crear sub-tablas iniciales
	config.DB.FirstOrCreate(&models.AntecedenteClinico{}, models.AntecedenteClinico{GestanteID: gestante.ID})
	config.DB.FirstOrCreate(&models.Paraclinico{}, models.Paraclinico{GestanteID: gestante.ID})
	config.DB.FirstOrCreate(&models.EgresoYPosparto{}, models.EgresoYPosparto{GestanteID: gestante.ID})

	// Crear cuenta de usuario del portal para la gestante (Usuario: document@maternas.com, Clave: document)
	if gestante.NumeroIdentificacion != "" {
		emailFormateado := fmt.Sprintf("%s@maternas.com", gestante.NumeroIdentificacion)
		var userCount int64
		config.DB.Model(&models.User{}).Where("email = ? OR email = ?", emailFormateado, gestante.NumeroIdentificacion).Count(&userCount)
		if userCount == 0 {
			hashedPass, err := bcrypt.GenerateFromPassword([]byte(gestante.NumeroIdentificacion), bcrypt.DefaultCost)
			if err == nil {
				maternaUser := models.User{
					Nombre:   fmt.Sprintf("%s %s", gestante.Nombres, gestante.Apellidos),
					Email:    emailFormateado,
					Password: string(hashedPass),
					Rol:      "GESTANTE",
					Activo:   true,
				}
				config.DB.Create(&maternaUser)
			}
		}
	}

	// Si venía fechaEmbarazo, guardarla como FUR en IngresoCPN
	var ingresoCPN models.IngresoCPN
	ingresoCPN.GestanteID = gestante.ID
	if feStr, ok := payload["fechaEmbarazo"].(string); ok && feStr != "" {
		if furDate, err := parseDateString(feStr); err == nil {
			ingresoCPN.Fur = &furDate
		}
	}
	config.DB.Where("gestante_id = ?", gestante.ID).Assign(ingresoCPN).FirstOrCreate(&ingresoCPN)

	// Recargar gestante completa
	config.DB.Preload("CreadaPor").
		Preload("Antecedentes").
		Preload("IngresoCPN").
		Preload("Paraclinicos").
		Preload("EgresoYPosparto").
		First(&gestante, gestante.ID)

	c.JSON(http.StatusCreated, gestante)
}

func convertMapDates(data map[string]interface{}) map[string]interface{} {
	result := make(map[string]interface{})
	for k, v := range data {
		if strVal, isStr := v.(string); isStr && strVal != "" {
			if t, err := parseDateString(strVal); err == nil && !t.IsZero() {
				result[k] = t
				continue
			}
		}
		result[k] = v
	}
	return result
}

func UpdateGestante(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	var existing models.Gestante
	if err := config.DB.First(&existing, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Gestante no encontrada"})
		return
	}

	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cuerpo de solicitud inválido"})
		return
	}

	// 1. Manejar sub-secciones enviadas dentro del payload
	if antData, ok := body["antecedentes"].(map[string]interface{}); ok {
		cleanAnt := convertMapDates(antData)
		cleanAnt["gestante_id"] = uint(id)
		var ant models.AntecedenteClinico
		config.DB.Where("gestante_id = ?", id).FirstOrCreate(&ant)
		config.DB.Model(&ant).Updates(cleanAnt)
		delete(body, "antecedentes")
	}

	if ingData, ok := body["ingresoCPN"].(map[string]interface{}); ok {
		cleanIng := convertMapDates(ingData)
		cleanIng["gestante_id"] = uint(id)
		var ing models.IngresoCPN
		config.DB.Where("gestante_id = ?", id).FirstOrCreate(&ing)
		config.DB.Model(&ing).Updates(cleanIng)
		delete(body, "ingresoCPN")
	}

	if parData, ok := body["paraclinicos"].(map[string]interface{}); ok {
		cleanPar := convertMapDates(parData)
		cleanPar["gestante_id"] = uint(id)
		var par models.Paraclinico
		config.DB.Where("gestante_id = ?", id).FirstOrCreate(&par)
		config.DB.Model(&par).Updates(cleanPar)
		delete(body, "paraclinicos")
	}

	if egrData, ok := body["egresoYPosparto"].(map[string]interface{}); ok {
		cleanEgr := convertMapDates(egrData)
		cleanEgr["gestante_id"] = uint(id)
		var egr models.EgresoYPosparto
		config.DB.Where("gestante_id = ?", id).FirstOrCreate(&egr)
		config.DB.Model(&egr).Updates(cleanEgr)
		delete(body, "egresoYPosparto")
	}

	// Remover llaves de asociaciones para evitar fallos en GORM updates
	delete(body, "controles")
	delete(body, "seguimientosTelef")
	delete(body, "eventos")
	delete(body, "creadaPor")
	delete(body, "CreadaPor")

	// 2. Si quedan campos propios de Gestante
	if len(body) > 0 {
		cleanBody := convertMapDates(body)
		if err := config.DB.Model(&existing).Updates(cleanBody).Error; err != nil {
			fmt.Printf("Error actualizando gestante #%d: %v\n", id, err)
		}
	}

	// Recargar gestante completa con todas sus sub-tablas
	config.DB.Preload("CreadaPor").
		Preload("Antecedentes").
		Preload("IngresoCPN").
		Preload("Controles").
		Preload("Paraclinicos").
		Preload("EgresoYPosparto").
		Preload("SeguimientosTelef").
		Preload("Eventos").
		First(&existing, id)

	c.JSON(http.StatusOK, existing)
}

func UpdateAntecedentes(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.Atoi(idStr)

	var antecedente models.AntecedenteClinico
	if err := c.ShouldBindJSON(&antecedente); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	antecedente.GestanteID = uint(id)
	config.DB.Where("gestante_id = ?", id).Assign(antecedente).FirstOrCreate(&antecedente)

	c.JSON(http.StatusOK, antecedente)
}

func UpdateIngresoCPN(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.Atoi(idStr)

	var cpn models.IngresoCPN
	if err := c.ShouldBindJSON(&cpn); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	cpn.GestanteID = uint(id)
	config.DB.Where("gestante_id = ?", id).Assign(cpn).FirstOrCreate(&cpn)

	c.JSON(http.StatusOK, cpn)
}

func UpdateParaclinicos(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.Atoi(idStr)

	var para models.Paraclinico
	if err := c.ShouldBindJSON(&para); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	para.GestanteID = uint(id)
	config.DB.Where("gestante_id = ?", id).Assign(para).FirstOrCreate(&para)

	c.JSON(http.StatusOK, para)
}

func UpdateEgresoPosparto(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.Atoi(idStr)

	var egreso models.EgresoYPosparto
	if err := c.ShouldBindJSON(&egreso); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	egreso.GestanteID = uint(id)
	config.DB.Where("gestante_id = ?", id).Assign(egreso).FirstOrCreate(&egreso)

	c.JSON(http.StatusOK, egreso)
}

func DeleteGestante(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	if err := config.DB.Delete(&models.Gestante{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error eliminando gestante"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Gestante eliminada correctamente"})
}

func GetCronograma(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID de gestante inválido"})
		return
	}

	var gestante models.Gestante
	err = config.DB.Preload("IngresoCPN").
		Preload("Eventos", func(db *gorm.DB) *gorm.DB {
			return db.Order("fecha_programada asc")
		}).
		Preload("Eventos.Prestadores").
		First(&gestante, id).Error

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Gestante no encontrada"})
		return
	}

	var fur *time.Time
	var fpp *time.Time
	var egSemanas int
	var egDias int

	if gestante.IngresoCPN != nil && gestante.IngresoCPN.Fur != nil && !gestante.IngresoCPN.Fur.IsZero() {
		fur = gestante.IngresoCPN.Fur
		calcFpp := fur.AddDate(0, 0, 280) // 40 semanas
		fpp = &calcFpp

		diasTranscurridos := int(time.Since(*fur).Hours() / 24)
		if diasTranscurridos > 0 {
			egSemanas = diasTranscurridos / 7
			egDias = diasTranscurridos % 7
		}
	}

	// Si la gestante ya tiene eventos asignados, los devolvemos en el cronograma
	var cronograma []gin.H
	pendientes := 0
	realizados := 0

	if len(gestante.Eventos) > 0 {
		for _, ev := range gestante.Eventos {
			if ev.Estado == "REALIZADO" {
				realizados++
			} else {
				pendientes++
			}

			cronograma = append(cronograma, gin.H{
				"id":                ev.ID,
				"tipo":              ev.Tipo,
				"descripcion":       ev.Descripcion,
				"fechaProgramada":   ev.FechaProgramada,
				"fechaRealizada":    ev.FechaRealizada,
				"estado":            ev.Estado,
				"esObligatorio":     ev.EsObligatorio,
				"esControl":         ev.EsControl,
				"estaAgendado":      ev.EstaAgendado,
				"fechaAgendamiento": ev.FechaAgendamiento,
				"resultado":         ev.Resultado,
				"codigoCUPS":        ev.CodigoCUPS,
				"trimestre":         ev.Trimestre,
				"paqueteId":         ev.PaqueteID,
				"plantillaId":       ev.PlantillaID,
				"prestadores":       ev.Prestadores,
			})
		}
	} else {
		// Si no tiene eventos creados, generamos una vista previa basada en plantillas de paquetes
		var paquetes []models.PaqueteEventos
		config.DB.Preload("Plantillas").Order("id asc").Find(&paquetes)

		startDate := gestante.CreatedAt
		if fur != nil {
			startDate = *fur
		}

		for _, pq := range paquetes {
			for _, plant := range pq.Plantillas {
				fechaProg := startDate.AddDate(0, 0, plant.SemanasRelativas*7)
				pendientes++
				cronograma = append(cronograma, gin.H{
					"id":               nil,
					"tipo":             plant.Tipo,
					"descripcion":      plant.Descripcion,
					"fechaProgramada":  fechaProg,
					"estado":           "VISTA_PREVIA",
					"esObligatorio":    plant.EsObligatorio,
					"esControl":        plant.EsControl,
					"semanasRelativas": plant.SemanasRelativas,
					"trimestre":        plant.Trimestre,
					"paqueteId":        pq.ID,
					"paqueteNombre":    pq.Nombre,
					"plantillaId":      plant.ID,
				})
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"gestanteId":           gestante.ID,
		"nombreCompleto":       fmt.Sprintf("%s %s", gestante.Nombres, gestante.Apellidos),
		"fur":                  fur,
		"fpp":                  fpp,
		"edadGestacional":      fmt.Sprintf("%d.%d semanas", egSemanas, egDias),
		"egSemanas":            egSemanas,
		"egDias":               egDias,
		"totalEventos":         len(cronograma),
		"eventosPendientes":    pendientes,
		"eventosRealizados":    realizados,
		"cronograma":           cronograma,
	})
}

