package handlers

import (
	"net/http"
	"strconv"

	"backend-go/internal/config"
	"backend-go/internal/models"

	"github.com/gin-gonic/gin"
)

// GetIPSHandler obtiene el listado de IPS registradas.
func GetIPSHandler(c *gin.Context) {
	var ipsList []models.IPS
	if err := config.DB.Find(&ipsList).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al consultar las IPS: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, ipsList)
}

// CreateIPSHandler registra una nueva IPS.
func CreateIPSHandler(c *gin.Context) {
	var body models.IPS
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos: " + err.Error()})
		return
	}

	if body.Nombre == "" || body.CodigoHabilitacion == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El nombre y el código de habilitación son obligatorios"})
		return
	}

	if err := config.DB.Create(&body).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creando IPS: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, body)
}

// UpdateIPSHandler actualiza los datos de una IPS.
func UpdateIPSHandler(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID de IPS inválido"})
		return
	}

	var ips models.IPS
	if err := config.DB.First(&ips, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "IPS no encontrada"})
		return
	}

	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "JSON inválido"})
		return
	}

	if err := config.DB.Model(&ips).Updates(body).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar IPS: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, ips)
}

// DeleteIPSHandler elimina o desactiva una IPS.
func DeleteIPSHandler(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID de IPS inválido"})
		return
	}

	if err := config.DB.Delete(&models.IPS{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar IPS: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "IPS eliminada correctamente"})
}
