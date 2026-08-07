package pdfextractor

import "time"

// LabResult represents a single structured paraclinical or laboratory measurement
type LabResult struct {
	Nombre           string  `json:"nombre,omitempty"`
	Valor            string  `json:"valor,omitempty"`
	ValorNumerico    float64 `json:"valorNumerico,omitempty"`
	Unidad           string  `json:"unidad,omitempty"`
	RangoReferencia  string  `json:"rangoReferencia,omitempty"`
	Estado           string  `json:"estado,omitempty"` // "NORMAL", "ANORMAL", "INDETERMINADO"
	ResultadoTexto   string  `json:"resultadoTexto,omitempty"`
	FechaRealizacion string  `json:"fechaRealizacion,omitempty"`
}

// PatientInfo holds demographic and prenatal admission data extracted from PDF
type PatientInfo struct {
	NombreCompleto     string  `json:"nombreCompleto,omitempty"`
	TipoIdentificacion string  `json:"tipoIdentificacion,omitempty"`
	NumeroIdentificacion string `json:"numeroIdentificacion,omitempty"`
	Edad               int     `json:"edad,omitempty"`
	SemanasGestacion   float64 `json:"semanasGestacion,omitempty"`
	FechaConsulta      string  `json:"fechaConsulta,omitempty"`
	EPS                string  `json:"eps,omitempty"`
	MedicoTratante     string  `json:"medicoTratante,omitempty"`
}

// ParaclinicosData contains structured maternal lab findings
type ParaclinicosData struct {
	Hemoglobina         LabResult `json:"hemoglobina"`
	Hematocrito         LabResult `json:"hematocrito"`
	Plaquetas           LabResult `json:"plaquetas"`
	GlicemiaEnAyunas    LabResult `json:"glicemiaEnAyunas"`
	PTOG75g             LabResult `json:"ptog75g"`
	GrupoSanguineo      string    `json:"grupoSanguineo,omitempty"`
	FactorRH            string    `json:"factorRh,omitempty"`
	VDRLSifilis         LabResult `json:"vdrlSifilis"`
	VIH                 LabResult `json:"vih"`
	HepatitisB          LabResult `json:"hepatitisB"`
	ToxoplasmaIgG       LabResult `json:"toxoplasmaIgG"`
	ToxoplasmaIgM       LabResult `json:"toxoplasmaIgM"`
	EstreptococoGrupoB  LabResult `json:"estreptococoGrupoB"`
	Urocultivo          LabResult `json:"urocultivo"`
	ParcialOrina        LabResult `json:"parcialOrina"`
	EcografiaObstetrica string    `json:"ecografiaObstetrica,omitempty"`
}

// FreeTextSections holds unstructured narrative blocks parsed from PDF
type FreeTextSections struct {
	MotivoConsulta     string `json:"motivoConsulta,omitempty"`
	EnfermedadActual   string `json:"enfermedadActual,omitempty"`
	EvolucionClinica   string `json:"evolucionClinica,omitempty"`
	ExamenFisico       string `json:"examenFisico,omitempty"`
	Diagnostico        string `json:"diagnostico,omitempty"`
	PlanTratamiento    string `json:"planTratamiento,omitempty"`
	Observaciones      string `json:"observaciones,omitempty"`
	Recomendaciones    string `json:"recomendaciones,omitempty"`
}

// MaternalPDFData is the root JSON structure returned to React frontend
type MaternalPDFData struct {
	Paciente       PatientInfo            `json:"paciente"`
	Paraclinicos   map[string]interface{} `json:"paraclinicos"`
	SeccionesTexto FreeTextSections       `json:"seccionesTexto"`
	Metadatos      ExtractionMetadata     `json:"metadatos"`
}

// ExtractionMetadata tracks processing metadata and error warnings
type ExtractionMetadata struct {
	NombreArchivo   string    `json:"nombreArchivo"`
	TamanioBytes    int64     `json:"tamanioBytes"`
	TotalPaginas    int       `json:"totalPaginas"`
	FechaExtraccion time.Time `json:"fechaExtraccion"`
	Advertencias    []string  `json:"advertencias,omitempty"`
	ProcesadoExito  bool      `json:"procesadoExito"`
}
