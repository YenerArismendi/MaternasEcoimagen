package main

import (
	"fmt"
	"log"
	"os"

	"backend-go/internal/config"
	"backend-go/internal/handlers"
	"backend-go/internal/middleware"
	"backend-go/internal/seed"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	fmt.Println("🚀 Iniciando Servidor Backend MaternasEcoimagen en Go...")

	db := config.InitDB()

	// Ejecutar seed inicial
	seed.SeedDatabase(db)

	r := gin.Default()

	// Configuración CORS
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}

	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOriginFunc = func(origin string) bool {
		return true
	}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Authorization", "Accept"}
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	corsConfig.AllowCredentials = true
	r.Use(cors.New(corsConfig))

	// Grupo API
	api := r.Group("/api")
	{
		// Health Check
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok", "server": "Go/Gin", "database": "PostgreSQL"})
		})

		// Theme (Público)
		api.GET("/theme", handlers.GetTheme)

		// Auth
		api.POST("/auth/login", handlers.Login)

		// Rutas Autenticadas
		auth := api.Group("")
		auth.Use(middleware.AuthMiddleware())
		{
			// User info
			auth.GET("/auth/me", handlers.GetMe)

			// Theme (Admin / Auth update)
			auth.PUT("/theme", handlers.UpdateTheme)

			// Gestantes / Maternas (Soporte para ambos nombres de ruta)
			for _, prefix := range []string{"/gestantes", "/maternas"} {
				auth.GET(prefix, handlers.GetGestantes)
				auth.GET(prefix+"/:id", handlers.GetGestanteByID)
				auth.POST(prefix, handlers.CreateGestante)
				auth.PUT(prefix+"/:id", handlers.UpdateGestante)
				auth.DELETE(prefix+"/:id", handlers.DeleteGestante)

				auth.PUT(prefix+"/:id/antecedentes", handlers.UpdateAntecedentes)
				auth.PUT(prefix+"/:id/cpn", handlers.UpdateIngresoCPN)
				auth.PUT(prefix+"/:id/paraclinicos", handlers.UpdateParaclinicos)
				auth.PUT(prefix+"/:id/egreso", handlers.UpdateEgresoPosparto)
				auth.GET(prefix+"/:id/cronograma", handlers.GetCronograma)
			}

			// Eventos Médicos
			auth.GET("/eventos/materna/:id", handlers.GetEventosPorMaterna)
			auth.POST("/eventos", handlers.CreateEvento)
			auth.PATCH("/eventos/:id", handlers.UpdateEvento)
			auth.DELETE("/eventos/:id", handlers.DeleteEvento)
			auth.POST("/eventos/bulk-delete", handlers.BulkDeleteEventos)
			auth.POST("/eventos/materna/:id/generar-basicos", handlers.GenerarEventosBasicos)

			// Paquetes
			auth.GET("/paquetes", handlers.GetPaquetes)
			auth.POST("/paquetes", handlers.CreatePaquete)
			auth.PUT("/paquetes/:id", handlers.UpdatePaquete)
			auth.DELETE("/paquetes/:id", handlers.DeletePaquete)
			auth.POST("/paquetes/aplicar/:paqueteId/materna/:gestanteId", handlers.AplicarPaqueteAMaterna)
			auth.GET("/paquetes/check-sync/:gestanteId", handlers.CheckSyncPaquetes)
			auth.POST("/paquetes/:paqueteId/sincronizar-materna/:gestanteId", handlers.SincronizarPaqueteMaterna)

			// FOMAG Excel Export / Import
			auth.GET("/fomag/export/excel", handlers.ExportFomagAll)
			auth.GET("/fomag/export/excel/:gestanteId", handlers.ExportFomagSingle)
			auth.POST("/fomag/import", handlers.ImportFomag)

			// Procesamiento y Extracción de PDFs Clínicos / Laboratorios
			auth.POST("/pdf/extract", handlers.ProcessMaternalPDFHandler)
			auth.GET("/pdf/config", handlers.GetPDFConfigHandler)
			auth.PUT("/pdf/config", handlers.UpdatePDFConfigHandler)
			auth.GET("/pdf/labs", handlers.GetLabParamsHandler)
			auth.POST("/pdf/labs", handlers.CreateLabParamHandler)
			auth.PUT("/pdf/labs/:id", handlers.UpdateLabParamHandler)
			auth.DELETE("/pdf/labs/:id", handlers.DeleteLabParamHandler)

			// Prestadores
			auth.GET("/prestadores", handlers.GetPrestadores)
			auth.POST("/prestadores", handlers.CreatePrestador)
			auth.DELETE("/prestadores/:id", handlers.DeletePrestador)

			// Usuarios
			auth.GET("/users", handlers.GetUsers)
			auth.POST("/users", handlers.CreateUser)
			auth.PUT("/users/:id", handlers.UpdateUser)
			auth.DELETE("/users/:id", handlers.DeleteUser)

			// Anuncios Clínica
			auth.GET("/anuncios", handlers.GetAnuncios)
			auth.POST("/anuncios", handlers.CreateAnuncio)
			auth.PUT("/anuncios/:id", handlers.UpdateAnuncio)
			auth.DELETE("/anuncios/:id", handlers.DeleteAnuncio)
			auth.POST("/anuncios/:id/participar", handlers.ParticiparAnuncio)
			auth.DELETE("/anuncios/:id/participar", handlers.CancelarParticipacion)
			auth.GET("/anuncios/:id/participaciones", handlers.GetParticipaciones)

			// Gestión de IPS
			auth.GET("/ips", handlers.GetIPSHandler)
			auth.POST("/ips", handlers.CreateIPSHandler)
			auth.PUT("/ips/:id", handlers.UpdateIPSHandler)
			auth.DELETE("/ips/:id", handlers.DeleteIPSHandler)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("⚡ Servidor escuchando en http://localhost:%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Error iniciando servidor Go: %v", err)
	}
}
