package pdfextractor

import (
	"testing"
)

func TestEvaluateRange(t *testing.T) {
	tests := []struct {
		val      float64
		min      float64
		max      float64
		expected string
	}{
		{12.5, 11.0, 14.0, "NORMAL"},
		{9.5, 11.0, 14.0, "ANORMAL"},
		{15.0, 11.0, 14.0, "ANORMAL"},
		{0.0, 11.0, 14.0, "INDETERMINADO"},
	}

	for _, tt := range tests {
		got := evaluateRange(tt.val, tt.min, tt.max)
		if got != tt.expected {
			t.Errorf("evaluateRange(%f, %f, %f) = %s; esperaba %s", tt.val, tt.min, tt.max, got, tt.expected)
		}
	}
}

func TestExtractFreeTextSections(t *testing.T) {
	sampleText := `HISTORIA CLÍNICA MATERNA
PACIENTE: María Rodríguez
CC: 1020304050
MOTIVO DE CONSULTA:
Paciente acude a control prenatal de rutina refiriendo movimientos fetales activos y sin sintomatología de alarma.

EVOLUCIÓN:
Gestante de 24 semanas con evolución satisfactoria, altura uterina acorde a edad gestacional.

DIAGNÓSTICO:
Embarazo de 24 semanas por FUR confiable. CPN adecuado.

PLAN DE MANEJO:
Continuar suplementación con hierro y ácido fólico. Solicitar ecografía de detalle anatómico.
`

	sections := extractFreeTextSections(sampleText)

	if sections.MotivoConsulta == "" {
		t.Errorf("No se extrajo la sección Motivo de Consulta")
	}
	if sections.EvolucionClinica == "" {
		t.Errorf("No se extrajo la sección Evolución Clínica")
	}
	if sections.Diagnostico == "" {
		t.Errorf("No se extrajo la sección Diagnóstico")
	}
	if sections.PlanTratamiento == "" {
		t.Errorf("No se extrajo la sección Plan de Manejo")
	}
}

func TestExtractParaclinicosFromText(t *testing.T) {
	sampleLabText := `
	RESULTADOS DE LABORATORIO
	Paciente: Carmen López CC: 52123456
	Hemoglobina: 12.4 g/dL
	Hematocrito: 37.5 %
	Plaquetas: 245000
	Glicemia: 84 mg/dL
	VDRL: No Reactivo
	VIH: No Reactivo
	Estreptococo: Negativo
	`

	var warnings []string
	labs := extractParaclinicos(sampleLabText, &warnings)

	if labs.Hemoglobina.ValorNumerico != 12.4 || labs.Hemoglobina.Estado != "NORMAL" {
		t.Errorf("Error extrayendo Hemoglobina: %+v", labs.Hemoglobina)
	}

	if labs.Plaquetas.ValorNumerico != 245000 || labs.Plaquetas.Estado != "NORMAL" {
		t.Errorf("Error extrayendo Plaquetas: %+v", labs.Plaquetas)
	}

	if labs.VDRLSifilis.Estado != "NORMAL" {
		t.Errorf("Error extrayendo VDRL: %+v", labs.VDRLSifilis)
	}
}
