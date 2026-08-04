import React, { useState, useEffect } from 'react';
import { 
  Heart, Calendar, Clock, ShieldAlert, PhoneCall, CheckCircle2, 
  User, FileText, Sparkles, Lock, AlertTriangle, Baby, Activity, 
  ChevronRight, Check, RefreshCw, MessageSquare, Phone, Info, Microscope,
  Megaphone, MapPin, Users, Star
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { calculateMaternaAlerts } from '../utils/alertUtils';

const PortalMaterna = ({ maternaData, isPreview = false }) => {
  const { notify, addNotification } = useNotification();
  const [materna, setMaterna] = useState(maternaData || null);
  const [activeTab, setActiveTab] = useState('citas');
  const [savingPhone, setSavingPhone] = useState(false);

  // Estado para anuncios
  const [anuncios, setAnuncios] = useState([]);
  const [rsvpLoading, setRsvpLoading] = useState(null); // id del anuncio cargando

  const fetchAnuncios = async () => {
    try {
      const res = await api.get('/anuncios');
      setAnuncios(res.data || []);
    } catch {}
  };

  useEffect(() => { fetchAnuncios(); }, []);

  // Sincronizar con el BottomNav móvil de GESTANTE
  useEffect(() => {
    const handleMobileTabChange = (e) => {
      setActiveTab(e.detail.tab);
    };
    window.addEventListener('gestante:tabchange', handleMobileTabChange);
    return () => window.removeEventListener('gestante:tabchange', handleMobileTabChange);
  }, []);

  // Modal para que la materna notifique fecha agendada o asistencia
  const [agendarModal, setAgendarModal] = useState({ open: false, evento: null, fecha: '' });
  const [confirmModal, setConfirmModal] = useState({ open: false, evento: null, fecha: '' });

  // Edición de teléfonos por la materna
  const [telefonos, setTelefonos] = useState({
    telefonoCel1: maternaData?.telefonoCel1 || '',
    telefonoCel2: maternaData?.telefonoCel2 || ''
  });

  useEffect(() => {
    if (maternaData) {
      setMaterna(maternaData);
      setTelefonos({
        telefonoCel1: maternaData.telefonoCel1 || '',
        telefonoCel2: maternaData.telefonoCel2 || ''
      });
    }
  }, [maternaData]);

  if (!materna) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        <Heart size={48} color="#ec4899" style={{ animation: 'pulse 1.5s infinite' }} />
        <p style={{ marginTop: '1rem', fontWeight: '800' }}>Cargando portal de la gestante...</p>
      </div>
    );
  }

  // Helper seguro para formatear fechas sin lanzar errores si viene un valor inválido
  const formatDateSafe = (dateVal) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    try {
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return String(dateVal);
    }
  };

  // Cálculos gestacionales
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const fur = materna.ingresoCPN?.fur || materna.createdAt;
  const start = fur ? new Date(fur) : new Date();
  const validStart = start && !isNaN(start.getTime()) ? start : new Date();
  const diffDays = Math.max(0, Math.ceil((now - validStart) / (1000 * 60 * 60 * 24)));
  const weeks = Math.floor(diffDays / 7);
  const daysRem = diffDays % 7;

  // Fecha probable de parto (FPP)
  const rawFpp = materna.ingresoCPN?.fpp;
  const fppDate = rawFpp && !isNaN(new Date(rawFpp).getTime())
    ? new Date(rawFpp)
    : new Date(validStart.getTime() + 280 * 24 * 60 * 60 * 1000);
  const formattedFPP = fppDate && !isNaN(fppDate.getTime())
    ? fppDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Por definir';

  const eventos = materna.eventos || [];
  const par = materna.paraclinicos || {};
  const egr = materna.egresoYPosparto || {};

  // Cálculo unificado de Alertas y Paraclínicos faltantes
  const alertsSummary = calculateMaternaAlerts(materna);

  // Citas agendadas o pendientes
  const citasPendientes = eventos.filter(e => e.estado === 'PENDIENTE');
  const citasRealizadas = eventos.filter(e => e.estado === 'REALIZADO');

  // Conteos dinámicos para Badges de Módulos (Citas, Exámenes, Alertas, Anuncios)
  const citasCount = citasPendientes.length;
  const examenesPendientesCount = alertsSummary.hitosFaltantes.length;
  const alertasCount = (materna.clasificacionRiesgo === 'ALTO' || materna.altoRiesgo ? 1 : 0) + alertsSummary.total;
  const anunciosCount = anuncios.length;

  // Evaluador Automático de Notificaciones (Citas Vencidas, Consultas, Exámenes, Anuncios, Alertas)
  useEffect(() => {
    if (!materna) return;

    // 1. Notificaciones de Citas (Vencidas, Hoy y 1 día antes)
    const todayAlerts = new Date();
    const todayStartAlerts = new Date(todayAlerts.getFullYear(), todayAlerts.getMonth(), todayAlerts.getDate());
    const mananaAlerts = new Date(todayStartAlerts.getTime() + 24 * 60 * 60 * 1000);

    eventos.forEach(ev => {
      if (ev.estado !== 'PENDIENTE' || !ev.fechaAgendamiento) return;

      const fechaCita = new Date(ev.fechaAgendamiento);
      const fechaDia = new Date(fechaCita.getFullYear(), fechaCita.getMonth(), fechaCita.getDate());
      const nombre = ev.descripcion || ev.nombreEvento || 'Consulta Prenatal';

      const esHoy = fechaDia.getTime() === todayStartAlerts.getTime();
      const esMañana = fechaDia.getTime() === mananaAlerts.getTime();
      const esPasada = fechaDia < todayStartAlerts;

      if (esPasada) {
        addNotification({
          id: `cita_vencida_${ev.id}`,
          title: `🚨 Cita Vencida: ${nombre}`,
          message: `La fecha de tu cita ya pasó. Por favor comunícate con tu clínica para reprogramar.`,
          category: 'CITA'
        });
      } else if (esHoy) {
        addNotification({
          id: `cita_hoy_${ev.id}`,
          title: `⚠️ ¡Tu cita es HOY! ${nombre}`,
          message: `Recuerda asistir puntualmente. Lleva tu documentación y carnet de vacunación.`,
          category: 'CITA'
        });
      } else if (esMañana) {
        addNotification({
          id: `cita_manana_${ev.id}`,
          title: `🔔 Recordatorio: Tu cita es MAÑANA — ${nombre}`,
          message: `Confirma tu asistencia y prepara tus documentos. Si no puedes ir, comunícate con tu clínica hoy.`,
          category: 'CITA'
        });
      }
    });

    // 2. Notificaciones de Consultas, Exámenes y Paraclínicos Pendientes (de calculateMaternaAlerts)
    alertsSummary.hitosFaltantes.forEach(hito => {
      const isConsulta = hito.categoria === 'CONSULTA';
      addNotification({
        id: `hito_pendiente_${hito.titulo.replace(/\s+/g, '_')}_${materna.id}`,
        title: `${isConsulta ? '🩺 Consulta Requerida' : '🧪 Examen Requerido'}: ${hito.titulo}`,
        message: `Estás en la semana ${weeks}. Requerido según norma técnica perinatal (${hito.ref}).`,
        category: isConsulta ? 'CITA' : 'EXAMEN'
      });
    });

    // 3. Notificaciones de Anuncios de la Clínica
    anuncios.forEach(an => {
      addNotification({
        id: `anuncio_${an.id}`,
        title: `📢 Anuncio Clínica: ${an.titulo}`,
        message: an.contenido ? (an.contenido.slice(0, 90) + '...') : 'Nuevo aviso de la clínica disponible.',
        category: 'ANUNCIO'
      });
    });

    // 4. Notificaciones de Riesgo Clínico
    if (materna.tipoRiesgo === 'ALTA' || materna.clasificacionRiesgo === 'ALTO' || materna.altoRiesgo) {
      addNotification({
        id: `riesgo_alto_${materna.id || '1'}`,
        title: `🚨 Alerta Clínica: Alto Riesgo Obstétrico`,
        message: `Monitorea atentamente los signos de alarma y acude a tu IPS de atención ante cualquier síntoma.`,
        category: 'ALERTA'
      });
    }

  }, [materna, eventos, par, weeks, anuncios, addNotification]);

  // Notificar al BottomNav móvil los conteos actualizados
  useEffect(() => {
    window.__gestanteCounts = { citas: citasCount, examenes: examenesPendientesCount, alarma: alertasCount, anuncios: anunciosCount };
    window.dispatchEvent(new CustomEvent('gestante:counts', {
      detail: window.__gestanteCounts
    }));
  }, [citasCount, examenesPendientesCount, alertasCount, anunciosCount]);

  // Estado y handler para permisos de Notificaciones Nativas en Teléfono / Navegador
  const [pushStatus, setPushStatus] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  const requestDeviceNotifications = async () => {
    if (!('Notification' in window)) {
      notify('Tu navegador o celular no soporta notificaciones push en segundo plano.', 'warning');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setPushStatus(permission);
      if (permission === 'granted') {
        notify('🌸 ¡Notificaciones del celular activadas!');
        new Notification('🌸 Dulce Espera - Ecoimagen Salud', {
          body: `¡Hola ${materna.nombres}! Te enviaremos alertas de tus citas y exámenes al teléfono.`,
          icon: '/maternal_3d.png'
        });
      } else if (permission === 'denied') {
        notify('Las notificaciones fueron bloqueadas en la configuración del navegador.', 'warning');
      }
    } catch (err) {
      notify('Error al solicitar permiso de notificaciones', 'error');
    }
  };

  // Guardar agendamiento realizado por la materna
  const handleSaveAgendamientoMaterna = async () => {
    if (!agendarModal.fecha) {
      notify('Por favor selecciona la fecha de tu cita', 'warning');
      return;
    }
    try {
      if (agendarModal.evento?.id) {
        await api.patch(`/eventos/${agendarModal.evento.id}`, {
          estaAgendado: true,
          fechaAgendamiento: new Date(agendarModal.fecha + 'T12:00:00')
        });
        notify('🌸 ¡Gracias! Hemos registrado la fecha de tu cita.');
      }
      setAgendarModal({ open: false, evento: null, fecha: '' });
      if (isPreview && maternaData) {
        // En vista previa re-fetch si aplica
      }
    } catch (err) {
      notify('Error al registrar la fecha', 'error');
    }
  };

  // Confirmar asistencia por la materna
  const handleConfirmAsistenciaMaterna = async () => {
    if (!confirmModal.fecha) {
      notify('Selecciona la fecha en la que asististe', 'warning');
      return;
    }
    try {
      if (confirmModal.evento?.id) {
        await api.patch(`/eventos/${confirmModal.evento.id}`, {
          estado: 'REALIZADO',
          fechaRealizada: new Date(confirmModal.fecha + 'T12:00:00'),
          resultado: 'Asistencia registrada por la paciente en el portal'
        });
        notify('🌸 ¡Gracias por asistir a tu cita! Tu registro se ha actualizado.');
      }
      setConfirmModal({ open: false, evento: null, fecha: '' });
    } catch (err) {
      notify('Error al confirmar asistencia', 'error');
    }
  };

  // Guardar teléfonos editados por la materna
  const handleSaveTelefonos = async () => {
    setSavingPhone(true);
    try {
      await api.put(`/maternas/${materna.id}`, {
        gestante: {
          telefonoCel1: telefonos.telefonoCel1,
          telefonoCel2: telefonos.telefonoCel2
        }
      });
      notify('Teléfonos de contacto actualizados correctamente');
    } catch (err) {
      notify('Error al actualizar teléfonos', 'error');
    } finally {
      setSavingPhone(false);
    }
  };

  // Helper para título de sección en móvil
  const SectionTitle = ({ icon: Icon, title, color }) => (
    <div className="portal-section-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', paddingBottom: '10px', borderBottom: `2px solid ${color}25` }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} color={color} />
      </div>
      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '950', color }}>{title}</h3>
    </div>
  );

  return (
    <div style={{ maxWidth: '1500px', width: '100%', margin: '0 auto', padding: '0.5rem', fontFamily: 'system-ui, -apple-system, sans-serif', boxSizing: 'border-box' }}>
      
      {/* Indicator si es Vista Previa de Control Médico */}
      {isPreview && (
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '12px 20px', borderRadius: '18px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 14px rgba(217,119,6,0.1)' }}>
          <Lock size={20} color="#d97706" />
          <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#92400e' }}>
            👁️ VISTA PREVIA PORTAL PACIENTE: Esta es la interfaz restringida que ve la materna sin acceso a modificación de expedientes ni diagnósticos clínicos.
          </span>
        </div>
      )}

      {/* Layout Dividido (2 Columnas amplias en PC, 1 Columna en Móvil) */}
      <div className="portal-split-layout">
        
        {/* PANEL IZQUIERDO: Tarjeta Gestacional 3D & Información Clave */}
        <div className="portal-sidebar-column">
          <div className="portal-hero-3d" style={{
            background: 'linear-gradient(145deg, #ffffff 0%, #fdf2f8 40%, #fbcfe8 100%)',
            borderRadius: '30px',
            padding: '1.8rem',
            color: '#831843',
            boxShadow: '0 20px 45px rgba(244, 114, 182, 0.22), inset 0 2px 4px rgba(255,255,255,0.9)',
            border: '2px solid rgba(255, 255, 255, 0.9)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Ilustración 3D de Gestación / Maternidad */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '1.4rem',
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(12px)',
              padding: '14px 18px',
              borderRadius: '24px',
              boxShadow: '0 10px 25px rgba(219,39,119,0.12)',
              border: '1.5px solid rgba(255,255,255,0.95)'
            }}>
              <div style={{
                position: 'relative',
                flexShrink: 0
              }}>
                <img 
                  src="/maternal_3d.png" 
                  alt="Maternidad 3D" 
                  style={{
                    width: '76px',
                    height: '76px',
                    borderRadius: '20px',
                    objectFit: 'cover',
                    boxShadow: '0 8px 20px rgba(244,114,182,0.4)',
                    border: '2px solid #ffffff',
                    transform: 'rotate(-2deg)'
                  }}
                />
                <span style={{
                  position: 'absolute', bottom: '-4px', right: '-4px',
                  background: '#ec4899', color: '#ffffff',
                  fontSize: '0.75rem', borderRadius: '50%', width: '24px', height: '24px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.15)', border: '2px solid #ffffff'
                }}>
                  ✨
                </span>
              </div>
              
              <div style={{ minWidth: 0, flex: 1 }}>
                <span style={{ background: '#fbcfe8', color: '#be185d', padding: '3px 10px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: '950', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Portal Paciente
                </span>
                <h2 style={{ margin: '4px 0 2px', fontSize: '1.25rem', fontWeight: '950', color: '#831843', lineHeight: 1.2 }}>
                  ¡Hola, {materna.nombres}! 👶
                </h2>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <span style={{ background: '#ffffff', color: '#9d174d', padding: '2px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '900', border: '1px solid #fecdd3' }}>
                    CC {materna.numeroIdentificacion}
                  </span>
                  <span style={{ background: '#ec4899', color: '#ffffff', padding: '2px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '900' }}>
                    {weeks < 13 ? '1er Trimestre' : weeks < 28 ? '2do Trimestre' : '3er Trimestre'}
                  </span>
                </div>
              </div>
            </div>

            {/* Módulo de Tarjetas 3D con Efecto Cristal */}
            <div className="gestacional-cards-3d" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', marginBottom: '1.2rem' }}>

              {/* Card 1: Semanas */}
              <div className="gestacional-card-item" style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(253,242,248,0.9) 100%)',
                backdropFilter: 'blur(10px)',
                padding: '12px 10px',
                borderRadius: '20px',
                border: '1.5px solid rgba(255,255,255,0.9)',
                boxShadow: '0 8px 18px rgba(157,23,77,0.06)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
              }}>
                <span className="card-icon" style={{ fontSize: '1.5rem', marginBottom: '2px' }}>🤰</span>
                <div className="card-label-group">
                  <span style={{ fontSize: '0.62rem', fontWeight: '900', color: '#9d174d', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Semana</span>
                </div>
                <strong className="card-value" style={{ fontSize: '1.4rem', fontWeight: '950', color: '#831843', margin: '1px 0' }}>{weeks}</strong>
                <span className="card-sub" style={{ fontSize: '0.62rem', fontWeight: '800', color: '#db2777' }}>
                  {40 - weeks} restantes
                </span>
              </div>

              {/* Card 2: FPP */}
              <div className="gestacional-card-item" style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(253,242,248,0.9) 100%)',
                backdropFilter: 'blur(10px)',
                padding: '12px 10px',
                borderRadius: '20px',
                border: '1.5px solid rgba(255,255,255,0.9)',
                boxShadow: '0 8px 18px rgba(157,23,77,0.06)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
              }}>
                <span className="card-icon" style={{ fontSize: '1.5rem', marginBottom: '2px' }}>🍼</span>
                <div className="card-label-group">
                  <span style={{ fontSize: '0.62rem', fontWeight: '900', color: '#9d174d', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Fecha Parto</span>
                </div>
                <strong className="card-value" style={{ fontSize: '0.78rem', fontWeight: '950', color: '#831843', margin: '2px 0', lineHeight: 1.2 }}>{formattedFPP}</strong>
                <span className="card-sub" style={{ fontSize: '0.62rem', fontWeight: '900', color: '#ec4899' }}>¡Casi listo!</span>
              </div>

              {/* Card 3: IPS */}
              <div className="gestacional-card-item" style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(253,242,248,0.9) 100%)',
                backdropFilter: 'blur(10px)',
                padding: '12px 10px',
                borderRadius: '20px',
                border: '1.5px solid rgba(255,255,255,0.9)',
                boxShadow: '0 8px 18px rgba(157,23,77,0.06)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
              }}>
                <span className="card-icon" style={{ fontSize: '1.5rem', marginBottom: '2px' }}>🏥</span>
                <div className="card-label-group">
                  <span style={{ fontSize: '0.62rem', fontWeight: '900', color: '#9d174d', textTransform: 'uppercase', letterSpacing: '0.3px' }}>IPS Atenc.</span>
                </div>
                <strong className="card-value" style={{ fontSize: '0.75rem', fontWeight: '950', color: '#831843', margin: '2px 0', lineHeight: 1.2, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {materna.ipsAtencion || 'Ecoimagen'}
                </strong>
                <span className="card-sub" style={{ fontSize: '0.62rem', fontWeight: '800', color: '#0284c7' }}>{materna.telefonoCel1 || 'Asignada'}</span>
              </div>

            </div>

            {/* Barra de progreso 3D de 40 Semanas */}
            <div style={{ background: 'rgba(255,255,255,0.8)', padding: '12px 16px', borderRadius: '20px', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 6px 16px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', fontWeight: '950', color: '#9d174d', marginBottom: '6px' }}>
                <span>Inicio (Sem 1)</span>
                <span style={{ background: '#ec4899', color: '#ffffff', padding: '2px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '950', boxShadow: '0 4px 10px rgba(236,72,153,0.3)' }}>
                  {Math.min(100, Math.round((weeks / 40) * 100))}% Completado
                </span>
                <span>Parto (Sem 40)</span>
              </div>
              <div style={{ height: '12px', background: '#fce7f3', borderRadius: '12px', overflow: 'hidden', border: '1px solid #fbcfe8', padding: '1px' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (weeks / 40) * 100)}%`,
                  background: 'linear-gradient(90deg, #f43f5e 0%, #ec4899 50%, #8b5cf6 100%)',
                  borderRadius: '10px',
                  transition: 'width 0.6s ease',
                  boxShadow: '0 2px 8px rgba(236,72,153,0.5)'
                }} />
              </div>
            </div>

            {/* Botón Llamar Línea de Atención */}
            <div style={{ marginTop: '1.2rem' }}>
              <a 
                href={`tel:${materna.telefonoCel1 || '123'}`} 
                style={{
                  background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                  color: 'white',
                  padding: '12px 18px',
                  borderRadius: '18px',
                  fontWeight: '950',
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 20px rgba(225,29,72,0.35)',
                  transition: 'transform 0.2s ease'
                }}
              >
                <PhoneCall size={18} /> LLAMAR A LÍNEA DE ATENCIÓN DIRECTA
              </a>
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: Módulos por Pestañas */}
        <div className="portal-content-column">

          {/* Banner de Notificaciones al Celular */}
          <div style={{
            background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
            border: '1.5px solid #c7d2fe',
            borderRadius: '20px',
            padding: '12px 18px',
            marginBottom: '1.2rem',
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            boxShadow: '0 6px 18px rgba(99,102,241,0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#4f46e5', color: '#ffffff', width: '40px', height: '40px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.2rem' }}>
                🔔
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: '950', color: '#312e81' }}>
                  Notificaciones al Teléfono / Celular
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#4338ca', fontWeight: '700' }}>
                  {pushStatus === 'granted'
                    ? '✅ Las notificaciones están activadas en tu dispositivo.'
                    : 'Recibe alertas con sonido sobre tus citas, ecografías y vacunas directamente en tu celular.'}
                </p>
              </div>
            </div>
            {pushStatus !== 'granted' && (
              <button
                onClick={requestDeviceNotifications}
                style={{
                  background: '#4f46e5', color: '#ffffff', border: 'none',
                  padding: '9px 16px', borderRadius: '14px', fontWeight: '950',
                  fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(79,70,229,0.3)',
                  whiteSpace: 'nowrap'
                }}
              >
                🔔 Activar Notificaciones
              </button>
            )}
          </div>

          {/* Navegación por pestañas — solo visible en DESKTOP */}
          <div className="portal-desktop-tabs" style={{ marginBottom: '1.2rem' }}>
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {[
                { id: 'citas',    label: '📅 Mis Citas y Consultas',    color: '#ec4899', count: citasCount },
                { id: 'examenes', label: '🧪 Mis Exámenes',             color: '#0284c7', count: examenesPendientesCount },
                { id: 'alarma',   label: '🚨 Signos de Alerta',         color: '#ef4444', count: alertasCount },
                { id: 'anuncios', label: '📢 Anuncios Clínica',        color: '#7c3aed', count: anunciosCount },
                { id: 'perfil',   label: '👤 Mis Datos',                color: '#10b981', count: 0 }
              ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      padding: '12px 20px', borderRadius: '18px', border: 'none',
                      background: isActive ? tab.color : '#ffffff',
                      color: isActive ? '#ffffff' : '#475569',
                      fontWeight: '950', fontSize: '0.88rem', cursor: 'pointer',
                      boxShadow: isActive ? `0 8px 22px ${tab.color}40` : '0 4px 12px rgba(0,0,0,0.04)',
                      whiteSpace: 'nowrap', transition: 'all 0.22s ease',
                      display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                  >
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span style={{
                        background: isActive ? 'rgba(255,255,255,0.3)' : (tab.id === 'alarma' ? '#ef4444' : '#be185d'),
                        color: '#ffffff',
                        fontSize: '0.72rem',
                        fontWeight: '950',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                      }}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Título de sección visible en MÓVIL */}
          <div className="portal-mobile-section-title">
            {activeTab === 'citas'    && <SectionTitle icon={Calendar}    title="📅 Mis Citas y Consultas"      color="#ec4899" />}
            {activeTab === 'examenes' && <SectionTitle icon={Microscope}  title="🧪 Mis Exámenes y Resultados"   color="#0284c7" />}
            {activeTab === 'alarma'   && <SectionTitle icon={ShieldAlert} title="🚨 Signos de Alarma y Consejos"  color="#ef4444" />}
            {activeTab === 'anuncios' && <SectionTitle icon={Megaphone}   title="📢 Anuncios de la Clínica"      color="#7c3aed" />}
            {activeTab === 'perfil'   && <SectionTitle icon={User}        title="👤 Mis Datos de Contacto"       color="#10b981" />}
          </div>

      <style>{`
        /* Layout split en PC */
        .portal-split-layout {
          display: grid;
          grid-template-columns: 420px 1fr;
          gap: 2rem;
          align-items: start;
        }
        .portal-sidebar-column {
          position: sticky;
          top: 1.5rem;
        }
        .portal-content-column {
          min-width: 0;
        }

        @media (min-width: 900px) {
          .portal-mobile-section-title { display: none !important; }
        }
        @media (max-width: 899px) {
          .portal-split-layout {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          .portal-sidebar-column {
            position: static !important;
          }
          .portal-desktop-tabs { display: none !important; }

          /* Hero 3D Card en móvil */
          .portal-hero-3d {
            padding: 1.2rem !important;
            border-radius: 24px !important;
          }

          /* Tarjetas gestacionales 3D en móvil: Tirillas horizontales amplias */
          .gestacional-cards-3d {
            grid-template-columns: 1fr !important;
            gap: 0.55rem !important;
          }
          .gestacional-card-item {
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
            text-align: left !important;
            padding: 10px 16px !important;
            border-radius: 18px !important;
          }
          .card-icon {
            font-size: 1.6rem !important;
            margin-bottom: 0 !important;
            margin-right: 10px !important;
          }
          .card-label-group {
            flex: 1;
            display: flex;
            align-items: center;
          }
          .card-value {
            font-size: 0.95rem !important;
            margin: 0 !important;
            text-align: right;
            white-space: nowrap !important;
          }
          .card-sub {
            display: none !important;
          }

          /* Secciones: 1 columna, bordes más suaves */
          .portal-grid-2col { grid-template-columns: 1fr !important; }
          .portal-grid-auto { grid-template-columns: 1fr !important; }
          .portal-card { border-radius: 18px !important; padding: 1.1rem !important; }
          .portal-header-card { border-radius: 20px !important; padding: 1.2rem !important; }
          /* Citas: tarjetas full-width */
          .cita-card { grid-template-columns: 1fr !important; }
          /* Examenes: 1 columna */
          .examenes-grid { grid-template-columns: 1fr !important; }
          /* Alarma: síntomas 1 columna */
          .alarma-grid { grid-template-columns: 1fr !important; }
          .tips-grid { grid-template-columns: 1fr !important; }
          /* Perfil: inputs full width */
          .perfil-inputs { max-width: 100% !important; }
          /* Botones de cita: columna */
          .cita-btns { flex-direction: column !important; }
          .cita-btns button { flex: none !important; width: 100% !important; }
        }
        /* Transición de tab */
        .portal-tab-content {
          animation: fadeSlideUp 0.22s ease both;
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ─── CONTENIDO TAB 1: MIS CITAS Y CONSULTAS ─── */}
      {activeTab === 'citas' && (
        <div key="citas" className="portal-tab-content" style={{ display: 'grid', gap: '1.2rem' }}>

          {/* ── BLOQUE 1: CITAS YA AGENDADAS (vista principal, con alerta de 1 día antes) ── */}
          {(() => {
            const citasAgendadas = citasPendientes.filter(e => e.estaAgendado || e.fechaAgendamiento);
            const hoy = new Date();
            const todayStart = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
            const manana = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
            const pasadoManana = new Date(todayStart.getTime() + 2 * 24 * 60 * 60 * 1000);

            if (citasAgendadas.length === 0) return null;

            return (
              <div className="portal-card" style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.05)', border: '1px solid #bfdbfe' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: '950', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={20} color="#2563eb" /> 📅 Mis Citas Ya Agendadas ({citasAgendadas.length})
                </h3>

                <div className="cita-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1rem' }}>
                  {citasAgendadas.map(c => {
                    const fechaCita = c.fechaAgendamiento ? new Date(c.fechaAgendamiento) : null;
                    const fechaDia = fechaCita ? new Date(fechaCita.getFullYear(), fechaCita.getMonth(), fechaCita.getDate()) : null;

                    const esHoy = fechaDia && fechaDia.getTime() === todayStart.getTime();
                    const esMañana = fechaDia && fechaDia.getTime() === manana.getTime();
                    const esUrgente = esHoy || esMañana;
                    const esPasada = fechaDia && fechaDia < todayStart;

                    return (
                      <div
                        key={c.id}
                        style={{
                          background: esHoy ? '#fef3c7' : esMañana ? '#eff6ff' : esPasada ? '#fff1f2' : '#f0fdf4',
                          border: `2px solid ${esHoy ? '#f59e0b' : esMañana ? '#60a5fa' : esPasada ? '#fca5a5' : '#86efac'}`,
                          padding: '1.2rem',
                          borderRadius: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        {/* Alerta de urgencia 1 día antes / mismo día */}
                        {(esHoy || esMañana) && (
                          <div style={{
                            background: esHoy ? '#f59e0b' : '#2563eb',
                            color: 'white',
                            padding: '8px 14px',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: '950',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <Clock size={14} />
                            {esHoy ? '⚠️ ¡TU CITA ES HOY! Recuerda asistir puntualmente.' : '🔔 ¡Recuerda! Tu cita es MAÑANA. Confirma tu asistencia.'}
                          </div>
                        )}

                        {esPasada && (
                          <div style={{ background: '#ef4444', color: 'white', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '950', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <AlertTriangle size={13} /> Cita pasada sin confirmar — Comunícate con tu clínica
                          </div>
                        )}

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '950', color: '#0f172a' }}>{c.descripcion}</h4>
                            <span style={{
                              background: esHoy ? '#f59e0b' : esMañana ? '#2563eb' : esPasada ? '#ef4444' : '#10b981',
                              color: 'white',
                              fontSize: '0.65rem',
                              fontWeight: '950',
                              padding: '2px 9px',
                              borderRadius: '8px',
                              flexShrink: 0
                            }}>
                              {esHoy ? 'HOY' : esMañana ? 'MAÑANA' : esPasada ? 'VENCIDA' : 'AGENDADA'}
                            </span>
                          </div>
                          <p style={{ margin: '6px 0 0', fontSize: '0.82rem', fontWeight: '800', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={13} />
                            {fechaCita ? `📅 ${formatDateSafe(c.fechaAgendamiento)}` : 'Fecha por confirmar'}
                          </p>
                          {c.tipo && (
                            <span style={{ fontSize: '0.68rem', fontWeight: '900', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', display: 'inline-block', marginTop: '4px' }}>
                              {c.tipo}
                            </span>
                          )}
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.7)', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                          <p style={{ margin: 0, fontSize: '0.76rem', fontWeight: '800', color: '#374151' }}>
                            💡 Recuerda llevar tu carnet de vacunación, documentos de identidad y tu historia clínica.
                            Si no puedes asistir, comunícate con tu clínica para reprogramar.
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ── BLOQUE 2: ALERTAS NORMATIVAS (SIN OPCIÓN DE AGENDAMIENTO — solo informativo) ── */}
          {(() => {
            const { hitosFaltantes, citasVencidas, consultasPendientes, weeks: semActual } = alertsSummary;
            const todasAlertas = [
              ...hitosFaltantes.map(h => ({ ...h, origen: 'normativo' })),
              ...citasVencidas.map(e => ({ id: 'cita', titulo: e.descripcion, ref: 'Cita vencida', tipo: 'urgente', categoria: e.tipo || 'CITA', origen: 'cita_vencida', evento: e })),
            ];
            if (todasAlertas.length === 0) return null;

            return (
              <div className="portal-card" style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '24px', boxShadow: '0 8px 24px rgba(251,113,133,0.08)', border: '1.5px solid #fecdd3' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: '950', color: '#9f1239', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={20} color="#ef4444" /> 🚨 Alertas y Pendientes de Atención ({todasAlertas.length})
                </h3>
                <p style={{ margin: '0 0 14px', fontSize: '0.8rem', color: '#be123c', fontWeight: '700' }}>
                  Estos son los controles y exámenes que tu equipo médico requiere atender. Por favor gestiona una cita con tu clínica o IPS para cada uno.
                </p>

                <div className="cita-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                  {todasAlertas.map((alerta, idx) => {
                    const esConsulta = alerta.categoria === 'CONSULTA';
                    const esVacuna  = alerta.categoria === 'VACUNA';
                    const esUrgente = alerta.tipo === 'urgente';

                    const bgColor  = esUrgente ? '#fff1f2' : '#fefce8';
                    const bdColor  = esUrgente ? '#fca5a5' : '#fde047';
                    const txtColor = esUrgente ? '#881337' : '#713f12';
                    const badgeBg  = esUrgente ? '#ef4444' : '#eab308';
                    const icon     = esConsulta ? '🩺' : esVacuna ? '💉' : '🧪';

                    return (
                      <div key={idx} style={{ background: bgColor, border: `1.5px solid ${bdColor}`, padding: '1.1rem', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '950', color: txtColor }}>
                            {icon} {alerta.titulo}
                          </h4>
                          <span style={{ background: badgeBg, color: 'white', fontSize: '0.62rem', fontWeight: '950', padding: '2px 8px', borderRadius: '6px', flexShrink: 0 }}>
                            {alerta.ref}
                          </span>
                        </div>

                        {/* Mensaje informativo para la materna — SIN botones de agendamiento */}
                        <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '12px', padding: '10px 12px', border: `1px dashed ${bdColor}` }}>
                          <p style={{ margin: 0, fontSize: '0.76rem', fontWeight: '800', color: txtColor, lineHeight: 1.5 }}>
                            📞 <strong>Por favor gestiona esta cita</strong> con tu clínica, IPS o médico tratante a la brevedad posible.
                            {esUrgente ? ' Este control es urgente según tu etapa gestacional.' : ' Este control está programado para tu bienestar y el del bebé.'}
                          </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: '900', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                            Semana {semActual} de gestación
                          </span>
                          {alerta.categoria && (
                            <span style={{ fontSize: '0.68rem', fontWeight: '900', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                              {alerta.categoria}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ── BLOQUE 3: CITAS PENDIENTES POR AGENDAR ── */}
          {(() => {
            const citasSinAgendar = citasPendientes.filter(e => !e.estaAgendado && !e.fechaAgendamiento);
            if (citasSinAgendar.length === 0) return null;

            return (
              <div className="portal-card" style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.04)', border: '1.5px solid #e0e7ff' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: '950', color: '#3730a3', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={20} color="#6366f1" /> 📋 Actividades Pendientes de Agendar ({citasSinAgendar.length})
                </h3>
                <p style={{ margin: '0 0 14px', fontSize: '0.8rem', color: '#4338ca', fontWeight: '700' }}>
                  Estas consultas o controles aún no tienen fecha confirmada. Solicita a tu médico o clínica que asigne una fecha.
                </p>

                <div className="cita-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                  {citasSinAgendar.map(c => (
                    <div key={c.id} style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', padding: '1rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '950', color: '#3730a3' }}>{c.descripcion}</h4>
                        <span style={{ background: '#6366f1', color: 'white', fontSize: '0.62rem', fontWeight: '950', padding: '2px 8px', borderRadius: '6px', flexShrink: 0 }}>
                          {c.tipo || 'ACTIVIDAD'}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#4338ca', fontWeight: '700' }}>
                        📞 Solicita a tu médico o clínica que asigne una fecha para esta actividad.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ── BLOQUE 4: HISTORIAL DE CITAS CUMPLIDAS ── */}
          {citasRealizadas.length > 0 && (
            <div className="portal-card" style={{ background: '#ffffff', padding: '1.4rem', borderRadius: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: '950', color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="#10b981" /> Historial de Citas y Atenciones Realizadas ({citasRealizadas.length})
              </h4>
              <div className="portal-grid-auto" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                {citasRealizadas.map(e => (
                  <div key={e.id} style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: '14px', border: '1px solid #bbf7d0' }}>
                    <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: '950', color: '#065f46' }}>{e.descripcion}</p>
                    <span style={{ fontSize: '0.72rem', color: '#047857', fontWeight: '800' }}>
                      ✅ Atendido el: {formatDateSafe(e.fechaRealizada || e.updatedAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── BLOQUE 5: Todo al día ── */}
          {citasPendientes.length === 0 && alertsSummary.total === 0 && (
            <div style={{ background: '#f0fdf4', padding: '2rem', borderRadius: '24px', border: '1.5px solid #bbf7d0', textAlign: 'center' }}>
              <CheckCircle2 size={40} color="#10b981" style={{ margin: '0 auto 12px' }} />
              <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: '950', color: '#065f46' }}>¡Todo al día! 🎉</h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#047857', fontWeight: '700' }}>No tienes citas pendientes ni alertas activas. Continúa con tus controles prenatales de seguimiento.</p>
            </div>
          )}

        </div>
      )}

      {/* ─── CONTENIDO TAB 2: MIS EXÁMENES Y RESULTADOS (LECTURA RESTRINGIDA) ─── */}
      {activeTab === 'examenes' && (
        <div key="examenes" className="portal-tab-content portal-card" style={{ background: '#ffffff', padding: '1.6rem', borderRadius: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '950', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Microscope size={22} color="#0284c7" /> Mis Resultados de Paraclínicos e Imágenes
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: '700' }}>
                Consulta los resultados registrados por tu equipo médico.
              </p>
            </div>
            <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '6px 14px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '950', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={14} /> Vista de Solo Lectura para la Paciente
            </div>
          </div>

          <div className="examenes-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
            {[
              { label: 'Hemoclasificación / Grupo Sanguíneo', val: par.hemoclasificacion },
              { label: 'Ecografía 1er Trimestre', val: formatDateSafe(par.ecografia1Trimestre) || par.eco1_Interpretacion },
              { label: 'Prueba de Tolerancia a la Glucosa (PTOG 75g)', val: par.ptog_75gr },
              { label: 'Ecografía de Detalle Anatómico Fetal', val: formatDateSafe(par.ecografiaDetalle) || par.ecoDetalle_Interpretacion },
              { label: 'Urocultivo 1er Trimestre', val: par.urocultivo },
              { label: 'Tamizaje Estreptococo Grupo B', val: par.estreptococoB },
              { label: 'Vacuna Tdap (Tosferina / Tétanos)', val: egr.fechaTdap ? `Aplicada el ${formatDateSafe(egr.fechaTdap)}` : null },
              { label: 'Vacuna Influenza Gestacional', val: egr.fechaInfluenza ? `Aplicada el ${formatDateSafe(egr.fechaInfluenza)}` : null },
              { label: 'Consulta de Odontología Prenatal', val: egr.odontologia_Ctrl1 ? `Realizada el ${formatDateSafe(egr.odontologia_Ctrl1)}` : null }
            ].map((item, idx) => {
              const displayVal = (typeof item.val === 'string' || typeof item.val === 'number') 
                ? item.val 
                : (item.val ? String(item.val) : null);

              return (
                <div key={idx} style={{ background: displayVal ? '#f0f9ff' : '#f8fafc', padding: '14px 16px', borderRadius: '18px', border: `1px solid ${displayVal ? '#bae6fd' : '#e2e8f0'}` }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    {item.label}
                  </span>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '950', color: displayVal ? '#0369a1' : '#94a3b8' }}>
                    {displayVal || 'Pendiente por realizar o registrar por tu médico'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── CONTENIDO TAB 3: SIGNOS DE ALARMA Y GUÍA DE SALUD ─── */}
      {activeTab === 'alarma' && (
        <div key="alarma" className="portal-tab-content" style={{ display: 'grid', gap: '1rem' }}>
          
          <div style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', border: '1.5px solid #fca5a5', padding: '1.6rem', borderRadius: '24px', boxShadow: '0 8px 24px rgba(239,68,68,0.1)' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '1.2rem', fontWeight: '950', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldAlert size={26} color="#ef4444" /> 🚨 ¿CUÁNDO DEBES IR A URGENCIAS DE INMEDIATO?
            </h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#7f1d1d', fontWeight: '800' }}>
              Si presentas cualquiera de los siguientes síntomas, acude de inmediato al centro de urgencias maternidad más cercano:
            </p>

            <div className="alarma-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
              {[
                '🔴 Sangrado vaginal de cualquier cantidad',
                '🔴 Dolor de cabeza intenso que no calma con reposo',
                '🔴 Ver lucecitas, chispitas o visión borrosa',
                '🔴 Zumbido constante en los oídos (pitos)',
                '🔴 Disminución o ausencia de movimientos de tu bebé',
                '🔴 Salida de líquido por la vagina (romper fuente)',
                '🔴 Dolores de vientre fuertes o contracciones seguidas',
                '🔴 Fiebre superior a 38°C o escalofríos',
                '🔴 Hinchazón repentina de cara, manos y pies'
              ].map((sintoma, idx) => (
                <div key={idx} style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '14px', border: '1px solid #fecdd3', fontSize: '0.82rem', fontWeight: '900', color: '#881337' }}>
                  {sintoma}
                </div>
              ))}
            </div>

            <div style={{ marginTop: '1.4rem', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <a 
                href={`tel:${materna.telefonoCel1 || '123'}`} 
                style={{ background: '#dc2626', color: 'white', padding: '12px 20px', borderRadius: '14px', fontWeight: '950', fontSize: '0.88rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 6px 16px rgba(220,38,38,0.3)' }}
              >
                <PhoneCall size={18} /> LLAMAR A MI IPS DE ATENCIÓN
              </a>
            </div>
          </div>

          <div className="portal-card" style={{ background: '#ffffff', padding: '1.6rem', borderRadius: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: '950', color: '#831843', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} color="#ec4899" /> 💡 Recomendaciones para tu Bienestar en el Embarazo
            </h4>
            <div className="tips-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              <div style={{ background: '#fdf2f8', padding: '14px', borderRadius: '16px', border: '1px solid #fbcfe8' }}>
                <h5 style={{ margin: '0 0 4px', fontSize: '0.88rem', fontWeight: '950', color: '#9d174d' }}>🥗 Alimentación Saludable</h5>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#831843', fontWeight: '700' }}>Consume frutas, verduras, proteína y toma abundante agua. Evita carnes crudas o embutidos sin cocinar.</p>
              </div>

              <div style={{ background: '#f0f9ff', padding: '14px', borderRadius: '16px', border: '1px solid #bae6fd' }}>
                <h5 style={{ margin: '0 0 4px', fontSize: '0.88rem', fontWeight: '950', color: '#0369a1' }}>💊 Micronutrientes</h5>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#0c4a6e', fontWeight: '700' }}>Toma tu Ácido Fólico, Hierro y Calcio diariamente según las indicaciones de tu médico en los controles.</p>
              </div>

              <div style={{ background: '#f0fdf4', padding: '14px', borderRadius: '16px', border: '1px solid #bbf7d0' }}>
                <h5 style={{ margin: '0 0 4px', fontSize: '0.88rem', fontWeight: '950', color: '#065f46' }}>🪥 Salud Oral</h5>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#047857', fontWeight: '700' }}>Asiste a tu consulta de odontología prenatal. Cepíllate 3 veces al día y usa seda dental para prevenir encías inflamadas.</p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ─── CONTENIDO TAB 5: ANUNCIOS DE LA CLÍNICA ─── */}
      {activeTab === 'anuncios' && (
        <div key="anuncios" className="portal-tab-content" style={{ display: 'grid', gap: '1rem' }}>
          {anuncios.length === 0 ? (
            <div style={{ background: '#ffffff', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', textAlign: 'center' }}>
              <Megaphone size={40} color="#7c3aed" style={{ opacity: 0.3, margin: '0 auto 12px' }} />
              <h4 style={{ margin: '0 0 6px', fontWeight: '950', color: '#4c1d95' }}>No hay anuncios en este momento</h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', fontWeight: '700' }}>¡Vuelve pronto! La clínica publicará talleres, eventos y novedades aquí.</p>
            </div>
          ) : (
            anuncios.map(a => {
              const TIPO_META = {
                INFO:    { color: '#3b82f6', bg: '#eff6ff', emoji: 'ℹ️',  label: 'Información' },
                EVENTO:  { color: '#8b5cf6', bg: '#f5f3ff', emoji: '🎉', label: 'Evento' },
                TALLER:  { color: '#f59e0b', bg: '#fffbeb', emoji: '📚', label: 'Taller' },
                URGENTE: { color: '#ef4444', bg: '#fef2f2', emoji: '🚨', label: 'Urgente' },
                OFERTA:  { color: '#10b981', bg: '#f0fdf4', emoji: '🎁', label: 'Oferta' },
              };
              const m = TIPO_META[a.tipo] || TIPO_META.INFO;
              const yaInscrita = a.participaciones?.some(p => p.gestanteId === materna?.id);
              const cupoLleno = a.cupoMaximo && (a.participaciones?.filter(p => p.estado === 'CONFIRMADO').length || 0) >= a.cupoMaximo;

              const handleRSVP = async () => {
                if (rsvpLoading) return;
                setRsvpLoading(a.id);
                try {
                  if (yaInscrita) {
                    await api.delete(`/anuncios/${a.id}/participar`);
                    notify('Inscripción cancelada correctamente', 'info');
                  } else {
                    await api.post(`/anuncios/${a.id}/participar`);
                    notify('🎉 ¡Te has inscrito correctamente!', 'success');
                  }
                  fetchAnuncios();
                } catch (err) {
                  notify(err.response?.data?.error || 'Error al procesar', 'error');
                } finally {
                  setRsvpLoading(null);
                }
              };

              return (
                <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ background: '#ffffff', borderRadius: '22px', boxShadow: '0 6px 20px rgba(0,0,0,0.05)', border: `1px solid ${a.destacado ? '#ddd6fe' : '#f1f5f9'}`, overflow: 'hidden' }}>

                  {/* Banda de color por tipo */}
                  <div style={{ height: '4px', background: `linear-gradient(90deg, ${m.color}, ${m.color}88)` }} />

                  <div style={{ padding: '1.2rem 1.4rem' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{m.emoji}</span>
                      <span style={{ background: m.bg, color: m.color, padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '900', border: `1px solid ${m.color}30` }}>{m.label}</span>
                      {a.destacado && <span style={{ background: '#fef3c7', color: '#d97706', padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '900' }}>⭐ Destacado</span>}
                    </div>

                    <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: '950', color: '#1e293b' }}>{a.titulo}</h3>
                    <p style={{ margin: '0 0 10px', fontSize: '0.83rem', color: '#475569', fontWeight: '600', lineHeight: 1.5 }}>{a.contenido}</p>

                    {/* Meta info */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.75rem', color: '#64748b', fontWeight: '700', marginBottom: a.permiteRSVP ? '12px' : 0 }}>
                      {a.fechaEvento && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '4px 10px', borderRadius: '10px' }}>
                          <Calendar size={12} color={m.color} /> {new Date(a.fechaEvento).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      )}
                      {a.lugarEvento && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '4px 10px', borderRadius: '10px' }}>
                          <MapPin size={12} color={m.color} /> {a.lugarEvento}
                        </span>
                      )}
                      {a.permiteRSVP && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f5f3ff', color: '#7c3aed', padding: '4px 10px', borderRadius: '10px' }}>
                          <Users size={12} /> {a.participaciones?.filter(p => p.estado === 'CONFIRMADO').length || 0} inscritas
                          {a.cupoMaximo && ` / ${a.cupoMaximo}`}
                        </span>
                      )}
                    </div>

                    {/* Botón RSVP */}
                    {a.permiteRSVP && !isPreview && (
                      <motion.button whileTap={{ scale: 0.96 }} onClick={handleRSVP}
                        disabled={rsvpLoading === a.id || (cupoLleno && !yaInscrita)}
                        style={{
                          width: '100%', padding: '11px', borderRadius: '14px', border: 'none', cursor: (cupoLleno && !yaInscrita) ? 'not-allowed' : 'pointer',
                          background: yaInscrita ? '#f0fdf4' : cupoLleno ? '#f1f5f9' : `linear-gradient(135deg, ${m.color}, ${m.color}cc)`,
                          color: yaInscrita ? '#065f46' : cupoLleno ? '#94a3b8' : '#ffffff',
                          fontWeight: '950', fontSize: '0.88rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          boxShadow: (!yaInscrita && !cupoLleno) ? `0 6px 16px ${m.color}40` : 'none',
                          border: yaInscrita ? '2px solid #86efac' : 'none',
                          marginTop: '10px', transition: 'all 0.2s'
                        }}>
                        {rsvpLoading === a.id
                          ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
                          : yaInscrita
                          ? <><Check size={16} /> ¡Ya estás inscrita! (Toca para cancelar)</>
                          : cupoLleno
                          ? 'Cupo lleno'
                          : <><Star size={15} /> Quiero participar</>
                        }
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* ─── CONTENIDO TAB 4: MIS DATOS DE CONTACTO (EDITABLE SOLO TELÉFONOS POR LA MATERNA) ─── */}
      {activeTab === 'perfil' && (
        <div key="perfil" className="portal-tab-content portal-card" style={{ background: '#ffffff', padding: '1.6rem', borderRadius: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '1.1rem', fontWeight: '950', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={22} color="#10b981" /> Actualizar Mis Datos de Contacto
          </h3>
          <p style={{ margin: '0 0 1.2rem', fontSize: '0.82rem', color: '#64748b', fontWeight: '700' }}>
            Como paciente, puedes actualizar tus números telefónicos para que tu equipo médico pueda llamarte o enviarte recordatorios. Los datos médicos solo son editados por tu profesional de salud.
          </p>

          <div className="perfil-inputs" style={{ maxWidth: '500px', display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '900', color: '#64748b', display: 'block', marginBottom: '4px' }}>TELÉFONO CELULAR PRINCIPAL:</label>
              <input 
                type="text" 
                value={telefonos.telefonoCel1} 
                onChange={(e) => setTelefonos({ ...telefonos, telefonoCel1: e.target.value })}
                placeholder="Ej. 3001234567"
                style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1.5px solid #cbd5e1', fontWeight: '800', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '900', color: '#64748b', display: 'block', marginBottom: '4px' }}>TELÉFONO SECUNDARIO / FAMILIAR:</label>
              <input 
                type="text" 
                value={telefonos.telefonoCel2} 
                onChange={(e) => setTelefonos({ ...telefonos, telefonoCel2: e.target.value })}
                placeholder="Ej. 3109876543"
                style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1.5px solid #cbd5e1', fontWeight: '800', fontSize: '0.9rem' }}
              />
            </div>

            <button 
              onClick={handleSaveTelefonos}
              disabled={savingPhone}
              style={{ padding: '12px 24px', borderRadius: '14px', background: '#10b981', color: 'white', fontWeight: '950', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 6px 16px rgba(16,185,129,0.3)' }}
            >
              <Check size={18} /> {savingPhone ? 'GUARDANDO...' : 'GUARDAR TELÉFONOS DE CONTACTO'}
            </button>
          </div>
        </div>
      )}

        </div>
      </div>

      {/* ─── MODAL 1: REGISTRAR FECHA DE CITA DESDE EL PORTAL MATERNA ─── */}
      {agendarModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', padding: '1.8rem', width: '100%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: '950', color: '#831843', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={20} color="#ec4899" /> Registrar Fecha de tu Cita
            </h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: '#64748b', fontWeight: '700' }}>
              {agendarModal.evento?.descripcion}
            </p>

            <label style={{ fontSize: '0.75rem', fontWeight: '900', color: '#64748b', display: 'block', marginBottom: '6px' }}>SELECCIONA LA FECHA DE TU CITA PROGRAMADA:</label>
            <input 
              type="date" 
              value={agendarModal.fecha} 
              onChange={(e) => setAgendarModal({ ...agendarModal, fecha: e.target.value })}
              style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1.5px solid #cbd5e1', fontSize: '0.95rem', fontWeight: '800', marginBottom: '1.4rem' }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setAgendarModal({ open: false, evento: null, fecha: '' })} style={{ flex: 1, padding: '12px', borderRadius: '14px', background: '#f1f5f9', border: 'none', fontWeight: '900', cursor: 'pointer', color: '#475569' }}>Cancelar</button>
              <button onClick={handleSaveAgendamientoMaterna} style={{ flex: 1.5, padding: '12px', borderRadius: '14px', background: '#ec4899', color: 'white', border: 'none', fontWeight: '950', cursor: 'pointer', boxShadow: '0 6px 16px rgba(236,72,153,0.3)' }}>GUARDAR MI CITA</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: CONFIRMAR ASISTENCIA DESDE EL PORTAL MATERNA ─── */}
      {confirmModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', padding: '1.8rem', width: '100%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: '950', color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={20} color="#10b981" /> Confirmar que Asististe
            </h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: '#64748b', fontWeight: '700' }}>
              {confirmModal.evento?.descripcion}
            </p>

            <label style={{ fontSize: '0.75rem', fontWeight: '900', color: '#64748b', display: 'block', marginBottom: '6px' }}>FECHA EN QUE ASISTISTE A TU CITA:</label>
            <input 
              type="date" 
              value={confirmModal.fecha} 
              onChange={(e) => setConfirmModal({ ...confirmModal, fecha: e.target.value })}
              style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1.5px solid #cbd5e1', fontSize: '0.95rem', fontWeight: '800', marginBottom: '1.4rem' }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmModal({ open: false, evento: null, fecha: '' })} style={{ flex: 1, padding: '12px', borderRadius: '14px', background: '#f1f5f9', border: 'none', fontWeight: '900', cursor: 'pointer', color: '#475569' }}>Cancelar</button>
              <button onClick={handleConfirmAsistenciaMaterna} style={{ flex: 1.5, padding: '12px', borderRadius: '14px', background: '#10b981', color: 'white', border: 'none', fontWeight: '950', cursor: 'pointer', boxShadow: '0 6px 16px rgba(16,185,129,0.3)' }}>CONFIRMAR MI ASISTENCIA</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PortalMaterna;
