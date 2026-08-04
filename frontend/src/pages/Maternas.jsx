import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X,
  Baby,
  Calendar,
  CreditCard,
  AlertTriangle,
  ClipboardList,
  Folder,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { calculateMaternaAlerts } from '../utils/alertUtils';

const Maternas = () => {
  const { user } = useAuth();
  const [maternas, setMaternas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMaterna, setCurrentMaterna] = useState(null);
  const [paquetes, setPaquetes] = useState([]);
  const navigate = useNavigate();
  const { notify, confirm } = useNotification();
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    numeroIdentificacion: '',
    tipoIdentificacion: 'CC',
    fechaNacimiento: '',
    fechaEmbarazo: '',
    tipoRiesgo: 'BAJA',
    paquetesSeleccionados: [],
    alertas: '',
    telefono: '',
    direccion: '',
    departamento: '',
    municipio: '',
    etnia: '',
    identidadGenero: '',
    discapacidad: '',
    victimaViolencia: '',
    carpetaEntregada: false
  });

  const fetchMaternas = async () => {
    try {
      const res = await api.get('/maternas');
      setMaternas(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.rol === 'GESTANTE') {
      if (user?.gestanteId) {
        navigate(`/maternas/${user.gestanteId}`, { replace: true });
        return;
      }
      const docNum = user?.email ? user.email.split('@')[0] : '';
      api.get('/maternas').then(res => {
        const found = res.data.find(m => m.numeroIdentificacion === docNum || user?.email?.includes(m.numeroIdentificacion));
        if (found) {
          navigate(`/maternas/${found.id}`, { replace: true });
        } else {
          setLoading(false);
        }
      }).catch(() => setLoading(false));
      return;
    }

    fetchMaternas();
    const fetchPaquetes = async () => {
        try {
            const res = await api.get('/paquetes');
            setPaquetes(res.data);
        } catch (err) { console.error(err); }
    };
    fetchPaquetes();
  }, [user, navigate]);

  const handleOpenModal = (e, materna = null) => {
    if (e) e.stopPropagation();
    if (materna) {
      setCurrentMaterna(materna);
      setFormData({
        nombres: materna.nombres,
        apellidos: materna.apellidos,
        numeroIdentificacion: materna.numeroIdentificacion,
        tipoIdentificacion: materna.tipoIdentificacion,
        fechaNacimiento: materna.fechaNacimiento.split('T')[0],
        fechaEmbarazo: materna.ingresoCPN?.fur?.split('T')[0] || materna.createdAt.split('T')[0],
        tipoRiesgo: materna.tipoRiesgo || 'BAJA',
        paquetesSeleccionados: materna.paquetesSeleccionados || [],
        alertas: materna.alertas || '',
        telefono: materna.telefonoCel1 || '',
        direccion: materna.direccion || '',
        departamento: materna.departamento || '',
        municipio: materna.municipio || '',
        etnia: materna.etnia || '',
        identidadGenero: materna.identidadGenero || '',
        discapacidad: materna.discapacidad || '',
        victimaViolencia: materna.victimaViolencia || '',
        carpetaEntregada: materna.carpetaEntregada || 'NO'
      });
    } else {
      setCurrentMaterna(null);
      setFormData({
        nombres: '',
        apellidos: '',
        numeroIdentificacion: '',
        tipoIdentificacion: 'CC',
        fechaNacimiento: '',
        fechaEmbarazo: '',
        tipoRiesgo: 'BAJA',
        paquetesSeleccionados: [],
        alertas: '',
        telefono: '',
        direccion: '',
        departamento: '',
        municipio: '',
        etnia: '',
        identidadGenero: '',
        discapacidad: '',
        victimaViolencia: '',
        carpetaEntregada: 'NO'
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenDetail = (materna) => {
    navigate(`/maternas/${materna.id}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let maternaId = currentMaterna?.id;
      if (currentMaterna) {
        await api.put(`/maternas/${currentMaterna.id}`, formData);
      } else {
        const res = await api.post('/maternas', formData);
        maternaId = res.data.id;
      }

      // Aplicar paquetes seleccionados si es nueva o se agregaron nuevos
      if (!currentMaterna && formData.paquetesSeleccionados && formData.paquetesSeleccionados.length > 0) {
          await Promise.all(formData.paquetesSeleccionados.map(async (pid) => {
              if (pid === 'basico') {
                  await api.post(`/eventos/materna/${maternaId}/generar-basicos`);
              } else {
                  await api.post(`/paquetes/aplicar/${pid}/materna/${maternaId}`);
              }
          }));
      }

      setIsModalOpen(false);
      notify(currentMaterna ? 'Paciente actualizada correctamente' : 'Paciente registrada con éxito');
      fetchMaternas();
    } catch (err) {
      notify(err.response?.data?.error || 'Error al guardar registro', 'error');
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    const ok = await confirm({
        title: '¿Eliminar Registro?',
        message: 'Esta acción no se puede deshacer y eliminará todo el historial de la paciente.',
        confirmText: 'Eliminar Paciente',
        type: 'danger'
    });

    if (ok) {
      try {
        await api.delete(`/maternas/${id}`);
        notify('Registro eliminado con éxito');
        fetchMaternas();
      } catch (err) {
        notify('Error al eliminar registro', 'error');
      }
    }
  };

  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'ALERTS' | 'OK' | 'HIGH_RISK'

  const filteredMaternas = maternas.filter(m => {
    const matchesSearch = `${m.nombres} ${m.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.numeroIdentificacion.includes(searchTerm);
    
    if (!matchesSearch) return false;

    if (filterType === 'ALERTS') {
      const alerts = calculateMaternaAlerts(m);
      return alerts.total > 0;
    }
    if (filterType === 'OK') {
      const alerts = calculateMaternaAlerts(m);
      return alerts.total === 0;
    }
    if (filterType === 'HIGH_RISK') {
      return m.tipoRiesgo === 'ALTA' || m.clasificacionRiesgo === 'ALTO' || m.altoRiesgo;
    }
    return true;
  });

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'ALTA': return 'var(--error-color)';
      case 'MEDIANA': return 'var(--warning-color)';
      case 'BAJA': return 'var(--success-color)';
      default: return 'var(--text-muted)';
    }
  };

  const handleDownloadAllFomag = async () => {
    try {
      notify('Generando reporte FOMAG...', 'info');
      const res = await api.get('/fomag/export/excel', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `FOMAG_Toda_Cohorte_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      notify('Reporte descargado correctamente', 'success');
    } catch (err) {
      console.error(err);
      notify('Error al descargar el reporte', 'error');
    }
  };

  const handleImportFomag = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    try {
      notify('Importando archivo FOMAG...', 'info');
      const form = new FormData();
      form.append('archivo', file);
      const res = await api.post('/fomag/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setImportSummary(res.data);
      setIsSummaryOpen(true);
      
      if (res.data.errores?.length === 0) {
          notify('Importación completada exitosamente', 'success');
      } else {
          notify(`Importación finalizada con ${res.data.errores.length} errores`, 'warning');
      }
      fetchMaternas();
    } catch (err) {
      notify(err.response?.data?.error || 'Error al importar el archivo', 'error');
    } finally {
      setImporting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <>
    <div className="maternas-page-content" style={{ position: 'relative', overflowX: 'hidden' }}>
      {/* Decorative Blobs */}
      <div className="blob" style={{ 
        width: '500px', height: '500px', background: 'var(--primary-color)', 
        top: '-150px', left: '-150px', filter: 'blur(120px)', opacity: 0.08 
      }} />
      <div className="blob" style={{ 
        width: '400px', height: '400px', background: 'var(--secondary-color)', 
        bottom: '-100px', right: '-100px', filter: 'blur(100px)', opacity: 0.08 
      }} />

      <div className="maternas-header" style={{ marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: 'clamp(1.2rem, 4vw, 2.2rem)', fontWeight: '900', letterSpacing: '-0.8px' }}>
            Maternas (Gestantes)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>Gestión de cohorte materno perinatal.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input id="fomag-import-input" type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImportFomag} />
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} disabled={importing} onClick={() => document.getElementById('fomag-import-input').click()}
            style={{ background: importing ? 'var(--border-color)' : 'linear-gradient(135deg, #4a1942, #7b2d8b)', color: 'white', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', borderRadius: '16px', fontSize: '0.9rem', border: 'none', cursor: importing ? 'not-allowed' : 'pointer' }}
          >
            <Upload size={18} /> <span className="btn-text">{importing ? 'Importando...' : 'Importar FOMAG'}</span>
          </motion.button>

          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleDownloadAllFomag}
            style={{ background: 'linear-gradient(135deg, #1b5e20, #2e7d32)', color: 'white', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', borderRadius: '16px', fontSize: '0.9rem', border: 'none', cursor: 'pointer' }}
          >
            <FileSpreadsheet size={18} /> <span className="btn-text">Exportar FOMAG</span>
          </motion.button>
          
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={(e) => handleOpenModal(e)}
            style={{ background: 'var(--primary-color)', color: 'white', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', borderRadius: '16px', fontSize: '0.9rem', border: 'none', cursor: 'pointer' }}
          >
            <Plus size={18} /> <span className="btn-text">Nueva Gestante</span>
          </motion.button>
        </div>
      </div>

      <div className="organic-card" style={{ overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Buscar por nombre o identificación..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '42px', paddingRight: '15px', paddingTop: '10px', paddingBottom: '10px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', fontSize: '0.9rem', borderRadius: '12px', width: '100%' }}
            />
          </div>

          {/* Filtros Rápidos de Alertas y Riesgo */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'Todas' },
              { id: 'ALERTS', label: '🚨 Con Alertas Pendientes' },
              { id: 'OK', label: '✅ Al Día' },
              { id: 'HIGH_RISK', label: '🔴 Alto Riesgo' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                style={{
                  padding: '6px 14px', borderRadius: '20px', border: 'none',
                  background: filterType === f.id ? 'var(--primary-color)' : 'var(--bg-color)',
                  color: filterType === f.id ? '#ffffff' : 'var(--text-muted)',
                  fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer',
                  border: `1px solid ${filterType === f.id ? 'var(--primary-color)' : 'var(--border-color)'}`
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="maternas-table-view" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', minWidth: '750px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-color)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <th style={{ padding: '1rem 1.2rem' }}>PACIENTE</th>
                <th style={{ padding: '1rem 1.2rem' }}>IDENTIFICACIÓN</th>
                <th style={{ padding: '1rem 1.2rem' }}>F. EMBARAZO</th>
                <th style={{ padding: '1rem 1.2rem' }}>ESTADO / ALERTAS</th>
                <th style={{ padding: '1rem 1.2rem' }}>PAQUETES</th>
                <th style={{ padding: '1rem 1.2rem' }}>RIESGO</th>
                <th style={{ padding: '1rem 1.2rem' }}>CARPETA</th>
                <th style={{ padding: '1rem 1.2rem', textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaternas.map(m => {
                const alertsInfo = calculateMaternaAlerts(m);

                return (
                  <tr key={m.id} onClick={() => handleOpenDetail(m)} style={{ cursor: 'pointer', transition: 'all 0.3s' }} className="table-row-hover">
                    <td style={{ padding: '1rem 1.2rem', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                          <Baby size={18} />
                        </div>
                        <div>
                          <p style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-main)' }}>{m.nombres} {m.apellidos}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Semana {alertsInfo.weeks}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.2rem', borderBottom: '1px solid var(--border-color)' }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)' }}>{m.tipoIdentificacion} {m.numeroIdentificacion}</p>
                    </td>
                    <td style={{ padding: '1rem 1.2rem', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-main)' }}>
                        <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                        {new Date(m.ingresoCPN?.fur || m.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    {/* COLUMNA ESTADO Y ALERTAS DE EXÁMENES / CITAS */}
                    <td style={{ padding: '1rem 1.2rem', borderBottom: '1px solid var(--border-color)' }}>
                      {alertsInfo.total > 0 ? (
                        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{
                            fontSize: '0.72rem', background: '#fff1f2', color: '#991b1b',
                            padding: '4px 10px', borderRadius: '12px', fontWeight: '950',
                            border: '1px solid #fecdd3', display: 'inline-flex', alignItems: 'center', gap: '5px'
                          }}>
                            <AlertTriangle size={13} color="#ef4444" /> {alertsInfo.total} Alerta(s) Pendientes
                          </span>
                          <span style={{ fontSize: '0.67rem', color: '#be123c', fontWeight: '800', paddingLeft: '4px' }}>
                            {alertsInfo.hitosFaltantes.length > 0 ? `${alertsInfo.hitosFaltantes.length} exám.` : ''}
                            {alertsInfo.hitosFaltantes.length > 0 && alertsInfo.citasVencidas.length > 0 ? ' • ' : ''}
                            {alertsInfo.citasVencidas.length > 0 ? `${alertsInfo.citasVencidas.length} citas venc.` : ''}
                          </span>
                        </div>
                      ) : (
                        <span style={{
                          fontSize: '0.72rem', background: '#f0fdf4', color: '#166534',
                          padding: '4px 10px', borderRadius: '12px', fontWeight: '950',
                          border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: '5px'
                        }}>
                          <CheckCircle2 size={13} color="#16a34a" /> Al Día
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '1rem 1.2rem', borderBottom: '1px solid var(--border-color)' }}>
                      {m.paquetesSeleccionados?.length > 0 ? (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {m.paquetesSeleccionados.map(pid => {
                            const isBasico = pid === 'basico';
                            const pack = paquetes.find(p => p.id === pid);
                            const name = isBasico ? 'Básico' : (pack?.nombre || 'Paquete');
                            return <span key={pid} style={{ fontSize: '0.65rem', background: 'var(--primary-color)15', color: 'var(--primary-color)', padding: '2px 8px', borderRadius: '12px', fontWeight: '800', border: '1px solid var(--primary-color)30' }}>{name}</span>;
                          })}
                        </div>
                      ) : <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ninguno</span>}
                    </td>
                    <td style={{ padding: '1rem 1.2rem', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '900', background: `${getRiskColor(m.tipoRiesgo || 'BAJA')}15`, color: getRiskColor(m.tipoRiesgo || 'BAJA'), border: `1px solid ${getRiskColor(m.tipoRiesgo || 'BAJA')}30` }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: getRiskColor(m.tipoRiesgo || 'BAJA') }} />
                        {m.tipoRiesgo || 'BAJA'}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.2rem', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '800', background: m.carpetaEntregada === 'SI' ? 'var(--success-color)15' : 'var(--bg-color)', color: m.carpetaEntregada === 'SI' ? 'var(--success-color)' : 'var(--text-muted)', border: `1px solid ${m.carpetaEntregada === 'SI' ? 'var(--success-color)30' : 'var(--border-color)'}` }}>
                        <Folder size={14} /> {m.carpetaEntregada === 'SI' ? 'Entregada' : 'Falta'}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.2rem', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <motion.button whileHover={{ scale: 1.1 }} onClick={(e) => handleOpenModal(e, m)} style={{ background: 'transparent', padding: '6px', color: 'var(--text-muted)', borderRadius: '10px', border: '1px solid var(--border-color)' }}><Edit2 size={14} /></motion.button>
                        <motion.button whileHover={{ scale: 1.1 }} onClick={(e) => handleDelete(e, m.id)} style={{ background: 'transparent', padding: '6px', color: 'var(--error-color)', borderRadius: '10px', border: '1px solid var(--border-color)' }}><Trash2 size={14} /></motion.button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '12px' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="organic-card modal-sheet" style={{ width: '100%', maxWidth: '700px', padding: '2rem', boxShadow: 'var(--shadow-xl)', maxHeight: '90vh', overflowY: 'auto', borderRadius: '28px', position: 'relative', background: 'var(--card-bg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '950', color: 'var(--text-main)' }}>{currentMaterna ? 'Editar Gestante' : 'Nueva Gestante'}</h3>
                <button onClick={() => setIsModalOpen(false)} style={{ background: 'var(--bg-color)', color: 'var(--text-muted)', padding: '8px', borderRadius: '50%', border: '1px solid var(--border-color)' }}><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', marginBottom: '6px', display: 'block' }}>NOMBRES</label>
                    <input type="text" value={formData.nombres} onChange={e => setFormData({...formData, nombres: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', marginBottom: '6px', display: 'block' }}>APELLIDOS</label>
                    <input type="text" value={formData.apellidos} onChange={e => setFormData({...formData, apellidos: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }} />
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', marginBottom: '6px', display: 'block' }}>TIPO IDENTIFICACIÓN</label>
                    <select value={formData.tipoIdentificacion} onChange={e => setFormData({...formData, tipoIdentificacion: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }}>
                      <option value="CC">Cédula de Ciudadanía</option>
                      <option value="CE">Cédula de Extranjería</option>
                      <option value="PA">Pasaporte</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', marginBottom: '6px', display: 'block' }}>NÚMERO IDENTIFICACIÓN</label>
                    <input type="text" value={formData.numeroIdentificacion} onChange={e => setFormData({...formData, numeroIdentificacion: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', marginBottom: '6px', display: 'block' }}>FECHA NACIMIENTO</label>
                    <input type="date" value={formData.fechaNacimiento} onChange={e => setFormData({...formData, fechaNacimiento: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', marginBottom: '6px', display: 'block' }}>F.U.M (INICIO EMBARAZO)</label>
                    <input type="date" value={formData.fechaEmbarazo} onChange={e => setFormData({...formData, fechaEmbarazo: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', marginBottom: '6px', display: 'block' }}>DEPARTAMENTO</label>
                    <input type="text" value={formData.departamento} onChange={e => setFormData({...formData, departamento: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', marginBottom: '6px', display: 'block' }}>MUNICIPIO</label>
                    <input type="text" value={formData.municipio} onChange={e => setFormData({...formData, municipio: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                   <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', marginBottom: '6px', display: 'block' }}>ETNIA</label>
                    <input type="text" value={formData.etnia} onChange={e => setFormData({...formData, etnia: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', marginBottom: '6px', display: 'block' }}>IDENTIDAD GÉNERO</label>
                    <input type="text" value={formData.identidadGenero} onChange={e => setFormData({...formData, identidadGenero: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }} />
                  </div>
                </div>

                {!currentMaterna && (
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', marginBottom: '10px', display: 'block' }}>APLICAR PAQUETES INICIALES</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <button type="button" onClick={() => {
                        const current = formData.paquetesSeleccionados;
                        const next = current.includes('basico') ? current.filter(x => x !== 'basico') : [...current, 'basico'];
                        setFormData({...formData, paquetesSeleccionados: next});
                      }} style={{ padding: '8px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid', borderColor: formData.paquetesSeleccionados.includes('basico') ? 'var(--primary-color)' : 'var(--border-color)', background: formData.paquetesSeleccionados.includes('basico') ? 'var(--primary-color)20' : 'white', color: formData.paquetesSeleccionados.includes('basico') ? 'var(--primary-color)' : 'var(--text-muted)' }}>Plan Básico</button>
                      {paquetes.map(p => (
                        <button key={p.id} type="button" onClick={() => {
                          const current = formData.paquetesSeleccionados;
                          const next = current.includes(p.id) ? current.filter(x => x !== p.id) : [...current, p.id];
                          setFormData({...formData, paquetesSeleccionados: next});
                        }} style={{ padding: '8px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid', borderColor: formData.paquetesSeleccionados.includes(p.id) ? 'var(--primary-color)' : 'var(--border-color)', background: formData.paquetesSeleccionados.includes(p.id) ? 'var(--primary-color)20' : 'white', color: formData.paquetesSeleccionados.includes(p.id) ? 'var(--primary-color)' : 'var(--text-muted)' }}>{p.nombre}</button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '1rem' }}>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" style={{ flex: 1, padding: '14px', borderRadius: '16px', border: 'none', background: 'var(--primary-color)', color: 'white', fontWeight: '900', fontSize: '0.9rem', cursor: 'pointer' }}>{currentMaterna ? 'Guardar Cambios' : 'Registrar Gestante'}</motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '14px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-muted)', fontWeight: '900', fontSize: '0.9rem', cursor: 'pointer' }}>Cancelar</motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isSummaryOpen && importSummary && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="organic-card" style={{ width: '100%', maxWidth: '600px', padding: '2rem', borderRadius: '32px', background: 'var(--card-bg)' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--primary-color)20', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                        <ClipboardList size={30} />
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '950' }}>Resumen de Importación</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Procesamiento de archivo FOMAG completado</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '1rem', borderRadius: '20px', background: 'var(--success-color)10', border: '1px solid var(--success-color)20', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--success-color)', textTransform: 'uppercase' }}>Creadas</p>
                        <p style={{ fontSize: '1.8rem', fontWeight: '950', color: 'var(--success-color)' }}>{importSummary.creados}</p>
                    </div>
                    <div style={{ padding: '1rem', borderRadius: '20px', background: 'var(--primary-color)10', border: '1px solid var(--primary-color)20', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary-color)', textTransform: 'uppercase' }}>Actualizadas</p>
                        <p style={{ fontSize: '1.8rem', fontWeight: '950', color: 'var(--primary-color)' }}>{importSummary.actualizados}</p>
                    </div>
                </div>

                {importSummary.errores?.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--error-color)' }}>
                            <AlertTriangle size={14} /> ERRORES DETECTADOS ({importSummary.errores.length})
                        </p>
                        <div style={{ maxHeight: '200px', overflowY: 'auto', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', padding: '10px' }}>
                            {importSummary.errores.map((err, idx) => (
                                <div key={idx} style={{ padding: '8px', borderBottom: idx === importSummary.errores.length - 1 ? 'none' : '1px solid var(--border-color)', fontSize: '0.75rem' }}>
                                    <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>Fila {err.fila} (Doc: {err.documento}):</span> 
                                    <span style={{ color: 'var(--error-color)', marginLeft: '5px' }}>{err.error}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setIsSummaryOpen(false)}
                    style={{ width: '100%', padding: '15px', borderRadius: '18px', background: 'var(--primary-color)', color: 'white', fontWeight: '900', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
                >
                    Entendido
                </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Maternas;
