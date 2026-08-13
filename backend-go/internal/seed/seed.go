package seed

import (
	"fmt"

	"backend-go/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func SeedDatabase(db *gorm.DB) {
	db = db.Session(&gorm.Session{NewDB: true})
	fmt.Println("🌱 Iniciando seed en Go...")

	// 0. Super Root User
	var superCount int64
	db.Model(&models.User{}).Where("email = ?", "superroot@maternas.com").Count(&superCount)
	if superCount == 0 {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("SuperRoot1234"), 12)
		if err == nil {
			superRoot := models.User{
				Nombre:   "Super Root Administrator",
				Email:    "superroot@maternas.com",
				Password: string(hashedPassword),
				Rol:      "SUPERADMIN",
				Activo:   true,
			}
			if err := db.Create(&superRoot).Error; err != nil {
				fmt.Printf("⚠️ Error creando Super Root: %v\n", err)
			} else {
				fmt.Printf("✅ Super Root creado: %s / SuperRoot1234\n", superRoot.Email)
			}
		} else {
			fmt.Printf("⚠️ Error hashing password: %v\n", err)
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

	// 5. Parámetros iniciales de laboratorios
	seedLabParams(db)

	fmt.Println("🎉 Seed completado exitosamente!")
}

func seedLabParams(db *gorm.DB) {
	var count int64
	db.Model(&models.LabParam{}).Count(&count)
	if count == 0 {
		fmt.Println("🔬 Creando parámetros iniciales de laboratorios...")
		defaultLabs := []models.LabParam{
			{Nombre: "Hemoglobina", CodigoCampo: "hemoglobina", TipoEval: "NUMERICO", Unidad: "g/dL", MinVal: 11.0, MaxVal: 14.0, Aliases: "HEMOGLOBINA, HB", Activo: true},
			{Nombre: "Hematocrito", CodigoCampo: "hematocrito", TipoEval: "NUMERICO", Unidad: "%", MinVal: 33.0, MaxVal: 44.0, Aliases: "HEMATOCRITO, HTO", Activo: true},
			{Nombre: "Plaquetas", CodigoCampo: "plaquetas", TipoEval: "NUMERICO", Unidad: "/mm3", MinVal: 150000.0, MaxVal: 450000.0, Aliases: "PLAQUETAS, RECUENTO DE PLAQUETAS", Activo: true},
			{Nombre: "Glicemia en Ayunas", CodigoCampo: "glicemiaEnAyunas", TipoEval: "NUMERICO", Unidad: "mg/dL", MinVal: 70.0, MaxVal: 92.0, Aliases: "GLICEMIA, GLUCOSA EN AYUNAS", Activo: true},
			{Nombre: "PTOG 75g", CodigoCampo: "ptog75g", TipoEval: "NUMERICO", Unidad: "mg/dL", MinVal: 0.0, MaxVal: 140.0, Aliases: "PTOG, TOLERANCIA A LA GLUCOSA", Activo: true},
			{Nombre: "VDRL / Sífilis", CodigoCampo: "vdrlSifilis", TipoEval: "CUALITATIVO", TerminosNormal: "No Reactiva, No Reactivo, Negativo, Negativa", TerminosAnormal: "Reactiva, Reactivo, Positivo, Positiva", Aliases: "SEROLOGIA VDRL, VDRL, SIFILIS", Activo: true},
			{Nombre: "VIH 1/2", CodigoCampo: "vih", TipoEval: "CUALITATIVO", TerminosNormal: "Negativo, Negativa, No Reactivo, No Reactiva", TerminosAnormal: "Positivo, Positiva, Reactivo, Reactiva", Aliases: "HIV 1/2 ANTICUERPOS, HIV 1/2, VIH 1/2, VIH, HIV", Activo: true},
			{Nombre: "Hepatitis B (HBsAg)", CodigoCampo: "hepatitisB", TipoEval: "CUALITATIVO", TerminosNormal: "No Reactivo, No Reactiva, Negativo, Negativa", TerminosAnormal: "Reactivo, Reactiva, Positivo, Positiva", Aliases: "HEPATITIS B, HBSAG, ANTIGENO DE SUPERFICIE", Activo: true},
			{Nombre: "Toxoplasma IgM", CodigoCampo: "toxoplasmaIgM", TipoEval: "INDICE", Unidad: "Index", MinVal: 0.80, MaxVal: 1.00, TerminosNormal: "Negativo, No Reactivo", TerminosAnormal: "Positivo, Reactivo", Aliases: "TOXOPLASMA IGM, TOXO IGM, TOXOPLASMOSIS IGM", Activo: true},
			{Nombre: "Toxoplasma IgG", CodigoCampo: "toxoplasmaIgG", TipoEval: "INDICE", Unidad: "UI/mL", MinVal: 1.00, MaxVal: 3.00, TerminosNormal: "Negativo, No Reactivo", TerminosAnormal: "Positivo, Reactivo", Aliases: "TOXOPLASMA IGG, TOXO IGG, TOXOPLASMOSIS IGG", Activo: true},
			{Nombre: "Estreptococo Grupo B", CodigoCampo: "estreptococoGrupoB", TipoEval: "CUALITATIVO", TerminosNormal: "Negativo, No Se Aisla", TerminosAnormal: "Positivo, Aislado", Aliases: "ESTREPTOCOCO, STGB, STREPTOCOCCUS AGALACTIAE", Activo: true},
			{Nombre: "Urocultivo", CodigoCampo: "urocultivo", TipoEval: "CUALITATIVO", TerminosNormal: "Negativo, Sin Germen", TerminosAnormal: "Positivo, Aislamiento", Aliases: "UROCULTIVO", Activo: true},
		}

		for _, lab := range defaultLabs {
			db.Create(&lab)
		}
		fmt.Println("✅ Parámetros iniciales de laboratorios sembrados.")
	}
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
