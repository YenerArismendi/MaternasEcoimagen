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
	ID        uint        `json:"id"`
	Nombre    string      `json:"nombre"`
	Email     string      `json:"email"`
	Rol       string      `json:"rol"`
	IPSID     *uint       `json:"ipsId"`
	IPS       *models.IPS `json:"ips,omitempty"`
	Activo    bool        `json:"activo"`
}

func GetUsers(c *gin.Context) {
	userIDVal, exists := c.Get("userId")
	var currentUser models.User
	if exists {
		dbSession := config.GetDB()
		switch v := userIDVal.(type) {
		case uint:
			dbSession.First(&currentUser, v)
		case float64:
			dbSession.First(&currentUser, uint(v))
		case int:
			dbSession.First(&currentUser, uint(v))
		}
	}

	query := config.GetDB().Model(&models.User{}).Preload("IPS").Order("created_at desc")

	// Si no es SUPERADMIN ni SUPER_ROOT, sólo puede ver usuarios de su misma IPS
	if currentUser.Rol != "SUPERADMIN" && currentUser.Rol != "SUPER_ROOT" {
		if currentUser.IPSID != nil && *currentUser.IPSID > 0 {
			query = query.Where("ips_id = ?", *currentUser.IPSID)
		} else {
			query = query.Where("ips_id = -1") // Previene listar usuarios si el admin no tiene IPS asignada
		}
	}

	var users []models.User
	if err := query.Find(&users).Error; err != nil {
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
			IPSID:  u.IPSID,
			IPS:    u.IPS,
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
	IPSID    *uint  `json:"ipsId"`
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

	// Si el creador pertenece a una IPS y no especificó ipsId, asignamos su misma IPS
	userIDVal, exists := c.Get("userId")
	if exists {
		if uid, ok := userIDVal.(uint); ok {
			var creator models.User
			if config.DB.First(&creator, uid).Error == nil && creator.IPSID != nil && input.IPSID == nil {
				input.IPSID = creator.IPSID
			}
		}
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
		IPSID:    input.IPSID,
		Activo:   true,
	}

	if err := config.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Ya existe un usuario con ese email"})
		return
	}

	if user.IPSID != nil && *user.IPSID > 0 {
		config.DB.Preload("IPS").First(&user, user.ID)
	}

	c.JSON(http.StatusCreated, UserResponse{
		ID:     user.ID,
		Nombre: user.Nombre,
		Email:  user.Email,
		Rol:    user.Rol,
		IPSID:  user.IPSID,
		IPS:    user.IPS,
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

	var rawBody map[string]interface{}
	if err := c.ShouldBindJSON(&rawBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	if nombreVal, ok := rawBody["nombre"].(string); ok && nombreVal != "" {
		user.Nombre = nombreVal
	}
	if emailVal, ok := rawBody["email"].(string); ok && emailVal != "" {
		user.Email = emailVal
	}
	if rolVal, ok := rawBody["rol"].(string); ok && rolVal != "" {
		user.Rol = rolVal
	}
	if activoVal, ok := rawBody["activo"].(bool); ok {
		user.Activo = activoVal
	}
	if passVal, ok := rawBody["password"].(string); ok && passVal != "" {
		hp, _ := bcrypt.GenerateFromPassword([]byte(passVal), 12)
		user.Password = string(hp)
	}

	if ipsIdVal, exists := rawBody["ipsId"]; exists {
		if ipsIdVal == nil {
			user.IPSID = nil
			config.DB.Model(&user).Select("ips_id").Update("ips_id", nil)
		} else {
			var parsedID uint
			switch v := ipsIdVal.(type) {
			case float64:
				parsedID = uint(v)
			case int:
				parsedID = uint(v)
			case int64:
				parsedID = uint(v)
			}
			if parsedID > 0 {
				user.IPSID = &parsedID
				config.DB.Model(&user).Select("ips_id").Update("ips_id", parsedID)
			} else {
				user.IPSID = nil
				config.DB.Model(&user).Select("ips_id").Update("ips_id", nil)
			}
		}
	}

	if err := config.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar usuario"})
		return
	}

	if user.IPSID != nil && *user.IPSID > 0 {
		config.DB.Preload("IPS").First(&user, user.ID)
	} else {
		user.IPS = nil
	}

	c.JSON(http.StatusOK, UserResponse{
		ID:     user.ID,
		Nombre: user.Nombre,
		Email:  user.Email,
		Rol:    user.Rol,
		IPSID:  user.IPSID,
		IPS:    user.IPS,
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
