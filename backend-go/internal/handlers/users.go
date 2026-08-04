package handlers

import (
	"net/http"
	"strconv"

	"backend-go/internal/config"
	"backend-go/internal/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type UserResponse struct {
	ID        uint   `json:"id"`
	Nombre    string `json:"nombre"`
	Email     string `json:"email"`
	Rol       string `json:"rol"`
	Activo    bool   `json:"activo"`
}

func GetUsers(c *gin.Context) {
	var users []models.User
	if err := config.DB.Order("created_at desc").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al obtener usuarios"})
		return
	}

	var res []UserResponse
	for _, u := range users {
		res = append(res, UserResponse{
			ID:     u.ID,
			Nombre: u.Nombre,
			Email:  u.Email,
			Rol:    u.Rol,
			Activo: u.Activo,
		})
	}

	c.JSON(http.StatusOK, res)
}

type CreateUserInput struct {
	Nombre   string `json:"nombre" binding:"required"`
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
	Rol      string `json:"rol"`
}

func CreateUser(c *gin.Context) {
	var input CreateUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nombre, email y contraseña son requeridos"})
		return
	}

	rol := input.Rol
	if rol == "" {
		rol = "ENFERMERA"
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), 12)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al encriptar contraseña"})
		return
	}

	user := models.User{
		Nombre:   input.Nombre,
		Email:    input.Email,
		Password: string(hashedPassword),
		Rol:      rol,
		Activo:   true,
	}

	if err := config.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Ya existe un usuario con ese email"})
		return
	}

	c.JSON(http.StatusCreated, UserResponse{
		ID:     user.ID,
		Nombre: user.Nombre,
		Email:  user.Email,
		Rol:    user.Rol,
		Activo: user.Activo,
	})
}

func UpdateUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	var user models.User
	if err := config.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Usuario no encontrado"})
		return
	}

	var body struct {
		Nombre   *string `json:"nombre"`
		Email    *string `json:"email"`
		Password *string `json:"password"`
		Rol      *string `json:"rol"`
		Activo   *bool   `json:"activo"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	if body.Nombre != nil {
		user.Nombre = *body.Nombre
	}
	if body.Email != nil {
		user.Email = *body.Email
	}
	if body.Rol != nil {
		user.Rol = *body.Rol
	}
	if body.Activo != nil {
		user.Activo = *body.Activo
	}
	if body.Password != nil && *body.Password != "" {
		hp, _ := bcrypt.GenerateFromPassword([]byte(*body.Password), 12)
		user.Password = string(hp)
	}

	if err := config.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar usuario"})
		return
	}

	c.JSON(http.StatusOK, UserResponse{
		ID:     user.ID,
		Nombre: user.Nombre,
		Email:  user.Email,
		Rol:    user.Rol,
		Activo: user.Activo,
	})
}

func DeleteUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	currentUserIDVal, _ := c.Get("userId")
	if currentUserID, ok := currentUserIDVal.(uint); ok && currentUserID == uint(id) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No puedes desactivar tu propia cuenta"})
		return
	}

	if err := config.DB.Model(&models.User{}).Where("id = ?", id).Update("activo", false).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al desactivar usuario"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Usuario desactivado correctamente"})
}
