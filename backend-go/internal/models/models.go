package models

import (
	"time"
)

type User struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Nombre    string    `gorm:"not null" json:"nombre"`
	Email     string    `gorm:"unique;not null" json:"email"`
	Password  string    `gorm:"not null" json:"-"`
	Rol       string    `gorm:"default:'ENFERMERA'" json:"rol"`
	Activo    bool      `gorm:"default:true" json:"activo"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Gestante struct {
	ID                       uint                    `gorm:"primaryKey" json:"id"`
	Consecutivo              *string                 `json:"consecutivo"`
	Region                   *string                 `json:"region"`
	IpsAtencion              *string                 `json:"ipsAtencion"`
	CodigoHabilitacionIPS    *string                 `json:"codigoHabilitacionIPS"`
	Departamento             *string                 `json:"departamento"`
	Municipio                *string                 `json:"municipio"`
	Nombres                  string                  `gorm:"not null" json:"nombres"`
	Apellidos                string                  `gorm:"not null" json:"apellidos"`
	TipoIdentificacion       string                  `gorm:"not null" json:"tipoIdentificacion"`
	NumeroIdentificacion     string                  `gorm:"unique;not null" json:"numeroIdentificacion"`
	EstadoCivil              *string                 `json:"estadoCivil"`
	FechaNacimiento          time.Time               `gorm:"not null" json:"fechaNacimiento"`
	EdadActual               *string                 `json:"edadActual"`
	Escolaridad              *string                 `json:"escolaridad"`
	MunicipioResidencia      *string                 `json:"municipioResidencia"`
	Direccion                *string                 `json:"direccion"`
	Barrio                   *string                 `json:"barrio"`
	TelefonoCel1             *string                 `json:"telefonoCel1"`
	TelefonoCel2             *string                 `json:"telefonoCel2"`
	OcupacionOficio          *string                 `json:"ocupacionOficio"`
	EnfoqueDiferencial       *string                 `json:"enfoqueDiferencial"`
	Etnia                    *string                 `json:"etnia"`
	IdentidadGenero          *string                 `json:"identidadGenero"`
	Discapacidad             *string                 `json:"discapacidad"`
	VictimaViolencia         *string                 `json:"victimaViolencia"`
	CaracterizacionPoblacion *string                 `json:"caracterizacionPoblacion"`
	GestanteCuatroOMasCPN    *string                 `json:"gestanteCuatroOMasCPN"`
	AdherenciaCPN            *string                 `json:"adherenciaCPN"`
	CausaNoAdherenciaCPN     *string                 `json:"causaNoAdherenciaCPN"`
	TipoRiesgo               *string                 `json:"tipoRiesgo"`
	CarpetaEntregada         *string                 `gorm:"default:'NO'" json:"carpetaEntregada"`
	CreadaPorID              uint                    `json:"creadaPorId"`
	CreadaPor                *User                   `gorm:"foreignKey:CreadaPorID" json:"creadaPor,omitempty"`
	Antecedentes             *AntecedenteClinico     `gorm:"foreignKey:GestanteID" json:"antecedentes,omitempty"`
	IngresoCPN               *IngresoCPN             `gorm:"foreignKey:GestanteID" json:"ingresoCPN,omitempty"`
	Controles                []SeguimientoControl    `gorm:"foreignKey:GestanteID" json:"controles,omitempty"`
	Paraclinicos             *Paraclinico            `gorm:"foreignKey:GestanteID" json:"paraclinicos,omitempty"`
	EgresoYPosparto          *EgresoYPosparto        `gorm:"foreignKey:GestanteID" json:"egresoYPosparto,omitempty"`
	SeguimientosTelef        []SeguimientoTelefonico `gorm:"foreignKey:GestanteID" json:"seguimientosTelef,omitempty"`
	Eventos                  []EventoMedico          `gorm:"foreignKey:GestanteID" json:"eventos,omitempty"`
	CreatedAt                time.Time               `json:"createdAt"`
	UpdatedAt                time.Time               `json:"updatedAt"`
}

type AntecedenteClinico struct {
	ID                          uint    `gorm:"primaryKey" json:"id"`
	GestanteID                  uint    `gorm:"uniqueIndex" json:"gestanteId"`
	Gestaciones                 *string `json:"gestaciones"`
	PartosVaginales             *string `json:"partosVaginales"`
	Cesareas                    *string `json:"cesareas"`
	Vivos                       *string `json:"vivos"`
	Mortinato                   *string `json:"mortinato"`
	Obito                       *string `json:"obito"`
	Aborto                      *string `json:"aborto"`
	Malformacion                *string `json:"malformacion"`
	Ectopicos                   *string `json:"ectopicos"`
	OtrosEventosObstetricos     *string `json:"otrosEventosObstetricos"`
	Hipertension                *string `json:"hipertension"`
	DiabetesMellitus            *string `json:"diabetesMellitus"`
	LupusEritematoso            *string `json:"lupusEritematoso"`
	Preeclampsia                *string `json:"preeclampsia"`
	Eclampsia                   *string `json:"eclampsia"`
	DiabetesGestacional         *string `json:"diabetesGestacional"`
	OtrosAntecedentesPersonales *string `json:"otrosAntecedentesPersonales"`
	AntecedentesFamiliares      *string `json:"antecedentesFamiliares"`
}

type IngresoCPN struct {
	ID                             uint       `gorm:"primaryKey" json:"id"`
	GestanteID                     uint       `gorm:"uniqueIndex" json:"gestanteId"`
	AtencionPreconcepcionalPlan    *string    `json:"atencionPreconcepcionalPlan"`
	AsesoriaMetodoPrevio           *string    `json:"asesoriaMetodoPrevio"`
	AcidoFolicoPrevio              *string    `json:"acidoFolicoPrevio"`
	CitasPreconcepcionales         *string    `json:"citasPreconcepcionales"`
	FechaInscripcionCPN            *time.Time `json:"fechaInscripcionCPN"`
	EdadGestacionalInicio          *string    `json:"edadGestacionalInicio"`
	EmbarazoDeseado                *string    `json:"embarazoDeseado"`
	RedApoyo                       *string    `json:"redApoyo"`
	TamizajeViolencia              *string    `json:"tamizajeViolencia"`
	TamizajeDepresionHerrera       *string    `json:"tamizajeDepresionHerrera"`
	Fur                            *time.Time `json:"fur"`
	EdadGestacionalActual          *string    `json:"edadGestacionalActual"`
	EdadGestacionalEco             *string    `json:"edadGestacionalEco"`
	Fpp                            *time.Time `json:"fpp"`
	ClasificacionRiesgoActual      *string    `json:"clasificacionRiesgoActual"`
	DiagnosticoARO_Actualizado     *string    `json:"diagnosticoARO_Actualizado"`
	PesoPregestacional_kg          *string    `json:"pesoPregestacional_kg"`
	Talla_cm                       *string    `json:"talla_cm"`
	PesoActual_kg                  *string    `json:"pesoActual_kg"`
	Imc_Gestacional                *string    `json:"imc_Gestacional"`
	ClasificacionRiesgoNutricional *string    `json:"clasificacionRiesgoNutricional"`
	RiesgoPsicosocial              *string    `json:"riesgoPsicosocial"`
	AtributoRiesgoPsicosocial      *string    `json:"atributoRiesgoPsicosocial"`
	RiesgoHipertension             *string    `json:"riesgoHipertension"`
	RiesgoPreeclampsia             *string    `json:"riesgoPreeclampsia"`
	RiesgoTromboembolico           *string    `json:"riesgoTromboembolico"`
	PrescripcionASA                *string    `json:"prescripcionASA"`
}

type SeguimientoControl struct {
	ID                       uint       `gorm:"primaryKey" json:"id"`
	GestanteID               uint       `gorm:"uniqueIndex:idx_gestante_control" json:"gestanteId"`
	NumeroControl            *int       `gorm:"uniqueIndex:idx_gestante_control" json:"numeroControl"`
	FechaCPN                 *time.Time `json:"fechaCPN"`
	Especialidad             *string    `json:"especialidad"`
	EdadGestacional          *string    `json:"edadGestacional"`
	TensionArterial          *string    `json:"tensionArterial"`
	RiesgoObstetrico         *string    `json:"riesgoObstetrico"`
	DiagnosticoARO           *string    `json:"diagnosticoARO"`
	Talla_cm                 *string    `json:"talla_cm"`
	Peso_kg                  *string    `json:"peso_kg"`
	Imc                      *string    `json:"imc"`
	ClasificacionNutricional *string    `json:"clasificacionNutricional"`
	MicronutrientesEntrega   *string    `json:"micronutrientesEntrega"`
	Hierro                   *string    `json:"hierro"`
	AcidoFolico              *string    `json:"acidoFolico"`
	Calcio                   *string    `json:"calcio"`
	ToxoplasmaIgMControl     *string    `json:"toxoplasmaIgMControl"`
	FechaEducacionEnfermeria *time.Time `json:"fechaEducacionEnfermeria"`
	RiesgoTromboembolicoSem28 *string    `json:"riesgoTromboembolicoSem28"`
	RiesgoPsicosocialTrim3   *string    `json:"riesgoPsicosocialTrim3"`
}

type Paraclinico struct {
	ID                          uint       `gorm:"primaryKey" json:"id"`
	GestanteID                  uint       `gorm:"uniqueIndex" json:"gestanteId"`
	Hemoclasificacion           *string    `json:"hemoclasificacion"`
	Hemograma_HB                *string    `json:"hemograma_HB"`
	Hemograma_HCTO              *string    `json:"hemograma_HCTO"`
	Hemograma_Plaquetas         *string    `json:"hemograma_Plaquetas"`
	Glicemia                    *string    `json:"glicemia"`
	Igg_Rubeola                 *string    `json:"igg_Rubeola"`
	Igg_Toxoplasma              *string    `json:"igg_Toxoplasma"`
	Igm_Toxoplasma              *string    `json:"igm_Toxoplasma"`
	AvidezToxoplasma            *string    `json:"avidezToxoplasma"`
	Iga_Toxoplasma              *string    `json:"iga_Toxoplasma"`
	Urocultivo                  *string    `json:"urocultivo"`
	Hemoparasitos               *string    `json:"hemoparasitos"`
	Chagas_Resultado            *string    `json:"chagas_Resultado"`
	Ecografia1Trimestre         *time.Time `json:"ecografia1Trimestre"`
	Eco1_Interpretacion         *string    `json:"eco1_Interpretacion"`
	Vih_Resultado               *string    `json:"vih_Resultado"`
	Vih_Fecha                   *time.Time `json:"vih_Fecha"`
	Hbsag_Resultado             *string    `json:"hbsag_Resultado"`
	Hbsag_Fecha                 *time.Time `json:"hbsag_Fecha"`
	Ptog_75gr                   *string    `json:"ptog_75gr"`
	Sifilis_Resultado           *string    `json:"sifilis_Resultado"`
	Sifilis_Fecha               *time.Time `json:"sifilis_Fecha"`
	EcografiaDetalle            *time.Time `json:"ecografiaDetalle"`
	EcoDetalle_Interpretacion   *string    `json:"ecoDetalle_Interpretacion"`
	CitologiaCCU                *string    `json:"citologiaCCU"`
	Sifilis_Diagnostico         *string    `json:"sifilis_Diagnostico"`
	Sifilis_EgInicioTratamiento *string    `json:"sifilis_EgInicioTratamiento"`
	Sifilis_Tratamiento         *string    `json:"sifilis_Tratamiento"`
	Sifilis_TratamientoOportuno *string    `json:"sifilis_TratamientoOportuno"`
	Sifilis_ContactosTratados   *string    `json:"sifilis_ContactosTratados"`
	Hemoparasitos2Trimestre     *string    `json:"hemoparasitos2Trimestre"`
	Hemograma3_HB               *string    `json:"hemograma3_HB"`
	Hemograma3_HCTO             *string    `json:"hemograma3_HCTO"`
	Hemograma3_Plaquetas        *string    `json:"hemograma3_Plaquetas"`
	Hemoparasitos3Trimestre     *string    `json:"hemoparasitos3Trimestre"`
	Vih3_Resultado              *string    `json:"vih3_Resultado"`
	Vih3_Fecha                  *time.Time `json:"vih3_Fecha"`
	Sifilis3_Resultado          *string    `json:"sifilis3_Resultado"`
	Sifilis3_Fecha              *time.Time `json:"sifilis3_Fecha"`
	EstreptococoB               *string    `json:"estreptococoB"`
}

type EgresoYPosparto struct {
	ID                                uint       `gorm:"primaryKey" json:"id"`
	GestanteID                        uint       `gorm:"uniqueIndex" json:"gestanteId"`
	FechaToxoideTetanico              *time.Time `json:"fechaToxoideTetanico"`
	FechaTdap                         *time.Time `json:"fechaTdap"`
	FechaInfluenza                    *time.Time `json:"fechaInfluenza"`
	FechaCovid1                       *time.Time `json:"fechaCovid1"`
	FechaCovid2                       *time.Time `json:"fechaCovid2"`
	FechaValoracionPediatria          *time.Time `json:"fechaValoracionPediatria"`
	AsesoriaIVE                       *string    `json:"asesoriaIVE"`
	FechaAsesoriaAnticoncepcion       *time.Time `json:"fechaAsesoriaAnticoncepcion"`
	FechaEntregaPreservativos         *time.Time `json:"fechaEntregaPreservativos"`
	FechaConsejeríaLactanciaPrenatal  *time.Time `json:"fechaConsejeríaLactanciaPrenatal"`
	CursosMaternidad_F1               *time.Time `json:"cursosMaternidad_F1"`
	CursosMaternidad_F2               *time.Time `json:"cursosMaternidad_F2"`
	CursosMaternidad_F3               *time.Time `json:"cursosMaternidad_F3"`
	CursosMaternidad_F4               *time.Time `json:"cursosMaternidad_F4"`
	CursosMaternidad_F5               *time.Time `json:"cursosMaternidad_F5"`
	CursosMaternidad_F6               *time.Time `json:"cursosMaternidad_F6"`
	CursosMaternidad_F7               *time.Time `json:"cursosMaternidad_F7"`
	Nutricion_Ctrl1                   *time.Time `json:"nutricion_Ctrl1"`
	Nutricion_Ctrl2                   *time.Time `json:"nutricion_Ctrl2"`
	Nutricion_Ctrl3                   *time.Time `json:"nutricion_Ctrl3"`
	Odontologia_Ctrl1                 *time.Time `json:"odontologia_Ctrl1"`
	Odontologia_Ctrl2                 *time.Time `json:"odontologia_Ctrl2"`
	Psicologia_Ctrl1                  *time.Time `json:"psicologia_Ctrl1"`
	Psicologia_Ctrl2                  *time.Time `json:"psicologia_Ctrl2"`
	Psicologia_Ctrl3                  *time.Time `json:"psicologia_Ctrl3"`
	TrabajoSocial_Ctrl1               *time.Time `json:"trabajoSocial_Ctrl1"`
	TrabajoSocial_Ctrl2               *time.Time `json:"trabajoSocial_Ctrl2"`
	MorbilidadMaternaExtrema          *string    `json:"morbilidadMaternaExtrema"`
	Cie10MME                          *string    `json:"cie10MME"`
	InfeccionZika                     *string    `json:"infeccionZika"`
	InstitucionParto                  *string    `json:"institucionParto"`
	EventoObstetrico                  *string    `json:"eventoObstetrico"`
	FechaParto                        *time.Time `json:"fechaParto"`
	FechaEvento                       *time.Time `json:"fechaEvento"`
	PartoHumanizado                   *string    `json:"partoHumanizado"`
	ConsejeríaPostpartoLactancia      *string    `json:"consejeríaPostpartoLactancia"`
	EdadGestacionalParto              *string    `json:"edadGestacionalParto"`
	EstadoRecienNacido                *string    `json:"estadoRecienNacido"`
	PesoRN_gr                         *string    `json:"pesoRN_gr"`
	TallaRN_cm                        *string    `json:"tallaRN_cm"`
	SexoRN                            *string    `json:"sexoRN"`
	ResultadoTSH_RN                   *string    `json:"resultadoTSH_RN"`
	TamizajeAuditivoRN                *string    `json:"tamizajeAuditivoRN"`
	FechaAltaRN                       *time.Time `json:"fechaAltaRN"`
	FechaConsultaRN_5dias             *time.Time `json:"fechaConsultaRN_5dias"`
	FechaAltaPuerpera                 *time.Time `json:"fechaAltaPuerpera"`
	FechaConsultaPuerpera_5dias       *time.Time `json:"fechaConsultaPuerpera_5dias"`
	ProvisionAnticonceptivoAlta       *string    `json:"provisionAnticonceptivoAlta"`
	MetodoAnticonceptivoElegido       *string    `json:"metodoAnticonceptivoElegido"`
	EntregaMedicamentosEgreso         *string    `json:"entregaMedicamentosEgreso"`
	MotivoCierreCaso                  *string    `json:"motivoCierreCaso"`
}

type SeguimientoTelefonico struct {
	ID                uint       `gorm:"primaryKey" json:"id"`
	GestanteID        uint       `gorm:"uniqueIndex:idx_gestante_seguim" json:"gestanteId"`
	NumeroSeguimiento *int       `gorm:"uniqueIndex:idx_gestante_seguim" json:"numeroSeguimiento"`
	Fecha             *time.Time `json:"fecha"`
	Observacion       *string    `json:"observacion"`
}

type EventoMedico struct {
	ID                uint             `gorm:"primaryKey" json:"id"`
	Tipo              string           `gorm:"not null" json:"tipo"`
	Descripcion       string           `gorm:"not null" json:"descripcion"`
	FechaProgramada   time.Time        `gorm:"not null" json:"fechaProgramada"`
	FechaRealizada    *time.Time       `json:"fechaRealizada"`
	Estado            string           `gorm:"default:'PENDIENTE'" json:"estado"`
	EsObligatorio     bool             `gorm:"default:false" json:"esObligatorio"`
	EsControl         bool             `gorm:"default:false" json:"esControl"`
	EstaAgendado      bool             `gorm:"default:false" json:"estaAgendado"`
	FechaAgendamiento *time.Time       `json:"fechaAgendamiento"`
	Resultado         *string          `json:"resultado"`
	CodigoCUPS        *string          `json:"codigoCUPS"`
	Notas             *string          `json:"notas"`
	Cantidad          *int             `gorm:"default:1" json:"cantidad"`
	Trimestre         *string          `json:"trimestre"`
	PaqueteID         *uint            `json:"paqueteId"`
	PlantillaID       *uint            `json:"plantillaId"`
	Plantilla         *PlantillaEvento `gorm:"foreignKey:PlantillaID" json:"plantilla,omitempty"`
	GestanteID        uint             `gorm:"not null" json:"gestanteId"`
	Gestante          *Gestante        `gorm:"foreignKey:GestanteID" json:"gestante,omitempty"`
	Prestadores       []Prestador      `gorm:"many2many:evento_prestadores;" json:"prestadores,omitempty"`
	CreatedAt         time.Time        `json:"createdAt"`
	UpdatedAt         time.Time        `json:"updatedAt"`
}

type PaqueteEventos struct {
	ID          uint              `gorm:"primaryKey" json:"id"`
	Nombre      string            `gorm:"not null" json:"nombre"`
	Descripcion *string           `json:"descripcion"`
	Trimestre   *string           `json:"trimestre"`
	Plantillas  []PlantillaEvento `gorm:"foreignKey:PaqueteID" json:"plantillas,omitempty"`
	CreatedAt   time.Time         `json:"createdAt"`
	UpdatedAt   time.Time         `json:"updatedAt"`
}

type PlantillaEvento struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	Tipo             string    `gorm:"not null" json:"tipo"`
	Descripcion      string    `gorm:"not null" json:"descripcion"`
	SemanasRelativas int       `gorm:"default:0" json:"semanasRelativas"`
	EsObligatorio    bool      `gorm:"default:false" json:"esObligatorio"`
	EsControl        bool      `gorm:"default:false" json:"esControl"`
	CodigoCUPS       *string   `json:"codigoCUPS"`
	Cantidad         int       `gorm:"default:1" json:"cantidad"`
	Trimestre        *string   `json:"trimestre"`
	PaqueteID        uint      `gorm:"not null" json:"paqueteId"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type Prestador struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Nombre    string         `gorm:"unique;not null" json:"nombre"`
	Nit       *string        `json:"nit"`
	Eventos   []EventoMedico `gorm:"many2many:evento_prestadores;" json:"eventos,omitempty"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
}

type ThemeConfig struct {
	ID             uint    `gorm:"primaryKey" json:"id"`
	PrimaryColor   string  `gorm:"default:'#E91E8C'" json:"primaryColor"`
	SecondaryColor string  `gorm:"default:'#3B82F6'" json:"secondaryColor"`
	AccentColor    string  `gorm:"default:'#F472B6'" json:"accentColor"`
	DarkMode       bool    `gorm:"default:false" json:"darkMode"`
	ClinicName     string  `gorm:"default:'Clínica Maternas'" json:"clinicName"`
	LogoURL        *string `json:"logoUrl"`
}

// ─── Sistema de Anuncios Clínica ───────────────────────────────────────────

type Anuncio struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Titulo       string    `gorm:"not null" json:"titulo"`
	Contenido    string    `gorm:"type:text;not null" json:"contenido"`
	Tipo         string    `gorm:"default:'INFO'" json:"tipo"` // INFO | EVENTO | TALLER | URGENTE | OFERTA
	ImagenURL    *string   `json:"imagenURL"`
	FechaEvento  *time.Time `json:"fechaEvento"`
	LugarEvento  *string   `json:"lugarEvento"`
	Activo       bool      `gorm:"default:true" json:"activo"`
	Destacado    bool      `gorm:"default:false" json:"destacado"`
	PermiteRSVP  bool      `gorm:"default:false" json:"permiteRSVP"`
	CupoMaximo   *int      `json:"cupoMaximo"`
	CreadoPorID  uint      `json:"creadoPorId"`
	CreadoPor    User      `gorm:"foreignKey:CreadoPorID" json:"creadoPor"`
	Participaciones []AnuncioParticipacion `gorm:"foreignKey:AnuncioID" json:"participaciones,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type AnuncioParticipacion struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	AnuncioID   uint      `gorm:"not null" json:"anuncioId"`
	GestanteID  uint      `gorm:"not null" json:"gestanteId"`
	Gestante    Gestante  `gorm:"foreignKey:GestanteID" json:"gestante,omitempty"`
	Estado      string    `gorm:"default:'CONFIRMADO'" json:"estado"` // CONFIRMADO | CANCELADO
	Comentario  *string   `json:"comentario"`
	CreatedAt   time.Time `json:"createdAt"`
}

// ─── Configuración de Parámetros Extractor PDF (Administrable) ───────────────────

type PDFExtractorConfig struct {
	ID                 uint      `gorm:"primaryKey" json:"id"`
	HemoglobinaMin     float64   `gorm:"default:11.0" json:"hemoglobinaMin"`
	HemoglobinaMax     float64   `gorm:"default:14.0" json:"hemoglobinaMax"`
	HematocritoMin     float64   `gorm:"default:33.0" json:"hematocritoMin"`
	HematocritoMax     float64   `gorm:"default:44.0" json:"hematocritoMax"`
	PlaquetasMin       float64   `gorm:"default:150000.0" json:"plaquetasMin"`
	PlaquetasMax       float64   `gorm:"default:450000.0" json:"plaquetasMax"`
	GlicemiaMin        float64   `gorm:"default:70.0" json:"glicemiaMin"`
	GlicemiaMax        float64   `gorm:"default:92.0" json:"glicemiaMax"`
	PtogMax            float64   `gorm:"default:140.0" json:"ptogMax"`
	
	// Parámetros Serología y Pruebas Especiales
	ToxoplasmaIgMLimiteNegativo float64 `gorm:"default:0.80" json:"toxoplasmaIgMLimiteNegativo"`
	ToxoplasmaIgMLimitePositivo float64 `gorm:"default:1.00" json:"toxoplasmaIgMLimitePositivo"`
	ToxoplasmaIgGLimiteNegativo float64 `gorm:"default:1.00" json:"toxoplasmaIgGLimiteNegativo"`
	ToxoplasmaIgGLimitePositivo float64 `gorm:"default:3.00" json:"toxoplasmaIgGLimitePositivo"`
	
	// Palabras clave y Alias de Búsqueda para Exámenes
	AliasToxoplasmaIgM string    `gorm:"default:'TOXOPLASMA IGM,TOXO IGM,TOXOPLASMOSIS IGM'" json:"aliasToxoplasmaIgM"`
	AliasToxoplasmaIgG string    `gorm:"default:'TOXOPLASMA IGG,TOXO IGG,TOXOPLASMOSIS IGG'" json:"aliasToxoplasmaIgG"`
	AliasHepatitisB    string    `gorm:"default:'HEPATITIS B,HBSAG,ANTIGENO DE SUPERFICIE'" json:"aliasHepatitisB"`
	AliasVDRL          string    `gorm:"default:'VDRL,SIFILIS,SEROLOGIA'" json:"aliasVDRL"`
	AliasVIH           string    `gorm:"default:'VIH,HIV,VIH 1/2'" json:"aliasVIH"`

	SeccionEvolucion   string    `gorm:"default:'EVOLUCIÓN,EVOLUCION CLINICA,NOTAS DE EVOLUCION'" json:"seccionEvolucion"`
	SeccionDiagnostico string    `gorm:"default:'DIAGNÓSTICO,DIAGNOSTICO,IMPRESIÓN DIAGNÓSTICA'" json:"seccionDiagnostico"`
	SeccionPlan        string    `gorm:"default:'PLAN DE MANEJO,PLAN DE TRATAMIENTO,CONDUCTA'" json:"seccionPlan"`
	SeccionMotivo      string    `gorm:"default:'MOTIVO DE CONSULTA,MOTIVO CONSULTA'" json:"seccionMotivo"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

// ─── Parámetro Dinámico de Laboratorio Individual ──────────────────────────────

type LabParam struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	Nombre          string    `gorm:"not null" json:"nombre"`              // Ej: "Rubéola IgG"
	CodigoCampo     string    `gorm:"not null;unique" json:"codigoCampo"` // Ej: "rubeolaIgG"
	TipoEval        string    `gorm:"default:'CUALITATIVO'" json:"tipoEval"` // NUMERICO | CUALITATIVO | INDICE
	Unidad          string    `json:"unidad"`                              // Ej: "g/dL", "mg/dL", "Index", "UI/mL"
	MinVal          float64   `json:"minVal"`                              // Min o Límite Negativo
	MaxVal          float64   `json:"maxVal"`                              // Max o Límite Positivo
	TerminosNormal  string    `json:"terminosNormal"`                      // Ej: "No Reactivo, Negativo, Normal"
	TerminosAnormal string    `json:"terminosAnormal"`                     // Ej: "Reactivo, Positivo, Anormal"
	Aliases         string    `json:"aliases"`                             // Ej: "RUBEOLA, RUBEOLA IGG, RUB"
	Activo          bool      `gorm:"default:true" json:"activo"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

