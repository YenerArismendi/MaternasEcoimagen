import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, X, Calendar, Microscope, Megaphone, ShieldAlert, 
  CheckCircle2, Trash2, ExternalLink, Check, Volume2, Sparkles
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

const NotificationCenterDrawer = () => {
  const { 
    notifications, 
    unreadCount, 
    isDrawerOpen, 
    setIsDrawerOpen, 
    markAllAsRead, 
    markAsRead, 
    clearNotifications,
    pushStatus,
    requestPushPermission
  } = useNotification();

  const [activeFilter, setActiveFilter] = useState('ALL');
  const navigate = useNavigate();

  const getIconForCategory = (cat) => {
    switch (cat) {
      case 'CITA': return <Calendar size={18} color="#ec4899" />;
      case 'EXAMEN': return <Microscope size={18} color="#0284c7" />;
      case 'ANUNCIO': return <Megaphone size={18} color="#7c3aed" />;
      case 'ALERTA': return <ShieldAlert size={18} color="#ef4444" />;
      default: return <Bell size={18} color="#ec4899" />;
    }
  };

  const getBorderColor = (cat) => {
    switch (cat) {
      case 'CITA': return '#fbcfe8';
      case 'EXAMEN': return '#bae6fd';
      case 'ANUNCIO': return '#ddd6fe';
      case 'ALERTA': return '#fca5a5';
      default: return '#e2e8f0';
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'ALL') return true;
    return n.category === activeFilter;
  });

  const handleAction = (item) => {
    markAsRead(item.id);
    if (item.link) {
      navigate(item.link);
      setIsDrawerOpen(false);
    }
  };

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          display: 'flex', justifyContent: 'flex-end',
          background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(6px)'
        }}>
          {/* Backdrop click to close */}
          <div style={{ position: 'absolute', inset: 0 }} onClick={() => setIsDrawerOpen(false)} />

          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            style={{
              position: 'relative', zIndex: 1,
              width: '100%', maxWidth: '440px', height: '100vh',
              background: '#ffffff',
              boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.15)',
              display: 'flex', flexDirection: 'column'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '1.5rem 1.5rem 1rem',
              borderBottom: '1px solid #f1f5f9',
              background: 'linear-gradient(135deg, #fff5f8 0%, #ffffff 100%)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: '#ec4899', color: '#ffffff', width: '38px', height: '38px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(236,72,153,0.3)' }}>
                    <Bell size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '950', color: '#831843' }}>
                      Centro de Notificaciones
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: '#db2777', fontWeight: '800' }}>
                      {unreadCount > 0 ? `${unreadCount} nuevas sin leer` : 'Al día con tus avisos'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsDrawerOpen(false)}
                  style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Botón de permiso push si no está activado */}
              {pushStatus !== 'granted' && (
                <div style={{
                  background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                  borderRadius: '14px', padding: '10px 14px', marginBottom: '0.8rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px'
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#3730a3' }}>
                    🔔 Recibe avisos directo en tu celular
                  </span>
                  <button
                    onClick={requestPushPermission}
                    style={{ background: '#4f46e5', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '10px', fontWeight: '950', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    Activar
                  </button>
                </div>
              )}

              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '4px' }}>
                {[
                  { id: 'ALL', label: 'Todas' },
                  { id: 'CITA', label: 'Citas' },
                  { id: 'EXAMEN', label: 'Exámenes' },
                  { id: 'ANUNCIO', label: 'Anuncios' },
                  { id: 'ALERTA', label: 'Alertas' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id)}
                    style={{
                      padding: '6px 14px', borderRadius: '20px', border: 'none',
                      background: activeFilter === f.id ? '#be185d' : '#f1f5f9',
                      color: activeFilter === f.id ? '#ffffff' : '#64748b',
                      fontSize: '0.75rem', fontWeight: '950', cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions Bar */}
            {notifications.length > 0 && (
              <div style={{ padding: '8px 1.5rem', background: '#faf5f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #fce7f3' }}>
                <button
                  onClick={markAllAsRead}
                  style={{ background: 'none', border: 'none', color: '#be185d', fontSize: '0.75rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <CheckCircle2 size={14} /> Marcar todas leídas
                </button>
                <button
                  onClick={clearNotifications}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Trash2 size={14} /> Limpiar historial
                </button>
              </div>
            )}

            {/* Notification List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.2rem 1.5rem' }}>
              {filteredNotifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#94a3b8' }}>
                  <Sparkles size={48} color="#ec4899" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                  <h4 style={{ margin: 0, fontWeight: '900', color: '#475569' }}>No tienes notificaciones</h4>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>Te avisaremos de tus citas, paraclínicos y novedades.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredNotifications.map(item => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '16px',
                        background: item.read ? '#ffffff' : 'linear-gradient(135deg, #fff5f8 0%, #ffffff 100%)',
                        border: `1.5px solid ${getBorderColor(item.category)}`,
                        boxShadow: item.read ? 'none' : '0 6px 16px rgba(236,72,153,0.08)',
                        position: 'relative'
                      }}
                    >
                      {!item.read && (
                        <span style={{
                          position: 'absolute', top: '14px', right: '14px',
                          width: '8px', height: '8px', borderRadius: '50%',
                          background: '#ec4899', boxShadow: '0 0 8px #ec4899'
                        }} />
                      )}

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{
                          background: '#f8fafc', padding: '8px', borderRadius: '12px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {getIconForCategory(item.category)}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h5 style={{ margin: 0, fontSize: '0.88rem', fontWeight: '950', color: '#1e293b' }}>
                            {item.title}
                          </h5>
                          <p style={{ margin: '3px 0 6px', fontSize: '0.78rem', color: '#475569', lineHeight: 1.35, fontWeight: '600' }}>
                            {item.message}
                          </p>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: '700' }}>
                              {new Date(item.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} • {new Date(item.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            </span>

                            {item.link && (
                              <button
                                onClick={() => handleAction(item)}
                                style={{
                                  background: '#fbcfe8', color: '#9d174d', border: 'none',
                                  padding: '4px 10px', borderRadius: '10px', fontSize: '0.72rem',
                                  fontWeight: '950', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                }}
                              >
                                Ver Módulo <ExternalLink size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NotificationCenterDrawer;
