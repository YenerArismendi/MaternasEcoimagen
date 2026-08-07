import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'framer-motion';
import { 
  Palette, Building2, Save, RefreshCcw, Moon, Sun, Loader2, Sliders, FileText, CheckCircle2,
  Plus, Trash2, Edit3, X, TestTube, Activity, Tag, Check, AlertCircle
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import api from '../api';

const ThemeConfig = () => {
  const { config, updateTheme } = useTheme();
  const [formData, setFormData] = useState({ ...config });
  const [loading, setLoading] = useState(false);
  const [pdfConfigLoading, setPdfConfigLoading] = useState(false);
  const { notify } = useNotification();

  // Configuración de Secciones de Texto
  const [pdfConfig, setPdfConfig] = useState({
    seccionEvolucion: 'EVOLUCIÓN,EVOLUCION CLINICA,NOTAS DE EVOLUCION',
    seccionDiagnostico: 'DIAGNÓSTICO,DIAGNOSTICO,IMPRESIÓN DIAGNÓSTICA',
    seccionPlan: 'PLAN DE MANEJO,PLAN DE TRATAMIENTO,CONDUCTA',
    seccionMotivo: 'MOTIVO DE CONSULTA,MOTIVO CONSULTA'
  });

  // Lista Dinámica de Laboratorios (1 a 1)
  const [labs, setLabs] = useState([]);
  const [labsLoading, setLabsLoading] = useState(false);
  const [showLabModal, setShowLabModal] = useState(false);
  const [editingLab, setEditingLab] = useState({
    id: null,
    nombre: '',
    codigoCampo: '',
    tipoEval: 'CUALITATIVO', // 'NUMERICO' | 'CUALITATIVO' | 'INDICE'
    unidad: '',
    minVal: 0,
    maxVal: 0,
    terminosNormal: 'No Reactivo, Negativo, Sin Germen',
    terminosAnormal: 'Reactivo, Positivo, Aislado',
    aliases: ''
  });

  useEffect(() => {
    fetchPDFConfig();
    fetchLabs();
  }, []);

  const fetchPDFConfig = async () => {
    try {
      const res = await api.get('/pdf/config');
      if (res.data?.data) {
        setPdfConfig(res.data.data);
      }
    } catch (err) {
      console.error("Error al cargar configuración de PDF Extractor:", err);
    }
  };

  const fetchLabs = async () => {
    setLabsLoading(true);
    try {
      const res = await api.get('/pdf/labs');
      if (res.data?.data) {
        setLabs(res.data.data);
      }
    } catch (err) {
      console.error("Error al cargar laboratorios parametrizados:", err);
    } finally {
      setLabsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handlePdfConfigChange = (e) => {
    const { name, value } = e.target;
    setPdfConfig({
      ...pdfConfig,
      [name]: value
    });
  };

  const handleSubmitTheme = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await updateTheme(formData);
    if (result.success) {
      notify('Configuración de tema guardada exitosamente ✨');
    } else {
      notify('Error al guardar configuración ❌', 'error');
    }
    setLoading(false);
  };

  const handleSavePdfConfig = async (e) => {
    e.preventDefault();
    setPdfConfigLoading(true);

    try {
      await api.put('/pdf/config', pdfConfig);
      notify('Palabras clave de secciones PDF guardadas ✨', 'success');
    } catch (err) {
      console.error("Error al guardar parámetros PDF:", err);
      notify('No se pudo guardar la configuración del PDF Extractor ❌', 'error');
    } finally {
      setPdfConfigLoading(false);
    }
  };

  // --- Handlers de Gestión de Laboratorios (1 a 1) ---

  const handleOpenNewLab = () => {
    setEditingLab({
      id: null,
      nombre: '',
      codigoCampo: '',
      tipoEval: 'CUALITATIVO',
      unidad: '',
      minVal: 0,
      maxVal: 0,
      terminosNormal: 'No Reactivo, Negativo',
      terminosAnormal: 'Reactivo, Positivo',
      aliases: ''
    });
    setShowLabModal(true);
  };

  const handleOpenEditLab = (lab) => {
    setEditingLab({ ...lab });
    setShowLabModal(true);
  };

  const handleSaveLab = async (e) => {
    e.preventDefault();
    if (!editingLab.nombre.trim()) {
      notify('El nombre del laboratorio es obligatorio ⚠️', 'warning');
      return;
    }
    try {
      const payload = {
        ...editingLab,
        minVal: parseFloat(editingLab.minVal || 0),
        maxVal: parseFloat(editingLab.maxVal || 0)
      };

      if (editingLab.id) {
        await api.put(`/pdf/labs/${editingLab.id}`, payload);
        notify(`Laboratorio '${editingLab.nombre}' actualizado correctamente ✨`, 'success');
      } else {
        await api.post('/pdf/labs', payload);
        notify(`Nuevo laboratorio '${editingLab.nombre}' parametrizado exitosamente ✨`, 'success');
      }
      setShowLabModal(false);
      fetchLabs();
    } catch (err) {
      console.error("Error guardando laboratorio:", err);
      notify('No se pudo guardar el laboratorio ❌', 'error');
    }
  };

  const handleDeleteLab = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar la parametrización para "${nombre}"?`)) return;
    try {
      await api.delete(`/pdf/labs/${id}`);
      notify(`Laboratorio '${nombre}' eliminado ✨`, 'info');
      fetchLabs();
    } catch (err) {
      console.error("Error eliminando laboratorio:", err);
      notify('No se pudo eliminar el laboratorio ❌', 'error');
    }
  };

  const renderLabTypeBadge = (tipoEval) => {
    if (tipoEval === 'NUMERICO') {
      return <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '800' }}>NUMÉRICO</span>;
    }
    if (tipoEval === 'INDICE') {
      return <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '800' }}>ÍNDICE / CORTE</span>;
    }
    return <span style={{ background: '#f3e8ff', color: '#7e22ce', padding: '3px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '800' }}>CUALITATIVO</span>;
  };

  return (
    <div style={{ maxWidth: '1100px', paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '800' }}>Configuración del Sistema</h2>
        <p style={{ color: 'var(--text-muted)' }}>Personaliza la identidad visual y administra individualmente (1 a 1) los parámetros de laboratorios para extracción automática.</p>
      </div>

      <div className="theme-grid" style={{ marginBottom: '2.5rem' }}>
        {/* Identidad Visual */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            background: 'var(--card-bg)',
            padding: '2rem',
            borderRadius: '24px',
            boxShadow: 'var(--shadow)',
            border: '1px solid var(--border-color)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
            <div style={{ background: '#fce7f3', padding: '10px', borderRadius: '14px', display: 'flex' }}>
              <Palette size={24} color="#e91e8c" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: 'var(--text-color)' }}>Identidad Visual y Colores</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Colores institucionales del software.</p>
            </div>
          </div>

          <form onSubmit={handleSubmitTheme} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-muted)' }}>Nombre de la Clínica / Sede:</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <Building2 size={18} color="var(--text-muted)" />
                <input
                  type="text"
                  name="clinicName"
                  value={formData.clinicName}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-color)' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-muted)' }}>Color Primario:</label>
                <input type="color" name="primaryColor" value={formData.primaryColor} onChange={handleChange} style={{ width: '100%', height: '42px', borderRadius: '10px', border: 'none', cursor: 'pointer', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-muted)' }}>Color Secundario:</label>
                <input type="color" name="secondaryColor" value={formData.secondaryColor} onChange={handleChange} style={{ width: '100%', height: '42px', borderRadius: '10px', border: 'none', cursor: 'pointer', marginTop: '4px' }} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, var(--primary-color) 0%, #be185d 100%)',
                color: 'white', padding: '12px', borderRadius: '12px', fontWeight: '800', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px'
              }}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Guardar Tema Visual
            </button>
          </form>
        </motion.div>

        {/* Delimitadores de Secciones en PDF */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            background: 'var(--card-bg)',
            padding: '2rem',
            borderRadius: '24px',
            boxShadow: 'var(--shadow)',
            border: '1px solid var(--border-color)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
            <div style={{ background: '#e0f2fe', padding: '10px', borderRadius: '14px', display: 'flex' }}>
              <FileText size={24} color="#0284c7" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: 'var(--text-color)' }}>Secciones de Texto Clínico PDF</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Palabras clave para delimitar párrafos de texto libre.</p>
            </div>
          </div>

          <form onSubmit={handleSavePdfConfig} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)' }}>Encabezados para 'Evolución Clínica':</label>
              <input type="text" name="seccionEvolucion" value={pdfConfig.seccionEvolucion} onChange={handlePdfConfigChange} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', marginTop: '4px', fontSize: '0.82rem' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)' }}>Encabezados para 'Diagnóstico':</label>
              <input type="text" name="seccionDiagnostico" value={pdfConfig.seccionDiagnostico} onChange={handlePdfConfigChange} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', marginTop: '4px', fontSize: '0.82rem' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)' }}>Encabezados para 'Plan de Manejo':</label>
              <input type="text" name="seccionPlan" value={pdfConfig.seccionPlan} onChange={handlePdfConfigChange} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', marginTop: '4px', fontSize: '0.82rem' }} />
            </div>

            <button
              type="submit"
              disabled={pdfConfigLoading}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: 'white', padding: '12px', borderRadius: '12px', fontWeight: '800', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px'
              }}
            >
              {pdfConfigLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Guardar Secciones
            </button>
          </form>
        </motion.div>
      </div>

      {/* ─── SECCIÓN DINÁMICA DE LABORATORIOS PARAMETRIZABLES (1 A 1) ───────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'var(--card-bg)',
          padding: '2.2rem',
          borderRadius: '24px',
          boxShadow: 'var(--shadow)',
          border: '1px solid var(--border-color)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.8rem', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '16px', display: 'flex' }}>
              <TestTube size={26} color="#16a34a" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: '800', margin: 0, color: 'var(--text-color)' }}>
                Catálogo de Laboratorios Parametrizables (1 a 1)
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Crea o modifica individualmente cada examen de laboratorio con sus alias de detección y criterios de evaluación.
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenNewLab}
            style={{
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: 'white', padding: '11px 20px', borderRadius: '14px', fontWeight: '800',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)'
            }}
          >
            <Plus size={18} /> Agregar Nuevo Laboratorio
          </button>
        </div>

        {labsLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Loader2 className="animate-spin" size={32} color="#16a34a" />
            <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '0.9rem' }}>Cargando catálogo de laboratorios...</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '16px' }}>
            {labs.map((lab) => (
              <div
                key={lab.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>{lab.nombre}</span>
                    {renderLabTypeBadge(lab.tipoEval)}
                  </div>

                  {/* Detalle de Valores de Referencia */}
                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', fontSize: '0.8rem', marginBottom: '10px' }}>
                    <div style={{ color: '#475569', fontWeight: '700', marginBottom: '3px' }}>Criterio de Evaluación:</div>
                    {lab.tipoEval === 'NUMERICO' && (
                      <div style={{ color: '#0369a1', fontWeight: '800' }}>
                        Min: {lab.minVal} - Max: {lab.maxVal} {lab.unidad}
                      </div>
                    )}
                    {lab.tipoEval === 'INDICE' && (
                      <div style={{ color: '#b45309', fontWeight: '800' }}>
                        Negativo &lt; {lab.minVal} | Positivo &gt; {lab.maxVal} {lab.unidad}
                      </div>
                    )}
                    {lab.tipoEval === 'CUALITATIVO' && (
                      <div style={{ color: '#15803d', fontWeight: '700' }}>
                        <span style={{ color: '#16a34a' }}>🟢 Normales:</span> {lab.terminosNormal || 'No Reactivo'}
                      </div>
                    )}
                  </div>

                  {/* Alias / Palabras clave */}
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    <strong style={{ color: '#334155' }}>Palabras Clave / Alias:</strong>
                    <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', marginTop: '3px', wordBreak: 'break-word' }}>
                      {lab.aliases || 'Nombre estándar'}
                    </div>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    onClick={() => handleOpenEditLab(lab)}
                    style={{
                      flex: 1, padding: '7px', borderRadius: '8px', border: '1px solid #cbd5e1',
                      background: '#f8fafc', color: '#334155', fontWeight: '700', fontSize: '0.8rem',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                    }}
                  >
                    <Edit3 size={14} /> Editar
                  </button>
                  <button
                    onClick={() => handleDeleteLab(lab.id, lab.nombre)}
                    style={{
                      padding: '7px 12px', borderRadius: '8px', border: 'none',
                      background: '#fee2e2', color: '#991b1b', fontWeight: '700', fontSize: '0.8rem',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ─── MODAL PARA EDITAR / CREAR LABORATORIO INDIVIDUAL ───────────────── */}
      {showLabModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px'
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: '#ffffff', borderRadius: '24px', padding: '2rem',
              maxWidth: '540px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <TestTube size={24} color="#16a34a" />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
                  {editingLab.id ? `Editar Examen: ${editingLab.nombre}` : 'Parametrizar Nuevo Laboratorio'}
                </h3>
              </div>
              <button onClick={() => setShowLabModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveLab} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>Nombre del Laboratorio / Examen *:</label>
                <input
                  type="text"
                  required
                  value={editingLab.nombre}
                  onChange={(e) => setEditingLab({ ...editingLab, nombre: e.target.value })}
                  placeholder="Ej: TSH, Rubéola IgG, Citomegalovirus, Urocultivo"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>Tipo de Evaluación:</label>
                  <select
                    value={editingLab.tipoEval}
                    onChange={(e) => setEditingLab({ ...editingLab, tipoEval: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', marginTop: '4px', background: '#ffffff', fontWeight: '700' }}
                  >
                    <option value="CUALITATIVO">CUALITATIVO (No Reactivo / Negativo)</option>
                    <option value="NUMERICO">NUMÉRICO (Min - Max)</option>
                    <option value="INDICE">ÍNDICE / CORTE (Quimioluminiscencia)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>Unidad de Medida:</label>
                  <input
                    type="text"
                    value={editingLab.unidad}
                    onChange={(e) => setEditingLab({ ...editingLab, unidad: e.target.value })}
                    placeholder="Ej: g/dL, %, mg/dL, Index, UI/mL"
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                  />
                </div>
              </div>

              {/* Campos dinámicos según Tipo de Evaluación */}
              {editingLab.tipoEval === 'NUMERICO' && (
                <div style={{ background: '#e0f2fe', padding: '12px', borderRadius: '12px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0369a1' }}>Rango Normal (Min - Max):</label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <input
                      type="number"
                      step="any"
                      value={editingLab.minVal}
                      onChange={(e) => setEditingLab({ ...editingLab, minVal: e.target.value })}
                      placeholder="Min"
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #93c5fd' }}
                    />
                    <input
                      type="number"
                      step="any"
                      value={editingLab.maxVal}
                      onChange={(e) => setEditingLab({ ...editingLab, maxVal: e.target.value })}
                      placeholder="Max"
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #93c5fd' }}
                    />
                  </div>
                </div>
              )}

              {editingLab.tipoEval === 'INDICE' && (
                <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '12px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#b45309' }}>Umbrales de Corte (Quimioluminiscencia):</label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#78350f', fontWeight: '700' }}>Límite Negativo (&lt;):</span>
                      <input
                        type="number"
                        step="any"
                        value={editingLab.minVal}
                        onChange={(e) => setEditingLab({ ...editingLab, minVal: e.target.value })}
                        placeholder="Ej: 0.80"
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #fcd34d' }}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#78350f', fontWeight: '700' }}>Límite Positivo (&gt;):</span>
                      <input
                        type="number"
                        step="any"
                        value={editingLab.maxVal}
                        onChange={(e) => setEditingLab({ ...editingLab, maxVal: e.target.value })}
                        placeholder="Ej: 1.00"
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #fcd34d' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {editingLab.tipoEval === 'CUALITATIVO' && (
                <div style={{ background: '#f3e8ff', padding: '12px', borderRadius: '12px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#6b21a8' }}>Términos Considerados Normales (Separados por Comas):</label>
                  <input
                    type="text"
                    value={editingLab.terminosNormal}
                    onChange={(e) => setEditingLab({ ...editingLab, terminosNormal: e.target.value })}
                    placeholder="Ej: No Reactivo, No Reactiva, Negativo, Sin Germen"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #c084fc', marginTop: '4px', fontSize: '0.85rem' }}
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>Palabras Clave / Alias de Búsqueda (Separados por Comas):</label>
                <textarea
                  rows="2"
                  value={editingLab.aliases}
                  onChange={(e) => setEditingLab({ ...editingLab, aliases: e.target.value })}
                  placeholder="Ej: TOXOPLASMA IGM, TOXO IGM, TOXOPLASMOSIS IGM (Ingresa los nombres alternativos con que sale en el PDF)"
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowLabModal(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: '700', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', color: 'white', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(22,163,74,0.3)' }}
                >
                  Guardar Laboratorio
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <style>{`
        .theme-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 25px;
        }
        @media (max-width: 768px) {
          .theme-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default ThemeConfig;
