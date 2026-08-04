package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"backend-go/internal/config"
	"backend-go/internal/models"
	"github.com/gin-gonic/gin"
)

// ─── GET /api/anuncios ── Lista anuncios activos (para maternas) o todos (admin/enfermera)
func GetAnuncios(c *gin.Context) {
	userRol, _ := c.Get("rol")
	var anuncios []models.Anuncio

	query := config.DB.Preload("CreadoPor").Preload("Participaciones").Order("destacado DESC, created_at DESC")

	// Las maternas solo ven los anuncios activos
	if userRol == "GESTANTE" {
		query = query.Where("activo = ?", true)
	}

	if err := query.Find(&anuncios).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al obtener anuncios"})
		return
	}
	c.JSON(http.StatusOK, anuncios)
}

// ─── POST /api/anuncios ── Crear anuncio (admin/enfermera)
func CreateAnuncio(c *gin.Context) {
	userID, _ := c.Get("userId")

	var input struct {
		Titulo      string  `json:"titulo" binding:"required"`
		Contenido   string  `json:"contenido" binding:"required"`
		Tipo        string  `json:"tipo"`
		ImagenURL   *string `json:"imagenURL"`
		FechaEvento *string `json:"fechaEvento"`
		LugarEvento *string `json:"lugarEvento"`
		Activo      *bool   `json:"activo"`
		Destacado   *bool   `json:"destacado"`
		PermiteRSVP *bool   `json:"permiteRSVP"`
		CupoMaximo  *int    `json:"cupoMaximo"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tipo := input.Tipo
	if tipo == "" {
		tipo = "INFO"
	}

	anuncio := models.Anuncio{
		Titulo:      input.Titulo,
		Contenido:   input.Contenido,
		Tipo:        tipo,
		ImagenURL:   input.ImagenURL,
		LugarEvento: input.LugarEvento,
		CupoMaximo:  input.CupoMaximo,
		CreadoPorID: userID.(uint),
	}

	if input.Activo != nil {
		anuncio.Activo = *input.Activo
	} else {
		anuncio.Activo = true
	}
	if input.Destacado != nil {
		anuncio.Destacado = *input.Destacado
	}
	if input.PermiteRSVP != nil {
		anuncio.PermiteRSVP = *input.PermiteRSVP
	}
	if input.FechaEvento != nil && *input.FechaEvento != "" {
		t, err := time.Parse("2006-01-02", *input.FechaEvento)
		if err == nil {
			anuncio.FechaEvento = &t
		}
	}

	if err := config.DB.Create(&anuncio).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear anuncio"})
		return
	}

	config.DB.Preload("CreadoPor").First(&anuncio, anuncio.ID)
	c.JSON(http.StatusCreated, anuncio)
}

// ─── PUT /api/anuncios/:id ── Editar anuncio
func UpdateAnuncio(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var anuncio models.Anuncio
	if err := config.DB.First(&anuncio, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Anuncio no encontrado"})
		return
	}

	var input struct {
		Titulo      *string `json:"titulo"`
		Contenido   *string `json:"contenido"`
		Tipo        *string `json:"tipo"`
		ImagenURL   *string `json:"imagenURL"`
		FechaEvento *string `json:"fechaEvento"`
		LugarEvento *string `json:"lugarEvento"`
		Activo      *bool   `json:"activo"`
		Destacado   *bool   `json:"destacado"`
		PermiteRSVP *bool   `json:"permiteRSVP"`
		CupoMaximo  *int    `json:"cupoMaximo"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if input.Titulo != nil {
		updates["titulo"] = *input.Titulo
	}
	if input.Contenido != nil {
		updates["contenido"] = *input.Contenido
	}
	if input.Tipo != nil {
		updates["tipo"] = *input.Tipo
	}
	if input.ImagenURL != nil {
		updates["imagen_url"] = *input.ImagenURL
	}
	if input.LugarEvento != nil {
		updates["lugar_evento"] = *input.LugarEvento
	}
	if input.Activo != nil {
		updates["activo"] = *input.Activo
	}
	if input.Destacado != nil {
		updates["destacado"] = *input.Destacado
	}
	if input.PermiteRSVP != nil {
		updates["permite_r_s_v_p"] = *input.PermiteRSVP
	}
	if input.CupoMaximo != nil {
		updates["cupo_maximo"] = *input.CupoMaximo
	}
	if input.FechaEvento != nil && *input.FechaEvento != "" {
		t, err := time.Parse("2006-01-02", *input.FechaEvento)
		if err == nil {
			updates["fecha_evento"] = t
		}
	}

	config.DB.Model(&anuncio).Updates(updates)
	config.DB.Preload("CreadoPor").Preload("Participaciones").First(&anuncio, id)
	c.JSON(http.StatusOK, anuncio)
}

// ─── DELETE /api/anuncios/:id ── Eliminar anuncio
func DeleteAnuncio(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	config.DB.Delete(&models.AnuncioParticipacion{}, "anuncio_id = ?", id)
	if err := config.DB.Delete(&models.Anuncio{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Anuncio eliminado"})
}

func getGestanteFromUser(userID uint) (*models.Gestante, error) {
	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		return nil, err
	}

	docNum := strings.TrimSpace(strings.Split(user.Email, "@")[0])
	var gestante models.Gestante
	err := config.DB.Where("numero_identificacion = ? OR email = ? OR LOWER(nombres) LIKE LOWER(?)", docNum, user.Email, "%"+user.Nombre+"%").First(&gestante).Error
	if err != nil {
		// Si es un usuario admin/enfermera probando, tomar la primera gestante de prueba si no coincide
		if errFirst := config.DB.First(&gestante).Error; errFirst == nil {
			return &gestante, nil
		}
		return nil, err
	}
	return &gestante, nil
}

// ─── POST /api/anuncios/:id/participar ── Materna se inscribe a un anuncio/evento
func ParticiparAnuncio(c *gin.Context) {
	anuncioID, _ := strconv.Atoi(c.Param("id"))
	userID, _ := c.Get("userId")

	gestante, err := getGestanteFromUser(userID.(uint))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No se encontró el perfil de gestante para este usuario"})
		return
	}

	// Verificar si el anuncio permite RSVP
	var anuncio models.Anuncio
	if err := config.DB.First(&anuncio, anuncioID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Anuncio no encontrado"})
		return
	}
	if !anuncio.PermiteRSVP {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Este anuncio no permite participación"})
		return
	}

	// Verificar cupo
	if anuncio.CupoMaximo != nil {
		var count int64
		config.DB.Model(&models.AnuncioParticipacion{}).Where("anuncio_id = ? AND estado = ?", anuncioID, "CONFIRMADO").Count(&count)
		if int(count) >= *anuncio.CupoMaximo {
			c.JSON(http.StatusConflict, gin.H{"error": "El cupo máximo está lleno"})
			return
		}
	}

	// Evitar duplicados
	var existing models.AnuncioParticipacion
	if err := config.DB.Where("anuncio_id = ? AND gestante_id = ?", anuncioID, gestante.ID).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Ya estás inscrita en este evento", "participacion": existing})
		return
	}

	var input struct {
		Comentario *string `json:"comentario"`
	}
	c.ShouldBindJSON(&input)

	part := models.AnuncioParticipacion{
		AnuncioID:  uint(anuncioID),
		GestanteID: gestante.ID,
		Estado:     "CONFIRMADO",
		Comentario: input.Comentario,
	}

	if err := config.DB.Create(&part).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al registrar participación"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "¡Te has inscrito correctamente!", "participacion": part})
}

// ─── DELETE /api/anuncios/:id/participar ── Cancelar inscripción
func CancelarParticipacion(c *gin.Context) {
	anuncioID, _ := strconv.Atoi(c.Param("id"))
	userID, _ := c.Get("userId")

	gestante, err := getGestanteFromUser(userID.(uint))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Perfil de gestante no encontrado"})
		return
	}

	config.DB.Where("anuncio_id = ? AND gestante_id = ?", anuncioID, gestante.ID).Delete(&models.AnuncioParticipacion{})
	c.JSON(http.StatusOK, gin.H{"message": "Participación cancelada"})
}

// ─── GET /api/anuncios/:id/participaciones ── Ver quiénes se inscribieron (admin)
func GetParticipaciones(c *gin.Context) {
	anuncioID, _ := strconv.Atoi(c.Param("id"))
	var parts []models.AnuncioParticipacion
	config.DB.Preload("Gestante").Where("anuncio_id = ?", anuncioID).Find(&parts)
	c.JSON(http.StatusOK, parts)
}
