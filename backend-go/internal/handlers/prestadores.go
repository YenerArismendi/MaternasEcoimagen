package handlers

import (
	"net/http"
	"strconv"

	"backend-go/internal/config"
	"backend-go/internal/models"

	"github.com/gin-gonic/gin"
)

func GetPrestadores(c *gin.Context) {
	var prestadores []models.Prestador
	if err := config.DB.Order("nombre asc").Find(&prestadores).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al obtener prestadores"})
		return
	}
	c.JSON(http.StatusOK, prestadores)
}

func CreatePrestador(c *gin.Context) {
	var input struct {
		Nombre string  `json:"nombre" binding:"required"`
		Nit    *string `json:"nit"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El nombre es obligatorio"})
		return
	}

	prestador := models.Prestador{
		Nombre: input.Nombre,
		Nit:    input.Nit,
	}

	if err := config.DB.Create(&prestador).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Ya existe un prestador con ese nombre o error al crear"})
		return
	}

	c.JSON(http.StatusCreated, prestador)
}

func DeletePrestador(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	if err := config.DB.Delete(&models.Prestador{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar prestador"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Prestador eliminado"})
}
