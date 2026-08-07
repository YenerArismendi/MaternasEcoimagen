package pdfextractor

import "bytes"

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"backend-go/internal/models"

	"github.com/ledongthuc/pdf"
)

// ExtractTextFromPDF opens a PDF file and extracts clean text page by page.
func ExtractTextFromPDF(filePath string) (string, int, error) {
	f, r, err := pdf.Open(filePath)
	if err != nil {
		return "", 0, fmt.Errorf("error al abrir archivo PDF: %w", err)
	}
	defer f.Close()

	totalPages := r.NumPage()
	if totalPages == 0 {
		return "", 0, fmt.Errorf("el PDF no contiene páginas legibles o está vacío")
	}

	var buf bytes.Buffer
	for pageIndex := 1; pageIndex <= totalPages; pageIndex++ {
		p := r.Page(pageIndex)
		if p.V.IsNull() {
			continue
		}
		text, err := p.GetPlainText(nil)
		if err != nil {
			// Continua extrayendo otras páginas si una falla
			continue
		}
		buf.WriteString(text)
		buf.WriteString("\n")
	}

	rawText := buf.String()
	if strings.TrimSpace(rawText) == "" {
		return "", totalPages, fmt.Errorf("no se pudo extraer texto digital del PDF (posiblemente sea una imagen escaneada)")
	}

	return rawText, totalPages, nil
}

// ParseMaternalPDF processes a maternal clinical record / lab result PDF with default parameters.
func ParseMaternalPDF(filePath string, filename string, fileSize int64) (*MaternalPDFData, error) {
	return ParseMaternalPDFWithConfig(filePath, filename, fileSize, models.PDFExtractorConfig{
		HemoglobinaMin: 11.0, HemoglobinaMax: 14.0,
		HematocritoMin: 33.0, HematocritoMax: 44.0,
		PlaquetasMin: 150000.0, PlaquetasMax: 450000.0,
		GlicemiaMin: 70.0, GlicemiaMax: 92.0, PtogMax: 140.0,
	})
}

// ParseMaternalPDFWithConfig processes a maternal PDF with custom admin configured ranges and keywords.
func ParseMaternalPDFWithConfig(filePath string, filename string, fileSize int64, cfg models.PDFExtractorConfig) (*MaternalPDFData, error) {
	return ParseMaternalPDFWithConfigAndLabs(filePath, filename, fileSize, cfg, nil)
}

// ParseMaternalPDFWithConfigAndLabs processes PDF using standard config and dynamic 1-by-1 lab parameters
func ParseMaternalPDFWithConfigAndLabs(filePath string, filename string, fileSize int64, cfg models.PDFExtractorConfig, customLabs []models.LabParam) (*MaternalPDFData, error) {
	rawText, pages, err := ExtractTextFromPDF(filePath)
	if err != nil {
		return &MaternalPDFData{
			Metadatos: ExtractionMetadata{
				NombreArchivo:   filename,
				TamanioBytes:    fileSize,
				TotalPaginas:    pages,
				FechaExtraccion: time.Now(),
				Advertencias:    []string{err.Error()},
				ProcesadoExito:  false,
			},
		}, err
	}

	warnings := []string{}
	normalizedText := normalizeText(rawText)

	// 1. Extraer Datos Demográficos del Paciente
	paciente := extractPatientInfo(normalizedText, &warnings)

	// 2. Extraer Paraclínicos (Estándar + Personalizados 1 a 1)
	paraclinicosMap := extractAllParaclinicos(normalizedText, &warnings, cfg, customLabs)

	// 3. Extraer Secciones de Texto Libre
	seccionesTexto := extractFreeTextSectionsWithConfig(rawText, cfg)

	result := &MaternalPDFData{
		Paciente:       paciente,
		Paraclinicos:   paraclinicosMap,
		SeccionesTexto: seccionesTexto,
		Metadatos: ExtractionMetadata{
			NombreArchivo:   filename,
			TamanioBytes:    fileSize,
			TotalPaginas:    pages,
			FechaExtraccion: time.Now(),
			Advertencias:    warnings,
			ProcesadoExito:  true,
		},
	}

	return result, nil
}

func extractAllParaclinicos(text string, warnings *[]string, cfg models.PDFExtractorConfig, customLabs []models.LabParam) map[string]interface{} {
	p := extractParaclinicosWithConfig(text, warnings, cfg)
	resMap := make(map[string]interface{})

	if p.Hemoglobina.ResultadoTexto != "" || p.Hemoglobina.ValorNumerico > 0 { resMap["hemoglobina"] = p.Hemoglobina }
	if p.Hematocrito.ResultadoTexto != "" || p.Hematocrito.ValorNumerico > 0 { resMap["hematocrito"] = p.Hematocrito }
	if p.Plaquetas.ResultadoTexto != "" || p.Plaquetas.ValorNumerico > 0 { resMap["plaquetas"] = p.Plaquetas }
	if p.GlicemiaEnAyunas.ResultadoTexto != "" || p.GlicemiaEnAyunas.ValorNumerico > 0 { resMap["glicemiaEnAyunas"] = p.GlicemiaEnAyunas }
	if p.PTOG75g.ResultadoTexto != "" || p.PTOG75g.ValorNumerico > 0 { resMap["ptog75g"] = p.PTOG75g }
	if p.GrupoSanguineo != "" { resMap["grupoSanguineo"] = p.GrupoSanguineo }
	if p.FactorRH != "" { resMap["factorRh"] = p.FactorRH }
	if p.VDRLSifilis.ResultadoTexto != "" { resMap["vdrlSifilis"] = p.VDRLSifilis }
	if p.VIH.ResultadoTexto != "" { resMap["vih"] = p.VIH }
	if p.HepatitisB.ResultadoTexto != "" { resMap["hepatitisB"] = p.HepatitisB }
	if p.ToxoplasmaIgM.ResultadoTexto != "" || p.ToxoplasmaIgM.ValorNumerico > 0 { resMap["toxoplasmaIgM"] = p.ToxoplasmaIgM }
	if p.ToxoplasmaIgG.ResultadoTexto != "" || p.ToxoplasmaIgG.ValorNumerico > 0 { resMap["toxoplasmaIgG"] = p.ToxoplasmaIgG }
	if p.EstreptococoGrupoB.ResultadoTexto != "" { resMap["estreptococoGrupoB"] = p.EstreptococoGrupoB }
	if p.Urocultivo.ResultadoTexto != "" { resMap["urocultivo"] = p.Urocultivo }

	// Evaluate custom labs added 1-by-1
	for _, lab := range customLabs {
		if !lab.Activo {
			continue
		}
		if _, exists := resMap[lab.CodigoCampo]; exists {
			continue
		}

		aliasList := strings.Split(lab.Aliases, ",")
		escaped := make([]string, 0, len(aliasList)+1)
		if lab.Nombre != "" {
			escaped = append(escaped, regexp.QuoteMeta(strings.TrimSpace(lab.Nombre)))
		}
		for _, a := range aliasList {
			if trimmed := strings.TrimSpace(a); trimmed != "" {
				escaped = append(escaped, regexp.QuoteMeta(trimmed))
			}
		}

		if len(escaped) == 0 {
			continue
		}

		pattern := fmt.Sprintf(`(?i)(?:%s)[\:\s]+([^\n]+)`, strings.Join(escaped, "|"))
		re := regexp.MustCompile(pattern)

		if m := re.FindStringSubmatch(text); len(m) > 1 {
			lineVal := strings.TrimSpace(m[1])
			labRes := evaluateCustomLabItem(lineVal, lab)
			resMap[lab.CodigoCampo] = labRes
		}
	}

	return resMap
}

func evaluateCustomLabItem(captured string, lab models.LabParam) LabResult {
	res := LabResult{
		Nombre: lab.Nombre,
		Unidad: lab.Unidad,
	}

	switch lab.TipoEval {
	case "NUMERICO":
		reNum := regexp.MustCompile(`(\d+(?:[\.,]\d+)?)`)
		if m := reNum.FindStringSubmatch(captured); len(m) > 1 {
			valStr := strings.ReplaceAll(m[1], ",", ".")
			if val, err := strconv.ParseFloat(valStr, 64); err == nil {
				res.ValorNumerico = val
				res.ResultadoTexto = fmt.Sprintf("%.2f %s", val, lab.Unidad)
				res.Valor = fmt.Sprintf("%.2f", val)
				res.Estado = evaluateRange(val, lab.MinVal, lab.MaxVal)
				res.RangoReferencia = fmt.Sprintf("%.1f - %.1f %s", lab.MinVal, lab.MaxVal, lab.Unidad)
			} else {
				res.ResultadoTexto = captured
				res.Estado = "INDETERMINADO"
			}
		} else {
			res.ResultadoTexto = captured
			res.Estado = "INDETERMINADO"
		}

	case "INDICE":
		reNum := regexp.MustCompile(`(\d+(?:[\.,]\d+)?)`)
		if m := reNum.FindStringSubmatch(captured); len(m) > 1 {
			valStr := strings.ReplaceAll(m[1], ",", ".")
			if val, err := strconv.ParseFloat(valStr, 64); err == nil {
				res.ValorNumerico = val
				res.ResultadoTexto = fmt.Sprintf("%.2f %s", val, lab.Unidad)
				res.Valor = fmt.Sprintf("%.2f", val)
				if val < lab.MinVal {
					res.Estado = "NORMAL"
				} else if val >= lab.MinVal && val <= lab.MaxVal {
					res.Estado = "INDETERMINADO"
				} else {
					res.Estado = "ANORMAL"
				}
				res.RangoReferencia = fmt.Sprintf("Neg: <%.2f | Dud: %.2f-%.2f | Pos: >%.2f", lab.MinVal, lab.MinVal, lab.MaxVal, lab.MaxVal)
			} else {
				res.ResultadoTexto = captured
				res.Estado = mapStatusCategorical(captured, strings.Split(lab.TerminosNormal, ",")...)
			}
		} else {
			res.ResultadoTexto = captured
			res.Estado = mapStatusCategorical(captured, strings.Split(lab.TerminosNormal, ",")...)
		}

	default: // "CUALITATIVO"
		res.ResultadoTexto = strings.Title(strings.ToLower(captured))
		normalTerms := strings.Split(lab.TerminosNormal, ",")
		res.Estado = mapStatusCategorical(captured, normalTerms...)
	}

	return res
}

// normalizeText replaces extra whitespace and unifies newlines for pattern matching
func normalizeText(text string) string {
	re := regexp.MustCompile(`\r\n|\r`)
	text = re.ReplaceAllString(text, "\n")
	reSpace := regexp.MustCompile(`[ \t]+`)
	return reSpace.ReplaceAllString(text, " ")
}

// extractPatientInfo searches for patient demographics
func extractPatientInfo(text string, warnings *[]string) PatientInfo {
	info := PatientInfo{}

	// Nombres (ej: Paciente: ALEJANDRA ENRIQUEZ BALLENA)
	reNombre := regexp.MustCompile(`(?i)(?:paciente|nombre|gestante|usuario)[\:\s]+([A-Za-zÁÉÍÓÚáéíóúÑñ\s]{3,60}?)(?:\s*(?:identificaci[oó]n|m[eé]dico|orden|convenio|edad|sexo|\n|$))`)
	if m := reNombre.FindStringSubmatch(text); len(m) > 1 {
		info.NombreCompleto = strings.TrimSpace(m[1])
	}

	// Identificación (ej: Identificación: 1127045062)
	reId := regexp.MustCompile(`(?i)(?:identificaci[oó]n|c[eé]dula|cc|documento|id)[\:\s]+([0-9\.\-]+)`)
	if m := reId.FindStringSubmatch(text); len(m) > 1 {
		info.NumeroIdentificacion = strings.TrimSpace(m[1])
		info.TipoIdentificacion = "CC"
	}

	// Edad (ej: Edad/Sexo: 30 A / F)
	reEdad := regexp.MustCompile(`(?i)(?:edad(?:\/sexo)?)[\:\s]+(\d{1,2})\s*(?:a|a[ñn]os)?`)
	if m := reEdad.FindStringSubmatch(text); len(m) > 1 {
		if val, err := strconv.Atoi(m[1]); err == nil {
			info.Edad = val
		}
	}

	// Semanas de Gestación / Edad Gestacional
	reSem := regexp.MustCompile(`(?i)(?:edad gestacional|semanas|eg|gestaci[oó]n):\s*(\d{1,2}(?:\.\d)?)\s*(?:semanas|sem|w)?`)
	if m := reSem.FindStringSubmatch(text); len(m) > 1 {
		if val, err := strconv.ParseFloat(m[1], 64); err == nil {
			info.SemanasGestacion = val
		}
	}

	// Fecha de Consulta / Examen
	reFecha := regexp.MustCompile(`(?i)(?:fecha|fecha de toma|fecha consulta):\s*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})`)
	if m := reFecha.FindStringSubmatch(text); len(m) > 1 {
		info.FechaConsulta = strings.TrimSpace(m[1])
	}

	if info.NombreCompleto == "" {
		*warnings = append(*warnings, "No se identificó el nombre del paciente mediante patrones estándar.")
	}

	return info
}

// extractParaclinicos parses numeric lab results & categorical diagnostic tests using defaults
func extractParaclinicos(text string, warnings *[]string) ParaclinicosData {
	return extractParaclinicosWithConfig(text, warnings, models.PDFExtractorConfig{
		HemoglobinaMin: 11.0, HemoglobinaMax: 14.0,
		HematocritoMin: 33.0, HematocritoMax: 44.0,
		PlaquetasMin: 150000.0, PlaquetasMax: 450000.0,
		GlicemiaMin: 70.0, GlicemiaMax: 92.0, PtogMax: 140.0,
	})
}

// extractParaclinicosWithConfig parses lab results using admin-defined reference limits
func extractParaclinicosWithConfig(text string, warnings *[]string, cfg models.PDFExtractorConfig) ParaclinicosData {
	p := ParaclinicosData{}

	hbMin := cfg.HemoglobinaMin
	if hbMin == 0 { hbMin = 11.0 }
	hbMax := cfg.HemoglobinaMax
	if hbMax == 0 { hbMax = 14.0 }

	htoMin := cfg.HematocritoMin
	if htoMin == 0 { htoMin = 33.0 }
	htoMax := cfg.HematocritoMax
	if htoMax == 0 { htoMax = 44.0 }

	plaqMin := cfg.PlaquetasMin
	if plaqMin == 0 { plaqMin = 150000.0 }
	plaqMax := cfg.PlaquetasMax
	if plaqMax == 0 { plaqMax = 450000.0 }

	gliMin := cfg.GlicemiaMin
	if gliMin == 0 { gliMin = 70.0 }
	gliMax := cfg.GlicemiaMax
	if gliMax == 0 { gliMax = 92.0 }

	ptogMax := cfg.PtogMax
	if ptogMax == 0 { ptogMax = 140.0 }

	toxoIgMNeg := cfg.ToxoplasmaIgMLimiteNegativo
	if toxoIgMNeg == 0 { toxoIgMNeg = 0.80 }
	toxoIgMPos := cfg.ToxoplasmaIgMLimitePositivo
	if toxoIgMPos == 0 { toxoIgMPos = 1.00 }

	toxoIgGNeg := cfg.ToxoplasmaIgGLimiteNegativo
	if toxoIgGNeg == 0 { toxoIgGNeg = 1.00 }
	toxoIgGPos := cfg.ToxoplasmaIgGLimitePositivo
	if toxoIgGPos == 0 { toxoIgGPos = 3.00 }

	// Hemoglobina
	reHb := regexp.MustCompile(`(?i)(?:hemoglobina|hb):\s*(\d{1,2}(?:[\.,]\d{1,2})?)\s*(g\/dl)?`)
	if m := reHb.FindStringSubmatch(text); len(m) > 1 {
		rawVal := strings.ReplaceAll(m[1], ",", ".")
		val, _ := strconv.ParseFloat(rawVal, 64)
		p.Hemoglobina = LabResult{
			Nombre:          "Hemoglobina",
			Valor:           m[1],
			ValorNumerico:   val,
			Unidad:          "g/dL",
			RangoReferencia: fmt.Sprintf("%.1f - %.1f g/dL", hbMin, hbMax),
			Estado:          evaluateRange(val, hbMin, hbMax),
		}
	}

	// Hematocrito
	reHto := regexp.MustCompile(`(?i)(?:hematocrito|hto):\s*(\d{1,2}(?:[\.,]\d{1,2})?)\s*(%)?`)
	if m := reHto.FindStringSubmatch(text); len(m) > 1 {
		rawVal := strings.ReplaceAll(m[1], ",", ".")
		val, _ := strconv.ParseFloat(rawVal, 64)
		p.Hematocrito = LabResult{
			Nombre:          "Hematocrito",
			Valor:           m[1],
			ValorNumerico:   val,
			Unidad:          "%",
			RangoReferencia: fmt.Sprintf("%.1f - %.1f %%", htoMin, htoMax),
			Estado:          evaluateRange(val, htoMin, htoMax),
		}
	}

	// Plaquetas
	rePlaq := regexp.MustCompile(`(?i)(?:plaquetas|recuento de plaquetas):\s*([\d\.,]+)`)
	if m := rePlaq.FindStringSubmatch(text); len(m) > 1 {
		cleanVal := strings.ReplaceAll(strings.ReplaceAll(m[1], ".", ""), ",", ".")
		val, _ := strconv.ParseFloat(cleanVal, 64)
		p.Plaquetas = LabResult{
			Nombre:          "Plaquetas",
			Valor:           m[1],
			ValorNumerico:   val,
			Unidad:          "/mm3",
			RangoReferencia: fmt.Sprintf("%.0f - %.0f /mm3", plaqMin, plaqMax),
			Estado:          evaluateRange(val, plaqMin, plaqMax),
		}
	}

	// Glicemia en Ayunas
	reGlicemia := regexp.MustCompile(`(?i)(?:glicemia|glucosa en ayunas):\s*(\d{2,3}(?:[\.,]\d)?)\s*(mg\/dl)?`)
	if m := reGlicemia.FindStringSubmatch(text); len(m) > 1 {
		rawVal := strings.ReplaceAll(m[1], ",", ".")
		val, _ := strconv.ParseFloat(rawVal, 64)
		p.GlicemiaEnAyunas = LabResult{
			Nombre:          "Glicemia en Ayunas",
			Valor:           m[1],
			ValorNumerico:   val,
			Unidad:          "mg/dL",
			RangoReferencia: fmt.Sprintf("%.0f - %.0f mg/dL", gliMin, gliMax),
			Estado:          evaluateRange(val, gliMin, gliMax),
		}
	}

	// PTOG 75g (Prueba de Tolerancia a la Glucosa)
	rePtog := regexp.MustCompile(`(?i)(?:ptog|tolerancia a la glucosa|curva de glucosa):\s*(\d{2,3}(?:[\.,]\d)?)\s*(mg\/dl)?`)
	if m := rePtog.FindStringSubmatch(text); len(m) > 1 {
		rawVal := strings.ReplaceAll(m[1], ",", ".")
		val, _ := strconv.ParseFloat(rawVal, 64)
		p.PTOG75g = LabResult{
			Nombre:          "PTOG 75g",
			Valor:           m[1],
			ValorNumerico:   val,
			Unidad:          "mg/dL",
			RangoReferencia: fmt.Sprintf("< %.0f mg/dL (2h)", ptogMax),
			Estado:          evaluateMaxLimit(val, ptogMax),
		}
	}

	// Grupo Sanguíneo y Factor RH
	reGrupo := regexp.MustCompile(`(?i)(?:grupo sangu[ií]neo|hemoclasificaci[oó]n):\s*([ABOab0]{1,2})\s*(Rh\s*[\+\-])?`)
	if m := reGrupo.FindStringSubmatch(text); len(m) > 1 {
		p.GrupoSanguineo = strings.ToUpper(m[1])
		if len(m) > 2 && m[2] != "" {
			p.FactorRH = m[2]
		}
	}

	// VDRL / Sífilis (ej: Serologia VDRL NO REACTIVA)
	reVdrl := regexp.MustCompile(`(?i)(?:serologia\s*vdrl|vdrl|s[ií]filis|serolog[ií]a)[\:\s]+(no reactiva|no reactivo|reactiva|reactivo|positivo|negativo)`)
	if m := reVdrl.FindStringSubmatch(text); len(m) > 1 {
		res := strings.Title(strings.ToLower(m[1]))
		p.VDRLSifilis = LabResult{
			Nombre:         "VDRL / Sífilis",
			ResultadoTexto: res,
			Estado:         mapStatusCategorical(res, "No Reactiva", "No Reactivo", "Negativo"),
		}
	}

	// VIH (ej: HIV 1/2 ANTICUERPOS NEGATIVO)
	reVih := regexp.MustCompile(`(?i)(?:hiv\s*1\/2\s*anticuerpos|hiv\s*1\/2|vih\s*1\/2|vih|hiv)[\:\s]+(no reactiva|no reactivo|reactiva|reactivo|positivo|negativo)`)
	if m := reVih.FindStringSubmatch(text); len(m) > 1 {
		res := strings.Title(strings.ToLower(m[1]))
		p.VIH = LabResult{
			Nombre:         "VIH 1/2",
			ResultadoTexto: res,
			Estado:         mapStatusCategorical(res, "No Reactiva", "No Reactivo", "Negativo"),
		}
	}

	// Hepatitis B (HBsAg)
	reHepB := regexp.MustCompile(`(?i)(?:hepatitis\s*b|hbsag|ant[ií]geno de superficie)[\:\s]+(no reactiva|no reactivo|reactiva|reactivo|positivo|negativo)`)
	if m := reHepB.FindStringSubmatch(text); len(m) > 1 {
		res := strings.Title(strings.ToLower(m[1]))
		p.HepatitisB = LabResult{
			Nombre:         "Hepatitis B (HBsAg)",
			ResultadoTexto: res,
			Estado:         mapStatusCategorical(res, "No Reactiva", "No Reactivo", "Negativo"),
		}
	}

	// Toxoplasma IgM (Soporta valor numérico de Quimioluminiscencia o texto)
	reToxoIgM := regexp.MustCompile(`(?i)(?:toxoplasma\s*igm|toxo\s*igm)\s*[\:\s]*(\d+(?:[\.,]\d+)?|(?:no\s*)?reactivo|positivo|negativo|dudoso)`)
	if m := reToxoIgM.FindStringSubmatch(text); len(m) > 1 {
		valStr := strings.TrimSpace(m[1])
		rawVal := strings.ReplaceAll(valStr, ",", ".")
		if numVal, err := strconv.ParseFloat(rawVal, 64); err == nil {
			estado := "NORMAL"
			if numVal >= toxoIgMNeg && numVal <= toxoIgMPos {
				estado = "INDETERMINADO"
			} else if numVal > toxoIgMPos {
				estado = "ANORMAL"
			}
			p.ToxoplasmaIgM = LabResult{
				Nombre:          "Toxoplasma IgM",
				Valor:           valStr,
				ValorNumerico:   numVal,
				Unidad:          "Index",
				RangoReferencia: fmt.Sprintf("Negativo: <%.2f | Dudoso: %.2f-%.2f | Positivo: >%.2f", toxoIgMNeg, toxoIgMNeg, toxoIgMPos, toxoIgMPos),
				Estado:          estado,
			}
		} else {
			res := strings.Title(strings.ToLower(valStr))
			p.ToxoplasmaIgM = LabResult{
				Nombre:         "Toxoplasma IgM",
				ResultadoTexto: res,
				Estado:         mapStatusCategorical(res, "Negativo", "No Reactivo"),
			}
		}
	}

	// Toxoplasma IgG (Soporta valor numérico de Quimioluminiscencia o texto)
	reToxoIgG := regexp.MustCompile(`(?i)(?:toxoplasma\s*igg|toxo\s*igg)\s*[\:\s]*(\d+(?:[\.,]\d+)?|(?:no\s*)?reactivo|positivo|negativo|dudoso)`)
	if m := reToxoIgG.FindStringSubmatch(text); len(m) > 1 {
		valStr := strings.TrimSpace(m[1])
		rawVal := strings.ReplaceAll(valStr, ",", ".")
		if numVal, err := strconv.ParseFloat(rawVal, 64); err == nil {
			estado := "NORMAL"
			if numVal >= toxoIgGNeg && numVal <= toxoIgGPos {
				estado = "INDETERMINADO"
			} else if numVal > toxoIgGPos {
				estado = "ANORMAL"
			}
			p.ToxoplasmaIgG = LabResult{
				Nombre:          "Toxoplasma IgG",
				Valor:           valStr,
				ValorNumerico:   numVal,
				Unidad:          "UI/mL",
				RangoReferencia: fmt.Sprintf("Negativo: <%.2f | Dudoso: %.2f-%.2f | Positivo: >%.2f", toxoIgGNeg, toxoIgGNeg, toxoIgGPos, toxoIgGPos),
				Estado:          estado,
			}
		} else {
			res := strings.Title(strings.ToLower(valStr))
			p.ToxoplasmaIgG = LabResult{
				Nombre:         "Toxoplasma IgG",
				ResultadoTexto: res,
				Estado:         mapStatusCategorical(res, "Negativo", "No Reactivo"),
			}
		}
	}

	// Estreptococo del Grupo B (STGB)
	reStgb := regexp.MustCompile(`(?i)(?:estreptococo|stgb|streptococcus agalactiae):\s*(negativo|positivo|no se aisla|aislado)`)
	if m := reStgb.FindStringSubmatch(text); len(m) > 1 {
		res := strings.Title(strings.ToLower(m[1]))
		p.EstreptococoGrupoB = LabResult{
			Nombre:         "Estreptococo Grupo B",
			ResultadoTexto: res,
			Estado:         mapStatusCategorical(res, "Negativo", "No Se Aisla"),
		}
	}

	// Urocultivo
	reUro := regexp.MustCompile(`(?i)(?:urocultivo):\s*(negativo|positivo|sin germen|aislamiento:[^\n]+)`)
	if m := reUro.FindStringSubmatch(text); len(m) > 1 {
		res := strings.TrimSpace(m[1])
		p.Urocultivo = LabResult{
			Nombre:         "Urocultivo",
			ResultadoTexto: res,
			Estado:         mapStatusCategorical(res, "Negativo", "Sin Germen"),
		}
	}

	return p
}

// extractFreeTextSections uses regular expressions and default section anchors
func extractFreeTextSections(rawText string) FreeTextSections {
	return extractFreeTextSectionsWithConfig(rawText, models.PDFExtractorConfig{})
}

// extractFreeTextSectionsWithConfig extracts narrative sections using custom admin section keywords
func extractFreeTextSectionsWithConfig(rawText string, cfg models.PDFExtractorConfig) FreeTextSections {
	sections := FreeTextSections{}

	buildRegex := func(customList string, defaultPattern string) *regexp.Regexp {
		if strings.TrimSpace(customList) == "" {
			return regexp.MustCompile(defaultPattern)
		}
		parts := strings.Split(customList, ",")
		escaped := make([]string, 0, len(parts))
		for _, p := range parts {
			if trimmed := strings.TrimSpace(p); trimmed != "" {
				escaped = append(escaped, regexp.QuoteMeta(trimmed))
			}
		}
		if len(escaped) == 0 {
			return regexp.MustCompile(defaultPattern)
		}
		pattern := fmt.Sprintf(`(?i)(?:%s)\s*[\:\-\n]\s*`, strings.Join(escaped, "|"))
		return regexp.MustCompile(pattern)
	}

	patterns := map[string]*regexp.Regexp{
		"motivo":      buildRegex(cfg.SeccionMotivo, `(?i)(?:MOTIVO DE CONSULTA|MOTIVO CONSULTA|CAUSA DE CONSULTA)\s*[\:\-\n]\s*`),
		"enfermedad":  regexp.MustCompile(`(?i)(?:ENFERMEDAD ACTUAL|RESUMEN HISTORIA|HISTORIA CLINICA)\s*[\:\-\n]\s*`),
		"evolucion":   buildRegex(cfg.SeccionEvolucion, `(?i)(?:EVOLUCIÓN|EVOLUCION CLINICA|EVOLUCION MEDICA|NOTAS DE EVOLUCION)\s*[\:\-\n]\s*`),
		"examen":      regexp.MustCompile(`(?i)(?:EXAMEN FÍSICO|EXAMEN FISICO|HALLAZGOS EXAMEN)\s*[\:\-\n]\s*`),
		"diagnostico": buildRegex(cfg.SeccionDiagnostico, `(?i)(?:DIAGNÓSTICO|DIAGNOSTICO|IMPRESIÓN DIAGNÓSTICA|IMPRESION DIAGNOSTICA|CIE-10)\s*[\:\-\n]\s*`),
		"plan":        buildRegex(cfg.SeccionPlan, `(?i)(?:PLAN DE MANEJO|PLAN DE TRATAMIENTO|PLAN Y TRATAMIENTO|CONDUCTA)\s*[\:\-\n]\s*`),
		"obs":         regexp.MustCompile(`(?i)(?:OBSERVACIONES|RECOMENDACIONES|NOTAS ADICIONALES)\s*[\:\-\n]\s*`),
	}

	allHeadersRegex := regexp.MustCompile(`(?i)(?:\n\s*(?:MOTIVO DE CONSULTA|ENFERMEDAD ACTUAL|EVOLUCIÓN|EVOLUCION|EXAMEN FÍSICO|EXAMEN FISICO|DIAGNÓSTICO|DIAGNOSTICO|PLAN DE MANEJO|PLAN Y TRATAMIENTO|OBSERVACIONES|FIRMADO POR|MÉDICO TRATANTE)\s*[\:\-\n])`)

	extractBlock := func(reStart *regexp.Regexp) string {
		loc := reStart.FindStringIndex(rawText)
		if loc == nil {
			return ""
		}
		startPos := loc[1]
		subText := rawText[startPos:]

		endMatch := allHeadersRegex.FindStringIndex(subText)
		if endMatch != nil {
			subText = subText[:endMatch[0]]
		}

		cleanBlock := strings.TrimSpace(subText)
		if len(cleanBlock) > 3000 {
			cleanBlock = cleanBlock[:3000] + "..."
		}
		return cleanBlock
	}

	sections.MotivoConsulta = extractBlock(patterns["motivo"])
	sections.EnfermedadActual = extractBlock(patterns["enfermedad"])
	sections.EvolucionClinica = extractBlock(patterns["evolucion"])
	sections.ExamenFisico = extractBlock(patterns["examen"])
	sections.Diagnostico = extractBlock(patterns["diagnostico"])
	sections.PlanTratamiento = extractBlock(patterns["plan"])
	sections.Observaciones = extractBlock(patterns["obs"])

	return sections
}

// Helpers for reference ranges
func evaluateRange(val float64, min float64, max float64) string {
	if val == 0 {
		return "INDETERMINADO"
	}
	if val >= min && val <= max {
		return "NORMAL"
	}
	return "ANORMAL"
}

func evaluateMaxLimit(val float64, max float64) string {
	if val == 0 {
		return "INDETERMINADO"
	}
	if val <= max {
		return "NORMAL"
	}
	return "ANORMAL"
}

func mapStatusCategorical(val string, normalTerms ...string) string {
	if val == "" {
		return "INDETERMINADO"
	}
	valLower := strings.ToLower(val)
	for _, term := range normalTerms {
		if strings.Contains(valLower, strings.ToLower(term)) {
			return "NORMAL"
		}
	}
	return "ANORMAL"
}
