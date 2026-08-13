import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Plus, Edit3, Trash2, Search, MapPin, Hash
} from 'lucide-react';

const IPSManagement = () => {
  const [ipsList, setIpsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Crear/Editar IPS
  const [showIpsForm, setShowIpsForm] = useState(false);
  const [selectedIpsForEdit, setSelectedIpsForEdit] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    codigoHabilitacion: '',
    departamento: '',
    municipio: ''
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchIPS();
  }, []);

  const fetchIPS = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ips', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error consultando el listado de IPS');
      const data = await res.json();
      setIpsList(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (ips = null) => {
    if (ips) {
      setSelectedIpsForEdit(ips);
      setFormData({
        nombre: ips.nombre || '',
        codigoHabilitacion: ips.codigoHabilitacion || '',
        departamento: ips.departamento || '',
        municipio: ips.municipio || ''
      });
    } else {
      setSelectedIpsForEdit(null);
      setFormData({
        nombre: '',
        codigoHabilitacion: '',
        departamento: '',
        municipio: ''
      });
    }
    setShowIpsForm(true);
  };

  const handleSaveIPS = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const url = selectedIpsForEdit ? `/api/ips/${selectedIpsForEdit.id}` : '/api/ips';
      const method = selectedIpsForEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando IPS');

      setShowIpsForm(false);
      fetchIPS();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteIPS = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta IPS?')) return;
    try {
      const res = await fetch(`/api/ips/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchIPS();
      }
    } catch (err) {
      console.error('Error eliminando IPS:', err);
    }
  };

  const filteredIPS = ipsList.filter(ips => 
    ips.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ips.codigoHabilitacion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ips.municipio?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header Sección */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2.5rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              padding: '12px', borderRadius: '18px', color: '#ffffff',
              boxShadow: '0 8px 20px rgba(2, 132, 199, 0.25)'
            }}>
              <Building2 size={32} />
            </div>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: '950', color: 'var(--text-main)', letterSpacing: '-0.8px' }}>
                Gestión de IPS
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: '600' }}>
                Administración multi-tenant de instituciones prestadoras de salud
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => handleOpenForm()}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '14px 28px', borderRadius: '18px',
            background: 'var(--primary-color)', color: '#ffffff',
            fontWeight: '800', border: 'none', cursor: 'pointer',
            boxShadow: 'var(--primary-glow) 0 8px 20px', transition: 'all 0.3s'
          }}
        >
          <Plus size={22} />
          <span>Registrar Nueva IPS</span>
        </button>
      </div>

      {/* Barra de Búsqueda */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem',
        background: 'var(--card-bg)', padding: '12px 20px', borderRadius: '20px',
        border: '1px solid var(--border-color)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
      }}>
        <Search size={22} style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Buscar IPS por nombre, código de habilitación o municipio..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            border: 'none', background: 'transparent', width: '100%',
            fontSize: '1rem', color: 'var(--text-main)', outline: 'none', fontWeight: '600'
          }}
        />
      </div>

      {/* Listado de Tarjetas de IPS */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          Cargando instituciones IPS...
        </div>
      ) : filteredIPS.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '4rem 2rem', background: 'var(--card-bg)',
          borderRadius: '24px', border: '1px solid var(--border-color)'
        }}>
          <Building2 size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>
            No hay instituciones IPS registradas
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Registra una nueva IPS para gestionar el acceso institucional.
          </p>
          <button
            onClick={() => handleOpenForm()}
            style={{
              padding: '12px 24px', borderRadius: '16px', background: 'var(--primary-color)',
              color: '#ffffff', border: 'none', fontWeight: '700', cursor: 'pointer'
            }}
          >
            Crear Primera IPS
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.8rem'
        }}>
          {filteredIPS.map(ips => (
            <motion.div
              key={ips.id}
              whileHover={{ y: -6, boxShadow: '0 20px 35px rgba(0,0,0,0.07)' }}
              transition={{ duration: 0.3 }}
              style={{
                backgroundColor: 'var(--card-bg)', borderRadius: '24px',
                border: '1px solid var(--border-color)', padding: '1.8rem',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                boxShadow: '0 8px 25px rgba(0,0,0,0.03)'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: '900', color: 'var(--text-main)' }}>
                    {ips.nombre}
                  </h3>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => handleOpenForm(ips)}
                      style={{
                        padding: '8px', borderRadius: '12px', border: '1px solid var(--border-color)',
                        background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer'
                      }}
                      title="Editar IPS"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteIPS(ips.id)}
                      style={{
                        padding: '8px', borderRadius: '12px', border: '1px solid #fecaca',
                        background: '#fef2f2', color: '#dc2626', cursor: 'pointer'
                      }}
                      title="Eliminar IPS"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Hash size={18} style={{ color: '#0284c7' }} />
                    <span>Cód. Habilitación: <strong style={{ color: 'var(--text-main)' }}>{ips.codigoHabilitacion}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <MapPin size={18} style={{ color: '#ec4899' }} />
                    <span>{ips.municipio || 'Municipio no especificado'}, {ips.departamento || 'Depto'}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* MODAL CREAR / EDITAR IPS */}
      {showIpsForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff', width: '100%', maxWidth: '520px',
            borderRadius: '24px', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '1.5rem', color: '#0f172a' }}>
              {selectedIpsForEdit ? 'Editar IPS' : 'Registrar Nueva IPS'}
            </h2>

            <form onSubmit={handleSaveIPS} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '700', color: '#334155', marginBottom: '6px', fontSize: '0.9rem' }}>
                  Nombre de la IPS / Clínica:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: IPS San Rafael del Sur"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '700', color: '#334155', marginBottom: '6px', fontSize: '0.9rem' }}>
                  Código de Habilitación Oficial:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 050010203001"
                  value={formData.codigoHabilitacion}
                  onChange={(e) => setFormData({ ...formData, codigoHabilitacion: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '700', color: '#334155', marginBottom: '6px', fontSize: '0.9rem' }}>
                    Departamento:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Antioquia"
                    value={formData.departamento}
                    onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '700', color: '#334155', marginBottom: '6px', fontSize: '0.9rem' }}>
                    Municipio:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Medellín"
                    value={formData.municipio}
                    onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowIpsForm(false)}
                  style={{ padding: '12px 20px', borderRadius: '14px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontWeight: '700' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '12px 24px', borderRadius: '14px', border: 'none', background: '#0284c7', color: '#ffffff', cursor: 'pointer', fontWeight: '800' }}
                >
                  Guardar IPS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default IPSManagement;
