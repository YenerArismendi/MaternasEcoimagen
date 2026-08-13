import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { 
  ArrowLeft, Baby, Calendar, User, MapPin, Phone, Heart,
  Clock, RefreshCw, ClipboardList, Stethoscope, Microscope,
  Syringe, PhoneCall, Save, ShieldAlert, Award, FileSpreadsheet,
  Activity, BookOpen, UserCheck, Sparkles, CheckCircle2, ChevronRight,
  Filter, Layers, Check, Circle, Bell, Copy, FileText,
  Edit3, X, FileEdit, Maximize2, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from '../components/LoadingSpinner';
import MedicalEvents from '../components/MedicalEvents';
import ClinicalAlertsPanel from '../components/ClinicalAlertsPanel';
import PortalMaterna from './PortalMaterna';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import PDFExtractionModal from '../components/PDFExtractionModal';
import ClinicalNoteModal from '../components/ClinicalNoteModal';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '18px', margin: '2rem', textAlign: 'center' }}>
          <h3 style={{ color: '#9f1239', margin: '0 0 8px' }}>🌸 Algo no salió como esperábamos</h3>
          <p style={{ color: '#be123c', fontSize: '0.9rem' }}>Ha ocurrido un detalle visual al mostrar esta sección. Por favor recarga la página o intenta navegar a otra pestaña.</p>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', background: '#be123c', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>Recargar Portal</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const CATEGORY_TITLES = {
  perfil: 'Categoría 1: Perfil Demográfico & Enfoque Diferencial',
  antecedentes: 'Categoría 2 y 3: Antecedentes Ginecoobstétricos, Personales y Familiares',
  ingreso: 'Categoría 2: Ingreso al Control Prenatal (CPN) & 19 Campos FOMAG',
  nutricion: 'Categoría 4: Nutrición Inicial & Valoración Antropométrica',
  controles: 'Categoría 5: Seguimiento y Registro de Controles Prenatales',
  paraclinicos: 'Categoría 6: Exámenes Paraclínicos & Imágenes Diagnósticas',
  interdisciplinario: 'Categoría 7: Atenciones Interdisciplinarias (Odontología, Nutrición, Psicología)',
  vacunas: 'Categoría 8: Esquema Completo de Vacunación Materna',
  cursos: 'Categoría 9: Cursos de Preparación para la Maternidad & Paternidad',
  ive_lactancia: 'Categoría 10: IVE, Lactancia Materna & Planificación Familiar',
  posparto: 'Categoría 11: Registro de Parto, Puerperio & Egreso Recién Nacido',
  telefonico: 'Categoría 12: Registro de Monitoreo & Seguimientos Telefónicos',
  calendario: 'Agenda Médica & Calendario de Eventos'
};

const getCategoryCardData = (tabId, materna) => {
  const ant = materna?.antecedentes || {};
  const cpn = materna?.ingresoCPN || {};
  const para = materna?.paraclinicos || {};
  const egr = materna?.egresoYPosparto || {};

  switch (tabId) {
    case 'perfil':
      return {
        id: 'perfil',
        title: '1. Perfil Demográfico & Enfoque',
        icon: <User size={22} />,
        color: '#2563eb',
        statusBg: materna?.region ? '#dbeafe' : '#f1f5f9',
        statusColor: materna?.region ? '#1e40af' : '#64748b',
        statusText: materna?.region ? 'DILIGENCIADO' : 'PENDIENTE',
        highlights: [
          { label: 'IPS Atención', value: materna?.ipsAtencion || materna?.ips?.nombre || 'No asignada' },
          { label: 'Ubicación', value: materna?.municipio ? `${materna.municipio}, ${materna.departamento || ''}` : 'N/A' },
          { label: 'Ocupación', value: materna?.ocupacionOficio || 'Sin registrar' },
          { label: 'Población', value: materna?.caracterizacionPoblacion || 'General' }
        ]
      };
    case 'antecedentes':
      return {
        id: 'antecedentes',
        title: '2. Antecedentes Clínicos y Obstétricos',
        icon: <ClipboardList size={22} />,
        color: '#8b5cf6',
        statusBg: ant.gestaciones !== undefined ? '#f3e8ff' : '#f1f5f9',
        statusColor: ant.gestaciones !== undefined ? '#6b21a8' : '#64748b',
        statusText: ant.gestaciones !== undefined ? 'DILIGENCIADO' : 'PENDIENTE',
        highlights: [
          { label: 'Fórmula Obstétrica', value: `G${ant.gestaciones || 0} P${ant.partosVaginales || 0} C${ant.cesareas || 0} A${ant.aborto || 0} V${ant.vivos || 0}` },
          { label: 'HTA / Diabetes', value: `HTA: ${ant.hipertension || 'NO'} | DM: ${ant.diabetesMellitus || 'NO'}` },
          { label: 'Preeclampsia', value: ant.preeclampsia || 'NO' }
        ]
      };
    case 'ingreso':
      return {
        id: 'ingreso',
        title: '3. Ingreso CPN & 19 Campos FOMAG',
        icon: <Clock size={22} />,
        color: '#10b981',
        statusBg: cpn.clasificacionRiesgoActual ? '#d1fae5' : '#f1f5f9',
        statusColor: cpn.clasificacionRiesgoActual ? '#065f46' : '#64748b',
        statusText: cpn.clasificacionRiesgoActual ? 'DILIGENCIADO' : 'PENDIENTE',
        highlights: [
          { label: 'Riesgo Obstétrico', value: cpn.clasificacionRiesgoActual || 'Sin evaluar', color: cpn.clasificacionRiesgoActual === 'ALTO RIESGO' ? '#dc2626' : '#059669' },
          { label: 'F.U.R', value: cpn.fur?.split('T')[0] || 'Sin fecha' },
          { label: 'Sífilis / VIH', value: `Sífilis: ${para.sifilis_Resultado || 'Pendiente'} | VIH: ${para.vih_Resultado || 'Pendiente'}` }
        ]
      };
    case 'nutricion':
      return {
        id: 'nutricion',
        title: '4. Nutrición Inicial & Antropometría',
        icon: <Activity size={22} />,
        color: '#f59e0b',
        statusBg: cpn.imc_Gestacional ? '#fef3c7' : '#f1f5f9',
        statusColor: cpn.imc_Gestacional ? '#92400e' : '#64748b',
        statusText: cpn.imc_Gestacional ? 'DILIGENCIADO' : 'PENDIENTE',
        highlights: [
          { label: 'IMC Gestacional', value: cpn.imc_Gestacional || 'Sin calcular' },
          { label: 'Peso / Talla', value: cpn.pesoActual_kg ? `${cpn.pesoActual_kg}kg / ${cpn.talla_cm || '?'}cm` : 'N/A' },
          { label: 'Riesgo Nutricional', value: cpn.clasificacionRiesgoNutricional || 'Sin evaluar' }
        ]
      };
    case 'controles':
      return {
        id: 'controles',
        title: '5. Controles Prenatales (CPN)',
        icon: <Stethoscope size={22} />,
        color: '#06b6d4',
        statusBg: materna?.controles?.length > 0 ? '#cffafe' : '#f1f5f9',
        statusColor: materna?.controles?.length > 0 ? '#155e75' : '#64748b',
        statusText: `${materna?.controles?.length || 0} CONTROLES`,
        highlights: [
          { label: 'Total Registrados', value: `${materna?.controles?.length || 0} controles de 11` },
          { label: 'Último Control', value: materna?.controles?.[materna.controles.length - 1]?.fechaControl?.split('T')[0] || 'Ninguno' }
        ]
      };
    case 'paraclinicos':
      return {
        id: 'paraclinicos',
        title: '6. Paraclínicos & Imágenes Diagnósticas',
        icon: <Microscope size={22} />,
        color: '#ec4899',
        statusBg: para.hemoglobina1 ? '#fce7f3' : '#f1f5f9',
        statusColor: para.hemoglobina1 ? '#9d174d' : '#64748b',
        statusText: para.hemoglobina1 ? 'EN SEGUIMIENTO' : 'PENDIENTE',
        highlights: [
          { label: 'Hemoglobina 1T', value: para.hemoglobina1 ? `${para.hemoglobina1} g/dL` : 'Pendiente' },
          { label: 'Urocultivo 1T', value: para.urocultivo1 || 'Pendiente' },
          { label: 'Ecografía Detalle', value: para.ecografiaDetalle ? 'Realizada' : 'Pendiente' }
        ]
      };
    case 'interdisciplinario':
      return {
        id: 'interdisciplinario',
        title: '7. Atenciones Interdisciplinarias',
        icon: <UserCheck size={22} />,
        color: '#6366f1',
        statusBg: egr.odontologia_ctrl1 ? '#e0e7ff' : '#f1f5f9',
        statusColor: egr.odontologia_ctrl1 ? '#3730a3' : '#64748b',
        statusText: egr.odontologia_ctrl1 ? 'DILIGENCIADO' : 'PENDIENTE',
        highlights: [
          { label: 'Odontología', value: egr.odontologia_ctrl1 ? 'Atendido' : 'Pendiente' },
          { label: 'Nutrición', value: egr.nutricion_ctrl1 ? 'Atendido' : 'Pendiente' },
          { label: 'Psicología', value: egr.psicologia_ctrl1 ? 'Atendido' : 'Pendiente' }
        ]
      };
    case 'vacunas':
      return {
        id: 'vacunas',
        title: '8. Esquema de Vacunación',
        icon: <Syringe size={22} />,
        color: '#14b8a6',
        statusBg: egr.fechaTdap ? '#ccfbf1' : '#f1f5f9',
        statusColor: egr.fechaTdap ? '#115e59' : '#64748b',
        statusText: egr.fechaTdap ? 'DILIGENCIADO' : 'PENDIENTE',
        highlights: [
          { label: 'Vacuna Tdap', value: egr.fechaTdap ? 'Aplicada' : 'Pendiente' },
          { label: 'Influenza', value: egr.fechaInfluenza ? 'Aplicada' : 'Pendiente' },
          { label: 'Toxoide Tetánico', value: egr.fechaToxoideTetanico ? 'Aplicada' : 'Pendiente' }
        ]
      };
    case 'cursos':
      return {
        id: 'cursos',
        title: '9. Cursos Preparación Maternidad',
        icon: <BookOpen size={22} />,
        color: '#a855f7',
        statusBg: egr.asistenciaCursoMaternidad ? '#f3e8ff' : '#f1f5f9',
        statusColor: egr.asistenciaCursoMaternidad ? '#6b21a8' : '#64748b',
        statusText: egr.asistenciaCursoMaternidad ? 'EN CURSO' : 'PENDIENTE',
        highlights: [
          { label: 'Asistencia Curso', value: egr.asistenciaCursoMaternidad || 'No asistió' },
          { label: 'Sesiones', value: `${egr.sesionesCursoCompletadas || 0} completadas` }
        ]
      };
    case 'ive_lactancia':
      return {
        id: 'ive_lactancia',
        title: '10. IVE, Lactancia & Planificación',
        icon: <Heart size={22} />,
        color: '#e11d48',
        statusBg: egr.asesoriaIVE ? '#ffe4e6' : '#f1f5f9',
        statusColor: egr.asesoriaIVE ? '#9f1239' : '#64748b',
        statusText: egr.asesoriaIVE ? 'DILIGENCIADO' : 'PENDIENTE',
        highlights: [
          { label: 'Asesoría IVE', value: egr.asesoriaIVE || 'No registrada' },
          { label: 'Lactancia Materna', value: egr.educacionLactancia || 'Pendiente' },
          { label: 'Método Elegido', value: egr.metodoElegido || 'Sin definir' }
        ]
      };
    case 'posparto':
      return {
        id: 'posparto',
        title: '11. Parto, Puerperio & Recién Nacido',
        icon: <Baby size={22} />,
        color: '#f43f5e',
        statusBg: egr.fechaParto ? '#ffe4e6' : '#f1f5f9',
        statusColor: egr.fechaParto ? '#9f1239' : '#64748b',
        statusText: egr.fechaParto ? 'PARTO REGISTRADO' : 'GESTACIÓN ACTIVA',
        highlights: [
          { label: 'Fecha de Parto', value: egr.fechaParto?.split('T')[0] || 'En proceso' },
          { label: 'Tipo de Parto', value: egr.tipoParto || 'N/A' },
          { label: 'Peso Recién Nacido', value: egr.pesoRN_g ? `${egr.pesoRN_g} g` : 'N/A' }
        ]
      };
    case 'telefonico':
      return {
        id: 'telefonico',
        title: '12. Seguimiento Telefónico',
        icon: <PhoneCall size={22} />,
        color: '#0284c7',
        statusBg: materna?.seguimientosTelef?.length > 0 ? '#e0f2fe' : '#f1f5f9',
        statusColor: materna?.seguimientosTelef?.length > 0 ? '#075985' : '#64748b',
        statusText: `${materna?.seguimientosTelef?.length || 0} LLAMADAS`,
        highlights: [
          { label: 'Contactos Realizados', value: `${materna?.seguimientosTelef?.length || 0} llamadas` }
        ]
      };
    case 'calendario':
      return {
        id: 'calendario',
        title: '13. Agenda & Eventos Médicos',
        icon: <Calendar size={22} />,
        color: '#64748b',
        statusBg: '#f1f5f9',
        statusColor: '#334155',
        statusText: 'CALENDARIO',
        highlights: [
          { label: 'Citas & Alertas', value: `${materna?.eventos?.length || 0} eventos registrados` }
        ]
      };
    default:
      return null;
  }
};

const MaternaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useNotification();
  const { user } = useAuth();
  const [materna, setMaterna] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState('etapa1');
  const [activeTab, setActiveTab] = useState('perfil');
  const [viewMode, setViewMode] = useState('etapas'); // 'etapas' | 'todas'
  const [activeMainSection, setActiveMainSection] = useState('alertas'); // 'alertas' (paciente) | 'medico' (personal médico)
  const [saving, setSaving] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [clinicalNoteModalOpen, setClinicalNoteModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState(null);

  const handleApplyPDFData = async (pdfData) => {
    if (!pdfData || !pdfData.paraclinicos) return;

    notify('Procesando y asignando resultados de paraclínicos al trimestre correspondiente...', 'info');

    // Determinar trimestre objetivo
    let targetTrim = pdfData.targetTrimestre;
    if (!targetTrim || targetTrim === 'auto') {
      const semPdf = pdfData.paciente?.semanasGestacion;
      if (semPdf && semPdf > 0) {
        if (semPdf <= 12) targetTrim = '1';
        else if (semPdf <= 26) targetTrim = '2';
        else targetTrim = '3';
      } else {
        const info = calculatePregnancyInfo(materna?.ingresoCPN?.fur || materna?.createdAt);
        if (info.weeks >= 27) targetTrim = '3';
        else if (info.weeks >= 13) targetTrim = '2';
        else targetTrim = '1';
      }
    }

    const p = pdfData.paraclinicos;
    const nowIso = new Date().toISOString();
    const updatedParaclinicos = { ...(materna.paraclinicos || {}) };

    // Extraer valores numéricos o de texto limpios
    const getVal = (item) => {
      if (!item) return null;
      if (typeof item === 'string') return item;
      return item.valorNumerico ? String(item.valorNumerico) : (item.resultadoTexto || item.valor || null);
    };

    const getTxt = (item) => {
      if (!item) return null;
      if (typeof item === 'string') return item;
      return item.resultadoTexto || item.valor || (item.valorNumerico ? String(item.valorNumerico) : null);
    };

    const hbVal = getVal(p.hemoglobina);
    const htoVal = getVal(p.hematocrito);
    const plaqVal = getVal(p.plaquetas);
    const glicVal = getVal(p.glicemiaEnAyunas);
    const ptogVal = getVal(p.ptog75g);
    const sifilisTxt = getTxt(p.vdrlSifilis);
    const vihTxt = getTxt(p.vih);
    const uroTxt = getTxt(p.urocultivo);
    const stgbTxt = getTxt(p.estreptococoGrupoB);
    const toxoIgGTxt = getTxt(p.toxoplasmaIgG);
    const toxoIgMTxt = getTxt(p.toxoplasmaIgM);
    const rubeolaTxt = getTxt(p.rubeolaIgG);
    const chagasTxt = getTxt(p.chagas);

    if (targetTrim === '1') {
      if (hbVal) updatedParaclinicos.hemograma_HB = hbVal;
      if (htoVal) updatedParaclinicos.hemograma_HCTO = htoVal;
      if (plaqVal) updatedParaclinicos.hemograma_Plaquetas = plaqVal;
      if (glicVal) updatedParaclinicos.glicemia = glicVal;
      if (sifilisTxt) {
        updatedParaclinicos.sifilis_Resultado = sifilisTxt;
        updatedParaclinicos.sifilis_Fecha = nowIso;
      }
      if (vihTxt) {
        updatedParaclinicos.vih_Resultado = vihTxt;
        updatedParaclinicos.vih_Fecha = nowIso;
      }
      if (uroTxt) updatedParaclinicos.urocultivo = uroTxt;
      if (toxoIgGTxt) updatedParaclinicos.igg_Toxoplasma = toxoIgGTxt;
      if (toxoIgMTxt) updatedParaclinicos.igm_Toxoplasma = toxoIgMTxt;
      if (rubeolaTxt) updatedParaclinicos.igg_Rubeola = rubeolaTxt;
      if (chagasTxt) updatedParaclinicos.chagas_Resultado = chagasTxt;
      if (p.grupoSanguineo) updatedParaclinicos.hemoclasificacion = `${p.grupoSanguineo} ${p.factorRh || ''}`.trim();
    } else if (targetTrim === '2') {
      if (hbVal) updatedParaclinicos.hemograma_HB = hbVal;
      if (htoVal) updatedParaclinicos.hemograma_HCTO = htoVal;
      if (plaqVal) updatedParaclinicos.hemograma_Plaquetas = plaqVal;
      if (ptogVal) updatedParaclinicos.ptog_75gr = ptogVal;
      if (sifilisTxt) updatedParaclinicos.sifilis_Resultado = sifilisTxt;
      if (vihTxt) updatedParaclinicos.vih_Resultado = vihTxt;
      if (uroTxt) updatedParaclinicos.urocultivo = uroTxt;
    } else if (targetTrim === '3') {
      if (hbVal) updatedParaclinicos.hemograma3_HB = hbVal;
      if (htoVal) updatedParaclinicos.hemograma3_HCTO = htoVal;
      if (plaqVal) updatedParaclinicos.hemograma3_Plaquetas = plaqVal;
      if (sifilisTxt) {
        updatedParaclinicos.sifilis3_Resultado = sifilisTxt;
        updatedParaclinicos.sifilis3_Fecha = nowIso;
      }
      if (vihTxt) {
        updatedParaclinicos.vih3_Resultado = vihTxt;
        updatedParaclinicos.vih3_Fecha = nowIso;
      }
      if (stgbTxt) updatedParaclinicos.estreptococoB = stgbTxt;
    }

    try {
      await api.put(`/maternas/${id}/paraclinicos`, updatedParaclinicos);
      setMaterna(prev => ({ ...prev, paraclinicos: updatedParaclinicos }));
      const trimLabels = { '1': '1er Trimestre', '2': '2do Trimestre', '3': '3er Trimestre' };
      notify(`¡Paraclínicos asignados exitosamente al ${trimLabels[targetTrim]}!`, 'success');
    } catch (err) {
      console.error("Error guardando datos extraídos del PDF:", err);
      notify('Datos vinculados localmente a la historia clínica.', 'warning');
    }
  };

  const calculatePregnancyInfo = (pregnancyDate) => {
    if (!pregnancyDate) return { weeks: 0, days: 0, progress: 0 };
    const start = new Date(pregnancyDate);
    const now = new Date();
    const diffDays = Math.max(0, Math.ceil((now - start) / (1000 * 60 * 60 * 24)));
    const progress = Math.min(Math.round((diffDays / 280) * 100), 100);
    const weeks = Math.floor(diffDays / 7);
    const days = diffDays % 7;
    return { progress, weeks, days };
  };

  const fetchMaterna = async () => {
    try {
      const res = await api.get(`/maternas/${id}`);
      const data = res.data;
      setMaterna(data);
      
      // Auto-detección del trimestre/etapa actual según la FUR o estado de posparto
      const info = calculatePregnancyInfo(data.ingresoCPN?.fur || data.createdAt);
      let autoStage = 'etapa1';
      let autoTab = 'perfil';

      if (data.egresoYPosparto?.fechaParto || data.egresoYPosparto?.eventoObstetrico) {
        autoStage = 'etapa4';
        autoTab = 'posparto';
      } else if (info.weeks >= 27) {
        autoStage = 'etapa3';
        autoTab = 'paraclinicos';
      } else if (info.weeks >= 13) {
        autoStage = 'etapa2';
        autoTab = 'paraclinicos';
      } else {
        autoStage = 'etapa1';
        autoTab = 'perfil';
      }

      setActiveStage(autoStage);
      setActiveTab(autoTab);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.rol === 'GESTANTE' && user?.gestanteId && Number(id) !== Number(user.gestanteId)) {
      navigate(`/maternas/${user.gestanteId}`, { replace: true });
      return;
    }
    fetchMaterna();
  }, [id, user]);

  const handleUpdateClinical = async (section, data) => {
    setSaving(true);
    try {
      let payload = {};
      if (section === 'gestante') {
        payload = data;
      } else {
        payload = { [section]: data };
      }
      const res = await api.put(`/maternas/${id}`, payload);
      setMaterna(res.data);
      notify('Información clínica guardada con éxito', 'success');
    } catch (err) {
      console.error(err);
      notify('Error al guardar la información clínica', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!materna) return <div style={{ padding: '2rem', textTransform: 'uppercase', fontWeight: '900' }}>Paciente no encontrada</div>;

  const info = calculatePregnancyInfo(materna.ingresoCPN?.fur || materna.createdAt);
  const edad = materna.edadActual || (materna.fechaNacimiento && !isNaN(new Date(materna.fechaNacimiento).getTime()) ? (new Date().getFullYear() - new Date(materna.fechaNacimiento).getFullYear()) : 'N/A');

  // Definición de las 5 Etapas Cronológicas
  const STAGES = [
    {
      id: 'etapa1',
      number: '1',
      title: 'Etapa 1: Ingreso & 1er Trimestre',
      subtitle: 'Semana 1 a 12',
      color: '#10b981',
      tabs: [
        { id: 'perfil', label: '1. Perfil Demográfico', icon: <User size={15} /> },
        { id: 'antecedentes', label: '2. Antecedentes Clínicos', icon: <ClipboardList size={15} /> },
        { id: 'ingreso', label: '3. Ingreso CPN & Riesgos', icon: <Clock size={15} /> },
        { id: 'nutricion', label: '4. Nutrición Inicial', icon: <Activity size={15} /> },
        { id: 'paraclinicos', label: '6. Paraclínicos 1er Trimestre', icon: <Microscope size={15} /> },
        { id: 'interdisciplinario', label: '7. Atenciones Interdisciplinarias (1er Trim)', icon: <UserCheck size={15} /> },
        { id: 'vacunas', label: '8. Vacunación (1er Trim)', icon: <Syringe size={15} /> },
        { id: 'controles', label: '5. Controles CPN (1-2)', icon: <Stethoscope size={15} /> },
      ]
    },
    {
      id: 'etapa2',
      number: '2',
      title: 'Etapa 2: 2do Trimestre',
      subtitle: 'Semana 13 a 26',
      color: '#3b82f6',
      tabs: [
        { id: 'paraclinicos', label: '6. Paraclínicos 2do Trimestre (PTOG/Eco)', icon: <Microscope size={15} /> },
        { id: 'interdisciplinario', label: '7. Atenciones Interdisciplinarias (2do Trim)', icon: <UserCheck size={15} /> },
        { id: 'vacunas', label: '8. Vacunación Prenatal (2do Trim)', icon: <Syringe size={15} /> },
        { id: 'cursos', label: '9. Cursos Maternidad (Encuentros 1-4)', icon: <BookOpen size={15} /> },
        { id: 'controles', label: '5. Controles CPN (3-6)', icon: <Stethoscope size={15} /> },
      ]
    },
    {
      id: 'etapa3',
      number: '3',
      title: 'Etapa 3: 3er Trimestre',
      subtitle: 'Semana 27 a 40',
      color: '#8b5cf6',
      tabs: [
        { id: 'paraclinicos', label: '6. Paraclínicos 3er Trimestre (Estreptococo/VIH)', icon: <Microscope size={15} /> },
        { id: 'interdisciplinario', label: '7. Atenciones Interdisciplinarias (3er Trim)', icon: <UserCheck size={15} /> },
        { id: 'vacunas', label: '8. Vacunación (3er Trim)', icon: <Syringe size={15} /> },
        { id: 'cursos', label: '9. Cursos Maternidad (Encuentros 5-7)', icon: <BookOpen size={15} /> },
        { id: 'ive_lactancia', label: '10. Asesoría Anticoncepción & Lactancia', icon: <ShieldAlert size={15} /> },
        { id: 'controles', label: '5. Controles CPN (7-11)', icon: <Stethoscope size={15} /> },
      ]
    },
    {
      id: 'etapa4',
      number: '4',
      title: 'Etapa 4: Parto & Posparto',
      subtitle: 'Nacimiento & Recién Nacido',
      color: '#ec4899',
      tabs: [
        { id: 'posparto', label: '11. Atención Parto & Recién Nacido', icon: <Baby size={15} /> },
        { id: 'ive_lactancia', label: '10. MME, CIE-10 & Notificaciones', icon: <ShieldAlert size={15} /> },
      ]
    },
    {
      id: 'etapa5',
      number: '5',
      title: 'Etapa 5: Monitoreo Telefónico & Agenda',
      subtitle: 'Seguimiento Continuo',
      color: '#f59e0b',
      tabs: [
        { id: 'telefonico', label: '12. Llamadas de Seguimiento (1-11)', icon: <PhoneCall size={15} /> },
        { id: 'calendario', label: 'Agenda Citas y Eventos', icon: <Calendar size={15} /> },
      ]
    }
  ];

  const currentStageObj = STAGES.find(s => s.id === activeStage) || STAGES[0];

  const ALL_TABS = [
    { id: 'perfil', label: '1. PERFIL', icon: <User size={15} /> },
    { id: 'antecedentes', label: '2. ANTECEDENTES', icon: <ClipboardList size={15} /> },
    { id: 'ingreso', label: '3. INGRESO CPN', icon: <Clock size={15} /> },
    { id: 'nutricion', label: '4. NUTRICIÓN', icon: <Activity size={15} /> },
    { id: 'paraclinicos', label: '6. PARACLÍNICOS', icon: <Microscope size={15} /> },
    { id: 'interdisciplinario', label: '7. INTERDISCIPLINARIO', icon: <UserCheck size={15} /> },
    { id: 'vacunas', label: '8. VACUNAS', icon: <Syringe size={15} /> },
    { id: 'cursos', label: '9. CURSOS (1-7)', icon: <BookOpen size={15} /> },
    { id: 'ive_lactancia', label: '10. IVE & ZIKA', icon: <ShieldAlert size={15} /> },
    { id: 'posparto', label: '11. POSPARTO & RN', icon: <Baby size={15} /> },
    { id: 'telefonico', label: '12. SEGUIMIENTO TEL.', icon: <PhoneCall size={15} /> },
    { id: 'controles', label: '5. CONTROLES (1-11)', icon: <Stethoscope size={15} /> },
    { id: 'calendario', label: 'EVENTOS/AGENDA', icon: <Calendar size={15} /> },
  ];

  return (
    <div style={{ maxWidth: '1600px', width: '96%', margin: '0 auto', padding: '1rem 0' }}>
      
      {/* Header Gestante Premium (Solo visible para personal médico / admin) */}
      {user?.rol !== 'GESTANTE' && (
      <div className="organic-card materna-header-card" style={{ 
        padding: '1.5rem 1.8rem', marginBottom: '1.2rem', 
        background: 'linear-gradient(135deg, #4a0728 0%, #831843 40%, #be185d 100%)',
        color: 'white', borderRadius: '24px',
        boxShadow: '0 12px 35px rgba(131, 24, 67, 0.35)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '1rem',
        position: 'relative', overflow: 'hidden'
      }}>
        {/* Decoración de fondo */}
        <div style={{ position: 'absolute', right: '-30px', top: '-30px', opacity: 0.07, pointerEvents: 'none' }}>
          <Baby size={180} color="#ffffff" />
        </div>
        <div style={{ position: 'absolute', left: '30%', bottom: '-40px', opacity: 0.04, pointerEvents: 'none' }}>
          <Heart size={160} color="#ffffff" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem', flex: 1, minWidth: 0 }}>
          <div style={{ 
            width: '60px', height: '60px', borderRadius: '18px', flexShrink: 0,
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1.5px solid rgba(255,255,255,0.3)',
            fontSize: '1.8rem'
          }}>
            🌸
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 className="materna-header-name" style={{
                margin: 0, fontSize: '1.75rem', fontWeight: '950',
                letterSpacing: '-0.5px', color: '#ffffff', lineHeight: 1.1,
                textShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}>
                {materna.nombres} {materna.apellidos}
              </h1>
              <span style={{
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(8px)',
                padding: '3px 12px', borderRadius: '20px',
                fontSize: '0.72rem', fontWeight: '900',
                border: '1px solid rgba(255,255,255,0.3)',
                whiteSpace: 'nowrap', flexShrink: 0
              }}>
                {materna.egresoYPosparto?.fechaParto
                  ? '🍼 Posparto'
                  : info.weeks < 13 ? '🌱 1er Trim.'
                  : info.weeks <= 26 ? '🌷 2do Trim.'
                  : '🌸 3er Trim.'}
              </span>
            </div>
            <p style={{
              margin: '5px 0 0', color: 'rgba(255,255,255,0.85)',
              fontSize: '0.88rem', fontWeight: '700',
              display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap'
            }}>
              <span>{materna.tipoIdentificacion} {materna.numeroIdentificacion}</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>{edad} años</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span style={{ background: 'rgba(255,255,255,0.15)', padding: '1px 8px', borderRadius: '10px', fontWeight: '900' }}>
                Sem. {info.weeks} + {info.days}d
              </span>
            </p>
          </div>
        </div>

        {user?.rol !== 'GESTANTE' && (
          <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
            <motion.button whileHover={{ scale: 1.05 }} onClick={() => navigate('/maternas')} style={{ background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.25)', padding: '10px 16px', borderRadius: '12px', fontWeight: '900', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
              <ArrowLeft size={15} /> Volver
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} onClick={() => setPdfModalOpen(true)} style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '12px', fontWeight: '900', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)' }}>
              <FileText size={16} /> Escanear PDF
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} onClick={() => setClinicalNoteModalOpen(true)} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '12px', fontWeight: '950', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)' }}>
              <Copy size={16} /> 📋 Plantilla HCL
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} onClick={async () => {
              notify('Generando reporte Excel FOMAG...', 'info');
              const res = await api.get(`/fomag/export/excel/${id}`, { responseType: 'blob' });
              const url = window.URL.createObjectURL(new Blob([res.data]));
              const link = document.createElement('a'); link.href = url;
              link.setAttribute('download', `FOMAG_${materna.numeroIdentificacion}.xlsx`);
              document.body.appendChild(link); link.click(); link.remove();
            }} style={{ background: '#ffffff', color: '#831843', border: 'none', padding: '10px 18px', borderRadius: '12px', fontWeight: '950', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', boxShadow: '0 6px 18px rgba(0,0,0,0.2)' }}>
              <FileSpreadsheet size={16} color="#831843" /> FOMAG
            </motion.button>
          </div>
        )}

        <style>{`
          @media (max-width: 768px) {
            .materna-header-card { padding: 1rem 1.1rem !important; border-radius: 18px !important; }
            .materna-header-name { font-size: 1.15rem !important; }
          }
        `}</style>
      </div>
      )}

      {user?.rol === 'GESTANTE' ? (
        <ErrorBoundary>
          <PortalMaterna maternaData={materna} isPreview={false} />
        </ErrorBoundary>
      ) : (
        <>
          {/* BARRA DE SELECCIÓN DE ENFOQUE: ALERTAS vs PORTAL MATERNA vs VISTA MÉDICA */}
          <div style={{
            display: 'flex', gap: '10px', marginBottom: '1.5rem',
            background: '#ffffff', padding: '8px', borderRadius: '22px',
            border: '1px solid #e2e8f0', boxShadow: '0 4px 18px rgba(0,0,0,0.04)',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => setActiveMainSection('alertas')}
              style={{
                flex: 1, minWidth: '220px', padding: '12px 18px', borderRadius: '16px', border: 'none',
                background: activeMainSection === 'alertas' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'transparent',
                color: activeMainSection === 'alertas' ? '#ffffff' : '#64748b',
                fontWeight: '950', fontSize: '0.88rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: activeMainSection === 'alertas' ? '0 8px 20px rgba(2, 132, 199, 0.25)' : 'none',
                transition: 'all 0.3s ease'
              }}
            >
              <Bell size={18} />
              📱 CENTRAL DE ALERTAS
            </button>

            <button
              onClick={() => setActiveMainSection('medico')}
              style={{
                flex: 1, minWidth: '220px', padding: '12px 18px', borderRadius: '16px', border: 'none',
                background: activeMainSection === 'medico' ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : 'transparent',
                color: activeMainSection === 'medico' ? '#ffffff' : '#64748b',
                fontWeight: '950', fontSize: '0.88rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: activeMainSection === 'medico' ? '0 8px 20px rgba(5, 150, 105, 0.25)' : 'none',
                transition: 'all 0.3s ease'
              }}
            >
              <Stethoscope size={18} />
              📋 MÓDULO CLÍNICO MÉDICO / ENFERMERÍA
            </button>

            <button
              onClick={() => setActiveMainSection('portal')}
              style={{
                flex: 1, minWidth: '220px', padding: '12px 18px', borderRadius: '16px', border: 'none',
                background: activeMainSection === 'portal' ? 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' : 'transparent',
                color: activeMainSection === 'portal' ? '#ffffff' : '#64748b',
                fontWeight: '950', fontSize: '0.88rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: activeMainSection === 'portal' ? '0 8px 20px rgba(236, 72, 153, 0.25)' : 'none',
                transition: 'all 0.3s ease'
              }}
            >
              <Baby size={18} />
              🌸 PORTAL MATERNA (VISTA PREVIA)
            </button>
          </div>

          {/* 1. VISTA PACIENTE: ALERTAS Y RECORDATORIOS */}
          {activeMainSection === 'alertas' ? (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <ClinicalAlertsPanel 
                materna={materna} 
                onNavigateTab={(tab) => { 
                  setActiveMainSection('medico'); 
                  setActiveTab(tab); 
                }} 
                onRefresh={fetchMaterna}
              />
            </div>
          ) : activeMainSection === 'portal' ? (
            <PortalMaterna maternaData={materna} isPreview={true} />
          ) : (
            <div>
          {/* Selector de Modo de Visualización (Cronológico vs 12 Categorías) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '5px', borderRadius: '16px' }}>
              <button 
                onClick={() => setViewMode('etapas')}
                style={{
                  padding: '8px 16px', borderRadius: '12px', border: 'none',
                  background: viewMode === 'etapas' ? '#ffffff' : 'transparent',
                  color: viewMode === 'etapas' ? 'var(--primary-color)' : 'var(--text-muted)',
                  fontWeight: '950', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                  boxShadow: viewMode === 'etapas' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                <Layers size={16} /> VISTA CRONOLÓGICA POR ETAPAS DEL EMBARAZO
              </button>
              <button 
                onClick={() => setViewMode('todas')}
                style={{
                  padding: '8px 16px', borderRadius: '12px', border: 'none',
                  background: viewMode === 'todas' ? '#ffffff' : 'transparent',
                  color: viewMode === 'todas' ? 'var(--primary-color)' : 'var(--text-muted)',
                  fontWeight: '950', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                  boxShadow: viewMode === 'todas' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                <Filter size={16} /> VER TODAS LAS 12 CATEGORÍAS
              </button>
            </div>

            {viewMode === 'etapas' && (
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                Ubicado automáticamente en la etapa actual de la gestante ({info.weeks} sem.)
              </span>
            )}
          </div>

          {/* LINEA DE TIEMPO / ETAPAS DEL EMBARAZO */}
          {viewMode === 'etapas' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '1.5rem' }}>
              {STAGES.map(stg => {
                const isSelected = activeStage === stg.id;
                return (
                  <motion.div
                    key={stg.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => {
                      setActiveStage(stg.id);
                      setActiveTab(stg.tabs[0].id);
                    }}
                    style={{
                      padding: '1.2rem', borderRadius: '18px', cursor: 'pointer',
                      background: isSelected ? stg.color : '#ffffff',
                      color: isSelected ? '#ffffff' : 'var(--text-main)',
                      border: isSelected ? `2px solid ${stg.color}` : '1px solid rgba(0,0,0,0.08)',
                      boxShadow: isSelected ? `0 10px 24px ${stg.color}35` : '0 4px 12px rgba(0,0,0,0.02)',
                      transition: 'all 0.25s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ 
                        fontSize: '0.75rem', fontWeight: '950', 
                        background: isSelected ? 'rgba(255,255,255,0.25)' : `${stg.color}15`, 
                        color: isSelected ? '#ffffff' : stg.color,
                        padding: '3px 10px', borderRadius: '12px' 
                      }}>
                        {stg.subtitle}
                      </span>
                      {isSelected ? <CheckCircle2 size={18} color="#ffffff" /> : <Circle size={18} color="var(--text-muted)" />}
                    </div>
                    <h4 style={{ margin: '6px 0 0', fontSize: '0.95rem', fontWeight: '950', letterSpacing: '-0.3px' }}>
                      {stg.title}
                    </h4>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* VISTA TIPO TARJETAS DE LAS CATEGORÍAS CLÍNICAS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '1.4rem' }}>
            {(viewMode === 'etapas' ? currentStageObj.tabs : ALL_TABS).map(tab => {
              const card = getCategoryCardData(tab.id, materna);
              if (!card) return null;
              return (
                <motion.div
                  key={card.id}
                  whileHover={{ y: -5, boxShadow: '0 16px 30px rgba(0,0,0,0.08)' }}
                  onClick={() => setActiveModalTab(card.id)}
                  style={{
                    background: '#ffffff',
                    borderRadius: '22px',
                    border: '1px solid #e2e8f0',
                    padding: '1.6rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                    transition: 'all 0.25s ease'
                  }}
                >
                  {/* Top Line Accent */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: card.color }} />

                  <div>
                    {/* Header: Icon & Status Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: `${card.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color }}>
                        {card.icon}
                      </div>
                      <span style={{ fontSize: '0.72rem', fontWeight: '950', padding: '4px 10px', borderRadius: '12px', background: card.statusBg, color: card.statusColor }}>
                        {card.statusText}
                      </span>
                    </div>

                    {/* Title */}
                    <h4 style={{ margin: '0 0 1rem', fontSize: '1.05rem', fontWeight: '950', color: '#1e293b', letterSpacing: '-0.2px' }}>
                      {card.title}
                    </h4>

                    {/* Summary Highlights List */}
                    <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '1rem', marginBottom: '1.2rem', border: '1px solid #f1f5f9' }}>
                      {card.highlights.map((h, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginBottom: idx === card.highlights.length - 1 ? 0 : '8px' }}>
                          <span style={{ color: '#64748b', fontWeight: '800' }}>{h.label}:</span>
                          <span style={{ fontWeight: '950', color: h.color || '#1e293b', textAlign: 'right' }}>{h.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveModalTab(card.id); }}
                    style={{
                      width: '100%',
                      padding: '11px',
                      borderRadius: '14px',
                      border: `1.5px solid ${card.color}`,
                      background: card.color,
                      color: '#ffffff',
                      fontWeight: '950',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: `0 4px 12px ${card.color}35`,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Edit3 size={16} /> DILIGENCIAR / EDITAR
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* MODAL PANTALLA COMPLETA PARA DILIGENCIAMIENTO */}
          <AnimatePresence>
            {activeModalTab && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 9999,
                  background: 'rgba(15, 23, 42, 0.75)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1.2rem'
                }}
              >
                <motion.div
                  initial={{ scale: 0.96, y: 25 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.96, y: 25 }}
                  style={{
                    background: '#ffffff',
                    borderRadius: '26px',
                    width: '96vw',
                    height: '94vh',
                    maxWidth: '1600px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 25px 60px -15px rgba(0,0,0,0.5)',
                    overflow: 'hidden'
                  }}
                >
                  {/* Header del Modal */}
                  <div style={{
                    padding: '1.2rem 2.2rem',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f8fafc'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ background: 'var(--primary-color)', color: 'white', padding: '10px', borderRadius: '14px', display: 'flex' }}>
                        <FileEdit size={22} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '950', color: '#1e293b' }}>
                          {CATEGORY_TITLES[activeModalTab] || 'Diligenciamiento Clínico'}
                        </h3>
                        <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: '700' }}>
                          Paciente: <strong style={{ color: '#0f172a' }}>{materna?.nombres} {materna?.apellidos}</strong> ({materna?.tipoIdentificacion}: {materna?.numeroIdentificacion})
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveModalTab(null)}
                      style={{
                        background: '#fee2e2',
                        border: 'none',
                        borderRadius: '14px',
                        width: '42px',
                        height: '42px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#ef4444',
                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#ffffff'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                      title="Cerrar Modal"
                    >
                      <X size={22} />
                    </button>
                  </div>

                  {/* Body del Modal con Scrollbar */}
                  <div style={{ padding: '2.2rem 2.8rem', overflowY: 'auto', flex: 1 }}>
                    {activeModalTab === 'perfil' && <PerfilSection materna={materna} onSave={(d) => { handleUpdateClinical('gestante', d); setActiveModalTab(null); }} saving={saving} />}
                    {activeModalTab === 'antecedentes' && <AntecedentesSection data={materna.antecedentes} onSave={(d) => { handleUpdateClinical('antecedentes', d); setActiveModalTab(null); }} saving={saving} />}
                    {activeModalTab === 'ingreso' && <IngresoSection materna={materna} onSave={(payload) => { handleUpdateClinical(payload); setActiveModalTab(null); }} saving={saving} />}
                    {activeModalTab === 'nutricion' && <NutricionSection data={materna.ingresoCPN} onSave={(d) => { handleUpdateClinical('ingresoCPN', d); setActiveModalTab(null); }} saving={saving} />}
                    {activeModalTab === 'controles' && <ControlesSection gestanteId={id} data={materna.controles} refresh={fetchMaterna} />}
                    {activeModalTab === 'paraclinicos' && <ParaclinicosSection materna={materna} data={materna.paraclinicos} activeStage={activeStage} onSave={(d) => { handleUpdateClinical('paraclinicos', d); setActiveModalTab(null); }} saving={saving} />}
                    {activeModalTab === 'interdisciplinario' && <InterdisciplinarioSection data={materna.egresoYPosparto} activeStage={activeStage} onSave={(d) => { handleUpdateClinical('egresoYPosparto', d); setActiveModalTab(null); }} saving={saving} />}
                    {activeModalTab === 'vacunas' && <VacunasSection data={materna.egresoYPosparto} activeStage={activeStage} onSave={(d) => { handleUpdateClinical('egresoYPosparto', d); setActiveModalTab(null); }} saving={saving} />}
                    {activeModalTab === 'cursos' && <CursosSection data={materna.egresoYPosparto} onSave={(d) => { handleUpdateClinical('egresoYPosparto', d); setActiveModalTab(null); }} saving={saving} />}
                    {activeModalTab === 'ive_lactancia' && <IveLactanciaSection data={materna.egresoYPosparto} onSave={(d) => { handleUpdateClinical('egresoYPosparto', d); setActiveModalTab(null); }} saving={saving} />}
                    {activeModalTab === 'posparto' && <PospartoSection data={materna.egresoYPosparto} onSave={(d) => { handleUpdateClinical('egresoYPosparto', d); setActiveModalTab(null); }} saving={saving} />}
                    {activeModalTab === 'telefonico' && <SeguimientoTelSection gestanteId={id} data={materna.seguimientosTelef} refresh={fetchMaterna} />}
                    {activeModalTab === 'calendario' && <MedicalEvents maternaId={id} />}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
  )}
  </>
  )}

  <PDFExtractionModal 
    isOpen={pdfModalOpen} 
    onClose={() => setPdfModalOpen(false)} 
    onApplyData={handleApplyPDFData} 
    gestanteNombre={`${materna?.nombres || ''} ${materna?.apellidos || ''}`} 
  />

  <ClinicalNoteModal
    isOpen={clinicalNoteModalOpen}
    onClose={() => setClinicalNoteModalOpen(false)}
    materna={materna}
  />
</div>
  );
};

// ─── SECCIONES DE FORMULARIOS ──────────────────────────────────────────

const PerfilSection = ({ materna, onSave, saving }) => {
  const [local, setLocal] = useState(materna || {});
  return (
    <div style={{ width: '100%' }}>
      <h3 style={{ fontSize: '1.4rem', fontWeight: '950', marginBottom: '1.5rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <User size={22} /> Categoría 1: Datos Demográficos y Enfoque Diferencial
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.2rem', marginBottom: '2rem' }}>
        {[
          { f: 'region', label: 'REGIÓN' },
          { f: 'ipsAtencion', label: 'IPS DE ATENCIÓN' },
          { f: 'codigoHabilitacionIPS', label: 'CÓDIGO HABILITACIÓN IPS' },
          { f: 'departamento', label: 'DEPARTAMENTO' },
          { f: 'municipio', label: 'MUNICIPIO' },
          { f: 'estadoCivil', label: 'ESTADO CIVIL' },
          { f: 'escolaridad', label: 'ESCOLARIDAD' },
          { f: 'municipioResidencia', label: 'MUNICIPIO RESIDENCIA' },
          { f: 'direccion', label: 'DIRECCIÓN' },
          { f: 'barrio', label: 'BARRIO' },
          { f: 'telefonoCel1', label: 'TELÉFONO CELULAR 1' },
          { f: 'telefonoCel2', label: 'TELÉFONO CELULAR 2' },
          { f: 'ocupacionOficio', label: 'OCUPACIÓN/OFICIO' },
          { f: 'etnia', label: 'ETNIA' },
          { f: 'identidadGenero', label: 'IDENTIDAD DE GÉNERO' },
          { f: 'discapacidad', label: 'DISCAPACIDAD' },
          { f: 'victimaViolencia', label: 'VÍCTIMA DE VIOLENCIA' },
          { f: 'caracterizacionPoblacion', label: 'CARACTERIZACIÓN POBLACIONAL' },
          { f: 'gestanteCuatroOMasCPN', label: 'GESTANTE CON 4+ CPN' },
          { f: 'adherenciaCPN', label: 'ADHERENCIA AL CPN' },
          { f: 'causaNoAdherenciaCPN', label: 'CAUSA DE NO ADHERENCIA' }
        ].map(i => (
          <div key={i.f}>
            <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>{i.label}</label>
            <input type="text" value={local[i.f] || ''} onChange={e => setLocal({...local, [i.f]: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', fontWeight: '700', fontSize: '0.85rem' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
        <button onClick={() => onSave(local)} disabled={saving} style={{ padding: '14px 28px', borderRadius: '14px', background: 'var(--primary-color)', color: 'white', fontWeight: '950', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(236, 72, 153, 0.35)' }}>
          <Save size={18} /> {saving ? 'GUARDANDO...' : 'GUARDAR DATOS DEMOGRÁFICOS'}
        </button>
      </div>
    </div>
  );
};

const AntecedentesSection = ({ data, onSave, saving }) => {
  const [local, setLocal] = useState(data || {});
  return (
    <div style={{ width: '100%' }}>
      <h3 style={{ fontSize: '1.4rem', fontWeight: '950', marginBottom: '1.5rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <ClipboardList size={22} /> Categoría 2 y 3: Antecedentes Ginecoobstétricos, Personales y Familiares
      </h3>
      
      <h4 style={{ fontWeight: '900', margin: '1rem 0 0.8rem', color: 'var(--text-main)' }}>Antecedentes Obstétricos</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {['gestaciones', 'partosVaginales', 'cesareas', 'vivos', 'mortinato', 'obito', 'aborto', 'malformacion', 'ectopicos', 'otrosEventosObstetricos'].map(f => (
          <div key={f}>
            <label style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block', textTransform: 'uppercase' }}>{f}</label>
            <input type="text" value={local[f] || ''} onChange={e => setLocal({...local, [f]: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-color)', fontWeight: '800' }} />
          </div>
        ))}
      </div>

      <h4 style={{ fontWeight: '900', margin: '1rem 0 0.8rem', color: 'var(--text-main)' }}>Antecedentes Personales y Familiares</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {['hipertension', 'diabetesMellitus', 'lupusEritematoso', 'preeclampsia', 'eclampsia', 'diabetesGestacional'].map(f => (
          <label key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-color)', padding: '12px', borderRadius: '12px', cursor: 'pointer', border: '1px solid var(--border-color)' }}>
            <input type="checkbox" checked={local[f] === 'SI'} onChange={e => setLocal({...local, [f]: e.target.checked ? 'SI' : 'NO'})} />
            <span style={{ fontSize: '0.8rem', fontWeight: '900', textTransform: 'uppercase' }}>{f}</span>
          </label>
        ))}
      </div>
      <div style={{ marginBottom: '2rem' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>ANTECEDENTES FAMILIARES DESTACADOS</label>
        <textarea rows={3} value={local.antecedentesFamiliares || ''} onChange={e => setLocal({...local, antecedentesFamiliares: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', fontWeight: '700' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
        <button onClick={() => onSave(local)} disabled={saving} style={{ padding: '14px 28px', borderRadius: '14px', background: 'var(--primary-color)', color: 'white', fontWeight: '950', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(236, 72, 153, 0.35)' }}>
          <Save size={18} /> {saving ? 'GUARDANDO...' : 'GUARDAR ANTECEDENTES'}
        </button>
      </div>
    </div>
  );
};

const IngresoSection = ({ materna, onSave, saving }) => {
  const [ingreso, setIngreso] = useState(materna?.ingresoCPN || {});
  const [para, setPara] = useState(materna?.paraclinicos || {});

  useEffect(() => {
    setIngreso(materna?.ingresoCPN || {});
    setPara(materna?.paraclinicos || {});
  }, [materna]);

  const handleSave = () => {
    onSave({
      ingresoCPN: ingreso,
      paraclinicos: para
    });
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.35rem', fontWeight: '950', margin: 0, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={24} /> Categoría 2: Ingreso al Control Prenatal (CPN) y Evaluación Inicial
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-muted)' }}>
            Diligenciamiento de los 19 campos clave exigidos por la norma técnica y la matriz de seguimiento FOMAG.
          </p>
        </div>

        <button 
          onClick={handleSave} 
          disabled={saving} 
          style={{ 
            padding: '12px 24px', borderRadius: '14px', background: 'var(--primary-color)', color: 'white', 
            fontWeight: '950', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)' 
          }}
        >
          <Save size={18} /> {saving ? 'GUARDANDO...' : 'GUARDAR INGRESO CPN'}
        </button>
      </div>

      {/* BLOQUE 1: DATOS DE INSCRIPCIÓN Y EDAD GESTACIONAL */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.4rem', marginBottom: '1.5rem' }}>
        <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: '950', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={18} color="#2563eb" /> 1. Inscripción y Edades Gestacionales
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
              FECHA DE INSCRIPCIÓN AL CPN POR MÉDICO GENERAL (DD/MM/AAAA)
            </label>
            <input 
              type="date" 
              value={ingreso.fechaInscripcionCPN?.split('T')[0] || ''} 
              onChange={e => setIngreso({...ingreso, fechaInscripcionCPN: e.target.value})} 
              style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', fontWeight: '700' }} 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
              EDAD GESTACIONAL AL INICIO DE CPN (INGRESO AL CPN)
            </label>
            <input 
              type="text" 
              placeholder="Ej: 8 semanas"
              value={ingreso.edadGestacionalInicio || ''} 
              onChange={e => setIngreso({...ingreso, edadGestacionalInicio: e.target.value})} 
              style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', fontWeight: '700' }} 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
              FUR (FECHA ÚLTIMA REGLA)
            </label>
            <input 
              type="date" 
              value={ingreso.fur?.split('T')[0] || ''} 
              onChange={e => setIngreso({...ingreso, fur: e.target.value})} 
              style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', fontWeight: '700' }} 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
              EDAD GESTACIONAL ACTUAL
            </label>
            <input 
              type="text" 
              placeholder="Ej: 12.4 semanas"
              value={ingreso.edadGestacionalActual || ''} 
              onChange={e => setIngreso({...ingreso, edadGestacionalActual: e.target.value})} 
              style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', fontWeight: '700' }} 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
              EDAD GESTACIONAL POR ECOGRAFÍA
            </label>
            <input 
              type="text" 
              placeholder="Ej: 11.2 semanas"
              value={ingreso.edadGestacionalEco || ''} 
              onChange={e => setIngreso({...ingreso, edadGestacionalEco: e.target.value})} 
              style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', fontWeight: '700' }} 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
              FPP (FECHA PROBABLE DE PARTO)
            </label>
            <input 
              type="date" 
              value={ingreso.fpp?.split('T')[0] || ''} 
              onChange={e => setIngreso({...ingreso, fpp: e.target.value})} 
              style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', fontWeight: '700' }} 
            />
          </div>
        </div>
      </div>

      {/* BLOQUE 2: TAMIZAJES PSICOSOCIALES Y EMBARAZO */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.4rem', marginBottom: '1.5rem' }}>
        <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: '950', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Heart size={18} color="#ec4899" /> 2. Aspectos Psicosociales y Red de Apoyo
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
              EMBARAZO DESEADO
            </label>
            <select 
              value={ingreso.embarazoDeseado || ''} 
              onChange={e => setIngreso({...ingreso, embarazoDeseado: e.target.value})} 
              style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', fontWeight: '700' }}
            >
              <option value="">-- Seleccionar --</option>
              <option value="SI">SI</option>
              <option value="NO">NO</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
              ¿TIENE RED DE APOYO FAMILIAR/SOCIAL?
            </label>
            <select 
              value={ingreso.redApoyo || ''} 
              onChange={e => setIngreso({...ingreso, redApoyo: e.target.value})} 
              style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', fontWeight: '700' }}
            >
              <option value="">-- Seleccionar --</option>
              <option value="SI">SI</option>
              <option value="NO">NO</option>
              <option value="BUENA">BUENA</option>
              <option value="DEFICIENTE">DEFICIENTE</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
              SE REALIZÓ TAMIZAJE DE VIOLENCIA
            </label>
            <select 
              value={ingreso.tamizajeViolencia || ''} 
              onChange={e => setIngreso({...ingreso, tamizajeViolencia: e.target.value})} 
              style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', fontWeight: '700' }}
            >
              <option value="">-- Seleccionar --</option>
              <option value="SI">SI</option>
              <option value="NO">NO</option>
              <option value="POSITIVO">POSITIVO</option>
              <option value="NEGATIVO">NEGATIVO</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
              SE REALIZÓ TAMIZAJE DE DEPRESIÓN (ESCALA HERRERA Y HURTADO)
            </label>
            <select 
              value={ingreso.tamizajeDepresionHerrera || ''} 
              onChange={e => setIngreso({...ingreso, tamizajeDepresionHerrera: e.target.value})} 
              style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', fontWeight: '700' }}
            >
              <option value="">-- Seleccionar --</option>
              <option value="SI">SI</option>
              <option value="NO">NO</option>
              <option value="SIN RIESGO">SIN RIESGO</option>
              <option value="CON RIESGO">CON RIESGO</option>
            </select>
          </div>
        </div>
      </div>

      {/* BLOQUE 3: TAMIZAJES INFECCIOSOS E INMUNOLÓGICOS INICIALES */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.4rem', marginBottom: '1.5rem' }}>
        <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: '950', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Microscope size={18} color="#0284c7" /> 3. Tamizajes Infecciosos al Ingreso (Pruebas Rápidas & Fechas)
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
              TAMIZAJE Y RESULTADO DE SÍFILIS
            </label>
            <input 
              type="text" 
              placeholder="Ej: Negativo / No Reactivo / Reactivo 1:8"
              value={para.sifilis_Resultado || ''} 
              onChange={e => setPara({...para, sifilis_Resultado: e.target.value})} 
              style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', fontWeight: '700' }} 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
              FECHA DE RESULTADO DE SÍFILIS
            </label>
            <input 
              type="date" 
              value={para.sifilis_Fecha?.split('T')[0] || ''} 
              onChange={e => setPara({...para, sifilis_Fecha: e.target.value})} 
              style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', fontWeight: '700' }} 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
              TAMIZACIÓN Y RESULTADO DE PRUEBA RÁPIDA DE VIH
            </label>
            <input 
              type="text" 
              placeholder="Ej: No Reactivo / Reactivo"
              value={para.vih_Resultado || ''} 
              onChange={e => setPara({...para, vih_Resultado: e.target.value})} 
              style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', fontWeight: '700' }} 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
              FECHA DE RESULTADO VIH
            </label>
            <input 
              type="date" 
              value={para.vih_Fecha?.split('T')[0] || ''} 
              onChange={e => setPara({...para, vih_Fecha: e.target.value})} 
              style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', fontWeight: '700' }} 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
              TAMIZAJE Y RESULTADO DE PRUEBA RÁPIDA DE HBSAG
            </label>
            <input 
              type="text" 
              placeholder="Ej: No Reactivo / Reactivo"
              value={para.hbsag_Resultado || ''} 
              onChange={e => setPara({...para, hbsag_Resultado: e.target.value})} 
              style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', fontWeight: '700' }} 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
              FECHA DE RESULTADOS DE HBSAG
            </label>
            <input 
              type="date" 
              value={para.hbsag_Fecha?.split('T')[0] || ''} 
              onChange={e => setPara({...para, hbsag_Fecha: e.target.value})} 
              style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', fontWeight: '700' }} 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
              TAMIZAJE DE CHAGAS
            </label>
            <input 
              type="text" 
              placeholder="Ej: Negativo / Positivo"
              value={para.chagas_Resultado || ''} 
              onChange={e => setPara({...para, chagas_Resultado: e.target.value})} 
              style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', fontWeight: '700' }} 
            />
          </div>
        </div>
      </div>

      {/* BLOQUE 4: CLASIFICACIÓN DE RIESGO OBSTÉTRICO Y DIAGNÓSTICO ARO */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.4rem', marginBottom: '1.5rem' }}>
        <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: '950', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={18} color="#d97706" /> 4. Clasificación de Riesgo Obstétrico & Diagnóstico ARO
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem', marginBottom: '1.2rem' }}>
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
              CLASIFICACIÓN DEL RIESGO OBSTÉTRICO ACTUAL
            </label>
            <select 
              value={ingreso.clasificacionRiesgoActual || ''} 
              onChange={e => setIngreso({...ingreso, clasificacionRiesgoActual: e.target.value})} 
              style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', fontWeight: '700' }}
            >
              <option value="">-- Seleccionar Riesgo --</option>
              <option value="BAJO RIESGO">BAJO RIESGO (BRO)</option>
              <option value="ALTO RIESGO">ALTO RIESGO (ARO)</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
            DIAGNÓSTICO ESCRITO DE ARO (ACTUALIZADO)
          </label>
          <textarea 
            rows={3} 
            placeholder="Escriba los diagnósticos de Alto Riesgo Obstétrico (ej: Preeclampsia previa, Diabetes Gestacional, Edad Materna Avanzada...)"
            value={ingreso.diagnosticoARO_Actualizado || ''} 
            onChange={e => setIngreso({...ingreso, diagnosticoARO_Actualizado: e.target.value})} 
            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', fontWeight: '700' }} 
          />
        </div>
      </div>

      {/* BLOQUE 5: DATOS PRECONCEPCIONALES Y EVALUACIÓN COMPLEMENTARIA */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.4rem', marginBottom: '2rem' }}>
        <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: '950', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} color="#10b981" /> 5. Etapa Preconcepcional y Factores Complementarios
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.2rem' }}>
          {[
            { f: 'atencionPreconcepcionalPlan', label: 'ATENCIÓN PRECONCEPCIONAL (PLANEADA)' },
            { f: 'asesoriaMetodoPrevio', label: 'ASESORÍA MÉTODO PRE-EVENTO' },
            { f: 'acidoFolicoPrevio', label: 'ÁCIDO FÓLICO PREVIO (3 MESES)' },
            { f: 'citasPreconcepcionales', label: 'NO. CITAS PRECONCEPCIONALES' },
            { f: 'riesgoPsicosocial', label: 'RIESGO PSICOSOCIAL' },
            { f: 'atributoRiesgoPsicosocial', label: 'ATRIBUTO RIESGO PSICOSOCIAL' },
            { f: 'riesgoHipertension', label: 'RIESGO HIPERTENSIÓN' },
            { f: 'riesgoPreeclampsia', label: 'RIESGO PREECLAMPSIA' },
            { f: 'riesgoTromboembolico', label: 'RIESGO TROMBOEMBÓLICO' },
            { f: 'prescripcionASA', label: 'PRESCRIPCIÓN ASA (ÁCIDO ACETILSALICÍLICO)' }
          ].map(i => (
            <div key={i.f}>
              <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>{i.label}</label>
              <input 
                type="text" 
                value={ingreso[i.f] || ''} 
                onChange={e => setIngreso({...ingreso, [i.f]: e.target.value})} 
                style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', fontWeight: '700' }} 
              />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          onClick={handleSave} 
          disabled={saving} 
          style={{ 
            padding: '12px 28px', borderRadius: '14px', background: 'var(--primary-color)', color: 'white', 
            fontWeight: '950', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)' 
          }}
        >
          <Save size={18} /> {saving ? 'GUARDANDO...' : 'GUARDAR INGRESO CPN'}
        </button>
      </div>
    </div>
  );
};

const NutricionSection = ({ data, onSave, saving }) => {
  const [local, setLocal] = useState(data || {});
  return (
    <div style={{ width: '100%' }}>
      <h3 style={{ fontSize: '1.4rem', fontWeight: '950', marginBottom: '1.5rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Activity size={22} /> Categoría 4: Medidas Antropométricas y Nutrición
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem', marginBottom: '2rem' }}>
        {[
          { f: 'pesoPregestacional_kg', label: 'PESO PREGESTACIONAL (KG)' },
          { f: 'talla_cm', label: 'TALLA (CM)' },
          { f: 'pesoActual_kg', label: 'PESO ACTUAL (KG)' },
          { f: 'imc_Gestacional', label: 'IMC GESTACIONAL' },
          { f: 'clasificacionRiesgoNutricional', label: 'RIESGO NUTRICIONAL' }
        ].map(i => (
          <div key={i.f}>
            <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>{i.label}</label>
            <input type="text" value={local[i.f] || ''} onChange={e => setLocal({...local, [i.f]: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', fontWeight: '800' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
        <button onClick={() => onSave(local)} disabled={saving} style={{ padding: '14px 28px', borderRadius: '14px', background: 'var(--primary-color)', color: 'white', fontWeight: '950', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(236, 72, 153, 0.35)' }}>
          <Save size={18} /> {saving ? 'GUARDANDO...' : 'GUARDAR NUTRICIÓN'}
        </button>
      </div>
    </div>
  );
};

const ControlesSection = ({ gestanteId, data, refresh }) => {
  return (
    <div>
      <h3 style={{ fontSize: '1.4rem', fontWeight: '950', marginBottom: '1rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Stethoscope size={22} /> Categoría 5: Historial de Controles Prenatales (1 al 11)
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '14px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: 'var(--primary-color)', color: 'white', textAlign: 'left', fontSize: '0.75rem', fontWeight: '900' }}>
              <th style={{ padding: '14px' }}># CONTROL</th>
              <th style={{ padding: '14px' }}>FECHA CPN</th>
              <th style={{ padding: '14px' }}>ESPECIALIDAD</th>
              <th style={{ padding: '14px' }}>EDAD GEST.</th>
              <th style={{ padding: '14px' }}>T. ARTERIAL</th>
              <th style={{ padding: '14px' }}>PESO / IMC</th>
              <th style={{ padding: '14px' }}>RIESGO ARO</th>
            </tr>
          </thead>
          <tbody>
            {[1,2,3,4,5,6,7,8,9,10,11].map(n => {
              const ctrl = data?.find(c => c.numeroControl === n);
              return (
                <tr key={n} style={{ borderBottom: '1px solid var(--border-color)', background: n % 2 === 0 ? 'rgba(0,0,0,0.015)' : 'white' }}>
                  <td style={{ padding: '12px 14px', fontWeight: '950', color: 'var(--primary-color)' }}>Control #{n}</td>
                  <td style={{ padding: '12px 14px', fontWeight: '700' }}>{ctrl?.fechaCPN ? new Date(ctrl.fechaCPN).toLocaleDateString() : '-'}</td>
                  <td style={{ padding: '12px 14px', fontWeight: '700' }}>{ctrl?.especialidad || '-'}</td>
                  <td style={{ padding: '12px 14px', fontWeight: '700' }}>{ctrl?.edadGestacional || '-'}</td>
                  <td style={{ padding: '12px 14px', fontWeight: '700' }}>{ctrl?.tensionArterial || '-'}</td>
                  <td style={{ padding: '12px 14px', fontWeight: '700' }}>{ctrl?.peso_kg ? `${ctrl.peso_kg} kg (IMC: ${ctrl.imc || '-'})` : '-'}</td>
                  <td style={{ padding: '12px 14px', fontWeight: '800' }}>{ctrl?.riesgoObstetrico || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const FIELD_LABELS = {
  hemoclasificacion: 'Hemoclasificación',
  glicemia: 'Glicemia Basal',
  hemograma_HB: 'Hemograma I - HB (g/dL)',
  hemograma_HCTO: 'Hemograma I - Hematocrito (%)',
  hemograma_Plaquetas: 'Hemograma I - Plaquetas',
  igg_Rubeola: 'Rubeola IgG',
  igg_Toxoplasma: 'Toxoplasma IgG',
  igm_Toxoplasma: 'Toxoplasma IgM',
  avidezToxoplasma: 'Avidez Toxoplasma',
  iga_Toxoplasma: 'Toxoplasma IgA',
  urocultivo: 'Urocultivo I',
  hemoparasitos: 'Hemoparásitos / Gota Gruesa',
  chagas_Resultado: 'Tamizaje Chagas',
  eco1_Interpretacion: 'Ecografía 1er Trimestre (10.6-13.6 sem)',

  ptog_75gr: 'PTOG 75g (Tamizaje Diabetes Gestacional)',
  vih_Resultado: 'VIH (2do Trimestre)',
  sifilis_Resultado: 'Sífilis (2do Trimestre)',
  hemoparasitos2Trimestre: 'Hemoparásitos 2do Trimestre',
  citologiaCCU: 'Citología CCU',
  sifilis_Diagnostico: 'Diagnóstico Sífilis',
  sifilis_EgInicioTratamiento: 'EG Inicio Tratamiento Sífilis',
  sifilis_Tratamiento: 'Tratamiento Sífilis',
  sifilis_ContactosTratados: 'Contactos Tratados Sífilis',

  hemograma3_HB: 'Hemograma III - HB (g/dL)',
  hemograma3_HCTO: 'Hemograma III - Hematocrito (%)',
  hemograma3_Plaquetas: 'Hemograma III - Plaquetas',
  hemoparasitos3Trimestre: 'Hemoparásitos 3er Trimestre',
  vih3_Resultado: 'VIH (3er Trimestre)',
  sifilis3_Resultado: 'Sífilis (3er Trimestre)',
  estreptococoB: 'Estreptococo Grupo B (STGB 35-37 sem)'
};

const ParaclinicosSection = ({ materna, data, activeStage, onSave, saving }) => {
  const [local, setLocal] = useState(data || {});
  const [showPreview, setShowPreview] = useState(false);
  const { notify } = useNotification();

  const generateFormattedText = (stageFilter = null) => {
    const lines = [];
    lines.push(`=== PARACLÍNICOS Y TAMIZAJES DIAGNÓSTICOS ===`);
    if (materna) {
      lines.push(`PACIENTE: ${materna.nombres || ''} ${materna.apellidos || ''}`);
      lines.push(`DOCUMENTO: ${materna.tipoIdentificacion || 'CC'} ${materna.numeroIdentificacion || ''}`);
      if (materna.ingresoCPN?.fur) {
        lines.push(`FUR: ${materna.ingresoCPN.fur.split('T')[0]}`);
      }
    }
    lines.push(`FECHA EMISIÓN: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`);
    lines.push(`--------------------------------------------------`);

    // 1er Trimestre
    if (!stageFilter || stageFilter === 'etapa1' || stageFilter === '1er Trimestre') {
      const items = [
        { k: 'hemoclasificacion', l: 'Hemoclasificación' },
        { k: 'glicemia', l: 'Glicemia Basal' },
        { k: 'hemograma_HB', l: 'Hemograma I (Hb)' },
        { k: 'hemograma_HCTO', l: 'Hemograma I (Hcto)' },
        { k: 'hemograma_Plaquetas', l: 'Hemograma I (Plaquetas)' },
        { k: 'igg_Toxoplasma', l: 'Toxoplasma IgG' },
        { k: 'igm_Toxoplasma', l: 'Toxoplasma IgM' },
        { k: 'avidezToxoplasma', l: 'Avidez Toxoplasma' },
        { k: 'igg_Rubeola', l: 'Rubeola IgG' },
        { k: 'urocultivo', l: 'Urocultivo I' },
        { k: 'chagas_Resultado', l: 'Chagas' },
        { k: 'hemoparasitos', l: 'Hemoparásitos' },
        { k: 'eco1_Interpretacion', l: 'Ecografía 1er Trimestre' }
      ].filter(i => local[i.k]);

      if (items.length > 0) {
        lines.push(`\n📌 1ER TRIMESTRE (Sem 1 - 12):`);
        items.forEach(i => lines.push(`  • ${i.l}: ${local[i.k]}`));
      }
    }

    // 2do Trimestre
    if (!stageFilter || stageFilter === 'etapa2' || stageFilter === '2do Trimestre') {
      const items = [
        { k: 'ptog_75gr', l: 'PTOG 75g (Glucosa)' },
        { k: 'vih_Resultado', l: 'VIH (2do Trim)' },
        { k: 'sifilis_Resultado', l: 'Sífilis (2do Trim)' },
        { k: 'citologiaCCU', l: 'Citología CCU' },
        { k: 'sifilis_Tratamiento', l: 'Tratamiento Sífilis' },
        { k: 'hemoparasitos2Trimestre', l: 'Hemoparásitos 2do Trim' }
      ].filter(i => local[i.k]);

      if (items.length > 0) {
        lines.push(`\n📌 2DO TRIMESTRE (Sem 13 - 26):`);
        items.forEach(i => lines.push(`  • ${i.l}: ${local[i.k]}`));
      }
    }

    // 3er Trimestre
    if (!stageFilter || stageFilter === 'etapa3' || stageFilter === '3er Trimestre') {
      const items = [
        { k: 'hemograma3_HB', l: 'Hemograma III (Hb)' },
        { k: 'hemograma3_HCTO', l: 'Hemograma III (Hcto)' },
        { k: 'hemograma3_Plaquetas', l: 'Hemograma III (Plaquetas)' },
        { k: 'vih3_Resultado', l: 'VIH (3er Trim)' },
        { k: 'sifilis3_Resultado', l: 'Sífilis (3er Trim)' },
        { k: 'estreptococoB', l: 'Estreptococo Grupo B (STGB)' },
        { k: 'hemoparasitos3Trimestre', l: 'Hemoparásitos 3er Trim' }
      ].filter(i => local[i.k]);

      if (items.length > 0) {
        lines.push(`\n📌 3ER TRIMESTRE (Sem 27+):`);
        items.forEach(i => lines.push(`  • ${i.l}: ${local[i.k]}`));
      }
    }

    return lines.join('\n');
  };

  const handleCopy = (text, title = 'Paraclínicos copiados al portapapeles') => {
    if (!text || text.trim() === '') {
      notify('No hay resultados registrados en esta sección para copiar', 'warning');
      return;
    }
    navigator.clipboard.writeText(text);
    notify(`📋 ${title} para Historia Clínica`, 'success');
  };

  const renderFieldWithCopy = (fieldKey) => {
    const labelText = FIELD_LABELS[fieldKey] || fieldKey;
    const value = local[fieldKey] || '';

    return (
      <div key={fieldKey} style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <label style={{ fontSize: '0.68rem', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            {labelText}
          </label>
          {value && (
            <button
              type="button"
              onClick={() => handleCopy(`${labelText}: ${value}`, `${labelText} copiado`)}
              title="Copiar este resultado"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--primary-color)',
                cursor: 'pointer',
                padding: '2px 4px',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '0.65rem',
                fontWeight: '800'
              }}
            >
              <Copy size={12} /> Copiar
            </button>
          )}
        </div>
        <input 
          type="text" 
          value={value} 
          onChange={e => setLocal({...local, [fieldKey]: e.target.value})} 
          placeholder="Sin registrar"
          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontWeight: '700', fontSize: '0.82rem' }} 
        />
      </div>
    );
  };

  const fullText = generateFormattedText();

  return (
    <div style={{ maxWidth: '1100px' }}>
      {/* Header Bar con Acciones de Copiado para Doctores */}
      <div style={{ 
        display: 'flex', 
        justify: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1.5rem', 
        flexWrap: 'wrap', 
        gap: '1rem',
        background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(59,130,246,0.06))',
        padding: '1.2rem 1.5rem',
        borderRadius: '20px',
        border: '1px solid rgba(16,185,129,0.2)'
      }}>
        <div>
          <h3 style={{ fontSize: '1.35rem', fontWeight: '950', margin: 0, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Microscope size={24} /> Categoría 6: Paraclínicos y Tamizajes Diagnósticos
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0', fontWeight: '600' }}>
            Copia directa de resultados formateada para diligenciamiento de Historias Clínicas.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <motion.button 
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => handleCopy(fullText, 'Todos los paraclínicos copiados')}
            style={{ 
              background: 'linear-gradient(135deg, #059669, #047857)', 
              color: 'white', 
              border: 'none', 
              padding: '10px 18px', 
              borderRadius: '12px', 
              fontWeight: '900', 
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(5,150,105,0.25)'
            }}
          >
            <Copy size={16} /> COPIAR TODO PARA HISTORIA CLÍNICA
          </motion.button>

          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            style={{ 
              background: 'var(--card-bg)', 
              color: 'var(--text-main)', 
              border: '1px solid var(--border-color)', 
              padding: '10px 16px', 
              borderRadius: '12px', 
              fontWeight: '800', 
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileText size={16} /> {showPreview ? 'Ocultar Vista Previa' : 'Vista Previa Texto HC'}
          </button>
        </div>
      </div>

      {/* Vista Previa del Texto Formateado para Copiar */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ marginBottom: '2rem', overflow: 'hidden' }}
          >
            <div style={{ 
              background: '#0f172a', 
              color: '#38bdf8', 
              padding: '1.5rem', 
              borderRadius: '16px', 
              fontFamily: 'monospace', 
              fontSize: '0.82rem',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#94a3b8', fontWeight: '900' }}>FORMATO PARA PEGAR EN HISTORIA CLÍNICA (RIPS/EHR)</span>
                <button 
                  onClick={() => handleCopy(fullText, 'Texto completo copiado')}
                  style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Copy size={14} /> Copiar Texto
                </button>
              </div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {fullText}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid por Trimestres */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        {(!activeStage || activeStage === 'etapa1') && (
          <div style={{ background: 'rgba(16, 185, 129, 0.03)', padding: '1.4rem', borderRadius: '18px', border: '2px solid #10b981' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ color: '#047857', fontWeight: '950', margin: 0 }}>1er Trimestre (Sem 1 - 12)</h4>
              <button
                type="button"
                onClick={() => handleCopy(generateFormattedText('1er Trimestre'), 'Paraclínicos 1er Trimestre copiados')}
                style={{ background: '#10b98115', color: '#047857', border: '1px solid #10b98140', padding: '4px 10px', borderRadius: '8px', fontWeight: '900', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Copy size={13} /> Copiar 1er Trim
              </button>
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              {['hemoclasificacion', 'glicemia', 'hemograma_HB', 'hemograma_HCTO', 'hemograma_Plaquetas', 'igg_Rubeola', 'igg_Toxoplasma', 'igm_Toxoplasma', 'avidezToxoplasma', 'iga_Toxoplasma', 'urocultivo', 'hemoparasitos', 'chagas_Resultado', 'eco1_Interpretacion'].map(f => renderFieldWithCopy(f))}
            </div>
          </div>
        )}

        {(!activeStage || activeStage === 'etapa2') && (
          <div style={{ background: 'rgba(59, 130, 246, 0.03)', padding: '1.4rem', borderRadius: '18px', border: '2px solid #3b82f6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ color: '#1d4ed8', fontWeight: '950', margin: 0 }}>2do Trimestre (Sem 13 - 26)</h4>
              <button
                type="button"
                onClick={() => handleCopy(generateFormattedText('2do Trimestre'), 'Paraclínicos 2do Trimestre copiados')}
                style={{ background: '#3b82f615', color: '#1d4ed8', border: '1px solid #3b82f640', padding: '4px 10px', borderRadius: '8px', fontWeight: '900', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Copy size={13} /> Copiar 2do Trim
              </button>
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              {['ptog_75gr', 'vih_Resultado', 'sifilis_Resultado', 'hemoparasitos2Trimestre', 'citologiaCCU', 'sifilis_Diagnostico', 'sifilis_EgInicioTratamiento', 'sifilis_Tratamiento', 'sifilis_ContactosTratados'].map(f => renderFieldWithCopy(f))}
            </div>
          </div>
        )}

        {(!activeStage || activeStage === 'etapa3') && (
          <div style={{ background: 'rgba(168, 85, 247, 0.03)', padding: '1.4rem', borderRadius: '18px', border: '2px solid #8b5cf6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ color: '#7e22ce', fontWeight: '950', margin: 0 }}>3er Trimestre (Sem 27+)</h4>
              <button
                type="button"
                onClick={() => handleCopy(generateFormattedText('3er Trimestre'), 'Paraclínicos 3er Trimestre copiados')}
                style={{ background: '#8b5cf615', color: '#7e22ce', border: '1px solid #8b5cf640', padding: '4px 10px', borderRadius: '8px', fontWeight: '900', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Copy size={13} /> Copiar 3er Trim
              </button>
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              {['hemograma3_HB', 'hemograma3_HCTO', 'hemograma3_Plaquetas', 'hemoparasitos3Trimestre', 'vih3_Resultado', 'sifilis3_Resultado', 'estreptococoB'].map(f => renderFieldWithCopy(f))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
        <button 
          onClick={() => onSave(local)} 
          disabled={saving} 
          style={{ padding: '14px 28px', borderRadius: '16px', background: 'var(--primary-color)', color: 'white', fontWeight: '950', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--primary-glow) 0 6px 18px' }}
        >
          <Save size={18} /> {saving ? 'GUARDANDO...' : 'GUARDAR PARACLÍNICOS'}
        </button>
      </div>
    </div>
  );
};

const InterdisciplinarioSection = ({ data, activeStage, onSave, saving }) => {
  const [local, setLocal] = useState(data || {});

  const renderField = (fieldKey, label) => (
    <div key={fieldKey}>
      <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
        {label}
      </label>
      <input 
        type="date" 
        value={local[fieldKey]?.split('T')[0] || ''} 
        onChange={e => setLocal({...local, [fieldKey]: e.target.value})} 
        style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }} 
      />
    </div>
  );

  return (
    <div style={{ width: '100%' }}>
      <h3 style={{ fontSize: '1.4rem', fontWeight: '950', marginBottom: '0.5rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <UserCheck size={22} /> Categoría 7: Consultas Interdisciplinarias por Trimestres (Especialidades)
      </h3>
      <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: '#64748b', fontWeight: '700' }}>
        Registre las fechas de atenciones especializadas correspondientes a cada etapa gestacional de la materna.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* 1ER TRIMESTRE */}
        {(!activeStage || activeStage === 'etapa1') && (
          <div style={{ background: 'rgba(16, 185, 129, 0.03)', padding: '1.4rem', borderRadius: '20px', border: '2px solid #10b981' }}>
            <h4 style={{ color: '#047857', fontWeight: '950', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🌱 1er Trimestre (Ingreso & Valoración)
            </h4>
            <div style={{ display: 'grid', gap: '12px' }}>
              {renderField('odontologia_Ctrl1', 'FECHA ODONTOLOGÍA CTRL 1 (Sem 14)')}
              {renderField('nutricion_Ctrl1', 'FECHA NUTRICIÓN CTRL 1 (Sem 16)')}
              {renderField('psicologia_Ctrl1', 'FECHA PSICOLOGÍA CTRL 1 (Sem 18)')}
              {renderField('trabajoSocial_Ctrl1', 'FECHA TRABAJO SOCIAL 1 (Sem 20)')}
            </div>
          </div>
        )}

        {/* 2DO TRIMESTRE */}
        {(!activeStage || activeStage === 'etapa2') && (
          <div style={{ background: 'rgba(59, 130, 246, 0.03)', padding: '1.4rem', borderRadius: '20px', border: '2px solid #3b82f6' }}>
            <h4 style={{ color: '#1d4ed8', fontWeight: '950', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🌿 2do Trimestre (Seguimiento Especialidades)
            </h4>
            <div style={{ display: 'grid', gap: '12px' }}>
              {renderField('odontologia_Ctrl2', 'FECHA ODONTOLOGÍA CTRL 2')}
              {renderField('nutricion_Ctrl2', 'FECHA NUTRICIÓN CTRL 2')}
              {renderField('psicologia_Ctrl2', 'FECHA PSICOLOGÍA CTRL 2')}
              {renderField('trabajoSocial_Ctrl2', 'FECHA TRABAJO SOCIAL 2')}
            </div>
          </div>
        )}

        {/* 3ER TRIMESTRE */}
        {(!activeStage || activeStage === 'etapa3') && (
          <div style={{ background: 'rgba(139, 92, 246, 0.03)', padding: '1.4rem', borderRadius: '20px', border: '2px solid #8b5cf6' }}>
            <h4 style={{ color: '#7e22ce', fontWeight: '950', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🌺 3er Trimestre (Controles Finales & Especialista)
            </h4>
            <div style={{ display: 'grid', gap: '12px' }}>
              {renderField('nutricion_Ctrl3', 'FECHA NUTRICIÓN CTRL 3')}
              {renderField('psicologia_Ctrl3', 'FECHA PSICOLOGÍA CTRL 3')}
              {renderField('consultaEspecialista', 'FECHA GINECOLOGÍA / OBSTETRICIA (Sem 28+)')}
              {renderField('fechaAsesoriaAnticoncepcion', 'FECHA ASESORÍA ANTICONCEPCIÓN PRE-EVENTO')}
            </div>
          </div>
        )}

      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
        <button onClick={() => onSave(local)} disabled={saving} style={{ padding: '14px 28px', borderRadius: '16px', background: 'var(--primary-color)', color: 'white', fontWeight: '950', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--primary-glow) 0 6px 18px' }}>
          <Save size={18} /> {saving ? 'GUARDANDO...' : 'GUARDAR ATENCIONES INTERDISCIPLINARIAS'}
        </button>
      </div>
    </div>
  );
};

const VacunasSection = ({ data, activeStage, onSave, saving }) => {
  const [local, setLocal] = useState(data || {});

  const renderField = (fieldKey, label) => (
    <div key={fieldKey}>
      <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
        {label}
      </label>
      <input 
        type="date" 
        value={local[fieldKey]?.split('T')[0] || ''} 
        onChange={e => setLocal({...local, [fieldKey]: e.target.value})} 
        style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }} 
      />
    </div>
  );

  return (
    <div style={{ width: '100%' }}>
      <h3 style={{ fontSize: '1.4rem', fontWeight: '950', marginBottom: '0.5rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Syringe size={22} /> Categoría 8: Esquema de Vacunación Prenatal por Trimestres
      </h3>
      <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: '#64748b', fontWeight: '700' }}>
        Registre las fechas de aplicación de biológicos distribuidas según la etapa gestacional.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* 1ER TRIMESTRE */}
        {(!activeStage || activeStage === 'etapa1') && (
          <div style={{ background: 'rgba(16, 185, 129, 0.03)', padding: '1.4rem', borderRadius: '20px', border: '2px solid #10b981' }}>
            <h4 style={{ color: '#047857', fontWeight: '950', margin: '0 0 1rem' }}>🌱 1er Trimestre</h4>
            <div style={{ display: 'grid', gap: '12px' }}>
              {renderField('fechaToxoideTetanico', 'TOXOIDE TETÁNICO (DOSIS 1)')}
              {renderField('fechaCovid1', 'COVID-19 PRIMERA DOSIS')}
            </div>
          </div>
        )}

        {/* 2DO TRIMESTRE */}
        {(!activeStage || activeStage === 'etapa2') && (
          <div style={{ background: 'rgba(59, 130, 246, 0.03)', padding: '1.4rem', borderRadius: '20px', border: '2px solid #3b82f6' }}>
            <h4 style={{ color: '#1d4ed8', fontWeight: '950', margin: '0 0 1rem' }}>🌿 2do Trimestre</h4>
            <div style={{ display: 'grid', gap: '12px' }}>
              {renderField('fechaTdap', 'TDAP (TÉTANOS/DIFTERIA/TOSFERINA - SEM 26)')}
              {renderField('fechaInfluenza', 'INFLUENZA ESTACIONAL (SEM 14+)')}
              {renderField('fechaCovid2', 'COVID-19 SEGUNDA DOSIS')}
            </div>
          </div>
        )}

        {/* 3ER TRIMESTRE */}
        {(!activeStage || activeStage === 'etapa3') && (
          <div style={{ background: 'rgba(139, 92, 246, 0.03)', padding: '1.4rem', borderRadius: '20px', border: '2px solid #8b5cf6' }}>
            <h4 style={{ color: '#7e22ce', fontWeight: '950', margin: '0 0 1rem' }}>🌺 3er Trimestre / Refuerzos</h4>
            <div style={{ display: 'grid', gap: '12px' }}>
              {renderField('fechaRefuerzoToxoide', 'REFUERZO TOXOIDE TETÁNICO')}
            </div>
          </div>
        )}

      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
        <button onClick={() => onSave(local)} disabled={saving} style={{ padding: '14px 28px', borderRadius: '16px', background: 'var(--primary-color)', color: 'white', fontWeight: '950', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--primary-glow) 0 6px 18px' }}>
          <Save size={18} /> {saving ? 'GUARDANDO...' : 'GUARDAR ESQUEMA VACUNACIÓN'}
        </button>
      </div>
    </div>
  );
};

const CursosSection = ({ data, onSave, saving }) => {
  const [local, setLocal] = useState(data || {});
  return (
    <div style={{ width: '100%' }}>
      <h3 style={{ fontSize: '1.4rem', fontWeight: '950', marginBottom: '1.5rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <BookOpen size={22} /> Categoría 9: Cursos de Maternidad y Paternidad (7 Encuentros)
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem', marginBottom: '2rem' }}>
        {[1,2,3,4,5,6,7].map(n => {
          const f = `cursosMaternidad_F${n}`;
          return (
            <div key={f}>
              <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>FECHA ENCUENTRO #{n}</label>
              <input type="date" value={local[f]?.split('T')[0] || ''} onChange={e => setLocal({...local, [f]: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)' }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
        <button onClick={() => onSave(local)} disabled={saving} style={{ padding: '14px 28px', borderRadius: '14px', background: 'var(--primary-color)', color: 'white', fontWeight: '950', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(236, 72, 153, 0.35)' }}>
          <Save size={18} /> {saving ? 'GUARDANDO...' : 'GUARDAR CURSOS MATERNIDAD'}
        </button>
      </div>
    </div>
  );
};

const IveLactanciaSection = ({ data, onSave, saving }) => {
  const [local, setLocal] = useState(data || {});
  return (
    <div style={{ width: '100%' }}>
      <h3 style={{ fontSize: '1.4rem', fontWeight: '950', marginBottom: '1.5rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <ShieldAlert size={22} /> Categoría 10: IVE, Lactancia & Eventos de Notificación
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.2rem', marginBottom: '2rem' }}>
        <div>
          <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>ASESORÍA IVE</label>
          <input type="text" value={local.asesoriaIVE || ''} onChange={e => setLocal({...local, asesoriaIVE: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>FECHA ASESORÍA ANTICONCEPCIÓN (SEM 28-34)</label>
          <input type="date" value={local.fechaAsesoriaAnticoncepcion?.split('T')[0] || ''} onChange={e => setLocal({...local, fechaAsesoriaAnticoncepcion: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>FECHA ENTREGA PRESERVATIVOS</label>
          <input type="date" value={local.fechaEntregaPreservativos?.split('T')[0] || ''} onChange={e => setLocal({...local, fechaEntregaPreservativos: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>FECHA CONSEJERÍA LACTANCIA PRENATAL</label>
          <input type="date" value={local.fechaConsejeríaLactanciaPrenatal?.split('T')[0] || ''} onChange={e => setLocal({...local, fechaConsejeríaLactanciaPrenatal: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>MORBILIDAD MATERNA EXTREMA (MME)</label>
          <input type="text" value={local.morbilidadMaternaExtrema || ''} onChange={e => setLocal({...local, morbilidadMaternaExtrema: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>CIE-10 MME</label>
          <input type="text" value={local.cie10MME || ''} onChange={e => setLocal({...local, cie10MME: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>INFECCIÓN POR ZIKA</label>
          <input type="text" value={local.infeccionZika || ''} onChange={e => setLocal({...local, infeccionZika: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)' }} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
        <button onClick={() => onSave(local)} disabled={saving} style={{ padding: '14px 28px', borderRadius: '14px', background: 'var(--primary-color)', color: 'white', fontWeight: '950', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(236, 72, 153, 0.35)' }}>
          <Save size={18} /> {saving ? 'GUARDANDO...' : 'GUARDAR IVE & NOTIFICACIÓN'}
        </button>
      </div>
    </div>
  );
};

const PospartoSection = ({ data, onSave, saving }) => {
  const [local, setLocal] = useState(data || {});
  return (
    <div style={{ width: '100%' }}>
      <h3 style={{ fontSize: '1.4rem', fontWeight: '950', marginBottom: '1.5rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Baby size={22} /> Categoría 11: Posparto, Recién Nacido y Planificación
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.2rem', marginBottom: '2rem' }}>
        {[
          { f: 'institucionParto', label: 'INSTITUCIÓN PARTO' },
          { f: 'eventoObstetrico', label: 'EVENTO OBSTÉTRICO' },
          { f: 'partoHumanizado', label: 'PARTO HUMANIZADO' },
          { f: 'consejeríaPostpartoLactancia', label: 'CONSEJERÍA POSTPARTO LACTANCIA' },
          { f: 'edadGestacionalParto', label: 'EDAD GESTACIONAL AL PARTO' },
          { f: 'estadoRecienNacido', label: 'ESTADO RECIÉN NACIDO' },
          { f: 'pesoRN_gr', label: 'PESO RN (GR)' },
          { f: 'tallaRN_cm', label: 'TALLA RN (CM)' },
          { f: 'sexoRN', label: 'SEXO RN' },
          { f: 'resultadoTSH_RN', label: 'RESULTADO TSH RN' },
          { f: 'tamizajeAuditivoRN', label: 'TAMIZAJE AUDITIVO RN' },
          { f: 'provisionAnticonceptivoAlta', label: 'PROVISIÓN MÉTODO ALTA' },
          { f: 'metodoAnticonceptivoElegido', label: 'MÉTODO ELEGIDO' },
          { f: 'entregaMedicamentosEgreso', label: 'MEDICAMENTOS EGRESO' },
          { f: 'motivoCierreCaso', label: 'MOTIVO CIERRE CASO' }
        ].map(i => (
          <div key={i.f}>
            <label style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>{i.label}</label>
            <input type="text" value={local[i.f] || ''} onChange={e => setLocal({...local, [i.f]: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', fontWeight: '700' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
        <button onClick={() => onSave(local)} disabled={saving} style={{ padding: '14px 28px', borderRadius: '14px', background: 'var(--primary-color)', color: 'white', fontWeight: '950', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(236, 72, 153, 0.35)' }}>
          <Save size={18} /> {saving ? 'GUARDANDO...' : 'GUARDAR REGISTRO POSPARTO'}
        </button>
      </div>
    </div>
  );
};

const SeguimientoTelSection = ({ gestanteId, data, refresh }) => (
  <div>
    <h3 style={{ fontSize: '1.4rem', fontWeight: '950', marginBottom: '1.5rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <PhoneCall size={22} /> Categoría 12: Seguimientos Telefónicos (1 al 11)
    </h3>
    <div style={{ display: 'grid', gap: '1rem' }}>
      {data?.map(s => (
        <div key={s.id} style={{ padding: '1.2rem', background: '#f8fafc', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontWeight: '950', fontSize: '0.85rem', color: 'var(--primary-color)' }}>Seguimiento #{s.numeroSeguimiento}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>{new Date(s.fecha).toLocaleString()}</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700' }}>{s.observacion}</p>
        </div>
      ))}
    </div>
  </div>
);

export default MaternaDetail;
