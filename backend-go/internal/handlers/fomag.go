package handlers

import (
	"bytes"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"backend-go/internal/config"
	"backend-go/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
	"golang.org/x/crypto/bcrypt"
)

func fmtDateGo(t *time.Time) string {
	if t == nil || t.IsZero() {
		return ""
	}
	return t.Format("02/01/2006")
}

func strVal(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func generateFomagExcelGo(gestantes []models.Gestante) ([]byte, error) {
	f := excelize.NewFile()
	sheetName := "Cohorte Materno Perinatal"
	f.SetSheetName("Sheet1", sheetName)

	// Estilo de encabezados oficial FOMAG
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF", Size: 9, Family: "Arial"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"1F4E78"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border: []excelize.Border{
			{Type: "top", Color: "BFBFBF", Style: 1},
			{Type: "left", Color: "BFBFBF", Style: 1},
			{Type: "bottom", Color: "BFBFBF", Style: 1},
			{Type: "right", Color: "BFBFBF", Style: 1},
		},
	})

	// Estilo de celdas de datos
	dataStyle, _ := f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Vertical: "center", WrapText: true},
		Border: []excelize.Border{
			{Type: "top", Color: "BFBFBF", Style: 1},
			{Type: "left", Color: "BFBFBF", Style: 1},
			{Type: "bottom", Color: "BFBFBF", Style: 1},
			{Type: "right", Color: "BFBFBF", Style: 1},
		},
	})

	setHeader := func(ref string, val string, mergeTo ...string) {
		f.SetCellValue(sheetName, ref, val)
		if len(mergeTo) > 0 && mergeTo[0] != "" {
			f.MergeCell(sheetName, ref, mergeTo[0])
			f.SetCellStyle(sheetName, ref, mergeTo[0], headerStyle)
		} else {
			f.SetCellStyle(sheetName, ref, ref, headerStyle)
		}
	}

	f.SetRowHeight(sheetName, 8, 40)
	f.SetRowHeight(sheetName, 9, 30)
	f.SetRowHeight(sheetName, 10, 40)
	f.SetRowHeight(sheetName, 11, 60)

	// ─── PARTE 1 DEL MAPA (Fila 8) ───
	setHeader("A8", "CONSECUTIVO")
	setHeader("B8", "REGION")
	setHeader("C8", "IPS DE ATENCIÓN")
	setHeader("D8", "CODIGO DE HABILITACION DE IPS")
	setHeader("E8", "DEPARTAMENTO")
	setHeader("F8", "MUNICIPIO")
	setHeader("G8", "NOMBRES")
	setHeader("H8", "APELLIDOS")
	setHeader("I8", "TIPO DE IDENTIFICACIÓN")
	setHeader("J8", "No DE IDENTIFICACION")
	setHeader("K8", "ESTADO CIVIL")
	setHeader("L8", "FECHA DE NACIMIENTO GESTANTE")
	setHeader("M8", "EDAD ACTUAL EN AÑOS")
	setHeader("N8", "ESCOLARIDAD")
	setHeader("O8", "MUNICIPIO DE RESIDENCIA")
	setHeader("P8", "DIRECCION")
	setHeader("Q8", "BARRIO")
	setHeader("R8", "TELEFONO CEL Nº 1")
	setHeader("S8", "TELEFONO CEL Nº 2")
	setHeader("T8", "OCUPACION/OFICIO")

	setHeader("U8", "ENFOQUE DIFERENCIAL")
	setHeader("Y8", "CARACTERIZACION DE LA POBLACION GESTANTE")
	setHeader("Z8", "ETAPA PRECONCEPCIONAL", "AC9")
	setHeader("AD8", "INSCRIPCION AL CONTROL PRENATAL", "AV9")
	setHeader("AW8", "ANTECEDENTES GINECOBSTETRICOS", "BF10")
	setHeader("BG8", "ANTECEDENTES PERSONALES", "BM10")
	setHeader("BN8", "ANTECEDENTES FAMILIARES")
	setHeader("BO8", "MEDIDAS ANTROPOMETRICAS AL INICIO CPN", "BS10")
	setHeader("BT8", "VALORACION DE MEDICO GINECOOBSTETRA", "CL9")
	setHeader("CM8", "PARACLINICOS PRIMER TRIMESTRE ( SEMANA 1 HASTA LA 12)", "DE9")
	setHeader("DF8", "SEGUNDO CONTROL PRENATAL", "DS8")
	setHeader("DU8", "TERCER CONTROL PRENATAL", "EI8")
	setHeader("EK8", "CUARTO CONTROL PRENATAL", "EX8")
	setHeader("EZ8", "QUINTO CONTROL PRENATAL", "FN8")
	setHeader("FP8", "CLASIFICACION DEL RIESGO BPS DURANTE EL SEGUNDO TRIMESTRE")
	setHeader("FQ8", "PARACLINICOS SEGUNDO TRIMESTRE ( SEMANA 13 A LA 26)")
	setHeader("GD8", "TAMIZAJE DE SIFILIS", "GH8")
	setHeader("GI8", "SEXTO CONTROL PRENATAL", "GX8")
	setHeader("GY8", "SEPTIMO CONTROL PRENATAL", "HN8")
	setHeader("HO8", "OCTAVO CONTROL PRENATAL", "IC8")
	setHeader("ID8", "NOVENO CONTROL PRENATAL", "IU8")
	setHeader("IV8", "DECIMO CONTROL PRENATAL", "JJ8")
	setHeader("JK8", "ONCEAVO CONTROL PRENATAL", "JY8")
	setHeader("JZ8", "GESTANTE CON 4 O MÁS CPN")
	setHeader("KA8", "ADHRENCIA AL CONTROL PRENATAL")
	setHeader("KB8", "CAUSA DE NO ADHERENCIA AL CNP")
	setHeader("KC8", "PARACLINICOS TERCER TRIMESTRE ( SEMANA 26 HASTA EL PARTO)", "KK8")
	setHeader("KL8", "FECHA DE VALORACION ANTENATAL O POR PEDIATRIA")
	setHeader("KM8", "ASESORIA IVE")
	setHeader("KN8", "FECHA ASESORIA EN ANTICONCEPCIÓN SEM 28 A 34")
	setHeader("KO8", "VACUNACIÓN", "KS10")
	setHeader("KT8", "CURSOS PREPARACION PARA LA MATERNIDAD Y LA PATERNIDAD", "KZ8")
	setHeader("LA8", "CONSULTAS", "LJ8")
	setHeader("LK8", "FECHA ENTREGA Y ASESORIA DE PRESERVATIVO")
	setHeader("LL8", "FECHA DE CONSEJERIA EN LACTANCIA MATERNA PRENATAL")
	setHeader("LM8", "EVENTOS DE NOTIFICACION Y SEGUIMIENTO", "LO8")
	setHeader("LP8", "INFORMACION POSPARTO-RN", "MF8")
	setHeader("MG8", "PLANIFICACION POST EVENTO", "MJ8")

	setHeader("MK8", "SEGUIMIENTO 1", "ML10")
	setHeader("MM8", "SEGUIMIENTO 2", "MN10")
	setHeader("MO8", "SEGUIMIENTO 3", "MP10")
	setHeader("MQ8", "SEGUIMIENTO 4", "MR10")
	setHeader("MS8", "SEGUIMIENTO 5", "MT10")
	setHeader("MU8", "SEGUIMIENTO 6", "MV10")
	setHeader("MW8", "SEGUIMIENTO 7", "MX10")
	setHeader("MY8", "SEGUIMIENTO 8", "MZ10")
	setHeader("NA8", "SEGUIMIENTO 9", "NB10")
	setHeader("NC8", "SEGUIMIENTO 10", "ND10")
	setHeader("NE8", "SEGUIMIENTO 11", "NF10")

	// ─── PARTE 2 DEL MAPA (Fila 10) ───
	setHeader("U10", "ETNIA")
	setHeader("V10", "IDENTIDAD DE GENERO")
	setHeader("W10", "DISCAPACIDAD")
	setHeader("X10", "VICTIMA DE VIOLENCIA")
	setHeader("Z10", "RECIBIO ATENCION PRECONCEPCIONAL ANTES DEL ACTUAL EMBARAZO (PLANEADO)")
	setHeader("AA10", "RECIBIO ASESORIA Y PROVISION DE METODO ANTICONCEPTIVO PREEVENTO OBSTETRICO POR PARTE DEL PRESTADOR PRIMARIO")
	setHeader("AB10", "RECIBIO ACIDO FOLICO DURANTE LOS 3 MESES ANTERIORES A LA GESTACION")
	setHeader("AC10", "¿A CUANTAS CITAS PRECONCEPCIONALES ASISTIO?")
	setHeader("AD10", "FECHA DE INSCRIPCION AL CPN POR MEDICO GENERAL (DD/MM/AAA)")
	setHeader("AE10", "EDAD GESTACIONAL AL INICIO DE CNP (INGRESO AL CONTROL PRENATAL)")
	setHeader("AF10", "EMBARAZO DESEADO")
	setHeader("AG10", "¿TIENE RED DE APOYO FAMILIAR/SOCIAL?")
	setHeader("AH10", "SE REALIZO TAMIZAJE DE VIOLENCIA")
	setHeader("AI10", "SE REALIZO TAMIZAJE DE DEPRESION SEGÚN ESCALA HERRERA Y HURTADO")
	setHeader("AJ10", "TAMIZAJE Y RESULTADO DE SIFILIS")
	setHeader("AK10", "FECHA DE RESULTADO DE SIFILIS")
	setHeader("AL10", "TAMIZACIÓN Y RESULTADO DE PRUEBA RAPIDA DE VIH")
	setHeader("AM10", "FECHA DE RESULTADO VIH")
	setHeader("AN10", "TAMIZAJE Y RESULTADO DE PRUEBA RAPIDA DE HBSAG")
	setHeader("AO10", "FECHA DE RESULTADOS DE HBSAG")
	setHeader("AP10", "TAMIZAJE DE CHAGAS")
	setHeader("AQ10", "FUR")
	setHeader("AR10", "EDAD GESTACIONAL ACTUAL")
	setHeader("AS10", "EDAD GESTACIONAL POR ECOGRAFIA")
	setHeader("AT10", "FPP")
	setHeader("AU10", "CLASIFICACION DEL RIESGO OBSTETRICO ACTUAL")
	setHeader("AV10", "DIAGNOSTICO ESCRITO DE ARO (ACTUALIZADO)")

	setHeader("BT10", "FECHA DE EDUCACION INDIVIDUAL POR ENFERMERIA")
	setHeader("BU10", "1 CPN")
	setHeader("BV10", "CLASIFICACION DEL RIESGO OBSTETRICO (AL INGRESO DEL CPN)")
	setHeader("BW10", "DIAGNOSTICO DESCRITO DE ARO")
	setHeader("BX10", "CLASIFICACION DEL RIESGO PSICOSOCIAL")
	setHeader("BY10", "ATRIBUTO EVALUADO DE RIESGO PSICOSOCIAL")
	setHeader("BZ10", "RIESGO DE HIPERTENSION")
	setHeader("CA10", "RIESGO DE PREECLAMPSIA")
	setHeader("CB10", "CLASIFICACIÓN DEL RIESGO TROMBOEMBÓLICO AL INGRESO DEL CONTROL PRENATAL")
	setHeader("CC10", "PRESCRIPCIÓN DE ASA")
	setHeader("CD10", "EDAD GESTACIONAL")
	setHeader("CE10", "TALLA (CM)")
	setHeader("CF10", "PESO ACTUAL (kg)")
	setHeader("CG10", "IMC GESTACIONAL")
	setHeader("CH10", "CLASIFICACION DEL RIESGO NUTRICIONAL")
	setHeader("CI10", "MICRONUTRIENTES", "CL10")
	setHeader("CM10", "RESULTADO HEMOCLASIFICACION")
	setHeader("CN10", "RESULTADO HEMOGRAMA", "CP10")
	setHeader("CQ10", "RESULTADO GLICEMIA")
	setHeader("CR10", "RESULTADO IgG PARA RUBEOLA")
	setHeader("CS10", "RESULTADO IgG E IgM PARA TOXOPLASMA/IGA Y AVIDEZ (INICIAL)")
	setHeader("CW10", "UROCULTIVO")
	setHeader("CX10", "HEMOPARASITOS (GOTA GRUESA) EN ZONA ENDEMICA")
	setHeader("CY10", "RESULTADO DE CHAGAS (RESIDENCIA O PROCEDENCIA DE GESTANTE)")
	setHeader("CZ10", "FECHA DE ECOGRAFIA 1 TRIMESTRE")
	setHeader("DA10", "INTERPRETACION DE LA ECOGRAFIA")
	setHeader("DB10", "MICRONUTRIENTES", "DE10")
	setHeader("DF10", "FECHA CPN")
	setHeader("DG10", "ESPECIALIDAD QUE ATIENDE EL CONTROL PRENATAL")
	setHeader("DH10", "EDAD GESTACIONAL")
	setHeader("DI10", "TENSION ARTERIAL")
	setHeader("DJ10", "CLASIFICACION DEL RIESGO OBSTETRICO (AL INGRESO DEL CPN)")
	setHeader("DK10", "DIAGNOSTICO ESCRITO DE ARO")
	setHeader("DL10", "TALLA (CM)")
	setHeader("DM10", "PESO ACTUAL (kg)")
	setHeader("DN10", "IMC GESTACIONAL")
	setHeader("DO10", "CLASIFICACION DEL RIESGO NUTRICIONAL")
	setHeader("DP10", "MICRONUTRIENTES", "DS10")
	setHeader("DT10", "RESULTADO TOXOPLASMA IGM DE CONTROL MENSUAL")
	setHeader("DU10", "FECHA DE EDUCACION INDIVIDUAL POR ENFERMERIA")
	setHeader("DV10", "FECHA CPN (MEDICO/GINECOOBSTETRA)")
	setHeader("DW10", "ESPECIALIDAD QUE ATIENDE EL CONTROL PRENATAL")
	setHeader("DX10", "EDAD GESTACIONAL")
	setHeader("DY10", "TENSION ARTERIAL")
	setHeader("DZ10", "CLASIFICACION DEL RIESGO OBSTETRICO (AL INGRESO DEL CPN)")
	setHeader("EA10", "DIAGNOSTICO ESCRITO DE ARO")
	setHeader("EB10", "TALLA (CM)")
	setHeader("EC10", "PESO ACTUAL (kg)")
	setHeader("ED10", "IMC GESTACIONAL")
	setHeader("EE10", "CLASIFICACION DEL RIESGO NUTRICIONAL")
	setHeader("EF10", "MICRONUTRIENTES", "EI10")
	setHeader("EJ10", "RESULTADO TOXOPLASMA IGM DE CONTROL MENSUAL")
	setHeader("EK10", "FECHA CPN (MEDICO/GINECOOBSTETRA)")
	setHeader("EL10", "ESPECIALIDAD QUE ATIENDE EL CONTROL PRENATAL")
	setHeader("EM10", "EDAD GESTACIONAL")
	setHeader("EN10", "TENSION ARTERIAL")
	setHeader("EO10", "CLASIFICACION DEL RIESGO OBSTETRICO (AL INGRESO DEL CPN)")
	setHeader("EP10", "DIAGNOSTICO ESCRITO DE ARO")
	setHeader("EQ10", "TALLA (CM)")
	setHeader("ER10", "PESO ACTUAL (kg)")
	setHeader("ES10", "IMC GESTACIONAL")
	setHeader("ET10", "CLASIFICACION DEL RIESGO NUTRICIONAL")
	setHeader("EU10", "MICRONUTRIENTES", "EX10")
	setHeader("EY10", "RESULTADO TOXOPLASMA IGM DE CONTROL MENSUAL")
	setHeader("EZ10", "FECHA DE EDUCACION INDIVIDUAL POR ENFERMERIA")
	setHeader("FA10", "FECHA CPN (MEDICO/GINECOOBSTETRA)")
	setHeader("FB10", "ESPECIALIDAD QUE ATIENDE EL CONTROL PRENATAL")
	setHeader("FC10", "EDAD GESTACIONAL")
	setHeader("FD10", "TENSION ARTERIAL")
	setHeader("FE10", "CLASIFICACION DEL RIESGO OBSTETRICO (AL INGRESO DEL CPN)")
	setHeader("FF10", "DIAGNOSTICO ESCRITO DE ARO")
	setHeader("FG10", "TALLA (CM)")
	setHeader("FH10", "PESO ACTUAL (kg)")
	setHeader("FI10", "IMC GESTACIONAL")
	setHeader("FJ10", "CLASIFICACION DEL RIESGO NUTRICIONAL")
	setHeader("FK10", "MICRONUTRIENTES", "FN10")
	setHeader("FO10", "RESULTADO TOXOPLASMA IGM DE CONTROL MENSUAL")
	setHeader("FQ10", "HEMOGRAMA", "FS10")
	setHeader("FT10", "RESULTADO PRUEBA DE TOLERANCIA A LA GLUCOSA(PTOG)CON 75 GR DE GLUCOSA")
	setHeader("FU10", "TAMIZACION Y RESULTADO DE PRUEBA RAPIDA DE VIH")
	setHeader("FV10", "FECHA DE PRUEBA RAPIDA DE VIH")
	setHeader("FW10", "TAMIZAJE Y RESULTADO DE SIFILIS")
	setHeader("FX10", "FECHA DE RESULTADO DE SIFILIS")
	setHeader("FY10", "RESULTADO TOXOPLASMA IGM DE CONTROL MENSUAL")
	setHeader("FZ10", "HEMOPARASITOS (GOTA GRUESA) EN ZONA ENDEMICA (MENSUAL)")
	setHeader("GA10", "FECHA DE LA ECOGRAFIA SEMANA DE DETALLE (18 Y 23 + 6 SEMANAS)")
	setHeader("GB10", "INTERPRETACION DE LA ECOGRAFIAS")
	setHeader("GC10", "RESULTADO TAMIZAJE PARA LESIONES PREMALIGNAS DE CERVIX (CCU)")
	setHeader("GD10", "DIAGNOSTICO DE SIFILIS")
	setHeader("GE10", "EDAD GESTACIONAL DE INICIO DE TRATAMIENTO PARA SIFILIS")
	setHeader("GF10", "TRATAMIENTO")
	setHeader("GG10", "COMPLETO TRATAMIENTO OPORTUNO EN LA GESTANTE")
	setHeader("GH10", "NUMERO CONTACTOS SEXUALES TRATADOS OPORTUNAMENTE")
	setHeader("GI10", "FECHA CPN (MEDICO/GINECOOBSTETRA)")
	setHeader("GJ10", "ESPECIALIDAD QUE ATIENDE EL CONTROL PRENATAL")
	setHeader("GK10", "EDAD GESTACIONAL EN SEMANAS")
	setHeader("GL10", "TENSION ARTERIAL")
	setHeader("GM10", "CLASIFICACION DEL RIESGO OBSTETRICO (AL INGRESO DEL CPN)")
	setHeader("GN10", "CLASIFICACION DEL RIESGO OBSTETRICO (AL INGRESO DEL CPN)")
	setHeader("GO10", "DIAGNOSTICO ESCRITO DE ARO")
	setHeader("GP10", "TALLA (CM)")
	setHeader("GQ10", "PESO ACTUAL (kg)")
	setHeader("GR10", "IMC GESTACIONAL")
	setHeader("GS10", "CLASIFICACION DEL RIESGO NUTRICIONAL")
	setHeader("GT10", "MICRONUTRIENTES", "GW10")
	setHeader("GX10", "RESULTADO TOXOPLASMA IGM MENSUAL")
	setHeader("GY10", "FECHA DE EDUCACION INDIVIDUAL POR ENFERMERIA")
	setHeader("GZ10", "7 CPN (MEDICO/GINECOOBSTETRA)")
	setHeader("HA10", "ESPECIALIDAD QUE ATIENDE EL CONTROL PRENATAL")
	setHeader("HB10", "EDAD GESTACIONAL EN SEMANAS")
	setHeader("HC10", "TENSION ARTERIAL")
	setHeader("HD10", "CLASIFICACION DEL RIESGO OBSTETRICO (AL INGRESO DEL CPN)")
	setHeader("HE10", "DIAGNOSTICO ESCRITO DE ARO")
	setHeader("HF10", "TALLA (CM)")
	setHeader("HG10", "PESO ACTUAL (kg)")
	setHeader("HH10", "IMC GESTACIONAL")
	setHeader("HI10", "CLASIFICACION DEL RIESGO NUTRICIONAL")
	setHeader("HJ10", "MICRONUTRIENTES", "HM10")
	setHeader("HN10", "RESULTADO TOXOPLASMA IGM MENSUAL")
	setHeader("HO10", "FECHA CPN (MEDICO/GINECOOBSTETRA)")
	setHeader("HP10", "ESPECIALIDAD QUE ATIENDE EL CONTROL PRENATAL")
	setHeader("HQ10", "EDAD GESTACIONAL EN SEMANAS")
	setHeader("HR10", "TENSION ARTERIAL")
	setHeader("HS10", "CLASIFICACION DEL RIESGO OBSTETRICO (AL INGRESO DEL CPN)")
	setHeader("HT10", "DIAGNOSTICO ESCRITO DE ARO")
	setHeader("HU10", "TALLA (CM)")
	setHeader("HV10", "PESO ACTUAL (kg)")
	setHeader("HW10", "IMC GESTACIONAL")
	setHeader("HX10", "CLASIFICACION DEL RIESGO NUTRICIONAL")
	setHeader("HY10", "MICRONUTRIENTES", "IB10")
	setHeader("IC10", "RESULTADO TOXOPLASMA IGM MENSUAL")
	setHeader("ID10", "FECHA DE EDUCACION INDIVIDUAL POR ENFERMERIA")
	setHeader("IE10", "FECHA CPN (MEDICO/GINECOOBSTETRA)")
	setHeader("IF10", "ESPECIALIDAD QUE ATIENDE EL CONTROL PRENATAL")
	setHeader("IG10", "EDAD GESTACIONAL")
	setHeader("IH10", "TENSION ARTERIAL")
	setHeader("II10", "CLASIFICACION DEL RIESGO OBSTETRICO (AL INGRESO DEL CPN)")
	setHeader("IJ10", "DIAGNOSTICO ESCRITO DE ARO")
	setHeader("IK10", "TALLA (CM)")
	setHeader("IL10", "PESO ACTUAL (kg)")
	setHeader("IM10", "IMC GESTACIONAL")
	setHeader("IN10", "CLASIFICACION DEL RIESGO NUTRICIONAL")
	setHeader("IO10", "RESULTADO TOXOPLASMA IGM MENSUAL")
	setHeader("IP10", "CLASIFICACION DEL RIESGO TROMBOEMBOLICO SEMANA 28")
	setHeader("IQ10", "CLASIFICACION DEL RIESGO PSICOSOCIAL DURANTE EL TERCER TRIMESTRE")
	setHeader("IR10", "MICRONUTRIENTES", "IU10")
	setHeader("IV10", "10 CPN (MEDICO/GINECOOBSTETRA)")
	setHeader("IW10", "ESPECIALIDAD QUE ATIENDE EL CONTROL PRENATAL")
	setHeader("IX10", "EDAD GESTACIONAL EN SEMANAS")
	setHeader("IY10", "TENSION ARTERIAL")
	setHeader("IZ10", "CLASIFICACION DEL RIESGO OBSTETRICO (AL INGRESO DEL CPN)")
	setHeader("JA10", "DIAGNOSTICO ESCRITO DE ARO")
	setHeader("JB10", "TALLA (CM)")
	setHeader("JC10", "PESO ACTUAL (kg)")
	setHeader("JD10", "IMC GESTACIONAL")
	setHeader("JE10", "CLASIFICACION DEL RIESGO NUTRICIONAL")
	setHeader("JF10", "MICRONUTRIENTES", "JI10")
	setHeader("JJ10", "RESULTADO TOXOPLASMA IGM MENSUAL")
	setHeader("JK10", "11 CPN (MEDICO/GINECOOBSTETRA)")
	setHeader("JL10", "ESPECIALIDAD QUE ATIENDE EL CONTROL PRENATAL")
	setHeader("JM10", "EDAD GESTACIONAL EN SEMANAS")
	setHeader("JN10", "TENSION ARTERIAL")
	setHeader("JO10", "CLASIFICACION DEL RIESGO OBSTETRICO (AL INGRESO DEL CPN)")
	setHeader("JP10", "DIAGNOSTICO ESCRITO DE ARO")
	setHeader("JQ10", "TALLA (CM)")
	setHeader("JR10", "PESO ACTUAL (kg)")
	setHeader("JS10", "IMC GESTACIONAL")
	setHeader("JT10", "CLASIFICACION DEL RIESGO NUTRICIONAL")
	setHeader("JU10", "MICRONUTRIENTES", "JX10")
	setHeader("JY10", "RESULTADO TOXOPLASMA IGM MENSUAL")
	setHeader("KC10", "HEMOGRAMA SEMANA 28", "KE10")
	setHeader("KF10", "HEMOPARASITOS (GOTA GRUESA) EN ZONA ENDEMICA")
	setHeader("KG10", "TAMIZACION Y RESULTADO DE PRUEBA RAPIDA DE VIH")
	setHeader("KH10", "FECHA DE RESULTADO VIH")
	setHeader("KI10", "TAMIZACION Y RESULTADO DE SIFILIS")
	setHeader("KJ10", "FECHA DE RESULTADO SIFILIS")
	setHeader("KK10", "TAMIZAJE ESTREPTOCOCO DEL GRUPO B")
	setHeader("KM10", "VALORACIÓN INTEGRAL ORIENTACIÓN Y ASESORÍA FRENTE A IVE")
	setHeader("KT10", "FECHA PRIMER ENCUENTRO ANTES DE SEMANA 14")
	setHeader("KU10", "FECHA SEGUNDO ENCUENTRO Y PREPARACION")
	setHeader("KV10", "FECHA TERCER ENCUENTRO Y PREPARACION")
	setHeader("KW10", "FECHA CUARTO ENCUENTRO Y PREPARACION")
	setHeader("KX10", "FECHA QUINTO ENCUENTRO Y PREPARACION")
	setHeader("KY10", "FECHA SEXTO ENCUENTRO Y PREPARACION")
	setHeader("KZ10", "FECHA SEPTIMO ENCUENTRO Y PREPARACION")
	setHeader("LA10", "NUTRICION", "LC10")
	setHeader("LD10", "ODONTOLOGIA", "LE10")
	setHeader("LF10", "PSICOLOGIA", "LH10")
	setHeader("LI10", "TRABAJO SOCIAL", "LJ10")
	setHeader("LM10", "PRESENTO MORBILDAD MATERNA EXTREMA")
	setHeader("LN10", "DX CIE 10 DE MME")
	setHeader("LO10", "INFECCION POR ZIKA DURANTE LA GESTACION")
	setHeader("LP10", "INSTITUCION DEL PARTO")
	setHeader("LQ10", "EVENTO OBSTERICO")
	setHeader("LR10", "FECHA DEL EVENTO OBSTETRICO")
	setHeader("LS10", "PARTO HUMANIZADO")
	setHeader("LT10", "CONSEJERÌA POSTPARTO SOBRE LACTANCIA MATERNA EXCLUSIVA")
	setHeader("LU10", "EDAD GESTACIONAL AL MOMENTO DEL PARTO")
	setHeader("LV10", "RECIEN NACIDO")
	setHeader("LW10", "MEDIDAS ANTROPOMETRICAS DEL RECIEN NACIDO", "LY10")
	setHeader("LZ10", "FECHA DE TSH")
	setHeader("MA10", "RESULTADO DE TSH")
	setHeader("MB10", "TAMIZAJE AUDITIVO DEL RECIEN NACIDO")
	setHeader("MC10", "FECHA DE ALTA HOSPITALARIA RECIEN NACIDO (24 HORAS POSTERIOR A PARTO)")
	setHeader("MD10", "FECHA DE CONSULTA DEL RECIEN NACIDO POSTERIOR A 5 DIAS DEL ALTA HOSPITALARIA")
	setHeader("ME10", "FECHA DE ALTA HOSPITALARIA A LA PUERPERA ( PARTO VAGINAL 24 HORAS Y CESAREA 48 HORAS MINIMO)")
	setHeader("MF10", "FECHA DE CONSULTA DE CONTROL DE LA PUERPERA MENOR A 5 DIAS POST EGRESO")
	setHeader("MG10", "MUJER POST PARTO O POSTABORTO CON PROVISIÒN MÈTODO ANTICONCEPTIVO ANTES DEL ALTA HOSPITALARIA")
	setHeader("MH10", "METODO ANTICONCEPTIVO ELEGIDO")
	setHeader("MI10", "Entrega efectiva de medicamentos antes del egreso hospitalario segun requerimeinto")
	setHeader("MJ10", "MOTIVO DE CIERRE DE CASO")

	// ─── PARTE 3 DEL MAPA (Fila 11) ───
	setHeader("AW11", "GESTACIONES")
	setHeader("AX11", "PARTOS VAGINALES")
	setHeader("AY11", "CESAREA")
	setHeader("AZ11", "VIVOS")
	setHeader("BA11", "MORTINATO")
	setHeader("BB11", "OBITO")
	setHeader("BC11", "ABORTO")
	setHeader("BD11", "MALFORMACION")
	setHeader("BE11", "ECTOPICOS")
	setHeader("BF11", "OTROS EVENTOS")
	setHeader("BG11", "HIPERTENSION")
	setHeader("BH11", "DIABETES MELLITUS")
	setHeader("BI11", "LUPUS ERITEMATOSO")
	setHeader("BJ11", "PREECLAMPSIA")
	setHeader("BK11", "ECLAMPSIA")
	setHeader("BL11", "DIABETES GESTACIONAL")
	setHeader("BM11", "OTROS")
	setHeader("BO11", "PESO PREGESTACIONAL (kg)")
	setHeader("BP11", "TALLA (CM)")
	setHeader("BQ11", "PESO ACTUAL (kg)")
	setHeader("BR11", "IMC GESTACIONAL")
	setHeader("BS11", "CLASIFICACION DEL RIESGO NUTRICIONAL")
	setHeader("CI11", "ENTREGA DE MICRONUTRIENTES")
	setHeader("CJ11", "HIERRO")
	setHeader("CK11", "ACIDO FOLICO")
	setHeader("CL11", "CALCIO")
	setHeader("CN11", "HB")
	setHeader("CO11", "HCTO")
	setHeader("CP11", "PLAQUETAS")
	setHeader("CR11", "IGG")
	setHeader("CS11", "IGG")
	setHeader("CT11", "IGM")
	setHeader("CU11", "PRUEBA DE AVIDEZ (MENOR DE 16 SEM)")
	setHeader("CV11", "IgA (MAYOR DE 16 SEM)")
	setHeader("CZ11", "ECOGRAFIA SEMANA 10+ 6 DIAS Y 13 SEMANAS+ 6 DIAS(TAMIZAJE DE TRISOMIA 13, 18 Y 21)")
	setHeader("DB11", "ENTREGA DE MICRONUTRIENTES")
	setHeader("DC11", "HIERRO")
	setHeader("DD11", "ACIDO FOLICO")
	setHeader("DE11", "CALCIO")
	setHeader("DP11", "ENTREGA DE MICRONUTRIENTES")
	setHeader("DQ11", "HIERRO")
	setHeader("DR11", "ACIDO FOLICO")
	setHeader("DS11", "CALCIO")
	setHeader("EF11", "ENTREGA DE MICRONUTRIENTES")
	setHeader("EG11", "HIERRO")
	setHeader("EH11", "ACIDO FOLICO")
	setHeader("EI11", "CALCIO")
	setHeader("EU11", "ENTREGA DE MICRONUTRIENTES")
	setHeader("EV11", "HIERRO")
	setHeader("EW11", "ACIDO FOLICO")
	setHeader("EX11", "CALCIO")
	setHeader("FK11", "ENTREGA DE MICRONUTRIENTES")
	setHeader("FL11", "HIERRO")
	setHeader("FM11", "ACIDO FOLICO")
	setHeader("FN11", "CALCIO")
	setHeader("FQ11", "HB")
	setHeader("FR11", "HTO")
	setHeader("FS11", "PLAQUETAS")
	setHeader("GT11", "ENTREGA DE MICRONUTRIENTES")
	setHeader("GU11", "HIERRO")
	setHeader("GV11", "ACIDO FOLICO")
	setHeader("GW11", "CALCIO")
	setHeader("HJ11", "ENTREGA DE MICRONUTRIENTES")
	setHeader("HK11", "HIERRO")
	setHeader("HL11", "ACIDO FOLICO")
	setHeader("HM11", "CALCIO")
	setHeader("HY11", "ENTREGA DE MICRONUTRIENTES")
	setHeader("HZ11", "HIERRO")
	setHeader("IA11", "ACIDO FOLICO")
	setHeader("IB11", "CALCIO")
	setHeader("IR11", "ENTREGA DE MICRONUTRIENTES")
	setHeader("IS11", "HIERRO")
	setHeader("IT11", "ACIDO FOLICO")
	setHeader("IU11", "CALCIO")
	setHeader("JF11", "ENTREGA DE MICRONUTRIENTES")
	setHeader("JG11", "HIERRO")
	setHeader("JH11", "ACIDO FOLICO")
	setHeader("JI11", "CALCIO")
	setHeader("KC11", "HB")
	setHeader("KD11", "HTO")
	setHeader("KE11", "PLAQUETAS")
	setHeader("KK11", "CULTIVO RECTO-VAGINAL")
	setHeader("KO11", "FECHA TOXOIDE TETANICO")
	setHeader("KP11", "FECHA TÈTANOS, DIFTERIA Y TOSFERINA ACELULAR")
	setHeader("KQ11", "FECHA INFLUENZA ESTACIONAL")
	setHeader("KR11", "FECHA COVID-19 PRIMERA DOSIS")
	setHeader("KS11", "FECHA COVID-19 SEGUNDA DOSIS")
	setHeader("LA11", "PRIMER CONTROL (1ER Y 2DO TRIMESTRE)")
	setHeader("LB11", "SEGUNDO CONTROL (3ER TRIMESTRE)")
	setHeader("LC11", "TERCER CONTROL")
	setHeader("LD11", "PRIMER CONTROL (1 TRIMESTRE)")
	setHeader("LE11", "SEGUNDO CONTROL (2 TRIMESTRE)")
	setHeader("LF11", "PRIMER CONTROL (1ER Y 2DO TRIMESTRE)")
	setHeader("LG11", "SEGUNDO CONTROL (3ER TRIMESTRE)")
	setHeader("LH11", "TERCER CONTROL")
	setHeader("LI11", "PRIMER CONTROL")
	setHeader("LJ11", "SEGUNDO CONTROL")
	setHeader("LW11", "PESO")
	setHeader("LX11", "TALLA")
	setHeader("LY11", "SEXO")
	setHeader("MK11", "FECHA")
	setHeader("ML11", "OBSERVACIÓN")
	setHeader("MM11", "FECHA")
	setHeader("MN11", "OBSERVACIÓN")
	setHeader("MO11", "FECHA")
	setHeader("MP11", "OBSERVACIÓN")
	setHeader("MQ11", "FECHA")
	setHeader("MR11", "OBSERVACIÓN")
	setHeader("MS11", "FECHA")
	setHeader("MT11", "OBSERVACIÓN")
	setHeader("MU11", "FECHA")
	setHeader("MV11", "OBSERVACIÓN")
	setHeader("MW11", "FECHA")
	setHeader("MX11", "OBSERVACIÓN")
	setHeader("MY11", "FECHA")
	setHeader("MZ11", "OBSERVACIÓN")
	setHeader("NA11", "FECHA")
	setHeader("NB11", "OBSERVACIÓN")
	setHeader("NC11", "FECHA")
	setHeader("ND11", "OBSERVACIÓN")
	setHeader("NE11", "FECHA")
	setHeader("NF11", "OBSERVACIÓN")

	// Llenar estilo de fondo y bordes en todo el bloque de encabezado (Filas 8-11, Columnas 1 a NF/370)
	maxCol, _ := excelize.ColumnNameToNumber("NF")
	for r := 8; r <= 11; r++ {
		for c := 1; c <= maxCol; c++ {
			colName, _ := excelize.ColumnNumberToName(c)
			cellRef := fmt.Sprintf("%s%d", colName, r)
			f.SetCellStyle(sheetName, cellRef, cellRef, headerStyle)
		}
	}

	// Llenar Filas de Datos (a partir de la fila 12)
	for i, g := range gestantes {
		rowIdx := 12 + i
		f.SetRowHeight(sheetName, rowIdx, 25)

		// 1. Datos Básicos
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", rowIdx), i+1)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", rowIdx), strVal(g.Region))
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", rowIdx), strVal(g.IpsAtencion))
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", rowIdx), strVal(g.CodigoHabilitacionIPS))
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", rowIdx), strVal(g.Departamento))
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", rowIdx), strVal(g.Municipio))
		f.SetCellValue(sheetName, fmt.Sprintf("G%d", rowIdx), g.Nombres)
		f.SetCellValue(sheetName, fmt.Sprintf("H%d", rowIdx), g.Apellidos)
		f.SetCellValue(sheetName, fmt.Sprintf("I%d", rowIdx), g.TipoIdentificacion)
		f.SetCellValue(sheetName, fmt.Sprintf("J%d", rowIdx), g.NumeroIdentificacion)
		f.SetCellValue(sheetName, fmt.Sprintf("K%d", rowIdx), strVal(g.EstadoCivil))
		f.SetCellValue(sheetName, fmt.Sprintf("L%d", rowIdx), fmtDateGo(&g.FechaNacimiento))
		f.SetCellValue(sheetName, fmt.Sprintf("M%d", rowIdx), strVal(g.EdadActual))
		f.SetCellValue(sheetName, fmt.Sprintf("N%d", rowIdx), strVal(g.Escolaridad))
		f.SetCellValue(sheetName, fmt.Sprintf("O%d", rowIdx), strVal(g.MunicipioResidencia))
		f.SetCellValue(sheetName, fmt.Sprintf("P%d", rowIdx), strVal(g.Direccion))
		f.SetCellValue(sheetName, fmt.Sprintf("Q%d", rowIdx), strVal(g.Barrio))
		f.SetCellValue(sheetName, fmt.Sprintf("R%d", rowIdx), strVal(g.TelefonoCel1))
		f.SetCellValue(sheetName, fmt.Sprintf("S%d", rowIdx), strVal(g.TelefonoCel2))
		f.SetCellValue(sheetName, fmt.Sprintf("T%d", rowIdx), strVal(g.OcupacionOficio))
		f.SetCellValue(sheetName, fmt.Sprintf("U%d", rowIdx), strVal(g.Etnia))
		f.SetCellValue(sheetName, fmt.Sprintf("V%d", rowIdx), strVal(g.IdentidadGenero))
		f.SetCellValue(sheetName, fmt.Sprintf("W%d", rowIdx), strVal(g.Discapacidad))
		f.SetCellValue(sheetName, fmt.Sprintf("X%d", rowIdx), strVal(g.VictimaViolencia))
		f.SetCellValue(sheetName, fmt.Sprintf("Y%d", rowIdx), strVal(g.CaracterizacionPoblacion))
		f.SetCellValue(sheetName, fmt.Sprintf("JZ%d", rowIdx), strVal(g.GestanteCuatroOMasCPN))
		f.SetCellValue(sheetName, fmt.Sprintf("KA%d", rowIdx), strVal(g.AdherenciaCPN))
		f.SetCellValue(sheetName, fmt.Sprintf("KB%d", rowIdx), strVal(g.CausaNoAdherenciaCPN))

		// 2. Antecedentes
		if g.Antecedentes != nil {
			ant := g.Antecedentes
			f.SetCellValue(sheetName, fmt.Sprintf("AW%d", rowIdx), strVal(ant.Gestaciones))
			f.SetCellValue(sheetName, fmt.Sprintf("AX%d", rowIdx), strVal(ant.PartosVaginales))
			f.SetCellValue(sheetName, fmt.Sprintf("AY%d", rowIdx), strVal(ant.Cesareas))
			f.SetCellValue(sheetName, fmt.Sprintf("AZ%d", rowIdx), strVal(ant.Vivos))
			f.SetCellValue(sheetName, fmt.Sprintf("BA%d", rowIdx), strVal(ant.Mortinato))
			f.SetCellValue(sheetName, fmt.Sprintf("BB%d", rowIdx), strVal(ant.Obito))
			f.SetCellValue(sheetName, fmt.Sprintf("BC%d", rowIdx), strVal(ant.Aborto))
			f.SetCellValue(sheetName, fmt.Sprintf("BD%d", rowIdx), strVal(ant.Malformacion))
			f.SetCellValue(sheetName, fmt.Sprintf("BE%d", rowIdx), strVal(ant.Ectopicos))
			f.SetCellValue(sheetName, fmt.Sprintf("BF%d", rowIdx), strVal(ant.OtrosEventosObstetricos))
			f.SetCellValue(sheetName, fmt.Sprintf("BG%d", rowIdx), strVal(ant.Hipertension))
			f.SetCellValue(sheetName, fmt.Sprintf("BH%d", rowIdx), strVal(ant.DiabetesMellitus))
			f.SetCellValue(sheetName, fmt.Sprintf("BI%d", rowIdx), strVal(ant.LupusEritematoso))
			f.SetCellValue(sheetName, fmt.Sprintf("BJ%d", rowIdx), strVal(ant.Preeclampsia))
			f.SetCellValue(sheetName, fmt.Sprintf("BK%d", rowIdx), strVal(ant.Eclampsia))
			f.SetCellValue(sheetName, fmt.Sprintf("BL%d", rowIdx), strVal(ant.DiabetesGestacional))
			f.SetCellValue(sheetName, fmt.Sprintf("BM%d", rowIdx), strVal(ant.OtrosAntecedentesPersonales))
			f.SetCellValue(sheetName, fmt.Sprintf("BN%d", rowIdx), strVal(ant.AntecedentesFamiliares))
		}

		// 3. Ingreso CPN
		if g.IngresoCPN != nil {
			ing := g.IngresoCPN
			f.SetCellValue(sheetName, fmt.Sprintf("Z%d", rowIdx), strVal(ing.AtencionPreconcepcionalPlan))
			f.SetCellValue(sheetName, fmt.Sprintf("AA%d", rowIdx), strVal(ing.AsesoriaMetodoPrevio))
			f.SetCellValue(sheetName, fmt.Sprintf("AB%d", rowIdx), strVal(ing.AcidoFolicoPrevio))
			f.SetCellValue(sheetName, fmt.Sprintf("AC%d", rowIdx), strVal(ing.CitasPreconcepcionales))
			f.SetCellValue(sheetName, fmt.Sprintf("AD%d", rowIdx), fmtDateGo(ing.FechaInscripcionCPN))
			f.SetCellValue(sheetName, fmt.Sprintf("AE%d", rowIdx), strVal(ing.EdadGestacionalInicio))
			f.SetCellValue(sheetName, fmt.Sprintf("AF%d", rowIdx), strVal(ing.EmbarazoDeseado))
			f.SetCellValue(sheetName, fmt.Sprintf("AG%d", rowIdx), strVal(ing.RedApoyo))
			f.SetCellValue(sheetName, fmt.Sprintf("AH%d", rowIdx), strVal(ing.TamizajeViolencia))
			f.SetCellValue(sheetName, fmt.Sprintf("AI%d", rowIdx), strVal(ing.TamizajeDepresionHerrera))
			f.SetCellValue(sheetName, fmt.Sprintf("AQ%d", rowIdx), fmtDateGo(ing.Fur))
			f.SetCellValue(sheetName, fmt.Sprintf("AR%d", rowIdx), strVal(ing.EdadGestacionalActual))
			f.SetCellValue(sheetName, fmt.Sprintf("AS%d", rowIdx), strVal(ing.EdadGestacionalEco))
			f.SetCellValue(sheetName, fmt.Sprintf("AT%d", rowIdx), fmtDateGo(ing.Fpp))
			f.SetCellValue(sheetName, fmt.Sprintf("AU%d", rowIdx), strVal(ing.ClasificacionRiesgoActual))
			f.SetCellValue(sheetName, fmt.Sprintf("AV%d", rowIdx), strVal(ing.DiagnosticoARO_Actualizado))
			f.SetCellValue(sheetName, fmt.Sprintf("BX%d", rowIdx), strVal(ing.RiesgoPsicosocial))
			f.SetCellValue(sheetName, fmt.Sprintf("BY%d", rowIdx), strVal(ing.AtributoRiesgoPsicosocial))
			f.SetCellValue(sheetName, fmt.Sprintf("BZ%d", rowIdx), strVal(ing.RiesgoHipertension))
			f.SetCellValue(sheetName, fmt.Sprintf("CA%d", rowIdx), strVal(ing.RiesgoPreeclampsia))
			f.SetCellValue(sheetName, fmt.Sprintf("CB%d", rowIdx), strVal(ing.RiesgoTromboembolico))
			f.SetCellValue(sheetName, fmt.Sprintf("CC%d", rowIdx), strVal(ing.PrescripcionASA))
			f.SetCellValue(sheetName, fmt.Sprintf("BO%d", rowIdx), strVal(ing.PesoPregestacional_kg))
			f.SetCellValue(sheetName, fmt.Sprintf("BP%d", rowIdx), strVal(ing.Talla_cm))
			f.SetCellValue(sheetName, fmt.Sprintf("BQ%d", rowIdx), strVal(ing.PesoActual_kg))
			f.SetCellValue(sheetName, fmt.Sprintf("BR%d", rowIdx), strVal(ing.Imc_Gestacional))
			f.SetCellValue(sheetName, fmt.Sprintf("BS%d", rowIdx), strVal(ing.ClasificacionRiesgoNutricional))
		}

		// 4. Mapeo de Controles Prenatales (1 a 11)
		controlesMap := make(map[int]models.SeguimientoControl)
		for _, ctrl := range g.Controles {
			if ctrl.NumeroControl != nil {
				controlesMap[*ctrl.NumeroControl] = ctrl
			}
		}

		setControlCols := func(n int, fFecha, fEsp, fEg, fTa, fRiesgo, fAro, fTalla, fPeso, fImc, fNutr, fMic, fHierro, fAcido, fCalcio string) {
			if ctrl, ok := controlesMap[n]; ok {
				if fFecha != "" {
					f.SetCellValue(sheetName, fmt.Sprintf("%s%d", fFecha, rowIdx), fmtDateGo(ctrl.FechaCPN))
				}
				if fEsp != "" {
					f.SetCellValue(sheetName, fmt.Sprintf("%s%d", fEsp, rowIdx), strVal(ctrl.Especialidad))
				}
				if fEg != "" {
					f.SetCellValue(sheetName, fmt.Sprintf("%s%d", fEg, rowIdx), strVal(ctrl.EdadGestacional))
				}
				if fTa != "" {
					f.SetCellValue(sheetName, fmt.Sprintf("%s%d", fTa, rowIdx), strVal(ctrl.TensionArterial))
				}
				if fRiesgo != "" {
					f.SetCellValue(sheetName, fmt.Sprintf("%s%d", fRiesgo, rowIdx), strVal(ctrl.RiesgoObstetrico))
				}
				if fAro != "" {
					f.SetCellValue(sheetName, fmt.Sprintf("%s%d", fAro, rowIdx), strVal(ctrl.DiagnosticoARO))
				}
				if fTalla != "" {
					f.SetCellValue(sheetName, fmt.Sprintf("%s%d", fTalla, rowIdx), strVal(ctrl.Talla_cm))
				}
				if fPeso != "" {
					f.SetCellValue(sheetName, fmt.Sprintf("%s%d", fPeso, rowIdx), strVal(ctrl.Peso_kg))
				}
				if fImc != "" {
					f.SetCellValue(sheetName, fmt.Sprintf("%s%d", fImc, rowIdx), strVal(ctrl.Imc))
				}
				if fNutr != "" {
					f.SetCellValue(sheetName, fmt.Sprintf("%s%d", fNutr, rowIdx), strVal(ctrl.ClasificacionNutricional))
				}
				if fMic != "" {
					f.SetCellValue(sheetName, fmt.Sprintf("%s%d", fMic, rowIdx), strVal(ctrl.MicronutrientesEntrega))
				}
				if fHierro != "" {
					f.SetCellValue(sheetName, fmt.Sprintf("%s%d", fHierro, rowIdx), strVal(ctrl.Hierro))
				}
				if fAcido != "" {
					f.SetCellValue(sheetName, fmt.Sprintf("%s%d", fAcido, rowIdx), strVal(ctrl.AcidoFolico))
				}
				if fCalcio != "" {
					f.SetCellValue(sheetName, fmt.Sprintf("%s%d", fCalcio, rowIdx), strVal(ctrl.Calcio))
				}
			}
		}

		setControlCols(1, "BU", "", "", "BZ", "", "", "", "CF", "CG", "CH", "CI", "CJ", "CK", "CL")
		setControlCols(2, "DF", "DG", "DH", "DI", "DJ", "DK", "DL", "DM", "DN", "DO", "DP", "DQ", "DR", "DS")
		setControlCols(3, "DV", "DW", "DX", "DY", "DZ", "EA", "EB", "EC", "ED", "EE", "EF", "EG", "EH", "EI")
		setControlCols(4, "EK", "EL", "EM", "EN", "EO", "EP", "EQ", "ER", "ES", "ET", "EU", "EV", "EW", "EX")
		setControlCols(5, "FA", "FB", "FC", "FD", "FE", "FF", "FG", "FH", "FI", "FJ", "FK", "FL", "FM", "FN")
		setControlCols(6, "GI", "GJ", "GK", "GL", "GM", "GO", "GP", "GQ", "GR", "GS", "GT", "GU", "GV", "GW")
		setControlCols(7, "GZ", "HA", "HB", "HC", "HD", "HE", "HF", "HG", "HH", "HI", "HJ", "HK", "HL", "HM")
		setControlCols(8, "HO", "HP", "HQ", "HR", "HS", "HT", "HU", "HV", "HW", "HX", "HY", "HZ", "IA", "IB")
		setControlCols(9, "IE", "IF", "IG", "IH", "II", "IJ", "IK", "IL", "IM", "IN", "IR", "IS", "IT", "IU")
		setControlCols(10, "IV", "IW", "IX", "IY", "IZ", "JA", "JB", "JC", "JD", "JE", "JF", "JG", "JH", "JI")
		setControlCols(11, "JK", "JL", "JM", "JN", "JO", "JP", "JQ", "JR", "JS", "JT", "JU", "JV", "JW", "JX")

		if ctrl9, ok := controlesMap[9]; ok {
			f.SetCellValue(sheetName, fmt.Sprintf("IP%d", rowIdx), strVal(ctrl9.RiesgoTromboembolicoSem28))
			f.SetCellValue(sheetName, fmt.Sprintf("IQ%d", rowIdx), strVal(ctrl9.RiesgoPsicosocialTrim3))
		}

		// 5. Paraclínicos
		if g.Paraclinicos != nil {
			par := g.Paraclinicos
			f.SetCellValue(sheetName, fmt.Sprintf("AJ%d", rowIdx), strVal(par.Sifilis_Resultado))
			f.SetCellValue(sheetName, fmt.Sprintf("AK%d", rowIdx), fmtDateGo(par.Sifilis_Fecha))
			f.SetCellValue(sheetName, fmt.Sprintf("AL%d", rowIdx), strVal(par.Vih_Resultado))
			f.SetCellValue(sheetName, fmt.Sprintf("AM%d", rowIdx), fmtDateGo(par.Vih_Fecha))
			f.SetCellValue(sheetName, fmt.Sprintf("AN%d", rowIdx), strVal(par.Hbsag_Resultado))
			f.SetCellValue(sheetName, fmt.Sprintf("AO%d", rowIdx), fmtDateGo(par.Hbsag_Fecha))
			f.SetCellValue(sheetName, fmt.Sprintf("AP%d", rowIdx), strVal(par.Chagas_Resultado))
			f.SetCellValue(sheetName, fmt.Sprintf("CM%d", rowIdx), strVal(par.Hemoclasificacion))
			f.SetCellValue(sheetName, fmt.Sprintf("CN%d", rowIdx), strVal(par.Hemograma_HB))
			f.SetCellValue(sheetName, fmt.Sprintf("CO%d", rowIdx), strVal(par.Hemograma_HCTO))
			f.SetCellValue(sheetName, fmt.Sprintf("CP%d", rowIdx), strVal(par.Hemograma_Plaquetas))
			f.SetCellValue(sheetName, fmt.Sprintf("CQ%d", rowIdx), strVal(par.Glicemia))
			f.SetCellValue(sheetName, fmt.Sprintf("CR%d", rowIdx), strVal(par.Igg_Rubeola))
			f.SetCellValue(sheetName, fmt.Sprintf("CS%d", rowIdx), strVal(par.Igg_Toxoplasma))
			f.SetCellValue(sheetName, fmt.Sprintf("CT%d", rowIdx), strVal(par.Igm_Toxoplasma))
			f.SetCellValue(sheetName, fmt.Sprintf("CU%d", rowIdx), strVal(par.AvidezToxoplasma))
			f.SetCellValue(sheetName, fmt.Sprintf("CV%d", rowIdx), strVal(par.Iga_Toxoplasma))
			f.SetCellValue(sheetName, fmt.Sprintf("CW%d", rowIdx), strVal(par.Urocultivo))
			f.SetCellValue(sheetName, fmt.Sprintf("CX%d", rowIdx), strVal(par.Hemoparasitos))
			f.SetCellValue(sheetName, fmt.Sprintf("CY%d", rowIdx), strVal(par.Chagas_Resultado))
			f.SetCellValue(sheetName, fmt.Sprintf("CZ%d", rowIdx), fmtDateGo(par.Ecografia1Trimestre))
			f.SetCellValue(sheetName, fmt.Sprintf("DA%d", rowIdx), strVal(par.Eco1_Interpretacion))
			f.SetCellValue(sheetName, fmt.Sprintf("FQ%d", rowIdx), strVal(par.Hemograma_HB))
			f.SetCellValue(sheetName, fmt.Sprintf("FR%d", rowIdx), strVal(par.Hemograma_HCTO))
			f.SetCellValue(sheetName, fmt.Sprintf("FS%d", rowIdx), strVal(par.Hemograma_Plaquetas))
			f.SetCellValue(sheetName, fmt.Sprintf("FT%d", rowIdx), strVal(par.Ptog_75gr))
			f.SetCellValue(sheetName, fmt.Sprintf("FU%d", rowIdx), strVal(par.Vih_Resultado))
			f.SetCellValue(sheetName, fmt.Sprintf("FV%d", rowIdx), fmtDateGo(par.Vih_Fecha))
			f.SetCellValue(sheetName, fmt.Sprintf("FW%d", rowIdx), strVal(par.Sifilis_Resultado))
			f.SetCellValue(sheetName, fmt.Sprintf("FX%d", rowIdx), fmtDateGo(par.Sifilis_Fecha))
			f.SetCellValue(sheetName, fmt.Sprintf("FZ%d", rowIdx), strVal(par.Hemoparasitos2Trimestre))
			f.SetCellValue(sheetName, fmt.Sprintf("GA%d", rowIdx), fmtDateGo(par.EcografiaDetalle))
			f.SetCellValue(sheetName, fmt.Sprintf("GB%d", rowIdx), strVal(par.EcoDetalle_Interpretacion))
			f.SetCellValue(sheetName, fmt.Sprintf("GC%d", rowIdx), strVal(par.CitologiaCCU))
			f.SetCellValue(sheetName, fmt.Sprintf("GD%d", rowIdx), strVal(par.Sifilis_Diagnostico))
			f.SetCellValue(sheetName, fmt.Sprintf("GE%d", rowIdx), strVal(par.Sifilis_EgInicioTratamiento))
			f.SetCellValue(sheetName, fmt.Sprintf("GF%d", rowIdx), strVal(par.Sifilis_Tratamiento))
			f.SetCellValue(sheetName, fmt.Sprintf("GG%d", rowIdx), strVal(par.Sifilis_TratamientoOportuno))
			f.SetCellValue(sheetName, fmt.Sprintf("GH%d", rowIdx), strVal(par.Sifilis_ContactosTratados))
			f.SetCellValue(sheetName, fmt.Sprintf("KC%d", rowIdx), strVal(par.Hemograma3_HB))
			f.SetCellValue(sheetName, fmt.Sprintf("KD%d", rowIdx), strVal(par.Hemograma3_HCTO))
			f.SetCellValue(sheetName, fmt.Sprintf("KE%d", rowIdx), strVal(par.Hemograma3_Plaquetas))
			f.SetCellValue(sheetName, fmt.Sprintf("KF%d", rowIdx), strVal(par.Hemoparasitos3Trimestre))
			f.SetCellValue(sheetName, fmt.Sprintf("KG%d", rowIdx), strVal(par.Vih3_Resultado))
			f.SetCellValue(sheetName, fmt.Sprintf("KH%d", rowIdx), fmtDateGo(par.Vih3_Fecha))
			f.SetCellValue(sheetName, fmt.Sprintf("KI%d", rowIdx), strVal(par.Sifilis3_Resultado))
			f.SetCellValue(sheetName, fmt.Sprintf("KJ%d", rowIdx), fmtDateGo(par.Sifilis3_Fecha))
			f.SetCellValue(sheetName, fmt.Sprintf("KK%d", rowIdx), strVal(par.EstreptococoB))
		}

		// 6. Vacunación, Interdisciplinarios y Posparto
		if g.EgresoYPosparto != nil {
			eg := g.EgresoYPosparto
			f.SetCellValue(sheetName, fmt.Sprintf("KL%d", rowIdx), fmtDateGo(eg.FechaValoracionPediatria))
			f.SetCellValue(sheetName, fmt.Sprintf("KM%d", rowIdx), strVal(eg.AsesoriaIVE))
			f.SetCellValue(sheetName, fmt.Sprintf("KN%d", rowIdx), fmtDateGo(eg.FechaAsesoriaAnticoncepcion))
			f.SetCellValue(sheetName, fmt.Sprintf("KO%d", rowIdx), fmtDateGo(eg.FechaToxoideTetanico))
			f.SetCellValue(sheetName, fmt.Sprintf("KP%d", rowIdx), fmtDateGo(eg.FechaTdap))
			f.SetCellValue(sheetName, fmt.Sprintf("KQ%d", rowIdx), fmtDateGo(eg.FechaInfluenza))
			f.SetCellValue(sheetName, fmt.Sprintf("KR%d", rowIdx), fmtDateGo(eg.FechaCovid1))
			f.SetCellValue(sheetName, fmt.Sprintf("KS%d", rowIdx), fmtDateGo(eg.FechaCovid2))
			f.SetCellValue(sheetName, fmt.Sprintf("KT%d", rowIdx), fmtDateGo(eg.CursosMaternidad_F1))
			f.SetCellValue(sheetName, fmt.Sprintf("KU%d", rowIdx), fmtDateGo(eg.CursosMaternidad_F2))
			f.SetCellValue(sheetName, fmt.Sprintf("KV%d", rowIdx), fmtDateGo(eg.CursosMaternidad_F3))
			f.SetCellValue(sheetName, fmt.Sprintf("KW%d", rowIdx), fmtDateGo(eg.CursosMaternidad_F4))
			f.SetCellValue(sheetName, fmt.Sprintf("KX%d", rowIdx), fmtDateGo(eg.CursosMaternidad_F5))
			f.SetCellValue(sheetName, fmt.Sprintf("KY%d", rowIdx), fmtDateGo(eg.CursosMaternidad_F6))
			f.SetCellValue(sheetName, fmt.Sprintf("KZ%d", rowIdx), fmtDateGo(eg.CursosMaternidad_F7))
			f.SetCellValue(sheetName, fmt.Sprintf("LA%d", rowIdx), fmtDateGo(eg.Nutricion_Ctrl1))
			f.SetCellValue(sheetName, fmt.Sprintf("LB%d", rowIdx), fmtDateGo(eg.Nutricion_Ctrl2))
			f.SetCellValue(sheetName, fmt.Sprintf("LC%d", rowIdx), fmtDateGo(eg.Nutricion_Ctrl3))
			f.SetCellValue(sheetName, fmt.Sprintf("LD%d", rowIdx), fmtDateGo(eg.Odontologia_Ctrl1))
			f.SetCellValue(sheetName, fmt.Sprintf("LE%d", rowIdx), fmtDateGo(eg.Odontologia_Ctrl2))
			f.SetCellValue(sheetName, fmt.Sprintf("LF%d", rowIdx), fmtDateGo(eg.Psicologia_Ctrl1))
			f.SetCellValue(sheetName, fmt.Sprintf("LG%d", rowIdx), fmtDateGo(eg.Psicologia_Ctrl2))
			f.SetCellValue(sheetName, fmt.Sprintf("LH%d", rowIdx), fmtDateGo(eg.Psicologia_Ctrl3))
			f.SetCellValue(sheetName, fmt.Sprintf("LI%d", rowIdx), fmtDateGo(eg.TrabajoSocial_Ctrl1))
			f.SetCellValue(sheetName, fmt.Sprintf("LJ%d", rowIdx), fmtDateGo(eg.TrabajoSocial_Ctrl2))
			f.SetCellValue(sheetName, fmt.Sprintf("LK%d", rowIdx), fmtDateGo(eg.FechaEntregaPreservativos))
			f.SetCellValue(sheetName, fmt.Sprintf("LL%d", rowIdx), fmtDateGo(eg.FechaConsejeríaLactanciaPrenatal))
			f.SetCellValue(sheetName, fmt.Sprintf("LM%d", rowIdx), strVal(eg.MorbilidadMaternaExtrema))
			f.SetCellValue(sheetName, fmt.Sprintf("LN%d", rowIdx), strVal(eg.Cie10MME))
			f.SetCellValue(sheetName, fmt.Sprintf("LO%d", rowIdx), strVal(eg.InfeccionZika))
			f.SetCellValue(sheetName, fmt.Sprintf("LP%d", rowIdx), strVal(eg.InstitucionParto))
			f.SetCellValue(sheetName, fmt.Sprintf("LQ%d", rowIdx), strVal(eg.EventoObstetrico))
			f.SetCellValue(sheetName, fmt.Sprintf("LR%d", rowIdx), fmtDateGo(eg.FechaEvento))
			f.SetCellValue(sheetName, fmt.Sprintf("LS%d", rowIdx), strVal(eg.PartoHumanizado))
			f.SetCellValue(sheetName, fmt.Sprintf("LT%d", rowIdx), strVal(eg.ConsejeríaPostpartoLactancia))
			f.SetCellValue(sheetName, fmt.Sprintf("LU%d", rowIdx), strVal(eg.EdadGestacionalParto))
			f.SetCellValue(sheetName, fmt.Sprintf("LV%d", rowIdx), strVal(eg.EstadoRecienNacido))
			f.SetCellValue(sheetName, fmt.Sprintf("LW%d", rowIdx), strVal(eg.PesoRN_gr))
			f.SetCellValue(sheetName, fmt.Sprintf("LX%d", rowIdx), strVal(eg.TallaRN_cm))
			f.SetCellValue(sheetName, fmt.Sprintf("LY%d", rowIdx), strVal(eg.SexoRN))
			f.SetCellValue(sheetName, fmt.Sprintf("LZ%d", rowIdx), fmtDateGo(eg.FechaParto))
			f.SetCellValue(sheetName, fmt.Sprintf("MA%d", rowIdx), strVal(eg.ResultadoTSH_RN))
			f.SetCellValue(sheetName, fmt.Sprintf("MB%d", rowIdx), strVal(eg.TamizajeAuditivoRN))
			f.SetCellValue(sheetName, fmt.Sprintf("MC%d", rowIdx), fmtDateGo(eg.FechaAltaRN))
			f.SetCellValue(sheetName, fmt.Sprintf("MD%d", rowIdx), fmtDateGo(eg.FechaConsultaRN_5dias))
			f.SetCellValue(sheetName, fmt.Sprintf("ME%d", rowIdx), fmtDateGo(eg.FechaAltaPuerpera))
			f.SetCellValue(sheetName, fmt.Sprintf("MF%d", rowIdx), fmtDateGo(eg.FechaConsultaPuerpera_5dias))
			f.SetCellValue(sheetName, fmt.Sprintf("MG%d", rowIdx), strVal(eg.ProvisionAnticonceptivoAlta))
			f.SetCellValue(sheetName, fmt.Sprintf("MH%d", rowIdx), strVal(eg.MetodoAnticonceptivoElegido))
			f.SetCellValue(sheetName, fmt.Sprintf("MI%d", rowIdx), strVal(eg.EntregaMedicamentosEgreso))
			f.SetCellValue(sheetName, fmt.Sprintf("MJ%d", rowIdx), strVal(eg.MotivoCierreCaso))
		}

		// 7. Seguimientos Telefónicos (1 a 11)
		seguimMap := make(map[int]models.SeguimientoTelefonico)
		for _, seg := range g.SeguimientosTelef {
			if seg.NumeroSeguimiento != nil {
				seguimMap[*seg.NumeroSeguimiento] = seg
			}
		}

		setSegCols := func(n int, fFecha, fObs string) {
			if seg, ok := seguimMap[n]; ok {
				if fFecha != "" {
					f.SetCellValue(sheetName, fmt.Sprintf("%s%d", fFecha, rowIdx), fmtDateGo(seg.Fecha))
				}
				if fObs != "" {
					f.SetCellValue(sheetName, fmt.Sprintf("%s%d", fObs, rowIdx), strVal(seg.Observacion))
				}
			}
		}

		setSegCols(1, "MK", "ML")
		setSegCols(2, "MM", "MN")
		setSegCols(3, "MO", "MP")
		setSegCols(4, "MQ", "MR")
		setSegCols(5, "MS", "MT")
		setSegCols(6, "MU", "MV")
		setSegCols(7, "MW", "MX")
		setSegCols(8, "MY", "MZ")
		setSegCols(9, "NA", "NB")
		setSegCols(10, "NC", "ND")
		setSegCols(11, "NE", "NF")

		// Aplicar bordes a todas las celdas de la fila de datos
		for c := 1; c <= maxCol; c++ {
			colName, _ := excelize.ColumnNumberToName(c)
			cellRef := fmt.Sprintf("%s%d", colName, rowIdx)
			f.SetCellStyle(sheetName, cellRef, cellRef, dataStyle)
		}
	}

	// Ajustar anchos de columnas principales
	for c := 1; c <= maxCol; c++ {
		colName, _ := excelize.ColumnNumberToName(c)
		f.SetColWidth(sheetName, colName, colName, 18)
	}
	f.SetColWidth(sheetName, "A", "A", 12)
	f.SetColWidth(sheetName, "G", "G", 25)
	f.SetColWidth(sheetName, "H", "H", 25)
	f.SetColWidth(sheetName, "J", "J", 18)
	f.SetColWidth(sheetName, "P", "P", 30)
	f.SetColWidth(sheetName, "AW", "AW", 35)

	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func ExportFomagAll(c *gin.Context) {
	var gestantes []models.Gestante
	err := config.DB.Preload("CreadaPor").
		Preload("Antecedentes").
		Preload("IngresoCPN").
		Preload("Controles").
		Preload("Paraclinicos").
		Preload("EgresoYPosparto").
		Preload("SeguimientosTelef").
		Find(&gestantes).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al consultar gestantes para FOMAG"})
		return
	}

	excelBytes, err := generateFomagExcelGo(gestantes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al generar archivo Excel FOMAG"})
		return
	}

	fileName := fmt.Sprintf("FOMAG_Toda_Cohorte_%s.xlsx", time.Now().Format("2006-01-02"))
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, fileName))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", excelBytes)
}

func ExportFomagSingle(c *gin.Context) {
	idStr := c.Param("gestanteId")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID de gestante inválido"})
		return
	}

	var gestante models.Gestante
	err = config.DB.Preload("CreadaPor").
		Preload("Antecedentes").
		Preload("IngresoCPN").
		Preload("Controles").
		Preload("Paraclinicos").
		Preload("EgresoYPosparto").
		Preload("SeguimientosTelef").
		First(&gestante, id).Error

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Gestante no encontrada"})
		return
	}

	excelBytes, err := generateFomagExcelGo([]models.Gestante{gestante})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al generar archivo Excel FOMAG"})
		return
	}

	fileName := fmt.Sprintf("FOMAG_%s.xlsx", gestante.NumeroIdentificacion)
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, fileName))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", excelBytes)
}

func ImportFomag(c *gin.Context) {
	file, err := c.FormFile("archivo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No se recibió el archivo Excel"})
		return
	}

	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al abrir el archivo subido"})
		return
	}
	defer f.Close()

	buf := new(bytes.Buffer)
	buf.ReadFrom(f)

	xlsx, err := excelize.OpenReader(buf)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El archivo no es un Excel válido"})
		return
	}
	defer xlsx.Close()

	sheetName := xlsx.GetSheetName(0)
	sheets := xlsx.GetSheetList()
	for _, s := range sheets {
		if strings.Contains(strings.ToLower(s), "cohorte") {
			sheetName = s
			break
		}
	}

	rows, err := xlsx.GetRows(sheetName)
	if err != nil || len(rows) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No se encontraron filas de datos en la hoja de Excel"})
		return
	}

	creados := 0
	actualizados := 0
	type ErrorItem struct {
		Fila      int    `json:"fila"`
		Documento string `json:"documento"`
		Error     string `json:"error"`
	}
	var errores []ErrorItem

	getColHeaderMap := make(map[string]int)

	// Detectar automáticamente la fila de encabezados
	headerRowIdx := -1
	for idx := 0; idx < len(rows) && idx < 20; idx++ {
		rowText := strings.ToUpper(strings.Join(rows[idx], " "))
		if strings.Contains(rowText, "IDENTIFICACION") || strings.Contains(rowText, "IDENTIFICACIÓN") || strings.Contains(rowText, "DOCUMENTO") || strings.Contains(rowText, "NOMBRES") {
			headerRowIdx = idx
			break
		}
	}

	if headerRowIdx >= 0 && headerRowIdx < len(rows) {
		for cIdx, val := range rows[headerRowIdx] {
			cleanVal := strings.ToUpper(strings.TrimSpace(val))
			if cleanVal != "" {
				getColHeaderMap[cleanVal] = cIdx
			}
		}
	}

	getCol := func(row []string, colStr string, altTitles ...string) string {
		for _, title := range altTitles {
			if cIdx, ok := getColHeaderMap[strings.ToUpper(strings.TrimSpace(title))]; ok && cIdx < len(row) {
				v := strings.TrimSpace(row[cIdx])
				if v != "" {
					return v
				}
			}
		}
		num, _ := excelize.ColumnNameToNumber(colStr)
		idx := num - 1
		if idx >= 0 && idx < len(row) {
			return strings.TrimSpace(row[idx])
		}
		return ""
	}

	setStr := func(target **string, val string) {
		val = strings.TrimSpace(val)
		if val != "" {
			*target = &val
		}
	}

	setStrVal := func(target *string, val string) {
		val = strings.TrimSpace(val)
		if val != "" {
			*target = val
		}
	}

	setDate := func(target **time.Time, val string) {
		val = strings.TrimSpace(val)
		if val != "" {
			if t, err := parseDateString(val); err == nil && !t.IsZero() {
				*target = &t
			}
		}
	}

	setDateVal := func(target *time.Time, val string) {
		val = strings.TrimSpace(val)
		if val != "" {
			if t, err := parseDateString(val); err == nil && !t.IsZero() {
				*target = t
			}
		}
	}

	// Determinar fila de inicio para los datos
	startRow := 11
	if headerRowIdx != -1 {
		startRow = headerRowIdx + 1
	} else if len(rows) > 1 && len(rows) < 12 {
		startRow = 1
	}

	userIDVal, _ := c.Get("userId")
	userID, _ := userIDVal.(uint)

	for rIdx := startRow; rIdx < len(rows); rIdx++ {
		row := rows[rIdx]
		numIdent := getCol(row, "J", "No DE IDENTIFICACION", "Nº DE IDENTIFICACION", "NUMERO DE IDENTIFICACION", "DOCUMENTO", "IDENTIFICACION")
		nombres := getCol(row, "G", "NOMBRES", "NOMBRE")
		apellidos := getCol(row, "H", "APELLIDOS", "APELLIDO")

		if numIdent == "" && nombres == "" {
			continue
		}
		if numIdent == "" {
			numIdent = fmt.Sprintf("TEMP_%d", rIdx+1)
		}

		var gestante models.Gestante
		res := config.DB.Where("numero_identificacion = ?", numIdent).First(&gestante)
		isNew := false

		if res.Error != nil {
			isNew = true
			tipoIdent := getCol(row, "I")
			if tipoIdent == "" {
				tipoIdent = "CC"
			}
			gestante = models.Gestante{
				Nombres:              nombres,
				Apellidos:            apellidos,
				TipoIdentificacion:   tipoIdent,
				NumeroIdentificacion: numIdent,
				CreadaPorID:          userID,
			}
			if err := config.DB.Create(&gestante).Error; err != nil {
				errores = append(errores, ErrorItem{Fila: rIdx + 1, Documento: numIdent, Error: err.Error()})
				continue
			}
		}

		// 1. Datos Básicos Gestante
		setStr(&gestante.Region, getCol(row, "B"))
		setStr(&gestante.IpsAtencion, getCol(row, "C"))
		setStr(&gestante.CodigoHabilitacionIPS, getCol(row, "D"))
		setStr(&gestante.Departamento, getCol(row, "E"))
		setStr(&gestante.Municipio, getCol(row, "F"))
		if nombres != "" { gestante.Nombres = nombres }
		if apellidos != "" { gestante.Apellidos = apellidos }
		setStrVal(&gestante.TipoIdentificacion, getCol(row, "I"))
		setStr(&gestante.EstadoCivil, getCol(row, "K"))
		setDateVal(&gestante.FechaNacimiento, getCol(row, "L"))
		setStr(&gestante.EdadActual, getCol(row, "M"))
		setStr(&gestante.Escolaridad, getCol(row, "N"))
		setStr(&gestante.MunicipioResidencia, getCol(row, "O"))
		setStr(&gestante.Direccion, getCol(row, "P"))
		setStr(&gestante.Barrio, getCol(row, "Q"))
		setStr(&gestante.TelefonoCel1, getCol(row, "R"))
		setStr(&gestante.TelefonoCel2, getCol(row, "S"))
		setStr(&gestante.OcupacionOficio, getCol(row, "T"))
		setStr(&gestante.Etnia, getCol(row, "U"))
		setStr(&gestante.IdentidadGenero, getCol(row, "V"))
		setStr(&gestante.Discapacidad, getCol(row, "W"))
		setStr(&gestante.VictimaViolencia, getCol(row, "X"))
		setStr(&gestante.CaracterizacionPoblacion, getCol(row, "Y"))
		setStr(&gestante.GestanteCuatroOMasCPN, getCol(row, "JZ"))
		setStr(&gestante.AdherenciaCPN, getCol(row, "KA"))
		setStr(&gestante.CausaNoAdherenciaCPN, getCol(row, "KB"))
		config.DB.Save(&gestante)

		// 2. Antecedentes Clínicos
		var ant models.AntecedenteClinico
		config.DB.FirstOrCreate(&ant, models.AntecedenteClinico{GestanteID: gestante.ID})
		setStr(&ant.Gestaciones, getCol(row, "AW"))
		setStr(&ant.PartosVaginales, getCol(row, "AX"))
		setStr(&ant.Cesareas, getCol(row, "AY"))
		setStr(&ant.Vivos, getCol(row, "AZ"))
		setStr(&ant.Mortinato, getCol(row, "BA"))
		setStr(&ant.Obito, getCol(row, "BB"))
		setStr(&ant.Aborto, getCol(row, "BC"))
		setStr(&ant.Malformacion, getCol(row, "BD"))
		setStr(&ant.Ectopicos, getCol(row, "BE"))
		setStr(&ant.OtrosEventosObstetricos, getCol(row, "BF"))
		setStr(&ant.Hipertension, getCol(row, "BG"))
		setStr(&ant.DiabetesMellitus, getCol(row, "BH"))
		setStr(&ant.LupusEritematoso, getCol(row, "BI"))
		setStr(&ant.Preeclampsia, getCol(row, "BJ"))
		setStr(&ant.Eclampsia, getCol(row, "BK"))
		setStr(&ant.DiabetesGestacional, getCol(row, "BL"))
		setStr(&ant.OtrosAntecedentesPersonales, getCol(row, "BM"))
		setStr(&ant.AntecedentesFamiliares, getCol(row, "BN"))
		config.DB.Save(&ant)

		// 3. Ingreso CPN
		var ing models.IngresoCPN
		config.DB.FirstOrCreate(&ing, models.IngresoCPN{GestanteID: gestante.ID})
		setStr(&ing.AtencionPreconcepcionalPlan, getCol(row, "Z"))
		setStr(&ing.AsesoriaMetodoPrevio, getCol(row, "AA"))
		setStr(&ing.AcidoFolicoPrevio, getCol(row, "AB"))
		setStr(&ing.CitasPreconcepcionales, getCol(row, "AC"))
		setDate(&ing.FechaInscripcionCPN, getCol(row, "AD"))
		setStr(&ing.EdadGestacionalInicio, getCol(row, "AE"))
		setStr(&ing.EmbarazoDeseado, getCol(row, "AF"))
		setStr(&ing.RedApoyo, getCol(row, "AG"))
		setStr(&ing.TamizajeViolencia, getCol(row, "AH"))
		setStr(&ing.TamizajeDepresionHerrera, getCol(row, "AI"))
		setDate(&ing.Fur, getCol(row, "AQ"))
		setStr(&ing.EdadGestacionalActual, getCol(row, "AR"))
		setStr(&ing.EdadGestacionalEco, getCol(row, "AS"))
		setDate(&ing.Fpp, getCol(row, "AT"))
		setStr(&ing.ClasificacionRiesgoActual, getCol(row, "AU"))
		setStr(&ing.DiagnosticoARO_Actualizado, getCol(row, "AV"))
		setStr(&ing.RiesgoPsicosocial, getCol(row, "BX"))
		setStr(&ing.AtributoRiesgoPsicosocial, getCol(row, "BY"))
		setStr(&ing.RiesgoHipertension, getCol(row, "BZ"))
		setStr(&ing.RiesgoPreeclampsia, getCol(row, "CA"))
		setStr(&ing.RiesgoTromboembolico, getCol(row, "CB"))
		setStr(&ing.PrescripcionASA, getCol(row, "CC"))
		setStr(&ing.PesoPregestacional_kg, getCol(row, "BO"))
		setStr(&ing.Talla_cm, getCol(row, "BP"))
		setStr(&ing.PesoActual_kg, getCol(row, "BQ"))
		setStr(&ing.Imc_Gestacional, getCol(row, "BR"))
		setStr(&ing.ClasificacionRiesgoNutricional, getCol(row, "BS"))
		config.DB.Save(&ing)

		// 4. Paraclínicos
		var par models.Paraclinico
		config.DB.FirstOrCreate(&par, models.Paraclinico{GestanteID: gestante.ID})
		setStr(&par.Sifilis_Resultado, getCol(row, "AJ"))
		setDate(&par.Sifilis_Fecha, getCol(row, "AK"))
		setStr(&par.Vih_Resultado, getCol(row, "AL"))
		setDate(&par.Vih_Fecha, getCol(row, "AM"))
		setStr(&par.Hbsag_Resultado, getCol(row, "AN"))
		setDate(&par.Hbsag_Fecha, getCol(row, "AO"))
		setStr(&par.Chagas_Resultado, getCol(row, "AP"))
		setStr(&par.Hemoclasificacion, getCol(row, "CM"))
		setStr(&par.Hemograma_HB, getCol(row, "CN"))
		setStr(&par.Hemograma_HCTO, getCol(row, "CO"))
		setStr(&par.Hemograma_Plaquetas, getCol(row, "CP"))
		setStr(&par.Glicemia, getCol(row, "CQ"))
		setStr(&par.Igg_Rubeola, getCol(row, "CR"))
		setStr(&par.Igg_Toxoplasma, getCol(row, "CS"))
		setStr(&par.Igm_Toxoplasma, getCol(row, "CT"))
		setStr(&par.AvidezToxoplasma, getCol(row, "CU"))
		setStr(&par.Iga_Toxoplasma, getCol(row, "CV"))
		setStr(&par.Urocultivo, getCol(row, "CW"))
		setStr(&par.Hemoparasitos, getCol(row, "CX"))
		setDate(&par.Ecografia1Trimestre, getCol(row, "CZ"))
		setStr(&par.Eco1_Interpretacion, getCol(row, "DA"))
		setStr(&par.Ptog_75gr, getCol(row, "FT"))
		setDate(&par.EcografiaDetalle, getCol(row, "GA"))
		setStr(&par.EcoDetalle_Interpretacion, getCol(row, "GB"))
		setStr(&par.CitologiaCCU, getCol(row, "GC"))
		setStr(&par.Sifilis_Diagnostico, getCol(row, "GD"))
		setStr(&par.Sifilis_EgInicioTratamiento, getCol(row, "GE"))
		setStr(&par.Sifilis_Tratamiento, getCol(row, "GF"))
		setStr(&par.Sifilis_TratamientoOportuno, getCol(row, "GG"))
		setStr(&par.Sifilis_ContactosTratados, getCol(row, "GH"))
		setStr(&par.Hemograma3_HB, getCol(row, "KC"))
		setStr(&par.Hemograma3_HCTO, getCol(row, "KD"))
		setStr(&par.Hemograma3_Plaquetas, getCol(row, "KE"))
		setStr(&par.Hemoparasitos3Trimestre, getCol(row, "KF"))
		setStr(&par.Vih3_Resultado, getCol(row, "KG"))
		setDate(&par.Vih3_Fecha, getCol(row, "KH"))
		setStr(&par.Sifilis3_Resultado, getCol(row, "KI"))
		setDate(&par.Sifilis3_Fecha, getCol(row, "KJ"))
		setStr(&par.EstreptococoB, getCol(row, "KK"))
		config.DB.Save(&par)

		// 5. Egreso y Posparto
		var eg models.EgresoYPosparto
		config.DB.FirstOrCreate(&eg, models.EgresoYPosparto{GestanteID: gestante.ID})
		setDate(&eg.FechaValoracionPediatria, getCol(row, "KL"))
		setStr(&eg.AsesoriaIVE, getCol(row, "KM"))
		setDate(&eg.FechaAsesoriaAnticoncepcion, getCol(row, "KN"))
		setDate(&eg.FechaToxoideTetanico, getCol(row, "KO"))
		setDate(&eg.FechaTdap, getCol(row, "KP"))
		setDate(&eg.FechaInfluenza, getCol(row, "KQ"))
		setDate(&eg.FechaCovid1, getCol(row, "KR"))
		setDate(&eg.FechaCovid2, getCol(row, "KS"))
		setDate(&eg.CursosMaternidad_F1, getCol(row, "KT"))
		setDate(&eg.CursosMaternidad_F2, getCol(row, "KU"))
		setDate(&eg.CursosMaternidad_F3, getCol(row, "KV"))
		setDate(&eg.CursosMaternidad_F4, getCol(row, "KW"))
		setDate(&eg.CursosMaternidad_F5, getCol(row, "KX"))
		setDate(&eg.CursosMaternidad_F6, getCol(row, "KY"))
		setDate(&eg.CursosMaternidad_F7, getCol(row, "KZ"))
		setDate(&eg.Nutricion_Ctrl1, getCol(row, "LA"))
		setDate(&eg.Nutricion_Ctrl2, getCol(row, "LB"))
		setDate(&eg.Nutricion_Ctrl3, getCol(row, "LC"))
		setDate(&eg.Odontologia_Ctrl1, getCol(row, "LD"))
		setDate(&eg.Odontologia_Ctrl2, getCol(row, "LE"))
		setDate(&eg.Psicologia_Ctrl1, getCol(row, "LF"))
		setDate(&eg.Psicologia_Ctrl2, getCol(row, "LG"))
		setDate(&eg.Psicologia_Ctrl3, getCol(row, "LH"))
		setDate(&eg.TrabajoSocial_Ctrl1, getCol(row, "LI"))
		setDate(&eg.TrabajoSocial_Ctrl2, getCol(row, "LJ"))
		setDate(&eg.FechaEntregaPreservativos, getCol(row, "LK"))
		setDate(&eg.FechaConsejeríaLactanciaPrenatal, getCol(row, "LL"))
		setStr(&eg.MorbilidadMaternaExtrema, getCol(row, "LM"))
		setStr(&eg.Cie10MME, getCol(row, "LN"))
		setStr(&eg.InfeccionZika, getCol(row, "LO"))
		setStr(&eg.InstitucionParto, getCol(row, "LP"))
		setStr(&eg.EventoObstetrico, getCol(row, "LQ"))
		setDate(&eg.FechaEvento, getCol(row, "LR"))
		setStr(&eg.PartoHumanizado, getCol(row, "LS"))
		setStr(&eg.ConsejeríaPostpartoLactancia, getCol(row, "LT"))
		setStr(&eg.EdadGestacionalParto, getCol(row, "LU"))
		setStr(&eg.EstadoRecienNacido, getCol(row, "LV"))
		setStr(&eg.PesoRN_gr, getCol(row, "LW"))
		setStr(&eg.TallaRN_cm, getCol(row, "LX"))
		setStr(&eg.SexoRN, getCol(row, "LY"))
		setDate(&eg.FechaParto, getCol(row, "LZ"))
		setStr(&eg.ResultadoTSH_RN, getCol(row, "MA"))
		setStr(&eg.TamizajeAuditivoRN, getCol(row, "MB"))
		setDate(&eg.FechaAltaRN, getCol(row, "MC"))
		setDate(&eg.FechaConsultaRN_5dias, getCol(row, "MD"))
		setDate(&eg.FechaAltaPuerpera, getCol(row, "ME"))
		setDate(&eg.FechaConsultaPuerpera_5dias, getCol(row, "MF"))
		setStr(&eg.ProvisionAnticonceptivoAlta, getCol(row, "MG"))
		setStr(&eg.MetodoAnticonceptivoElegido, getCol(row, "MH"))
		setStr(&eg.EntregaMedicamentosEgreso, getCol(row, "MI"))
		setStr(&eg.MotivoCierreCaso, getCol(row, "MJ"))
		config.DB.Save(&eg)

		// 6. Controles CPN (1 al 11)
		readControl := func(numCtrl int, fFecha, fEsp, fEg, fTa, fRiesgo, fAro, fTalla, fPeso, fImc, fNutr, fMic, fHierro, fAcido, fCalcio string) {
			fechaVal := getCol(row, fFecha)
			if fechaVal == "" && fEsp != "" && getCol(row, fEsp) == "" {
				return
			}
			var ctrl models.SeguimientoControl
			config.DB.Where("gestante_id = ? AND numero_control = ?", gestante.ID, numCtrl).FirstOrCreate(&ctrl, models.SeguimientoControl{
				GestanteID: gestante.ID,
				NumeroControl: &numCtrl,
			})
			setDate(&ctrl.FechaCPN, fechaVal)
			if fEsp != "" { setStr(&ctrl.Especialidad, getCol(row, fEsp)) }
			if fEg != "" { setStr(&ctrl.EdadGestacional, getCol(row, fEg)) }
			if fTa != "" { setStr(&ctrl.TensionArterial, getCol(row, fTa)) }
			if fRiesgo != "" { setStr(&ctrl.RiesgoObstetrico, getCol(row, fRiesgo)) }
			if fAro != "" { setStr(&ctrl.DiagnosticoARO, getCol(row, fAro)) }
			if fTalla != "" { setStr(&ctrl.Talla_cm, getCol(row, fTalla)) }
			if fPeso != "" { setStr(&ctrl.Peso_kg, getCol(row, fPeso)) }
			if fImc != "" { setStr(&ctrl.Imc, getCol(row, fImc)) }
			if fNutr != "" { setStr(&ctrl.ClasificacionNutricional, getCol(row, fNutr)) }
			if fMic != "" { setStr(&ctrl.MicronutrientesEntrega, getCol(row, fMic)) }
			if fHierro != "" { setStr(&ctrl.Hierro, getCol(row, fHierro)) }
			if fAcido != "" { setStr(&ctrl.AcidoFolico, getCol(row, fAcido)) }
			if fCalcio != "" { setStr(&ctrl.Calcio, getCol(row, fCalcio)) }
			config.DB.Save(&ctrl)
		}

		readControl(1, "BU", "", "", "BZ", "", "", "", "CF", "CG", "CH", "CI", "CJ", "CK", "CL")
		readControl(2, "DF", "DG", "DH", "DI", "DJ", "DK", "DL", "DM", "DN", "DO", "DP", "DQ", "DR", "DS")
		readControl(3, "DV", "DW", "DX", "DY", "DZ", "EA", "EB", "EC", "ED", "EE", "EF", "EG", "EH", "EI")
		readControl(4, "EK", "EL", "EM", "EN", "EO", "EP", "EQ", "ER", "ES", "ET", "EU", "EV", "EW", "EX")
		readControl(5, "FA", "FB", "FC", "FD", "FE", "FF", "FG", "FH", "FI", "FJ", "FK", "FL", "FM", "FN")
		readControl(6, "GI", "GJ", "GK", "GL", "GM", "GO", "GP", "GQ", "GR", "GS", "GT", "GU", "GV", "GW")
		readControl(7, "GZ", "HA", "HB", "HC", "HD", "HE", "HF", "HG", "HH", "HI", "HJ", "HK", "HL", "HM")
		readControl(8, "HO", "HP", "HQ", "HR", "HS", "HT", "HU", "HV", "HW", "HX", "HY", "HZ", "IA", "IB")
		readControl(9, "IE", "IF", "IG", "IH", "II", "IJ", "IK", "IL", "IM", "IN", "IR", "IS", "IT", "IU")
		readControl(10, "IV", "IW", "IX", "IY", "IZ", "JA", "JB", "JC", "JD", "JE", "JF", "JG", "JH", "JI")
		readControl(11, "JK", "JL", "JM", "JN", "JO", "JP", "JQ", "JR", "JS", "JT", "JU", "JV", "JW", "JX")

		// 7. Seguimientos Telefónicos (1 al 11)
		readSeguimiento := func(numSeg int, fFecha, fObs string) {
			fVal := getCol(row, fFecha)
			oVal := getCol(row, fObs)
			if fVal == "" && oVal == "" {
				return
			}
			var seg models.SeguimientoTelefonico
			config.DB.Where("gestante_id = ? AND numero_seguimiento = ?", gestante.ID, numSeg).FirstOrCreate(&seg, models.SeguimientoTelefonico{
				GestanteID: gestante.ID,
				NumeroSeguimiento: &numSeg,
			})
			setDate(&seg.Fecha, fVal)
			setStr(&seg.Observacion, oVal)
			config.DB.Save(&seg)
		}

		readSeguimiento(1, "MK", "ML")
		readSeguimiento(2, "MM", "MN")
		readSeguimiento(3, "MO", "MP")
		readSeguimiento(4, "MQ", "MR")
		readSeguimiento(5, "MS", "MT")
		readSeguimiento(6, "MU", "MV")
		readSeguimiento(7, "MW", "MX")
		readSeguimiento(8, "MY", "MZ")
		readSeguimiento(9, "NA", "NB")
		readSeguimiento(10, "NC", "ND")
		readSeguimiento(11, "NE", "NF")

		// 8. Auto-crear cuenta de usuario para el portal gestante (email: numIdent@maternas.com, clave: numIdent)
		emailFormateado := fmt.Sprintf("%s@maternas.com", numIdent)
		var userCount int64
		config.DB.Model(&models.User{}).Where("email = ? OR email = ?", emailFormateado, numIdent).Count(&userCount)
		if userCount == 0 {
			hashedPass, err := bcrypt.GenerateFromPassword([]byte(numIdent), bcrypt.DefaultCost)
			if err == nil {
				maternaUser := models.User{
					Nombre:   fmt.Sprintf("%s %s", gestante.Nombres, gestante.Apellidos),
					Email:    emailFormateado,
					Password: string(hashedPass),
					Rol:      "GESTANTE",
					Activo:   true,
				}
				config.DB.Create(&maternaUser)
			}
		}

		if isNew {
			creados++
		} else {
			actualizados++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Importación de Matriz FOMAG completada exitosamente",
		"creados":      creados,
		"actualizados": actualizados,
		"errores":      errores,
	})
}
