package handlers

import (
	"net/http"

	"backend-go/internal/config"
	"backend-go/internal/models"

	"github.com/gin-gonic/gin"
)

func GetTheme(c *gin.Context) {
	var theme models.ThemeConfig
	if err := config.DB.First(&theme).Error; err != nil {
		theme = models.ThemeConfig{
			PrimaryColor:   "#E91E8C",
			SecondaryColor: "#3B82F6",
			AccentColor:    "#F472B6",
			DarkMode:       false,
			ClinicName:     "Dulce espera",
		}
		config.DB.Create(&theme)
	}
	c.JSON(http.StatusOK, theme)
}

func UpdateTheme(c *gin.Context) {
	var theme models.ThemeConfig
	if err := config.DB.First(&theme).Error; err != nil {
		theme = models.ThemeConfig{
			PrimaryColor:   "#E91E8C",
			SecondaryColor: "#3B82F6",
			AccentColor:    "#F472B6",
			DarkMode:       false,
			ClinicName:     "Dulce espera",
		}
		config.DB.Create(&theme)
	}

	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cuerpo inválido"})
		return
	}

	if err := config.DB.Model(&theme).Updates(body).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar el tema"})
		return
	}

	c.JSON(http.StatusOK, theme)
}
