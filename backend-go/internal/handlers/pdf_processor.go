package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"backend-go/internal/config"
	"backend-go/internal/models"
	"backend-go/internal/pdfextractor"

	"github.com/gin-gonic/gin"
)

// GetPDFConfigHandler handles GET /api/pdf/config
func GetPDFConfigHandler(c *gin.Context) {
	var cfg models.PDFExtractorConfig
	if err := config.DB.First(&cfg).Error; err != nil {
		// Crear configuración por defecto si no existe
		cfg = models.PDFExtractorConfig{
			HemoglobinaMin:     11.0,
			HemoglobinaMax:     14.0,
			HematocritoMin:     33.0,
			HematocritoMax:     44.0,
			PlaquetasMin:       150000.0,
			PlaquetasMax:       450000.0,
			GlicemiaMin:        70.0,
			GlicemiaMax:        92.0,
			PtogMax:            140.0,
			SeccionEvolucion:   "EVOLUCIÓN,EVOLUCION CLINICA,NOTAS DE EVOLUCION",
			SeccionDiagnostico: "DIAGNÓSTICO,DIAGNOSTICO,IMPRESIÓN DIAGNÓSTICA",
			SeccionPlan:        "PLAN DE MANEJO,PLAN DE TRATAMIENTO,CONDUCTA",
			SeccionMotivo:      "MOTIVO DE CONSULTA,MOTIVO CONSULTA",
		}
		config.DB.Create(&cfg)
	}

	c.JSON(http.StatusOK, gin.H{"data": cfg})
}

// UpdatePDFConfigHandler handles PUT /api/pdf/config (Admin only)
func UpdatePDFConfigHandler(c *gin.Context) {
	var input models.PDFExtractorConfig
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos de configuración inválidos", "detalle": err.Error()})
		return
	}

	var existing models.PDFExtractorConfig
	if err := config.DB.First(&existing).Error; err != nil {
		input.ID = 1
		config.DB.Create(&input)
	} else {
		input.ID = existing.ID
		config.DB.Save(&input)
	}

	c.JSON(http.StatusOK, gin.H{
		"mensaje": "Parámetros del extractor de PDF actualizados correctamente",
		"data":    input,
	})
}

// ProcessMaternalPDFHandler handles POST /api/pdf/extract
func ProcessMaternalPDFHandler(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		fileHeader, err = c.FormFile("pdf")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Archivo PDF no proporcionado.",
				"detalle": "Debe enviar un archivo en el campo multipart/form-data 'file' o 'pdf'.",
			})
			return
		}
	}

	// Validar extensión
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if ext != ".pdf" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Formato de archivo no válido.",
			"detalle": fmt.Sprintf("Se requiere un archivo con extensión .pdf, recibido: %s", ext),
		})
		return
	}

	// Cargar configuración de base de datos
	var cfg models.PDFExtractorConfig
	if err := config.DB.First(&cfg).Error; err != nil {
		cfg = models.PDFExtractorConfig{
			HemoglobinaMin: 11.0, HemoglobinaMax: 14.0,
			HematocritoMin: 33.0, HematocritoMax: 44.0,
			PlaquetasMin: 150000.0, PlaquetasMax: 450000.0,
			GlicemiaMin: 70.0, GlicemiaMax: 92.0, PtogMax: 140.0,
		}
	}

	// Cargar catálogo de laboratorios individuales parametrizados (1 a 1)
	var customLabs []models.LabParam
	config.DB.Where("activo = ?", true).Find(&customLabs)

	// Abrir el archivo subido
	uploadedFile, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Error al abrir el archivo subido.",
			"detalle": err.Error(),
		})
		return
	}
	defer uploadedFile.Close()

	// Crear archivo temporal
	tempFile, err := os.CreateTemp("", "materna_pdf_*.pdf")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Error al crear archivo temporal para procesamiento.",
			"detalle": err.Error(),
		})
		return
	}
	tempPath := tempFile.Name()
	defer os.Remove(tempPath)
	defer tempFile.Close()

	// Copiar contenido al archivo temporal
	if _, err := io.Copy(tempFile, uploadedFile); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Error al guardar el archivo temporalmente.",
			"detalle": err.Error(),
		})
		return
	}

	// Ejecutar extractor de PDF en Go con configuración dinámica y catálogo de laboratorios 1 a 1
	parsedData, err := pdfextractor.ParseMaternalPDFWithConfigAndLabs(tempPath, fileHeader.Filename, fileHeader.Size, cfg, customLabs)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error":     "Error durante el procesamiento del archivo PDF.",
			"detalle":   err.Error(),
			"metadatos": parsedData.Metadatos,
		})
		return
	}

	// Respuesta Exitosa con JSON Estructurado
	c.JSON(http.StatusOK, gin.H{
		"mensaje": "PDF procesado exitosamente",
		"data":    parsedData,
	})
}

// ─── Handlers para Gestión Individual de Laboratorios (1 a 1) ─────────────────

// GetLabParamsHandler handles GET /api/pdf/labs
func GetLabParamsHandler(c *gin.Context) {
	var labs []models.LabParam
	config.DB.Order("id asc").Find(&labs)
	c.JSON(http.StatusOK, gin.H{"data": labs})
}

// CreateLabParamHandler handles POST /api/pdf/labs (Admin only)
func CreateLabParamHandler(c *gin.Context) {
	var input models.LabParam
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos de laboratorio inválidos", "detalle": err.Error()})
		return
	}
	if strings.TrimSpace(input.Nombre) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El nombre del laboratorio es obligatorio"})
		return
	}
	if strings.TrimSpace(input.CodigoCampo) == "" {
		// Autogenerar código de campo limpio
		input.CodigoCampo = strings.ToLower(strings.ReplaceAll(input.Nombre, " ", ""))
	}
	input.Activo = true
	if err := config.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No se pudo guardar el laboratorio", "detalle": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"mensaje": "Laboratorio agregado exitosamente", "data": input})
}

// UpdateLabParamHandler handles PUT /api/pdf/labs/:id (Admin only)
func UpdateLabParamHandler(c *gin.Context) {
	id := c.Param("id")
	var lab models.LabParam
	if err := config.DB.First(&lab, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Laboratorio no encontrado"})
		return
	}
	if err := c.ShouldBindJSON(&lab); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos", "detalle": err.Error()})
		return
	}
	config.DB.Save(&lab)
	c.JSON(http.StatusOK, gin.H{"mensaje": "Laboratorio actualizado exitosamente", "data": lab})
}

// DeleteLabParamHandler handles DELETE /api/pdf/labs/:id (Admin only)
func DeleteLabParamHandler(c *gin.Context) {
	id := c.Param("id")
	if err := config.DB.Delete(&models.LabParam{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No se pudo eliminar el laboratorio"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"mensaje": "Laboratorio eliminado exitosamente"})
}
