import React, { useState, useEffect } from 'react';
import { 
  Copy, Check, FileText, X, Sparkles, Sliders, RefreshCw, 
  User, ClipboardList, Microscope, Syringe, AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '../context/NotificationContext';

const ClinicalNoteModal = ({ isOpen, onClose, materna }) => {
  const { notify } = useNotification();
  const [copied, setCopied] = useState(false);
  const [templateType, setTemplateType] = useState('completa'); // 'completa' | 'paraclinicos' | 'remision' | 'ingreso'
  const [conducta, setConducta] = useState('');
  
  // Opciones de secciones a incluir
  const [options, setOptions] = useState({
    includeDemograficos: true,
    includeGestacion: true,
    includeAntecedentes: true,
    includeParaclinicos: true,
    includeVacunas: true,
    includeConducta: true
  });

  if (!isOpen || !materna) return null;

  const ant = materna.antecedentes || {};
  const cpn = materna.ingresoCPN || {};
  const par = materna.paraclinicos || {};
  const egr = materna.egresoYPosparto || {};
  const controles = materna.controles || [];

  // Calcular semanas de gestación
  const calculateWeeks = () => {
    const furStr = cpn.fur || materna.createdAt;
    if (!furStr) return 'N/A';
    const start = new Date(furStr);
    if (isNaN(start.getTime())) return 'N/A';
    const now = new Date();
    const diffDays = Math.max(0, Math.ceil((now - start) / (1000 * 60 * 60 * 24)));
    const w = Math.floor(diffDays / 7);
    const d = diffDays % 7;
    return `${w} semanas + ${d} días`;
  };

  const egText = calculateWeeks();
  const fechaHoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

  // Generación del texto formateado según el tipo de plantilla y secciones seleccionadas
  const generateClinicalText = () => {
    let lines = [];

    // ENCABEZADO
    lines.push(`======================================================================`);
    lines.push(`               HISTORIA CLÍNICA - NOTA DE CONTROL PRENATAL            `);
    lines.push(`======================================================================`);
    lines.push(`FECHA DE REGISTRO: ${fechaHoy}`);
    lines.push(``);

    // 1. DATOS DEMOGRÁFICOS
    if (options.includeDemograficos) {
      lines.push(`----------------------------------------------------------------------`);
      lines.push(`1. DATOS GENERALES DE LA PATIENT`);
      lines.push(`----------------------------------------------------------------------`);
      lines.push(`Paciente: ${materna.nombres || ''} ${materna.apellidos || ''}`.trim());
      lines.push(`Identificación: ${materna.tipoIdentificacion || 'CC'} ${materna.numeroIdentificacion || 'N/A'}`);
      lines.push(`Edad: ${materna.edadActual || 'N/A'} años | Estado Civil: ${materna.estadoCivil || 'Sin especificar'}`);
      lines.push(`IPS de Atención: ${materna.ipsAtencion || materna.ips?.nombre || 'No asignada'}`);
      lines.push(`Ubicación: ${materna.municipio || 'N/A'}, ${materna.departamento || ''}`);
      lines.push(`Teléfono: ${materna.telefonoCel1 || 'N/A'} | Dirección: ${materna.direccion || 'Sin registrar'}`);
      lines.push(``);
    }

    // 2. ESTADO GESTACIONAL ACTUAL & INGRESO CPN
    if (options.includeGestacion) {
      lines.push(`----------------------------------------------------------------------`);
      lines.push(`2. ESTADO GESTACIONAL ACTUAL`);
      lines.push(`----------------------------------------------------------------------`);
      lines.push(`F.U.R (Fecha Última Regla): ${cpn.fur ? new Date(cpn.fur).toLocaleDateString('es-CO') : 'Sin dato'}`);
      lines.push(`F.P.P (Fecha Probable Parto): ${cpn.fpp ? new Date(cpn.fpp).toLocaleDateString('es-CO') : 'Sin dato'}`);
      lines.push(`Edad Gestacional Actual: ${egText}`);
      lines.push(`Clasificación de Riesgo Obstétrico: ${cpn.clasificacionRiesgoActual || 'BAJO RIESGO'}`);
      if (cpn.diagnosticoARO_Actualizado) {
        lines.push(`Diagnósticos ARO / Alertas: ${cpn.diagnosticoARO_Actualizado}`);
      }
      lines.push(`Peso Pregestacional: ${cpn.pesoPregestacional_kg ? cpn.pesoPregestacional_kg + ' kg' : 'N/A'} | Talla: ${cpn.talla_cm ? cpn.talla_cm + ' cm' : 'N/A'}`);
      lines.push(`Peso Actual: ${cpn.pesoActual_kg ? cpn.pesoActual_kg + ' kg' : 'N/A'} | IMC Gestacional: ${cpn.imc_Gestacional || 'Sin calcular'}`);
      lines.push(`Clasificación Nutricional: ${cpn.clasificacionRiesgoNutricional || 'Sin evaluar'}`);
      lines.push(``);
    }

    // 3. ANTECEDENTES OBSTÉTRICOS Y PERSONALES
    if (options.includeAntecedentes) {
      lines.push(`----------------------------------------------------------------------`);
      lines.push(`3. ANTECEDENTES GINECOOBSTÉTRICOS Y PATOLÓGICOS`);
      lines.push(`----------------------------------------------------------------------`);
      lines.push(`Fórmula Obstétrica: Gestaciones: ${ant.gestaciones || 0} | Partos: ${ant.partosVaginales || 0} | Cesáreas: ${ant.cesareas || 0} | Abortos: ${ant.aborto || 0} | Vivos: ${ant.vivos || 0}`);
      lines.push(`Hipertensión (HTA): ${ant.hipertension || 'NO'} | Diabetes Mellitus: ${ant.diabetesMellitus || 'NO'}`);
      lines.push(`Preeclampsia Previa: ${ant.preeclampsia || 'NO'} | Eclampsia: ${ant.eclampsia || 'NO'}`);
      lines.push(`Diabetes Gestacional: ${ant.diabetesGestacional || 'NO'} | Lupus: ${ant.lupusEritematoso || 'NO'}`);
      if (ant.otrosAntecedentesPersonales) lines.push(`Otros Antecedentes Personales: ${ant.otrosAntecedentesPersonales}`);
      if (ant.antecedentesFamiliares) lines.push(`Antecedentes Familiares: ${ant.antecedentesFamiliares}`);
      lines.push(``);
    }

    // 4. PARACLÍNICOS & IMÁGENES DIAGNÓSTICAS
    if (options.includeParaclinicos) {
      lines.push(`----------------------------------------------------------------------`);
      lines.push(`4. EXÁMENES PARACLÍNICOS Y ESTUDIOS DIAGNÓSTICOS`);
      lines.push(`----------------------------------------------------------------------`);
      lines.push(`Hemoclasificación: ${par.hemoclasificacion || 'Sin registrar'}`);
      
      lines.push(`- 1er Trimestre:`);
      lines.push(`  * Hemograma (HB / HCTO / Plaq): ${par.hemograma_HB ? par.hemograma_HB + ' g/dL' : 'Pdt'} / ${par.hemograma_HCTO ? par.hemograma_HCTO + '%' : 'Pdt'} / ${par.hemograma_Plaquetas || 'Pdt'}`);
      lines.push(`  * Glicemia en Ayunas: ${par.glicemia ? par.glicemia + ' mg/dL' : 'Pendiente'}`);
      lines.push(`  * Urocultivo: ${par.urocultivo || 'Pendiente'}`);
      lines.push(`  * Serología Sífilis / VDRL (1T): ${par.sifilis_Resultado || 'Pendiente'} ${par.sifilis_Fecha ? '(' + new Date(par.sifilis_Fecha).toLocaleDateString('es-CO') + ')' : ''}`);
      lines.push(`  * Prueba VIH (1T): ${par.vih_Resultado || 'Pendiente'} ${par.vih_Fecha ? '(' + new Date(par.vih_Fecha).toLocaleDateString('es-CO') + ')' : ''}`);
      lines.push(`  * Antígeno Hepatitis B (HBsAg): ${par.hbsag_Resultado || 'Pendiente'}`);
      lines.push(`  * Rubéola IgG: ${par.igg_Rubeola || 'Pendiente'} | Toxoplasma IgG/IgM: ${par.igg_Toxoplasma || 'Pdt'} / ${par.igm_Toxoplasma || 'Pdt'}`);
      lines.push(`  * Ecografía 1er Trimestre: ${par.ecografia1Trimestre ? new Date(par.ecografia1Trimestre).toLocaleDateString('es-CO') : 'Pendiente'} ${par.eco1_Interpretacion ? '- Obs: ' + par.eco1_Interpretacion : ''}`);

      if (templateType === 'completa' || templateType === 'paraclinicos') {
        lines.push(`- 2do Trimestre:`);
        lines.push(`  * PTOG 75g (Tolerancia a Glucosa): ${par.ptog_75gr || 'Pendiente'}`);
        lines.push(`  * Ecografía Detalle Anatómico: ${par.ecografiaDetalle ? new Date(par.ecografiaDetalle).toLocaleDateString('es-CO') : 'Pendiente'} ${par.ecoDetalle_Interpretacion ? '- Obs: ' + par.ecoDetalle_Interpretacion : ''}`);

        lines.push(`- 3er Trimestre:`);
        lines.push(`  * Hemograma 3T (HB / HCTO / Plaq): ${par.hemograma3_HB ? par.hemograma3_HB + ' g/dL' : 'Pdt'} / ${par.hemograma3_HCTO ? par.hemograma3_HCTO + '%' : 'Pdt'} / ${par.hemograma3_Plaquetas || 'Pdt'}`);
        lines.push(`  * Serología Sífilis (3T): ${par.sifilis3_Resultado || 'Pendiente'} | VIH (3T): ${par.vih3_Resultado || 'Pendiente'}`);
        lines.push(`  * Cultivo Estreptococo Grupo B (STGB): ${par.estreptococoB || 'Pendiente'}`);
      }
      lines.push(``);
    }

    // 5. VACUNACIÓN & INTERDISCIPLINARIOS
    if (options.includeVacunas) {
      lines.push(`----------------------------------------------------------------------`);
      lines.push(`5. VACUNACIÓN Y VALORACIONES INTERDISCIPLINARIAS`);
      lines.push(`----------------------------------------------------------------------`);
      lines.push(`Vacuna Tdap (Tosferina): ${egr.fechaTdap ? new Date(egr.fechaTdap).toLocaleDateString('es-CO') : 'Pendiente'}`);
      lines.push(`Vacuna Influenza: ${egr.fechaInfluenza ? new Date(egr.fechaInfluenza).toLocaleDateString('es-CO') : 'Pendiente'}`);
      lines.push(`Odontología (Ctrl 1): ${egr.odontologia_Ctrl1 ? new Date(egr.odontologia_Ctrl1).toLocaleDateString('es-CO') : 'Pendiente'}`);
      lines.push(`Nutrición (Ctrl 1): ${egr.nutricion_Ctrl1 ? new Date(egr.nutricion_Ctrl1).toLocaleDateString('es-CO') : 'Pendiente'}`);
      lines.push(`Psicología (Ctrl 1): ${egr.psicologia_Ctrl1 ? new Date(egr.psicologia_Ctrl1).toLocaleDateString('es-CO') : 'Pendiente'}`);
      lines.push(`Trabajo Social (Ctrl 1): ${egr.trabajoSocial_Ctrl1 ? new Date(egr.trabajoSocial_Ctrl1).toLocaleDateString('es-CO') : 'Pendiente'}`);
      lines.push(`Asesoría Anticoncepción / IVE: ${egr.fechaAsesoriaAnticoncepcion ? 'Realizada' : 'Pendiente'} | Asesoria IVE: ${egr.asesoriaIVE || 'NO'}`);
      lines.push(``);
    }

    // 6. CONDUCTA & OBSERVACIONES
    if (options.includeConducta) {
      lines.push(`======================================================================`);
      lines.push(`PLAN DE MANEJO / CONDUCTA MÉDICA`);
      lines.push(`======================================================================`);
      if (conducta.trim()) {
        lines.push(conducta.trim());
      } else {
        lines.push(`- Se realiza control prenatal normativo. Gestante en adecuada evolución.`);
        lines.push(`- Se explican signos de alarma en el embarazo (Cefalea intensa, fosfenos, epigastralgia, sangrado transvaginal, pérdida de líquido, disminución de movimientos fetales).`);
        lines.push(`- Continuar suplementación con Ácido Fólico, Hierro y Calcio según indicación.`);
        lines.push(`- Cita a próximo control prenatal según esquema según edad gestacional.`);
      }
      lines.push(``);
    }

    return lines.join('\n');
  };

  const textToCopy = generateClinicalText();

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      notify('📋 ¡Plantilla copiada al portapapeles! Lista para pegar en la HCL', 'success');
      setTimeout(() => setCopied(false), 3000);
    }).catch(err => {
      console.error('Error al copiar:', err);
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      notify('📋 ¡Plantilla copiada al portapapeles!', 'success');
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: '1rem'
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
            border: '1px solid #cbd5e1'
          }}
        >
          {/* Header Modal */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: 'white',
            padding: '1.2rem 1.6rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '14px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)'
              }}>
                <FileText size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '950', letterSpacing: '-0.3px' }}>
                  📋 Plantilla de Historia Clínica (Copiado Rápido HCL)
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>
                  Genera la nota de evolución o resumen prenatal listo para copiar y pegar en tu sistema EMR original.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '12px', padding: '8px', color: 'white', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Cuerpo Modal (Filtros + Vista Previa) */}
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', flex: 1, overflow: 'hidden' }}>
            
            {/* Panel Izquierdo: Configuración y Secciones */}
            <div style={{
              background: '#f8fafc',
              borderRight: '1px solid #e2e8f0',
              padding: '1.2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              overflowY: 'auto'
            }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '950', color: '#475569', display: 'block', marginBottom: '8px' }}>
                  TIPO DE PLANTILLA / NOTA:
                </label>
                <select
                  value={templateType}
                  onChange={(e) => {
                    setTemplateType(e.target.value);
                    if (e.target.value === 'paraclinicos') {
                      setOptions({ includeDemograficos: true, includeGestacion: true, includeAntecedentes: false, includeParaclinicos: true, includeVacunas: false, includeConducta: true });
                    } else if (e.target.value === 'remision') {
                      setOptions({ includeDemograficos: true, includeGestacion: true, includeAntecedentes: true, includeParaclinicos: true, includeVacunas: true, includeConducta: true });
                    } else {
                      setOptions({ includeDemograficos: true, includeGestacion: true, includeAntecedentes: true, includeParaclinicos: true, includeVacunas: true, includeConducta: true });
                    }
                  }}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '12px',
                    border: '1.5px solid #cbd5e1', fontSize: '0.82rem', fontWeight: '900',
                    color: '#0f172a', background: '#ffffff'
                  }}
                >
                  <option value="completa">🌸 Control Prenatal Completo</option>
                  <option value="paraclinicos">🧪 Resumen Paraclínicos y Exámenes</option>
                  <option value="remision">🚨 Resumen Remisión / Especialista ARO</option>
                  <option value="ingreso">📝 Epicrisis de Ingreso CPN</option>
                </select>
              </div>

              <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '950', color: '#475569', display: 'block', marginBottom: '8px' }}>
                  SECCIONES A INCLUIR:
                </label>

                <div style={{ display: 'grid', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: '800', color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={options.includeDemograficos}
                      onChange={(e) => setOptions({ ...options, includeDemograficos: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#0284c7' }}
                    />
                    1. Datos Demográficos
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: '800', color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={options.includeGestacion}
                      onChange={(e) => setOptions({ ...options, includeGestacion: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#0284c7' }}
                    />
                    2. Estado Gestacional & Riesgo
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: '800', color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={options.includeAntecedentes}
                      onChange={(e) => setOptions({ ...options, includeAntecedentes: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#0284c7' }}
                    />
                    3. Antecedentes Obstétricos
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: '800', color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={options.includeParaclinicos}
                      onChange={(e) => setOptions({ ...options, includeParaclinicos: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#0284c7' }}
                    />
                    4. Paraclínicos & Imágenes
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: '800', color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={options.includeVacunas}
                      onChange={(e) => setOptions({ ...options, includeVacunas: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#0284c7' }}
                    />
                    5. Vacunas & Interdisciplinarios
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: '800', color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={options.includeConducta}
                      onChange={(e) => setOptions({ ...options, includeConducta: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#0284c7' }}
                    />
                    6. Plan de Manejo / Conducta
                  </label>
                </div>
              </div>

              {options.includeConducta && (
                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '950', color: '#475569', display: 'block', marginBottom: '6px' }}>
                    OBSERVACIÓN / PLAN ADICIONAL:
                  </label>
                  <textarea
                    rows="3"
                    value={conducta}
                    onChange={(e) => setConducta(e.target.value)}
                    placeholder="Escribe conducta médica personalizada (Ej. Prescribir ASA 100mg, citar en 3 semanas...)"
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: '10px',
                      border: '1px solid #cbd5e1', fontSize: '0.78rem', resize: 'vertical'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Panel Derecho: Vista Previa del Texto Formateado */}
            <div style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden', background: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '900', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={16} color="#0284c7" /> VISTA PREVIA DE LA NOTA MÉDICA
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '800' }}>
                  {textToCopy.length} caracteres
                </span>
              </div>

              {/* Contenedor de Texto tipo Consola Médica */}
              <div style={{
                flex: 1,
                background: '#0f172a',
                color: '#38bdf8',
                borderRadius: '16px',
                padding: '1.2rem',
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                fontSize: '0.82rem',
                lineHeight: '1.45',
                overflowY: 'auto',
                border: '1px solid #1e293b',
                whiteSpace: 'pre-wrap',
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)'
              }}>
                {textToCopy}
              </div>

              {/* Botón de Copiado Gigante */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={onClose}
                  style={{
                    padding: '12px 20px', borderRadius: '14px', background: '#f1f5f9',
                    border: 'none', fontWeight: '900', fontSize: '0.85rem', color: '#475569', cursor: 'pointer'
                  }}
                >
                  Cerrar
                </button>

                <button
                  onClick={handleCopy}
                  style={{
                    flex: 1, padding: '14px 24px', borderRadius: '14px',
                    background: copied ? '#10b981' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: 'white', border: 'none', fontWeight: '950', fontSize: '0.92rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: copied ? '0 8px 20px rgba(16, 185, 129, 0.4)' : '0 8px 20px rgba(2, 132, 199, 0.4)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                  {copied ? '¡COPIADO AL PORTAPAPELES CON ÉXITO!' : '📋 COPIAR NOTA DE EVOLUCIÓN PARA LA HCL'}
                </button>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ClinicalNoteModal;
