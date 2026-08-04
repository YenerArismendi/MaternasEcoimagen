package config

import (
	"fmt"
	"log"
	"os"
	"strings"

	"backend-go/internal/models"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB() *gorm.DB {
	_ = godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")

	var db *gorm.DB
	var err error

	if strings.HasPrefix(dbURL, "postgres://") || strings.HasPrefix(dbURL, "postgresql://") {
		// Asegurar connect_timeout para evitar bloqueos si la BD remota no responde
		connStr := dbURL
		if !strings.Contains(connStr, "connect_timeout") {
			if strings.Contains(connStr, "?") {
				connStr += "&connect_timeout=5"
			} else {
				connStr += "?connect_timeout=5"
			}
		}

		fmt.Println("🔌 Intentando conectar a PostgreSQL:", connStr)
		db, err = gorm.Open(postgres.Open(connStr), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Warn),
		})

		if err != nil {
			log.Printf("⚠️ No se pudo conectar a PostgreSQL (%v). Usando base de datos local SQLite...", err)
			db, err = gorm.Open(sqlite.Open("maternas_dev.db"), &gorm.Config{
				Logger: logger.Default.LogMode(logger.Info),
			})
		}
	} else {
		fmt.Println("🔌 Conectando a la base de datos local SQLite (maternas_dev.db)...")
		db, err = gorm.Open(sqlite.Open("maternas_dev.db"), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Info),
		})
	}

	if err != nil {
		log.Fatalf("❌ Error crítico inicializando la base de datos: %v", err)
	}

	fmt.Println("✅ Base de datos conectada correctamente")

	// AutoMigrate
	err = db.AutoMigrate(
		&models.User{},
		&models.Gestante{},
		&models.AntecedenteClinico{},
		&models.IngresoCPN{},
		&models.SeguimientoControl{},
		&models.Paraclinico{},
		&models.EgresoYPosparto{},
		&models.SeguimientoTelefonico{},
		&models.EventoMedico{},
		&models.PaqueteEventos{},
		&models.PlantillaEvento{},
		&models.Prestador{},
		&models.ThemeConfig{},
		&models.Anuncio{},
		&models.AnuncioParticipacion{},
	)
	if err != nil {
		log.Fatalf("❌ Error en AutoMigrate de GORM: %v", err)
	}

	fmt.Println("✅ Tablas y esquema migrados exitosamente")
	DB = db
	return db
}
