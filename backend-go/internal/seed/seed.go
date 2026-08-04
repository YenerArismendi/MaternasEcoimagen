package seed

import (
	"fmt"
	"log"

	"backend-go/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func SeedDatabase(db *gorm.DB) {
	fmt.Println("🌱 Iniciando seed en Go...")

	// 1. Admin User
	var count int64
	db.Model(&models.User{}).Where("email = ?", "admin@maternas.com").Count(&count)
	if count == 0 {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("Admin1234"), 12)
		if err != nil {
			log.Fatalf("Error encriptando password de admin: %v", err)
		}
		admin := models.User{
			Nombre:   "Administrador",
			Email:    "admin@maternas.com",
			Password: string(hashedPassword),
			Rol:      "ADMIN",
			Activo:   true,
		}
		if err := db.Create(&admin).Error; err != nil {
			log.Printf("⚠️ Error creando admin: %v", err)
		} else {
			fmt.Printf("✅ Admin creado: %s\n", admin.Email)
		}
	}

	// 2. ThemeConfig
	var themeCount int64
	db.Model(&models.ThemeConfig{}).Count(&themeCount)
	if themeCount == 0 {
		theme := models.ThemeConfig{
			PrimaryColor:   "#E91E8C",
			SecondaryColor: "#3B82F6",
			AccentColor:    "#F472B6",
			DarkMode:       false,
			ClinicName:     "Dulce espera",
		}
		db.Create(&theme)
		fmt.Println("✅ Configuración de tema creada")
	}

	// 3. Paquetes y Plantillas
	seedPaquetes(db)

	// 4. Crear cuentas de usuario para gestantes existentes sin cuenta
	seedGestanteUsers(db)

	fmt.Println("🎉 Seed completado exitosamente!")
}

func seedGestanteUsers(db *gorm.DB) {
	// Corregir roles de usuarios de gestantes que hayan quedado asignados como ENFERMERA
	db.Model(&models.User{}).Where("email LIKE ? AND email != ?", "%@maternas.com", "admin@maternas.com").Update("rol", "GESTANTE")

	var gestantes []models.Gestante
	db.Find(&gestantes)
	for _, g := range gestantes {
		if g.NumeroIdentificacion == "" {
			continue
		}
		emailFormateado := fmt.Sprintf("%s@maternas.com", g.NumeroIdentificacion)
		var count int64
		db.Model(&models.User{}).Where("email = ? OR email = ?", emailFormateado, g.NumeroIdentificacion).Count(&count)
		if count == 0 {
			hashedPass, err := bcrypt.GenerateFromPassword([]byte(g.NumeroIdentificacion), 12)
			if err == nil {
				maternaUser := models.User{
					Nombre:   fmt.Sprintf("%s %s", g.Nombres, g.Apellidos),
					Email:    emailFormateado,
					Password: string(hashedPass),
					Rol:      "GESTANTE",
					Activo:   true,
				}
				db.Create(&maternaUser)
				fmt.Printf("🌸 Usuario gestante auto-creado: %s\n", emailFormateado)
			}
		}
	}
}

func seedPaquetes(db *gorm.DB) {
	fmt.Println("📦 Creando paquetes FOMAG...")

	paquetes := []struct {
		ID          uint
		Nombre      string
		Descripcion string
		Trimestre   string
		Plantillas  []models.PlantillaEvento
	}{
		{
			ID:          1,
			Nombre:      "FOMAG Trimestre 1",
			Descripcion: "Controles y paraclínicos iniciales de ingreso al programa.",
			Trimestre:   "1er Trimestre",
			Plantillas: []models.PlantillaEvento{
				{Tipo: "CONSULTA", Descripcion: "Control Prenatal Ingreso (Médico/Ginecobstetra)", SemanasRelativas: 0, EsObligatorio: true, EsControl: true},
				{Tipo: "CONSULTA", Descripcion: "Control Prenatal (Enfermería)", SemanasRelativas: 4, EsObligatorio: true, EsControl: true},
				{Tipo: "LABORATORIO", Descripcion: "TSH", SemanasRelativas: 1, EsObligatorio: true, EsControl: false},
				{Tipo: "LABORATORIO", Descripcion: "Hemograma I", SemanasRelativas: 1, EsObligatorio: true, EsControl: false},
				{Tipo: "LABORATORIO", Descripcion: "Hemoclasificación", SemanasRelativas: 1, EsObligatorio: true, EsControl: false},
				{Tipo: "LABORATORIO", Descripcion: "VIH (Prueba Rápida I)", SemanasRelativas: 1, EsObligatorio: true, EsControl: false},
				{Tipo: "LABORATORIO", Descripcion: "Sífilis (Prueba Treponémica I)", SemanasRelativas: 1, EsObligatorio: true, EsControl: false},
				{Tipo: "LABORATORIO", Descripcion: "Glicemia", SemanasRelativas: 1, EsObligatorio: true, EsControl: false},
				{Tipo: "LABORATORIO", Descripcion: "Urocultivo I", SemanasRelativas: 1, EsObligatorio: true, EsControl: false},
				{Tipo: "LABORATORIO", Descripcion: "Toxoplasma IgG/IgM", SemanasRelativas: 1, EsObligatorio: true, EsControl: false},
				{Tipo: "LABORATORIO", Descripcion: "Rubeola IgG", SemanasRelativas: 1, EsObligatorio: false, EsControl: false},
				{Tipo: "LABORATORIO", Descripcion: "Chagas", SemanasRelativas: 1, EsObligatorio: false, EsControl: false},
				{Tipo: "LABORATORIO", Descripcion: "HBsAg (Hepatitis B)", SemanasRelativas: 1, EsObligatorio: true, EsControl: false},
				{Tipo: "ESTUDIO", Descripcion: "Ecografía 1er Trimestre (10.6 - 13.6 Sem)", SemanasRelativas: 11, EsObligatorio: true, EsControl: false},
			},
		},
		{
			ID:          2,
			Nombre:      "FOMAG Trimestre 2",
			Descripcion: "Seguimiento especializado mitad del embarazo.",
			Trimestre:   "2do Trimestre",
			Plantillas: []models.PlantillaEvento{
				{Tipo: "CONSULTA", Descripcion: "Control Prenatal (Semana 16)", SemanasRelativas: 16, EsObligatorio: true, EsControl: true},
				{Tipo: "CONSULTA", Descripcion: "Control Prenatal (Semana 20)", SemanasRelativas: 20, EsObligatorio: true, EsControl: true},
				{Tipo: "CONSULTA", Descripcion: "Control Prenatal (Semana 24)", SemanasRelativas: 24, EsObligatorio: true, EsControl: true},
				{Tipo: "CONSULTA", Descripcion: "Control Prenatal (Semana 26)", SemanasRelativas: 26, EsObligatorio: true, EsControl: true},
				{Tipo: "ESTUDIO", Descripcion: "Ecografía Detalle Anatómico (18-23 Sem)", SemanasRelativas: 20, EsObligatorio: true, EsControl: false},
				{Tipo: "LABORATORIO", Descripcion: "Hemograma II", SemanasRelativas: 24, EsObligatorio: true, EsControl: false},
				{Tipo: "LABORATORIO", Descripcion: "PTOG (Glucosa 24-28 Sem)", SemanasRelativas: 24, EsObligatorio: true, EsControl: false},
				{Tipo: "LABORATORIO", Descripcion: "VIH (Prueba Rápida II)", SemanasRelativas: 24, EsObligatorio: true, EsControl: false},
				{Tipo: "LABORATORIO", Descripcion: "Sífilis (Prueba Treponémica II)", SemanasRelativas: 24, EsObligatorio: true, EsControl: false},
				{Tipo: "LABORATORIO", Descripcion: "Tamizaje CCU (Citología)", SemanasRelativas: 16, EsObligatorio: false, EsControl: false},
			},
		},
		{
			ID:          3,
			Nombre:      "FOMAG Trimestre 3",
			Descripcion: "Preparación para el parto y exámenes finales.",
			Trimestre:   "3er Trimestre",
			Plantillas: []models.PlantillaEvento{
				{Tipo: "CONSULTA", Descripcion: "Control Prenatal (Semana 28)", SemanasRelativas: 28, EsObligatorio: true, EsControl: true},
				{Tipo: "CONSULTA", Descripcion: "Control Prenatal (Semana 32)", SemanasRelativas: 32, EsObligatorio: true, EsControl: true},
				{Tipo: "CONSULTA", Descripcion: "Control Prenatal (Semana 36)", SemanasRelativas: 36, EsObligatorio: true, EsControl: true},
				{Tipo: "CONSULTA", Descripcion: "Control Prenatal (Semana 38)", SemanasRelativas: 38, EsObligatorio: true, EsControl: true},
				{Tipo: "CONSULTA", Descripcion: "Control Prenatal (Semana 40)", SemanasRelativas: 40, EsObligatorio: true, EsControl: true},
				{Tipo: "LABORATORIO", Descripcion: "Hemograma Semana 28", SemanasRelativas: 28, EsObligatorio: true, EsControl: false},
				{Tipo: "LABORATORIO", Descripcion: "VIH (Prueba Rápida III)", SemanasRelativas: 32, EsObligatorio: true, EsControl: false},
				{Tipo: "LABORATORIO", Descripcion: "Sífilis (Prueba Treponémica III)", SemanasRelativas: 32, EsObligatorio: true, EsControl: false},
				{Tipo: "LABORATORIO", Descripcion: "Estreptococo B (35-37 Sem)", SemanasRelativas: 36, EsObligatorio: true, EsControl: false},
				{Tipo: "ESTUDIO", Descripcion: "Ecografía Obstétrica Crecimiento", SemanasRelativas: 32, EsObligatorio: true, EsControl: false},
				{Tipo: "VACUNA", Descripcion: "Toxoide Tetánico / Tdap", SemanasRelativas: 28, EsObligatorio: true, EsControl: false},
				{Tipo: "CONSULTA", Descripcion: "Cursos Preparación Maternidad/Paternidad", SemanasRelativas: 28, EsObligatorio: false, EsControl: false},
			},
		},
	}

	for _, pData := range paquetes {
		var p models.PaqueteEventos
		trimestreVal := pData.Trimestre
		err := db.FirstOrCreate(&p, models.PaqueteEventos{ID: pData.ID, Nombre: pData.Nombre, Descripcion: &pData.Descripcion, Trimestre: &trimestreVal}).Error
		if err == nil {
			db.Where("paquete_id = ?", p.ID).Delete(&models.PlantillaEvento{})
			for _, pl := range pData.Plantillas {
				pl.PaqueteID = p.ID
				pl.Cantidad = 1
				pl.Trimestre = &pData.Trimestre
				db.Create(&pl)
			}
		}
	}
	fmt.Println("✅ Paquetes y plantillas creados en Go.")
}
