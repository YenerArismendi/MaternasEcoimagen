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
)

func GetEventosPorMaterna(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID de gestante inválido"})
		return
	}

	var eventos []models.EventoMedico
	err = config.DB.Preload("Prestadores").
		Where("gestante_id = ?", id).
		Order("fecha_programada asc").
		Find(&eventos).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al obtener eventos médicos"})
		return
	}

	c.JSON(http.StatusOK, eventos)
}

type CreateEventoInput struct {
	Tipo            string   `json:"tipo" binding:"required"`
	Descripcion     string   `json:"descripcion" binding:"required"`
	FechaProgramada string   `json:"fechaProgramada" binding:"required"`
	FechaRealizada  *string  `json:"fechaRealizada"`
	Estado          *string  `json:"estado"`
	Resultado       *string  `json:"resultado"`
	EsObligatorio   *bool    `json:"esObligatorio"`
	EsControl       *bool    `json:"esControl"`
	MaternaID       uint     `json:"maternaId"`
	GestanteID      uint     `json:"gestanteId"`
	Notas           *string  `json:"notas"`
	CodigoCUPS      *string  `json:"codigoCUPS"`
	Trimestre       *string  `json:"trimestre"`
	PrestadoresIDs  []uint   `json:"prestadoresIds"`
}

func CreateEvento(c *gin.Context) {
	var input CreateEventoInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Faltan campos obligatorios", "details": err.Error()})
		return
	}

	gID := input.GestanteID
	if gID == 0 {
		gID = input.MaternaID
	}
	if gID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Se requiere ID de gestante (gestanteId o maternaId)"})
		return
	}

	fechaProg, err := time.Parse(time.RFC3339, input.FechaProgramada)
	if err != nil {
		fechaProg, err = time.Parse("2006-01-02", input.FechaProgramada)
		if err != nil {
			fechaProg = time.Now()
		}
	}

	estado := "PENDIENTE"
	if input.Estado != nil && *input.Estado != "" {
		estado = *input.Estado
	}

	var fechaReal *time.Time
	if input.FechaRealizada != nil && *input.FechaRealizada != "" {
		if t, err := time.Parse(time.RFC3339, *input.FechaRealizada); err == nil {
			fechaReal = &t
		} else if t, err := time.Parse("2006-01-02", *input.FechaRealizada); err == nil {
			fechaReal = &t
		}
	}
	if estado == "REALIZADO" && fechaReal == nil {
		now := time.Now()
		fechaReal = &now
	}

	esOblig := false
	if input.EsObligatorio != nil {
		esOblig = *input.EsObligatorio
	}
	esCtrl := false
	if input.EsControl != nil {
		esCtrl = *input.EsControl
	}

	evento := models.EventoMedico{
		Tipo:            input.Tipo,
		Descripcion:     input.Descripcion,
		FechaProgramada: fechaProg,
		FechaRealizada:  fechaReal,
		EsObligatorio:   esOblig,
		EsControl:       esCtrl,
		Resultado:       input.Resultado,
		CodigoCUPS:      input.CodigoCUPS,
		GestanteID:      gID,
		Notas:           input.Notas,
		Trimestre:       input.Trimestre,
		Estado:          estado,
		EstaAgendado:    false,
	}

	if len(input.PrestadoresIDs) > 0 {
		var prestadores []models.Prestador
		config.DB.Where("id IN ?", input.PrestadoresIDs).Find(&prestadores)
		evento.Prestadores = prestadores
	}

	if err := config.DB.Create(&evento).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear evento médico"})
		return
	}

	config.DB.Preload("Prestadores").First(&evento, evento.ID)
	sincronizarEventoConMatricesClinicas(&evento)
	c.JSON(http.StatusCreated, evento)
}

func UpdateEvento(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	var evento models.EventoMedico
	if err := config.DB.First(&evento, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Evento no encontrado"})
		return
	}

	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cuerpo de solicitud inválido"})
		return
	}

	// Tratar fechas si vienen en formato string
	if fp, ok := body["fechaProgramada"].(string); ok && fp != "" {
		if t, err := time.Parse(time.RFC3339, fp); err == nil {
			body["fecha_programada"] = t
		}
	}
	if fr, ok := body["fechaRealizada"].(string); ok && fr != "" {
		if t, err := time.Parse(time.RFC3339, fr); err == nil {
			body["fecha_realizada"] = t
		}
	}

	if estado, ok := body["estado"].(string); ok && estado == "REALIZADO" && body["fechaRealizada"] == nil && evento.FechaRealizada == nil {
		now := time.Now()
		body["fecha_realizada"] = &now
	}

	if err := config.DB.Model(&evento).Updates(body).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar evento médico"})
		return
	}

	config.DB.Preload("Prestadores").First(&evento, evento.ID)
	sincronizarEventoConMatricesClinicas(&evento)
	c.JSON(http.StatusOK, evento)
}

func sincronizarEventoConMatricesClinicas(evento *models.EventoMedico) {
	if evento.Estado != "REALIZADO" || evento.FechaRealizada == nil || evento.GestanteID == 0 {
		return
	}

	gID := evento.GestanteID
	fechaReal := *evento.FechaRealizada
	descLower := strings.ToLower(evento.Descripcion)

	// Garantizar la existencia de registros asociados usando FirstOrCreate
	var egreso models.EgresoYPosparto
	config.DB.Where("gestante_id = ?", gID).FirstOrCreate(&egreso, models.EgresoYPosparto{GestanteID: gID})

	var para models.Paraclinico
	config.DB.Where("gestante_id = ?", gID).FirstOrCreate(&para, models.Paraclinico{GestanteID: gID})

	var cpn models.IngresoCPN
	config.DB.Where("gestante_id = ?", gID).FirstOrCreate(&cpn, models.IngresoCPN{GestanteID: gID})

	// 1. Vacunas y Atenciones Interdisciplinarias (EgresoYPosparto)
	if strings.Contains(descLower, "tdap") || strings.Contains(descLower, "tosferina") {
		config.DB.Model(&egreso).Update("fecha_tdap", fechaReal)
	} else if strings.Contains(descLower, "influenza") {
		config.DB.Model(&egreso).Update("fecha_influenza", fechaReal)
	} else if strings.Contains(descLower, "toxoide") || strings.Contains(descLower, "tetanico") || strings.Contains(descLower, "tétanos") {
		config.DB.Model(&egreso).Update("fecha_toxoide_tetanico", fechaReal)
	} else if strings.Contains(descLower, "covid") {
		config.DB.Model(&egreso).Update("fecha_covid1", fechaReal)
	} else if strings.Contains(descLower, "odontolog") {
		config.DB.Model(&egreso).Update("odontologia_ctrl1", fechaReal)
	} else if strings.Contains(descLower, "nutricion") || strings.Contains(descLower, "nutrición") {
		config.DB.Model(&egreso).Update("nutricion_ctrl1", fechaReal)
	} else if strings.Contains(descLower, "psicolog") || strings.Contains(descLower, "psicología") {
		config.DB.Model(&egreso).Update("psicologia_ctrl1", fechaReal)
	} else if strings.Contains(descLower, "trabajo social") {
		config.DB.Model(&egreso).Update("trabajo_social_ctrl1", fechaReal)
	} else if strings.Contains(descLower, "anticoncep") {
		config.DB.Model(&egreso).Update("fecha_asesoria_anticoncepcion", fechaReal)
	} else if strings.Contains(descLower, "ive") {
		res := "Realizado"
		config.DB.Model(&egreso).Update("asesoria_ive", res)
	} else if strings.Contains(descLower, "lactancia") {
		config.DB.Model(&egreso).Update("fecha_consejería_lactancia_prenatal", fechaReal)
	} else if strings.Contains(descLower, "curso") || strings.Contains(descLower, "maternidad") {
		config.DB.Model(&egreso).Update("cursos_maternidad_f1", fechaReal)
	}

	// 2. Paraclínicos e Imágenes Diagnósticas (Paraclinico)
	if strings.Contains(descLower, "ecografía de detalle") || strings.Contains(descLower, "eco detalle") || strings.Contains(descLower, "detalle anatómico") || strings.Contains(descLower, "detalle") {
		config.DB.Model(&para).Update("ecografia_detalle", fechaReal)
	} else if strings.Contains(descLower, "ecografía 1er") || strings.Contains(descLower, "ecografía de tamizaje") || strings.Contains(descLower, "eco1") || (strings.Contains(descLower, "1er") && strings.Contains(descLower, "eco")) {
		config.DB.Model(&para).Update("ecografia1_trimestre", fechaReal)
	} else if strings.Contains(descLower, "ptog") || strings.Contains(descLower, "tolerancia a la glucosa") {
		val := fmt.Sprintf("Realizado (%s)", fechaReal.Format("02/01/2006"))
		config.DB.Model(&para).Update("ptog_75gr", val)
	} else if strings.Contains(descLower, "estreptococo") || strings.Contains(descLower, "stgb") {
		val := fmt.Sprintf("Realizado (%s)", fechaReal.Format("02/01/2006"))
		config.DB.Model(&para).Update("estreptococo_b", val)
	} else if strings.Contains(descLower, "urocultivo") {
		val := fmt.Sprintf("Realizado (%s)", fechaReal.Format("02/01/2006"))
		config.DB.Model(&para).Update("urocultivo", val)
	} else if strings.Contains(descLower, "hemoclasificacion") || strings.Contains(descLower, "hemoclasificación") {
		val := fmt.Sprintf("Registrado (%s)", fechaReal.Format("02/01/2006"))
		config.DB.Model(&para).Update("hemoclasificacion", val)
	} else if strings.Contains(descLower, "sífilis") || strings.Contains(descLower, "sifilis") || strings.Contains(descLower, "vdrl") {
		if strings.Contains(descLower, "3") || strings.Contains(descLower, "tercer") {
			res := "Negativo"
			config.DB.Model(&para).Updates(map[string]interface{}{"sifilis3_resultado": res, "sifilis3_fecha": fechaReal})
		} else {
			res := "Negativo"
			config.DB.Model(&para).Updates(map[string]interface{}{"sifilis_resultado": res, "sifilis_fecha": fechaReal})
		}
	} else if strings.Contains(descLower, "vih") {
		if strings.Contains(descLower, "3") || strings.Contains(descLower, "tercer") {
			res := "Negativo"
			config.DB.Model(&para).Updates(map[string]interface{}{"vih3_resultado": res, "vih3_fecha": fechaReal})
		} else {
			res := "Negativo"
			config.DB.Model(&para).Updates(map[string]interface{}{"vih_resultado": res, "vih_fecha": fechaReal})
		}
	} else if strings.Contains(descLower, "hemograma") {
		if strings.Contains(descLower, "3") || strings.Contains(descLower, "tercer") {
			config.DB.Model(&para).Updates(map[string]interface{}{"hemograma3_hb": "Normal", "hemograma3_hcto": "Normal"})
		} else {
			config.DB.Model(&para).Updates(map[string]interface{}{"hemograma_hb": "Normal", "hemograma_hcto": "Normal"})
		}
	}

	// 3. Controles CPN (SeguimientoControl) e Ingreso CPN
	if strings.Contains(descLower, "ingreso") && (strings.Contains(descLower, "cpn") || strings.Contains(descLower, "control")) {
		config.DB.Model(&cpn).Update("fecha_inscripcion_cpn", fechaReal)
	}

	if strings.Contains(descLower, "control") || strings.Contains(descLower, "cpn") || evento.EsControl {
		// Detectar número de control específico (1 al 11)
		numControl := 0
		for i := 11; i >= 1; i-- {
			if strings.Contains(descLower, fmt.Sprintf("%d cpn", i)) ||
				strings.Contains(descLower, fmt.Sprintf("%dº cpn", i)) ||
				strings.Contains(descLower, fmt.Sprintf("%d control", i)) ||
				strings.Contains(descLower, fmt.Sprintf("control #%d", i)) ||
				strings.Contains(descLower, fmt.Sprintf("control %d", i)) ||
				strings.Contains(descLower, fmt.Sprintf("control prenatal #%d", i)) {
				numControl = i
				break
			}
		}

		if numControl == 0 {
			var count int64
			config.DB.Model(&models.SeguimientoControl{}).Where("gestante_id = ?", gID).Count(&count)
			numControl = int(count) + 1
			if numControl > 11 {
				numControl = 11
			}
		}

		var ctrl models.SeguimientoControl
		if err := config.DB.Where("gestante_id = ? AND numero_control = ?", gID, numControl).FirstOrCreate(&ctrl, models.SeguimientoControl{GestanteID: gID, NumeroControl: &numControl}).Error; err == nil {
			config.DB.Model(&ctrl).Update("fecha_cpn", fechaReal)
		}
	}
}

func DeleteEvento(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	if err := config.DB.Delete(&models.EventoMedico{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar evento"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Evento eliminado"})
}

func BulkDeleteEventos(c *gin.Context) {
	var input struct {
		IDs []uint `json:"ids"`
	}
	if err := c.ShouldBindJSON(&input); err != nil || len(input.IDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Faltan IDs para eliminar"})
		return
	}

	if err := config.DB.Where("id IN ?", input.IDs).Delete(&models.EventoMedico{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar eventos en bloque"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Eventos eliminados correctamente"})
}

func GenerarEventosBasicos(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID de gestante inválido"})
		return
	}

	var gestante models.Gestante
	if err := config.DB.Preload("IngresoCPN").First(&gestante, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Paciente no encontrada"})
		return
	}

	startDate := gestante.CreatedAt
	if gestante.IngresoCPN != nil && gestante.IngresoCPN.Fur != nil {
		startDate = *gestante.IngresoCPN.Fur
	}

	var basicEvents []models.EventoMedico

	for i := 1; i <= 10; i++ {
		date := startDate.AddDate(0, 0, i*28)
		desc := "Control Prenatal #" + strconv.Itoa(i)
		if i == 1 {
			desc = "Primera Vez Control Prenatal"
		}
		basicEvents = append(basicEvents, models.EventoMedico{
			Tipo:            "CITA",
			Descripcion:     desc,
			FechaProgramada: date,
			EsObligatorio:   true,
			EsControl:       true,
			GestanteID:      gestante.ID,
			Estado:          "PENDIENTE",
			EstaAgendado:    false,
		})
	}

	eco1Date := startDate.AddDate(0, 0, 12*7)
	eco2Date := startDate.AddDate(0, 0, 22*7)
	eco3Date := startDate.AddDate(0, 0, 32*7)

	basicEvents = append(basicEvents,
		models.EventoMedico{Tipo: "ESTUDIO", Descripcion: "Ecografía de Tamizaje (Sem 11-14)", FechaProgramada: eco1Date, EsObligatorio: true, GestanteID: gestante.ID, EstaAgendado: false},
		models.EventoMedico{Tipo: "ESTUDIO", Descripcion: "Ecografía Detalle Anatómico (Sem 20-24)", FechaProgramada: eco2Date, EsObligatorio: true, GestanteID: gestante.ID, EstaAgendado: false},
		models.EventoMedico{Tipo: "ESTUDIO", Descripcion: "Ecografía de Crecimiento (Sem 32+)", FechaProgramada: eco3Date, EsObligatorio: true, GestanteID: gestante.ID, EstaAgendado: false},
	)

	lab1Date := startDate.AddDate(0, 0, 7)
	lab2Date := startDate.AddDate(0, 0, 24*7)
	lab3Date := startDate.AddDate(0, 0, 35*7)

	t1 := "1er Trimestre"
	t2 := "2do Trimestre"
	t3 := "3er Trimestre"

	basicEvents = append(basicEvents,
		models.EventoMedico{Tipo: "LABORATORIO", Descripcion: "Laboratorios 1er Trimestre", FechaProgramada: lab1Date, EsObligatorio: true, GestanteID: gestante.ID, Estado: "PENDIENTE", EstaAgendado: false, Trimestre: &t1},
		models.EventoMedico{Tipo: "LABORATORIO", Descripcion: "Prueba de Tolerancia a la Glucosa", FechaProgramada: lab2Date, EsObligatorio: true, GestanteID: gestante.ID, Estado: "PENDIENTE", EstaAgendado: false, Trimestre: &t2},
		models.EventoMedico{Tipo: "LABORATORIO", Descripcion: "Laboratorios 3er Trimestre", FechaProgramada: lab3Date, EsObligatorio: true, GestanteID: gestante.ID, Estado: "PENDIENTE", EstaAgendado: false, Trimestre: &t3},
	)

	if err := config.DB.Create(&basicEvents).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al generar eventos básicos"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Eventos básicos generados", "count": len(basicEvents)})
}
