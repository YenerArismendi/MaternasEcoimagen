import React, { useState } from 'react';
import { 
  AlertTriangle, Calendar, Clock, CheckCircle2, 
  Bell, ChevronRight, Stethoscope, Microscope, Syringe, ShieldAlert, Sparkles, Send,
  Check, RefreshCw, X, FileText, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { calculateMaternaAlerts } from '../utils/alertUtils';

const getRelativeTimeText = (targetDateStr, now = new Date()) => {
  if (!targetDateStr) return '';
  const target = new Date(targetDateStr);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  
  const diffMs = targetStart - todayStart;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Corresponde HOY';
  if (diffDays > 0) {
    if (diffDays === 1) return 'Falta 1 día (Mañana)';
    if (diffDays < 7) return `Faltan ${diffDays} días`;
    const weeks = Math.floor(diffDays / 7);
    const remDays = diffDays % 7;
    return remDays === 0 
      ? `Faltan ${weeks} semana(s)` 
      : `Faltan ${weeks} semana(s) y ${remDays} día(s)`;
  } else {
    const absDays = Math.abs(diffDays);
    if (absDays === 1) return 'Vencida hace 1 día (Ayer)';
    if (absDays < 7) return `Vencida hace ${absDays} días`;
    const weeks = Math.floor(absDays / 7);
    const remDays = absDays % 7;
    return remDays === 0 
      ? `Vencida hace ${weeks} semana(s)` 
      : `Vencida hace ${weeks} semana(s) y ${remDays} día(s)`;
  }
};

const ClinicalAlertsPanel = ({ materna, onNavigateTab, onRefresh }) => {
  const { notify } = useNotification();

  const [agendarModal, setAgendarModal] = useState({ open: false, evento: null, hito: null, fecha: '' });
  const [confirmModal, setConfirmModal] = useState({ open: false, evento: null, fecha: '', notas: '' });

  if (!materna) return null;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const { citasVencidas, consultasPendientes, hitosFaltantes, weeks } = calculateMaternaAlerts(materna);

  const eventos = materna.eventos || [];
  const par = materna.paraclinicos || {};
  const egr = materna.egresoYPosparto || {};

  const consultasNormativas = hitosFaltantes.filter(h => h.categoria === 'CONSULTA');
  const laboratoriosNormativos = hitosFaltantes.filter(h => h.categoria !== 'CONSULTA');
  const totalConsultas = (consultasPendientes?.length || 0) + consultasNormativas.length;
  const totalAlertas = (citasVencidas?.length || 0) + (consultasPendientes?.length || 0) + hitosFaltantes.length;

  // 2. Citas Agendadas Próximas o para Hoy
  const citasAgendadas = eventos.filter(e => {
    if (e.estado !== 'PENDIENTE') return false;
    return e.estaAgendado || e.fechaAgendamiento;
  });

  // 4. PREDICTOR DE PRÓXIMOS HITOS Y EXÁMENES (Fechas futuras por semana gestacional)
  const proximosHitos = [];

  if (weeks >= 14 && weeks < 24 && !par.ecografiaDetalle) {
    const semRestantes = 18 - weeks;
    proximosHitos.push({
      id: 'paraclinicos',
      titulo: 'Ecografía de Detalle Anatómico Fetal',
      rangoSem: 'Semana 18 a 24',
      semRestantes,
      mensaje: semRestantes <= 0 ? 'Corresponde realizarla AHORA (Semana actual)' : `Corresponde realizarla en ${semRestantes} semana(s) (Semana 18)`,
      badgeColor: '#3b82f6'
    });
  }

  if (weeks >= 20 && weeks < 28 && !par.ptog_75gr) {
    const semRestantes = 24 - weeks;
    proximosHitos.push({
      id: 'paraclinicos',
      titulo: 'Prueba de Tolerancia a la Glucosa (PTOG 75g)',
      rangoSem: 'Semana 24 a 28',
      semRestantes,
      mensaje: semRestantes <= 0 ? 'Corresponde realizarla AHORA (Semana 24-28)' : `Corresponde en ${semRestantes} semana(s) (Semana 24)`,
      badgeColor: '#8b5cf6'
    });
  }

  if (weeks >= 22 && weeks < 28 && !egr.fechaTdap) {
    const semRestantes = 26 - weeks;
    proximosHitos.push({
      id: 'vacunas',
      titulo: 'Vacunación Tdap (Tosferina, Tétanos, Difteria)',
      rangoSem: 'Semana 26 en adelante',
      semRestantes,
      mensaje: semRestantes <= 0 ? 'Corresponde aplicar AHORA' : `Programar para dentro de ${semRestantes} semana(s) (Semana 26)`,
      badgeColor: '#ec4899'
    });
  }

  if (weeks >= 24 && weeks < 34 && !egr.fechaAsesoriaAnticoncepcion) {
    const semRestantes = 28 - weeks;
    proximosHitos.push({
      id: 'ive_lactancia',
      titulo: 'Asesoría Anticoncepción Pre-evento',
      rangoSem: 'Semana 28 a 34',
      semRestantes,
      mensaje: semRestantes <= 0 ? 'Gestión requerida en el trimestre actual' : `Gestionar en ${semRestantes} semana(s) (Semana 28)`,
      badgeColor: '#10b981'
    });
  }

  if (weeks >= 31 && weeks < 37 && !par.estreptococoB) {
    const semRestantes = 35 - weeks;
    proximosHitos.push({
      id: 'paraclinicos',
      titulo: 'Cultivo Estreptococo Grupo B (STGB)',
      rangoSem: 'Semana 35 a 37',
      semRestantes,
      mensaje: semRestantes <= 0 ? 'Corresponde realizar AHORA' : `Programar toma en ${semRestantes} semana(s) (Semana 35)`,
      badgeColor: '#f59e0b'
    });
  }

  // 5. Atenciones Realizadas (Historial reciente anexado a Excel)
  const eventosRealizados = eventos.filter(e => e.estado === 'REALIZADO');

  const handleSaveAgendamiento = async () => {
    if (!agendarModal.fecha) {
      notify('Debe seleccionar una fecha de agendamiento', 'warning');
      return;
    }
    try {
      if (agendarModal.evento?.id) {
        await api.patch(`/eventos/${agendarModal.evento.id}`, {
          estaAgendado: true,
          fechaAgendamiento: new Date(agendarModal.fecha + 'T12:00:00')
        });
        notify('Cita agendada correctamente');
      } else if (agendarModal.hito) {
        await api.post('/eventos', {
          tipo: agendarModal.hito.id === 'vacunas' ? 'VACUNA' : 'ESTUDIO',
          descripcion: agendarModal.hito.titulo,
          fechaProgramada: agendarModal.fecha,
          fechaAgendamiento: new Date(agendarModal.fecha + 'T12:00:00'),
          estaAgendado: true,
          esObligatorio: true,
          maternaId: materna.id
        });
        notify('Cita creada y agendada correctamente');
      }
      setAgendarModal({ open: false, evento: null, hito: null, fecha: '' });
      if (onRefresh) onRefresh();
    } catch (err) {
      notify('Error al agendar fecha', 'error');
    }
  };

  const handleConfirmAsistencia = async () => {
    if (!confirmModal.fecha) {
      notify('Debe ingresar la fecha en que se realizó la atención', 'warning');
      return;
    }
    try {
      if (confirmModal.evento?.id) {
        await api.patch(`/eventos/${confirmModal.evento.id}`, {
          estado: 'REALIZADO',
          fechaRealizada: new Date(confirmModal.fecha + 'T12:00:00'),
          resultado: confirmModal.notas || 'Asistencia Confirmada'
        });
        notify('✅ ¡Asistencia confirmada! La fecha se ha anexado automáticamente a la matriz Excel FOMAG.');
      }
      setConfirmModal({ open: false, evento: null, fecha: '', notas: '' });
      if (onRefresh) onRefresh();
    } catch (err) {
      notify('Error al confirmar asistencia', 'error');
    }
  };

  return (
    <div style={{ display: 'grid', gap: '1.4rem' }}>
      {/* 🔴 HEADER BANNER GENERAL DE ALERTAS CLÍNICAS */}
      <div style={{
        background: totalAlertas > 0 
          ? 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)' 
          : 'linear-gradient(135deg, #f0fdf4 0%, #e6f4ea 100%)',
        border: `1.5px solid ${totalAlertas > 0 ? '#fecdd3' : '#bbf7d0'}`,
        borderRadius: '24px',
        padding: '1.4rem 1.8rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '18px',
            background: totalAlertas > 0 ? '#ef4444' : '#10b981',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', boxShadow: totalAlertas > 0 ? '0 8px 20px rgba(239, 68, 68, 0.35)' : '0 8px 20px rgba(16, 185, 129, 0.35)'
          }}>
            {totalAlertas > 0 ? <AlertTriangle size={28} /> : <CheckCircle2 size={28} />}
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '950', color: totalAlertas > 0 ? '#991b1b' : '#065f46' }}>
              {totalAlertas > 0 
                ? `🚨 ${totalAlertas} ALERTAS CLÍNICAS Y PENDIENTES` 
                : '✅ CONTROL GESTACIONAL AL DÍA SIN ALERTAS VENCIDAS'}
            </h4>
            <p style={{ margin: '3px 0 0', fontSize: '0.85rem', fontWeight: '700', color: totalAlertas > 0 ? '#9f1239' : '#047857' }}>
              {totalAlertas > 0 
                ? `Gestante en semana ${weeks}. Requiere atención de ${totalConsultas} consulta(s), ${laboratoriosNormativos.length} examen(es) y ${citasVencidas.length} cita(s) vencida(s).`
                : `Gestante en la semana ${weeks} de gestación con todos los controles normativos al día.`}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {citasAgendadas.length > 0 && (
            <div style={{ background: '#ffffff', padding: '8px 16px', borderRadius: '14px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={18} color="#2563eb" />
              <span style={{ fontSize: '0.82rem', fontWeight: '900', color: '#1e3a8a' }}>
                {citasAgendadas.length} Cita(s) Agendada(s)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 🩺 SECCIÓN 1: CONSULTAS Y CONTROLES CLÍNICOS PENDIENTES */}
      {totalConsultas > 0 && (
        <div style={{ background: '#ffffff', padding: '1.4rem', borderRadius: '22px', border: '1.5px solid #60a5fa', boxShadow: '0 6px 20px rgba(37, 99, 235, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '950', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Stethoscope size={20} color="#2563eb" /> 🩺 CONSULTAS Y CONTROLES CLÍNICOS PENDIENTES ({totalConsultas})
            </h4>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#1d4ed8', background: '#dbeafe', padding: '3px 10px', borderRadius: '8px' }}>
              CONTROL DE ATENCIÓN INTEGRAL
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '12px' }}>
            {/* Consultas Normativas por Semana Gestacional */}
            {consultasNormativas.map((cNorm, idx) => (
              <div key={`cn_${idx}`} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '14px', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                    <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '950', color: '#1e3a8a' }}>{cNorm.titulo}</h5>
                    <span style={{ background: '#2563eb', color: 'white', fontSize: '0.65rem', fontWeight: '950', padding: '2px 8px', borderRadius: '6px', flexShrink: 0 }}>
                      {cNorm.ref}
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: '0.76rem', fontWeight: '700', color: '#1d4ed8' }}>
                    Consulta médica / especializada requerida según norma técnica perinatal ({weeks} sem).
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', paddingTop: '6px', borderTop: '1px dashed #bfdbfe' }}>
                  <button
                    onClick={() => setAgendarModal({ open: true, evento: null, hito: cNorm, fecha: todayStr })}
                    style={{ flex: 1, background: '#2563eb', color: 'white', border: 'none', padding: '7px 10px', borderRadius: '10px', fontSize: '0.73rem', fontWeight: '950', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', boxShadow: '0 4px 10px rgba(37,99,235,0.25)' }}
                  >
                    <Calendar size={13} /> Agendar Consulta
                  </button>

                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab(cNorm.id)}
                      style={{ flex: 1.2, background: '#ffffff', color: '#1e40af', border: '1px solid #3b82f6', padding: '7px 10px', borderRadius: '10px', fontSize: '0.73rem', fontWeight: '950', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <FileText size={13} /> Diligenciar Ficha
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Consultas en Eventos Médicos de la Gestante */}
            {consultasPendientes?.map((ev, idx) => (
              <div key={`evc_${idx}`} style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '14px', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                    <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '950', color: '#0369a1' }}>{ev.descripcion || 'Consulta Control Prenatal'}</h5>
                    <span style={{ background: '#0284c7', color: 'white', fontSize: '0.65rem', fontWeight: '950', padding: '2px 8px', borderRadius: '6px', flexShrink: 0 }}>
                      {ev.trimestre || `Semana ${weeks}`}
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: '0.76rem', fontWeight: '700', color: '#0369a1' }}>
                    Consulta o control agendado/programado pendiente por confirmar o realizar.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', paddingTop: '6px', borderTop: '1px dashed #bae6fd' }}>
                  <button
                    onClick={() => setAgendarModal({ open: true, evento: ev, hito: null, fecha: ev.fechaAgendamiento ? new Date(ev.fechaAgendamiento).toISOString().split('T')[0] : todayStr })}
                    style={{ flex: 1, background: '#0284c7', color: 'white', border: 'none', padding: '7px 10px', borderRadius: '10px', fontSize: '0.73rem', fontWeight: '950', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  >
                    <Calendar size={13} /> Agendar Cita
                  </button>

                  <button
                    onClick={() => setConfirmModal({ open: true, evento: ev, fecha: todayStr, notas: '' })}
                    style={{ flex: 1.2, background: '#10b981', color: 'white', border: 'none', padding: '7px 10px', borderRadius: '10px', fontSize: '0.73rem', fontWeight: '950', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  >
                    <CheckCircle2 size={13} /> Confirmar Atendida
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🟡 SECCIÓN 2: DESGLOSE DE EXÁMENES Y LABORATORIOS NORMATIVOS PENDIENTES */}
      {laboratoriosNormativos.length > 0 && (
        <div style={{ background: '#ffffff', padding: '1.4rem', borderRadius: '22px', border: '1.5px solid #fde047', boxShadow: '0 6px 20px rgba(234, 179, 8, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '950', color: '#854d0e', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Microscope size={20} color="#ca8a04" /> 🟡 DESGLOSE DE EXÁMENES Y LABORATORIOS PENDIENTES ({laboratoriosNormativos.length})
            </h4>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#854d0e', background: '#fef9c3', padding: '3px 10px', borderRadius: '8px' }}>
              REQUERIMIENTO NORMATIVO POR SEMANA {weeks}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '12px' }}>
            {laboratoriosNormativos.map((hito, idx) => (
              <div key={idx} style={{ background: '#fefce8', border: '1px solid #fef08a', padding: '14px', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                    <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '950', color: '#713f12' }}>{hito.titulo}</h5>
                    <span style={{ background: hito.tipo === 'urgente' ? '#ef4444' : '#eab308', color: 'white', fontSize: '0.65rem', fontWeight: '950', padding: '2px 8px', borderRadius: '6px', flexShrink: 0 }}>
                      {hito.ref}
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: '0.76rem', fontWeight: '700', color: '#854d0e' }}>
                    Estudio o paraclínico obligatorio según norma técnica para la edad gestacional actual ({weeks} sem).
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', paddingTop: '6px', borderTop: '1px dashed #fef08a' }}>
                  <button
                    onClick={() => setAgendarModal({ open: true, evento: null, hito: hito, fecha: todayStr })}
                    style={{ flex: 1, background: '#eab308', color: 'white', border: 'none', padding: '7px 10px', borderRadius: '10px', fontSize: '0.73rem', fontWeight: '950', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', boxShadow: '0 4px 10px rgba(234,179,8,0.25)' }}
                  >
                    <Calendar size={13} /> Agendar Cita
                  </button>

                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab(hito.id)}
                      style={{ flex: 1.2, background: '#ffffff', color: '#854d0e', border: '1px solid #eab308', padding: '7px 10px', borderRadius: '10px', fontSize: '0.73rem', fontWeight: '950', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <FileText size={13} /> Diligenciar Ficha
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🔴 SECCIÓN 3: ALERTAS Y CITAS VENCIDAS */}
      {citasVencidas.length > 0 && (
        <div style={{ background: '#ffffff', padding: '1.4rem', borderRadius: '22px', border: '1.5px solid #fecdd3', boxShadow: '0 6px 20px rgba(225, 29, 72, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '950', color: '#be123c', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={20} color="#be123c" /> 🔴 CITAS Y EXÁMENES VENCIDOS ({citasVencidas.length})
            </h4>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#9f1239', background: '#ffe4e6', padding: '3px 10px', borderRadius: '8px' }}>
              REQUERIMIENTO INMEDIATO
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
            {citasVencidas.map(c => {
              const targetDateStr = c.fechaAgendamiento || c.fechaProgramada;
              const relativeText = getRelativeTimeText(targetDateStr, now);

              return (
                <div key={c.id} style={{ background: '#fff1f2', border: '1px solid #fda4af', padding: '14px', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '950', color: '#881337' }}>{c.descripcion}</h5>
                      <span style={{ background: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: '950', padding: '2px 8px', borderRadius: '6px', flexShrink: 0 }}>
                        {relativeText}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.76rem', fontWeight: '700', color: '#be123c' }}>
                      Debió realizarse el: <strong>{new Date(targetDateStr).toLocaleDateString()}</strong>
                    </p>
                  </div>

                  {/* Acciones Directas: Agendar o Confirmar Asistencia */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '6px', borderTop: '1px dashed #fecdd3' }}>
                    <button 
                      onClick={() => setAgendarModal({ open: true, evento: c, hito: null, fecha: c.fechaAgendamiento ? new Date(c.fechaAgendamiento).toISOString().split('T')[0] : todayStr })}
                      style={{ flex: 1, background: '#ffffff', color: '#be123c', border: '1px solid #fda4af', padding: '7px 10px', borderRadius: '10px', fontSize: '0.73rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                    >
                      <Calendar size={13} /> Agendar Cita
                    </button>

                    <button 
                      onClick={() => setConfirmModal({ open: true, evento: c, fecha: todayStr, notas: '' })}
                      style={{ flex: 1.2, background: '#10b981', color: 'white', border: 'none', padding: '7px 10px', borderRadius: '10px', fontSize: '0.73rem', fontWeight: '950', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', boxShadow: '0 4px 10px rgba(16,185,129,0.25)' }}
                    >
                      <CheckCircle2 size={13} /> Confirmar Asistió (Excel)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 🔵 SECCIÓN 2: CITAS AGENDADAS CON CONFIRMACIÓN DE ASISTENCIA */}
      {citasAgendadas.length > 0 && (
        <div style={{ background: '#ffffff', padding: '1.4rem', borderRadius: '22px', border: '1.5px solid #bfdbfe', boxShadow: '0 6px 20px rgba(37, 99, 235, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '950', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={20} color="#1d4ed8" /> 🔵 CITAS Y CONSULTAS AGENDADAS ({citasAgendadas.length})
            </h4>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#1e40af', background: '#dbeafe', padding: '3px 10px', borderRadius: '8px' }}>
              CONTROL DE ASISTENCIA Y PAGO IPS
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
            {citasAgendadas.map(c => {
              const agDateStr = c.fechaAgendamiento;
              const relativeText = getRelativeTimeText(agDateStr, now);
              const agDate = new Date(agDateStr);
              const isTodayOrPast = agDate <= now || relativeText.includes('HOY') || relativeText.includes('Vencida');

              return (
                <div key={c.id} style={{ background: isTodayOrPast ? '#eff6ff' : '#f8fafc', border: `1px solid ${isTodayOrPast ? '#93c5fd' : '#e2e8f0'}`, padding: '14px', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '950', color: '#1e3a8a' }}>{c.descripcion}</h5>
                      <span style={{ background: isTodayOrPast ? '#2563eb' : '#64748b', color: 'white', fontSize: '0.65rem', fontWeight: '950', padding: '2px 8px', borderRadius: '6px', flexShrink: 0 }}>
                        {relativeText}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.78rem', fontWeight: '800', color: '#2563eb' }}>
                      📅 Cita Agendada para: <strong>{new Date(agDateStr).toLocaleDateString()}</strong>
                    </p>
                  </div>

                  {/* Banner de Pregunta de Asistencia */}
                  <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '0.74rem', fontWeight: '900', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Bell size={13} color="#2563eb" /> ¿ASISTIÓ A LA CONSULTA O EXAMEN EL DÍA DE LA CITA?
                    </p>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => setConfirmModal({ open: true, evento: c, fecha: agDateStr ? agDateStr.split('T')[0] : todayStr, notas: '' })}
                        style={{ flex: 1.5, background: '#10b981', color: 'white', border: 'none', padding: '7px 10px', borderRadius: '10px', fontSize: '0.73rem', fontWeight: '950', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', boxShadow: '0 4px 10px rgba(16,185,129,0.25)' }}
                      >
                        <CheckCircle2 size={14} /> SÍ, ASISTIÓ (Anexar a Excel)
                      </button>

                      <button 
                        onClick={() => setAgendarModal({ open: true, evento: c, hito: null, fecha: agDateStr ? agDateStr.split('T')[0] : todayStr })}
                        style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '7px 10px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <RefreshCw size={12} /> Reagendar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 🔮 SECCIÓN 3: PREDICTOR DE PRÓXIMOS HITOS Y EXÁMENES (Con cálculo de tiempo restante y botón agendar) */}
      {proximosHitos.length > 0 && (
        <div style={{ background: '#f0f9ff', padding: '1.4rem', borderRadius: '22px', border: '1.5px solid #bae6fd' }}>
          <h4 style={{ margin: '0 0 6px', fontSize: '0.98rem', fontWeight: '950', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="#0284c7" /> 🔮 HITOS Y EXÁMENES PRÓXIMOS A REALIZAR (PREDICTOR CLÍNICO)
          </h4>
          <p style={{ margin: '0 0 12px', fontSize: '0.78rem', fontWeight: '700', color: '#0c4a6e' }}>
            Citas programadas por edad gestacional para pre-agendar con la paciente antes de la fecha límite:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
            {proximosHitos.map((item, idx) => (
              <div key={idx} style={{ background: '#ffffff', padding: '14px', borderRadius: '16px', border: '1px solid #e0f2fe', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', boxShadow: '0 4px 12px rgba(2,132,199,0.04)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                    <span style={{ background: item.badgeColor, color: 'white', fontSize: '0.68rem', fontWeight: '950', padding: '2px 8px', borderRadius: '8px' }}>
                      {item.rangoSem}
                    </span>
                    <h5 style={{ margin: 0, fontSize: '0.88rem', fontWeight: '950', color: '#0f172a' }}>{item.titulo}</h5>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: '800', color: '#0369a1' }}>
                    {item.mensaje}
                  </p>
                </div>

                <button
                  onClick={() => setAgendarModal({ open: true, evento: null, hito: item, fecha: todayStr })}
                  style={{
                    background: '#0284c7', color: 'white', border: 'none', padding: '8px 14px',
                    borderRadius: '12px', fontSize: '0.74rem', fontWeight: '950', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, boxShadow: '0 4px 12px rgba(2,132,199,0.25)'
                  }}
                >
                  <Calendar size={13} /> AGENDAR <ChevronRight size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🟢 SECCIÓN 4: HISTORIAL RECIENTE DE ATENCIONES ANEXADAS AL EXCEL */}
      {eventosRealizados.length > 0 && (
        <div style={{ background: '#ffffff', padding: '1.2rem 1.4rem', borderRadius: '20px', border: '1px solid #cbd5e1' }}>
          <h5 style={{ margin: '0 0 10px', fontSize: '0.88rem', fontWeight: '950', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="#10b981" /> 🟢 HISTORIAL DE CITAS COMPLETADAS Y ANEXADAS AL EXCEL ({eventosRealizados.length})
          </h5>
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
            {eventosRealizados.slice(0, 5).map(e => (
              <div key={e.id} style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', flexShrink: 0, minWidth: '220px' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '900', color: '#0f172a' }}>{e.descripcion}</p>
                <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <Check size={12} /> Realizado: {new Date(e.fechaRealizada || e.updatedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── MODAL 1: AGENDAR CITA (Establecer Fecha de Cita Agendada) ─── */}
      <AnimatePresence>
        {agendarModal.open && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={{ background: '#ffffff', borderRadius: '24px', padding: '1.8rem', width: '100%', maxWidth: '440px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '950', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={20} color="#0284c7" /> Agendar Fecha de Cita
                </h3>
                <button onClick={() => setAgendarModal({ open: false, evento: null, hito: null, fecha: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
              </div>

              <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', fontWeight: '800', color: '#334155' }}>
                {agendarModal.evento?.descripcion || agendarModal.hito?.titulo}
              </p>

              <label style={{ fontSize: '0.75rem', fontWeight: '900', color: '#64748b', display: 'block', marginBottom: '6px' }}>SELECCIONAR FECHA DE LA CITA CON LA IPS:</label>
              <input 
                type="date" 
                value={agendarModal.fecha} 
                onChange={(e) => setAgendarModal({ ...agendarModal, fecha: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1.5px solid #cbd5e1', fontSize: '0.95rem', fontWeight: '800', marginBottom: '1rem' }}
              />

              <div style={{ display: 'flex', gap: '6px', marginBottom: '1.4rem' }}>
                <button onClick={() => setAgendarModal({ ...agendarModal, fecha: todayStr })} style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}>Hoy</button>
                <button onClick={() => {
                  const d = new Date(); d.setDate(d.getDate() + 1);
                  setAgendarModal({ ...agendarModal, fecha: d.toISOString().split('T')[0] });
                }} style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}>Mañana</button>
                <button onClick={() => {
                  const d = new Date(); d.setDate(d.getDate() + 7);
                  setAgendarModal({ ...agendarModal, fecha: d.toISOString().split('T')[0] });
                }} style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}>En 1 semana</button>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setAgendarModal({ open: false, evento: null, hito: null, fecha: '' })} style={{ flex: 1, padding: '12px', borderRadius: '14px', background: '#f1f5f9', border: 'none', fontWeight: '900', cursor: 'pointer', color: '#475569' }}>Cancelar</button>
                <button onClick={handleSaveAgendamiento} style={{ flex: 1.5, padding: '12px', borderRadius: '14px', background: '#0284c7', color: 'white', border: 'none', fontWeight: '950', cursor: 'pointer', boxShadow: '0 6px 16px rgba(2,132,199,0.3)' }}>GUARDAR AGENDAMIENTO</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 2: CONFIRMAR ASISTENCIA & ANEXAR A MATRIZ EXCEL ─── */}
      <AnimatePresence>
        {confirmModal.open && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={{ background: '#ffffff', borderRadius: '24px', padding: '1.8rem', width: '100%', maxWidth: '460px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '950', color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={22} color="#10b981" /> Confirmar Asistencia de la Paciente
                </h3>
                <button onClick={() => setConfirmModal({ open: false, evento: null, fecha: '', notas: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
              </div>

              <div style={{ background: '#f0fdf4', padding: '12px 14px', borderRadius: '14px', border: '1px solid #bbf7d0', marginBottom: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: '950', color: '#065f46' }}>{confirmModal.evento?.descripcion}</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.74rem', fontWeight: '800', color: '#047857' }}>
                  Al confirmar, esta fecha se anexará automáticamente a los registros requeridos para la matriz de Excel FOMAG.
                </p>
              </div>

              <label style={{ fontSize: '0.75rem', fontWeight: '900', color: '#64748b', display: 'block', marginBottom: '6px' }}>FECHA EN QUE SE REALIZÓ LA ATENCIÓN:</label>
              <input 
                type="date" 
                value={confirmModal.fecha} 
                onChange={(e) => setConfirmModal({ ...confirmModal, fecha: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1.5px solid #cbd5e1', fontSize: '0.95rem', fontWeight: '800', marginBottom: '1rem' }}
              />

              <label style={{ fontSize: '0.75rem', fontWeight: '900', color: '#64748b', display: 'block', marginBottom: '6px' }}>OBSERVACIONES / RESULTADO (OPCIONAL):</label>
              <textarea 
                rows="2" 
                value={confirmModal.notas} 
                onChange={(e) => setConfirmModal({ ...confirmModal, notas: e.target.value })}
                placeholder="Ej. Realizado sin complicaciones, resultado normal..." 
                style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', marginBottom: '1.4rem' }}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setConfirmModal({ open: false, evento: null, fecha: '', notas: '' })} style={{ flex: 1, padding: '12px', borderRadius: '14px', background: '#f1f5f9', border: 'none', fontWeight: '900', cursor: 'pointer', color: '#475569' }}>Cancelar</button>
                <button onClick={handleConfirmAsistencia} style={{ flex: 1.6, padding: '12px', borderRadius: '14px', background: '#10b981', color: 'white', border: 'none', fontWeight: '950', cursor: 'pointer', boxShadow: '0 6px 16px rgba(16,185,129,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Check size={18} /> CONFIRMAR Y ANEXAR A EXCEL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ClinicalAlertsPanel;
