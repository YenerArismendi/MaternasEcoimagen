package handlers

import (
	"net/http"
	"os"
	"strings"
	"time"

	"backend-go/internal/config"
	"backend-go/internal/middleware"
	"backend-go/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email y contraseña son requeridos"})
		return
	}

	var user models.User
	if err := config.DB.Where("LOWER(email) = LOWER(?)", strings.TrimSpace(req.Email)).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Credenciales inválidas"})
		return
	}

	if !user.Activo {
		c.JSON(http.StatusForbidden, gin.H{"error": "Usuario inactivo"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Credenciales inválidas"})
		return
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "maternas_super_secret_key_2024_change_in_production"
	}

	claims := middleware.Claims{
		UserID: user.ID,
		Email:  user.Email,
		Rol:    user.Rol,
		Nombre: user.Nombre,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error generando token de acceso"})
		return
	}

	var gestanteID *uint
	if user.Rol == "GESTANTE" {
		docNum := strings.TrimSpace(strings.Split(user.Email, "@")[0])
		var gestante models.Gestante
		if err := config.DB.Where("numero_identificacion = ? OR email = ? OR LOWER(nombres) LIKE LOWER(?)", docNum, user.Email, "%"+user.Nombre+"%").First(&gestante).Error; err == nil {
			gID := gestante.ID
			gestanteID = &gID
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"token": tokenString,
		"user": gin.H{
			"id":         user.ID,
			"nombre":     user.Nombre,
			"email":      user.Email,
			"rol":        user.Rol,
			"ipsId":      user.IPSID,
			"gestanteId": gestanteID,
		},
	})
}

func GetMe(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autenticado"})
		return
	}

	var user models.User
	if err := config.DB.Preload("IPS").First(&user, userID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado u obsoleto"})
		return
	}

	var gestanteID *uint
	if user.Rol == "GESTANTE" {
		docNum := strings.TrimSpace(strings.Split(user.Email, "@")[0])
		var gestante models.Gestante
		if err := config.DB.Where("numero_identificacion = ? OR email = ? OR LOWER(nombres) LIKE LOWER(?)", docNum, user.Email, "%"+user.Nombre+"%").First(&gestante).Error; err == nil {
			gID := gestante.ID
			gestanteID = &gID
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"id":         user.ID,
		"nombre":     user.Nombre,
		"email":      user.Email,
		"rol":        user.Rol,
		"ipsId":      user.IPSID,
		"ips":        user.IPS,
		"gestanteId": gestanteID,
	})
}
