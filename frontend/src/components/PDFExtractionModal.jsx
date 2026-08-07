import React, { useState } from 'react';
import { 
  FileText, Upload, CheckCircle, AlertTriangle, XCircle, 
  User, Activity, ClipboardCheck, Sparkles, RefreshCw, X, ArrowRight, Settings
} from 'lucide-react';
import api from '../api';

const PDFExtractionModal = ({ isOpen, onClose, onApplyData, gestanteNombre }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('resumen'); // 'resumen' | 'paraclinicos' | 'texto'
  const [editableSections, setEditableSections] = useState({
    evolucionClinica: '',
    diagnostico: '',
    planTratamiento: '',
    motivoConsulta: '',
    observaciones: ''
  });

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf' && !selectedFile.name.endsWith('.pdf')) {
        setError('Por favor selecciona un archivo en formato .PDF válido.');
        return;
      }
      setFile(selectedFile);
      setError('');
      setExtractedData(null);
    }
  };

  const handleUploadAndExtract = async () => {
    if (!file) return;
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const res = await api.post('/pdf/extract', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      const extracted = res.data.data;
      setExtractedData(extracted);
      setEditableSections({
        evolucionClinica: extracted.seccionesTexto?.evolucionClinica || '',
        diagnostico: extracted.seccionesTexto?.diagnostico || '',
        planTratamiento: extracted.seccionesTexto?.planTratamiento || '',
        motivoConsulta: extracted.seccionesTexto?.motivoConsulta || '',
        observaciones: extracted.seccionesTexto?.observaciones || ''
      });
    } catch (err) {
      console.error("Error analizando PDF:", err);
      const msg = err.response?.data?.detalle || err.response?.data?.error || 'Ocurrió un error leyendo el archivo PDF. Verifica que sea texto digital y no una foto escaneada.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!extractedData) return;
    const finalPayload = {
      ...extractedData,
      seccionesTexto: {
        ...extractedData.seccionesTexto,
        ...editableSections
      }
    };
    if (onApplyData) {
      onApplyData(finalPayload);
    }
    onClose();
  };

  const renderBadgeStatus = (estado) => {
    if (estado === 'NORMAL') {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          background: '#dcfce7', color: '#15803d', padding: '3px 10px',
          borderRadius: '12px', fontSize: '0.75rem', fontWeight: '800'
        }}>
          <CheckCircle size={13} /> NORMAL
        </span>
      );
    }
    if (estado === 'ANORMAL') {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          background: '#ffe4e6', color: '#be123c', padding: '3px 10px',
          borderRadius: '12px', fontSize: '0.75rem', fontWeight: '800'
        }}>
          <AlertTriangle size={13} /> ANORMAL
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        background: '#f1f5f9', color: '#64748b', padding: '3px 10px',
        borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700'
      }}>
        INDETERMINADO
      </span>
    );
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '1rem'
    }}>
      <div style={{
        background: '#ffffff', width: '100%', maxWidth: '850px',
        maxHeight: '90vh', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0'
      }}>
        
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.75rem', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)', padding: '10px',
              borderRadius: '14px', display: 'flex'
            }}>
              <Sparkles size={24} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>
                Extracción Inteligente de PDF (IA Clínico)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', opacity: 0.9 }}>
                Lectura de Historias Clínicas y Laboratorios para {gestanteNombre || 'Materna'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)', border: 'none', color: '#ffffff',
              width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          
          {/* Upload Area */}
          {!extractedData && (
            <div>
              {!file ? (
                <div style={{
                  border: '2px dashed #cbd5e1', borderRadius: '18px', padding: '2.5rem 1.5rem',
                  textAlign: 'center', background: '#f8fafc', transition: 'all 0.3s ease',
                  cursor: 'pointer', position: 'relative'
                }}>
                  <input 
                    type="file" 
                    accept=".pdf" 
                    onChange={handleFileChange}
                    style={{
                      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                      opacity: 0, cursor: 'pointer'
                    }}
                  />
                  <div style={{
                    width: '60px', height: '60px', background: '#e0f2fe', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px'
                  }}>
                    <Upload size={28} color="#0284c7" />
                  </div>
                  <h4 style={{ margin: '0 0 6px', color: '#1e293b', fontSize: '1.05rem', fontWeight: '700' }}>
                    Arrastra o selecciona el archivo PDF clínico
                  </h4>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                    Admite historias clínicas y resultados de laboratorios en texto digital
                  </p>
                </div>
              ) : (
                <div style={{
                  border: '1px solid #bae6fd', borderRadius: '18px', padding: '1.75rem',
                  textAlign: 'center', background: '#f0f9ff', display: 'flex',
                  flexDirection: 'column', alignItems: 'center', gap: '12px'
                }}>
                  <div style={{
                    width: '54px', height: '54px', background: '#0284c7', borderRadius: '16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff'
                  }}>
                    <FileText size={28} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px', color: '#0369a1', fontSize: '1.1rem', fontWeight: '800' }}>
                      {file.name}
                    </h4>
                    <p style={{ margin: 0, color: '#0284c7', fontSize: '0.85rem', fontWeight: '600' }}>
                      {(file.size / 1024).toFixed(1)} KB — Archivo seleccionado
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <label style={{
                      padding: '8px 16px', background: '#ffffff', border: '1px solid #cbd5e1',
                      borderRadius: '12px', color: '#475569', fontWeight: '700', fontSize: '0.82rem',
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
                    }}>
                      Cambiar Archivo
                      <input 
                        type="file" 
                        accept=".pdf" 
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                      />
                    </label>

                    <button
                      onClick={handleUploadAndExtract}
                      disabled={loading}
                      style={{
                        padding: '10px 24px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: '800',
                        fontSize: '0.9rem', cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)'
                      }}
                    >
                      {loading ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                      {loading ? 'Procesando y Analizando PDF...' : 'Analizar y Extraer Información'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Feedback */}
          {error && (
            <div style={{
              marginTops: '12px', padding: '12px 16px', background: '#fff1f2',
              border: '1px solid #fecdd3', borderRadius: '14px', color: '#be123c',
              fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              <XCircle size={18} />
              <div><strong>Error en Extracción:</strong> {error}</div>
            </div>
          )}

          {/* Results extracted */}
          {extractedData && (
            <div>
              {/* Top Selector Tabs */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', pb: '8px' }}>
                <button
                  onClick={() => setActiveTab('resumen')}
                  style={{
                    padding: '8px 16px', borderRadius: '12px', border: 'none',
                    background: activeTab === 'resumen' ? '#e0f2fe' : 'transparent',
                    color: activeTab === 'resumen' ? '#0369a1' : '#64748b',
                    fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  👤 Datos Paciente ({extractedData.paciente?.nombreCompleto || 'Identificado'})
                </button>
                <button
                  onClick={() => setActiveTab('paraclinicos')}
                  style={{
                    padding: '8px 16px', borderRadius: '12px', border: 'none',
                    background: activeTab === 'paraclinicos' ? '#e0f2fe' : 'transparent',
                    color: activeTab === 'paraclinicos' ? '#0369a1' : '#64748b',
                    fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  🔬 Paraclínicos & Laboratorios
                </button>
                <button
                  onClick={() => setActiveTab('texto')}
                  style={{
                    padding: '8px 16px', borderRadius: '12px', border: 'none',
                    background: activeTab === 'texto' ? '#e0f2fe' : 'transparent',
                    color: activeTab === 'texto' ? '#0369a1' : '#64748b',
                    fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  📝 Secciones de Texto & Evolución
                </button>
              </div>

              {/* Tab 1: Paciente */}
              {activeTab === 'resumen' && (
                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 12px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={18} color="#0284c7" /> Información Demográfica Detectada
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>NOMBRE COMPLETO:</span>
                      <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>{extractedData.paciente?.nombreCompleto || 'No especificado'}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>DOCUMENTO:</span>
                      <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>{extractedData.paciente?.numeroIdentificacion || 'No detectado'}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>EDAD:</span>
                      <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>{extractedData.paciente?.edad ? `${extractedData.paciente.edad} años` : 'N/A'}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>EDAD GESTACIONAL:</span>
                      <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0284c7' }}>{extractedData.paciente?.semanasGestacion ? `${extractedData.paciente.semanasGestacion} Semanas` : 'N/A'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Paraclinicos */}
              {activeTab === 'paraclinicos' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                  {Object.entries(extractedData.paraclinicos || {}).map(([key, item]) => {
                    if (typeof item === 'object' && item?.nombre) {
                      return (
                        <div key={key} style={{
                          background: '#ffffff', padding: '12px 14px', borderRadius: '14px',
                          border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#334155' }}>{item.nombre}</span>
                            {renderBadgeStatus(item.estado)}
                          </div>
                          <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#0f172a' }}>
                            {item.valor || item.resultadoTexto || 'No reportado'} <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>{item.unidad || ''}</span>
                          </div>
                          {item.rangoReferencia && (
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>Ref: {item.rangoReferencia}</div>
                          )}
                        </div>
                      );
                    }
                    if (typeof item === 'string' && item) {
                      return (
                        <div key={key} style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>{key.toUpperCase()}:</span>
                          <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>{item}</div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              )}

              {/* Tab 3: Texto Libre */}
              {activeTab === 'texto' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>EVOLUCIÓN CLÍNICA EXTRACCIÓN:</label>
                    <textarea 
                      rows={3} 
                      value={editableSections.evolucionClinica}
                      onChange={(e) => setEditableSections({ ...editableSections, evolucionClinica: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>DIAGNÓSTICO:</label>
                    <textarea 
                      rows={2} 
                      value={editableSections.diagnostico}
                      onChange={(e) => setEditableSections({ ...editableSections, diagnostico: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>PLAN DE MANEJO Y TRATAMIENTO:</label>
                    <textarea 
                      rows={2} 
                      value={editableSections.planTratamiento}
                      onChange={(e) => setEditableSections({ ...editableSections, planTratamiento: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1rem 1.75rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          {extractedData ? (
            <button
              onClick={() => { setExtractedData(null); setFile(null); }}
              style={{
                padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '10px',
                color: '#475569', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'
              }}
            >
              🔄 Cargar Otro PDF
            </button>
          ) : <div />}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 18px', background: '#ffffff', border: '1px solid #cbd5e1',
                borderRadius: '12px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'
              }}
            >
              Cancelar
            </button>

            {extractedData && (
              <button
                onClick={handleApply}
                style={{
                  padding: '10px 22px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: '800',
                  fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                }}
              >
                <ArrowRight size={16} /> Auto-Diligenciar Historia Clínica
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PDFExtractionModal;
