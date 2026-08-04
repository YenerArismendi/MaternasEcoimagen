package handlers

import (
	"net/http"
	"strconv"
	"time"

	"backend-go/internal/config"
	"backend-go/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetPaquetes(c *gin.Context) {
	var paquetes []models.PaqueteEventos
	err := config.DB.Preload("Plantillas").Order("created_at desc").Find(&paquetes).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al obtener paquetes"})
		return
	}

	for i := range paquetes {
		if paquetes[i].Plantillas == nil {
			paquetes[i].Plantillas = []models.PlantillaEvento{}
		}
	}

	c.JSON(http.StatusOK, paquetes)
}

type CreatePaqueteInput struct {
	Nombre      string                   `json:"nombre" binding:"required"`
	Descripcion *string                  `json:"descripcion"`
	Trimestre   *string                  `json:"trimestre"`
	Plantillas  []models.PlantillaEvento `json:"plantillas"`
}

func CreatePaquete(c *gin.Context) {
	var input CreatePaqueteInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El nombre es obligatorio"})
		return
	}

	paquete := models.PaqueteEventos{
		Nombre:      input.Nombre,
		Descripcion: input.Descripcion,
		Trimestre:   input.Trimestre,
		Plantillas:  input.Plantillas,
	}

	if err := config.DB.Create(&paquete).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear paquete"})
		return
	}

	config.DB.Preload("Plantillas").First(&paquete, paquete.ID)
	c.JSON(http.StatusCreated, paquete)
}

func UpdatePaquete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID de paquete inválido"})
		return
	}

	var input CreatePaqueteInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	err = config.DB.Transaction(func(tx *gorm.DB) error {
		var paquete models.PaqueteEventos
		if err := tx.First(&paquete, id).Error; err != nil {
			return err
		}

		paquete.Nombre = input.Nombre
		paquete.Descripcion = input.Descripcion
		paquete.Trimestre = input.Trimestre

		if err := tx.Save(&paquete).Error; err != nil {
			return err
		}

		tx.Where("paquete_id = ?", id).Delete(&models.PlantillaEvento{})
		for _, p := range input.Plantillas {
			p.ID = 0
			p.PaqueteID = uint(id)
			if err := tx.Create(&p).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar paquete", "details": err.Error()})
		return
	}

	var paquete models.PaqueteEventos
	config.DB.Preload("Plantillas").First(&paquete, id)
	c.JSON(http.StatusOK, paquete)
}

func DeletePaquete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	if err := config.DB.Delete(&models.PaqueteEventos{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar paquete"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Paquete eliminado correctamente"})
}

func AplicarPaqueteAMaterna(c *gin.Context) {
	paqueteIdStr := c.Param("paqueteId")
	gestanteIdStr := c.Param("gestanteId")

	pID, _ := strconv.Atoi(paqueteIdStr)
	gID, _ := strconv.Atoi(gestanteIdStr)

	var gestante models.Gestante
	var paquete models.PaqueteEventos

	if err := config.DB.Preload("IngresoCPN").First(&gestante, gID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Paciente no encontrada"})
		return
	}

	if err := config.DB.Preload("Plantillas").First(&paquete, pID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Paquete no encontrado"})
		return
	}

	startDate := gestante.CreatedAt
	if gestante.IngresoCPN != nil && gestante.IngresoCPN.Fur != nil {
		startDate = *gestante.IngresoCPN.Fur
	}

	var eventosParaCrear []models.EventoMedico
	pIDUint := uint(pID)

	for _, plant := range paquete.Plantillas {
		plantID := plant.ID
		fechaProg := startDate.AddDate(0, 0, plant.SemanasRelativas*7)

		eventosParaCrear = append(eventosParaCrear, models.EventoMedico{
			Tipo:            plant.Tipo,
			Descripcion:     plant.Descripcion,
			FechaProgramada: fechaProg,
			EsObligatorio:   plant.EsObligatorio,
			EsControl:       plant.EsControl,
			CodigoCUPS:      plant.CodigoCUPS,
			Cantidad:        &plant.Cantidad,
			Trimestre:       plant.Trimestre,
			PaqueteID:       &pIDUint,
			PlantillaID:     &plantID,
			GestanteID:      gestante.ID,
			Estado:          "PENDIENTE",
			EstaAgendado:    false,
		})
	}

	if len(eventosParaCrear) > 0 {
		if err := config.DB.Create(&eventosParaCrear).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al aplicar paquete"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Paquete aplicado correctamente", "count": len(eventosParaCrear)})
}

func CheckSyncPaquetes(c *gin.Context) {
	idStr := c.Param("gestanteId")
	gID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID de gestante inválido"})
		return
	}

	var eventos []models.EventoMedico
	config.DB.Where("gestante_id = ? AND paquete_id IS NOT NULL", gID).Find(&eventos)

	if len(eventos) == 0 {
		c.JSON(http.StatusOK, gin.H{"desactualizados": []uint{}})
		return
	}

	mapaFechas := make(map[uint]time.Time)
	for _, ev := range eventos {
		if ev.PaqueteID != nil {
			pid := *ev.PaqueteID
			if t, exists := mapaFechas[pid]; !exists || ev.CreatedAt.After(t) {
				mapaFechas[pid] = ev.CreatedAt
			}
		}
	}

	var paqueteIDs []uint
	for pid := range mapaFechas {
		paqueteIDs = append(paqueteIDs, pid)
	}

	var paquetes []models.PaqueteEventos
	config.DB.Where("id IN ?", paqueteIDs).Find(&paquetes)

	var desactualizados []uint
	for _, pq := range paquetes {
		if t, exists := mapaFechas[pq.ID]; exists && pq.UpdatedAt.After(t) {
			desactualizados = append(desactualizados, pq.ID)
		}
	}

	c.JSON(http.StatusOK, gin.H{"desactualizados": desactualizados})
}

func SincronizarPaqueteMaterna(c *gin.Context) {
	paqueteIdStr := c.Param("paqueteId")
	gestanteIdStr := c.Param("gestanteId")

	pID, _ := strconv.Atoi(paqueteIdStr)
	gID, _ := strconv.Atoi(gestanteIdStr)

	var gestante models.Gestante
	var paquete models.PaqueteEventos

	if err := config.DB.Preload("IngresoCPN").First(&gestante, gID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Paciente no encontrada"})
		return
	}

	if err := config.DB.Preload("Plantillas").First(&paquete, pID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Paquete no encontrado"})
		return
	}

	startDate := gestante.CreatedAt
	if gestante.IngresoCPN != nil && gestante.IngresoCPN.Fur != nil {
		startDate = *gestante.IngresoCPN.Fur
	}

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		// Eliminar eventos pendientes del paquete
		tx.Where("gestante_id = ? AND paquete_id = ? AND estado = 'PENDIENTE'", gID, pID).Delete(&models.EventoMedico{})

		// Obtener IDs de plantillas con eventos ya completados o agendados
		var eventosCompletados []models.EventoMedico
		tx.Where("gestante_id = ? AND paquete_id = ? AND estado != 'PENDIENTE' AND plantilla_id IS NOT NULL", gID, pID).Find(&eventosCompletados)

		completadasMap := make(map[uint]bool)
		for _, ev := range eventosCompletados {
			if ev.PlantillaID != nil {
				completadasMap[*ev.PlantillaID] = true
			}
		}

		pIDUint := uint(pID)
		var nuevosEventos []models.EventoMedico

		for _, plant := range paquete.Plantillas {
			if !completadasMap[plant.ID] {
				plantID := plant.ID
				fechaProg := startDate.AddDate(0, 0, plant.SemanasRelativas*7)

				nuevosEventos = append(nuevosEventos, models.EventoMedico{
					Tipo:            plant.Tipo,
					Descripcion:     plant.Descripcion,
					FechaProgramada: fechaProg,
					EsObligatorio:   plant.EsObligatorio,
					EsControl:       plant.EsControl,
					CodigoCUPS:      plant.CodigoCUPS,
					Cantidad:        &plant.Cantidad,
					Trimestre:       plant.Trimestre,
					PaqueteID:       &pIDUint,
					PlantillaID:     &plantID,
					GestanteID:      gestante.ID,
					Estado:          "PENDIENTE",
					EstaAgendado:    false,
				})
			}
		}

		if len(nuevosEventos) > 0 {
			if err := tx.Create(&nuevosEventos).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al sincronizar paquete"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Paquete sincronizado correctamente", "paquete": paquete.Nombre})
}
