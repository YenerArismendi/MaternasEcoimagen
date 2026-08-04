import React, { useState, useEffect } from 'react';
import {
  Megaphone, Plus, Edit3, Trash2, Eye, EyeOff, Star,
  StarOff, Calendar, MapPin, Users, Check, X, Info,
  AlertTriangle, Gift, BookOpen, RefreshCw, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const TIPOS = [
  { value: 'INFO',    label: 'Información General', color: '#3b82f6', bg: '#eff6ff', icon: Info },
  { value: 'EVENTO',  label: 'Evento / Actividad',  color: '#8b5cf6', bg: '#f5f3ff', icon: Calendar },
  { value: 'TALLER',  label: 'Taller / Curso',      color: '#f59e0b', bg: '#fffbeb', icon: BookOpen },
  { value: 'URGENTE', label: 'Aviso Urgente',        color: '#ef4444', bg: '#fef2f2', icon: AlertTriangle },
  { value: 'OFERTA',  label: 'Oferta / Beneficio',   color: '#10b981', bg: '#f0fdf4', icon: Gift },
];

const getTipoMeta = (tipo) => TIPOS.find(t => t.value === tipo) || TIPOS[0];

const EMPTY_FORM = {
  titulo: '', contenido: '', tipo: 'INFO',
  imagenURL: '', fechaEvento: '', lugarEvento: '',
  activo: true, destacado: false, permiteRSVP: false, cupoMaximo: ''
};

export default function Anuncios() {
  const { notify } = useNotification();
  const { user } = useAuth();
  const [anuncios, setAnuncios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [viewParts, setViewParts] = useState(null); // anuncioId para ver participantes
  const [participaciones, setParticipaciones] = useState([]);

  const fetchAnuncios = async () => {
    try {
      setLoading(true);
      const res = await api.get('/anuncios');
      setAnuncios(res.data || []);
    } catch { notify('Error al cargar anuncios', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAnuncios(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.contenido.trim()) {
      notify('El título y el contenido son obligatorios', 'warning'); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        cupoMaximo: form.cupoMaximo ? parseInt(form.cupoMaximo) : null,
        imagenURL: form.imagenURL || null,
        fechaEvento: form.fechaEvento || null,
        lugarEvento: form.lugarEvento || null,
      };
      if (editingId) {
        await api.put(`/anuncios/${editingId}`, payload);
        notify('Anuncio actualizado correctamente', 'success');
      } else {
        await api.post('/anuncios', payload);
        notify('🎉 Anuncio publicado con éxito', 'success');
      }
      setShowForm(false); setEditingId(null); setForm(EMPTY_FORM);
      fetchAnuncios();
    } catch (err) {
      notify(err.response?.data?.error || 'Error al guardar', 'error');
    } finally { setSaving(false); }
  };

  const handleEdit = (a) => {
    setForm({
      titulo: a.titulo, contenido: a.contenido, tipo: a.tipo,
      imagenURL: a.imagenURL || '', lugarEvento: a.lugarEvento || '',
      fechaEvento: a.fechaEvento ? a.fechaEvento.split('T')[0] : '',
      activo: a.activo, destacado: a.destacado,
      permiteRSVP: a.permiteRSVP, cupoMaximo: a.cupoMaximo || ''
    });
    setEditingId(a.id); setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este anuncio?')) return;
    try {
      await api.delete(`/anuncios/${id}`);
      notify('Anuncio eliminado', 'success');
      fetchAnuncios();
    } catch { notify('Error al eliminar', 'error'); }
  };

  const toggleActivo = async (a) => {
    try {
      await api.put(`/anuncios/${a.id}`, { activo: !a.activo });
      fetchAnuncios();
    } catch { notify('Error al cambiar estado', 'error'); }
  };

  const toggleDestacado = async (a) => {
    try {
      await api.put(`/anuncios/${a.id}`, { destacado: !a.destacado });
      fetchAnuncios();
    } catch { notify('Error al cambiar destacado', 'error'); }
  };

  const verParticipaciones = async (id) => {
    if (viewParts === id) { setViewParts(null); return; }
    try {
      const res = await api.get(`/anuncios/${id}/participaciones`);
      setParticipaciones(res.data || []);
      setViewParts(id);
    } catch { notify('Error al cargar participaciones', 'error'); }
  };

  const badge = (tipo) => {
    const m = getTipoMeta(tipo);
    return (
      <span style={{ background: m.bg, color: m.color, padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '900', display: 'inline-flex', alignItems: 'center', gap: '4px', border: `1px solid ${m.color}30` }}>
        <m.icon size={11} /> {m.label}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 0 3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '950', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Megaphone size={28} color="#ec4899" /> Anuncios de la Clínica
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: '600' }}>
            Publica noticias, eventos y talleres para las gestantes del programa.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={() => { setShowForm(v => !v); setEditingId(null); setForm(EMPTY_FORM); }}
          style={{ background: showForm ? '#f1f5f9' : 'linear-gradient(135deg,#ec4899,#be185d)', color: showForm ? '#64748b' : '#fff', border: 'none', padding: '12px 22px', borderRadius: '14px', fontWeight: '950', fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: showForm ? 'none' : '0 6px 18px rgba(236,72,153,0.3)' }}
        >
          {showForm ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Nuevo Anuncio</>}
        </motion.button>
      </div>

      {/* Formulario */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            onSubmit={handleSubmit}
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '1.8rem', marginBottom: '1.8rem', boxShadow: '0 8px 30px rgba(236,72,153,0.08)' }}
          >
            <h3 style={{ margin: '0 0 1.4rem', fontWeight: '950', color: '#831843', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {editingId ? <Edit3 size={18} /> : <Plus size={18} />}
              {editingId ? 'Editar Anuncio' : 'Publicar Nuevo Anuncio'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>TÍTULO DEL ANUNCIO *</label>
                <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ej. Taller de lactancia materna – Agosto 2026"
                  style={{ ...inp, fontSize: '1rem', fontWeight: '800' }} required />
              </div>

              <div>
                <label style={lbl}>TIPO DE ANUNCIO</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={inp}>
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label style={lbl}>FECHA DEL EVENTO (opcional)</label>
                <input type="date" value={form.fechaEvento} onChange={e => setForm(f => ({ ...f, fechaEvento: e.target.value }))} style={inp} />
              </div>

              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>CONTENIDO / DESCRIPCIÓN *</label>
                <textarea value={form.contenido} onChange={e => setForm(f => ({ ...f, contenido: e.target.value }))}
                  placeholder="Describe el anuncio, horarios, requisitos, etc."
                  rows={4} style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }} required />
              </div>

              <div>
                <label style={lbl}>LUGAR DEL EVENTO (opcional)</label>
                <input value={form.lugarEvento} onChange={e => setForm(f => ({ ...f, lugarEvento: e.target.value }))}
                  placeholder="Ej. Sala de Espera 2 – Piso 1" style={inp} />
              </div>

              <div>
                <label style={lbl}>URL DE IMAGEN (opcional)</label>
                <input value={form.imagenURL} onChange={e => setForm(f => ({ ...f, imagenURL: e.target.value }))}
                  placeholder="https://..." style={inp} />
              </div>
            </div>

            {/* Opciones */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.2rem', background: '#f8fafc', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              {[
                { key: 'activo',      label: 'Activo (visible para maternas)',   color: '#10b981' },
                { key: 'destacado',   label: 'Destacado (aparece primero)',       color: '#f59e0b' },
                { key: 'permiteRSVP', label: 'Permite inscripción (RSVP)',        color: '#8b5cf6' },
              ].map(opt => (
                <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '800', fontSize: '0.83rem', color: form[opt.key] ? opt.color : '#94a3b8' }}>
                  <div onClick={() => setForm(f => ({ ...f, [opt.key]: !f[opt.key] }))}
                    style={{ width: '22px', height: '22px', borderRadius: '7px', background: form[opt.key] ? opt.color : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0, cursor: 'pointer' }}>
                    {form[opt.key] && <Check size={13} color="#fff" strokeWidth={3} />}
                  </div>
                  {opt.label}
                </label>
              ))}
              {form.permiteRSVP && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={lbl}>Cupo máximo:</label>
                  <input type="number" min="1" value={form.cupoMaximo}
                    onChange={e => setForm(f => ({ ...f, cupoMaximo: e.target.value }))}
                    placeholder="Sin límite" style={{ ...inp, width: '100px', padding: '8px 12px' }} />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
                style={{ padding: '11px 20px', borderRadius: '12px', background: '#f1f5f9', border: 'none', fontWeight: '900', cursor: 'pointer', color: '#475569' }}>
                Cancelar
              </button>
              <motion.button type="submit" disabled={saving} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                style={{ flex: 1, padding: '11px 20px', borderRadius: '12px', background: 'linear-gradient(135deg,#ec4899,#be185d)', color: '#fff', border: 'none', fontWeight: '950', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 6px 18px rgba(236,72,153,0.3)' }}>
                {saving ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : (editingId ? <Check size={16} /> : <Megaphone size={16} />)}
                {saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Publicar Anuncio'}
              </motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Lista de anuncios */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#ec4899' }} />
          <p style={{ marginTop: '1rem', fontWeight: '800' }}>Cargando anuncios...</p>
        </div>
      ) : anuncios.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
          <Megaphone size={48} color="#ec4899" style={{ opacity: 0.3 }} />
          <h3 style={{ margin: '1rem 0 4px', fontWeight: '950', color: 'var(--text-main)' }}>No hay anuncios publicados</h3>
          <p style={{ color: 'var(--text-muted)', fontWeight: '700' }}>Crea el primer anuncio para las gestantes.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {anuncios.map(a => {
            const m = getTipoMeta(a.tipo);
            const partsCount = a.participaciones?.length || 0;
            return (
              <motion.div key={a.id} layout
                style={{ background: 'var(--card-bg)', border: `1px solid ${a.destacado ? '#fbbf24' : 'var(--border-color)'}`, borderRadius: '20px', padding: '1.2rem 1.4rem', boxShadow: a.destacado ? '0 4px 20px rgba(251,191,36,0.15)' : '0 2px 10px rgba(0,0,0,0.03)', opacity: a.activo ? 1 : 0.6 }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {/* Icono tipo */}
                  <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${m.color}25` }}>
                    <m.icon size={22} color={m.color} />
                  </div>

                  {/* Contenido */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      {a.destacado && <span style={{ fontSize: '0.85rem' }}>⭐</span>}
                      {badge(a.tipo)}
                      {!a.activo && <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '8px', fontSize: '0.68rem', fontWeight: '900' }}>OCULTO</span>}
                      {a.permiteRSVP && <span style={{ background: '#f5f3ff', color: '#7c3aed', padding: '2px 8px', borderRadius: '8px', fontSize: '0.68rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '3px' }}><Users size={10} /> {partsCount} inscritas</span>}
                    </div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: '950', color: 'var(--text-main)' }}>{a.titulo}</h3>
                    <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.contenido}</p>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                      {a.fechaEvento && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> {new Date(a.fechaEvento).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
                      {a.lugarEvento && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> {a.lugarEvento}</span>}
                      <span style={{ color: '#94a3b8' }}>Publicado por {a.creadoPor?.nombre || 'Admin'}</span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <ActionBtn onClick={() => toggleDestacado(a)} title={a.destacado ? 'Quitar destacado' : 'Destacar'} color="#f59e0b">
                      {a.destacado ? <StarOff size={15} /> : <Star size={15} />}
                    </ActionBtn>
                    <ActionBtn onClick={() => toggleActivo(a)} title={a.activo ? 'Ocultar' : 'Mostrar'} color="#64748b">
                      {a.activo ? <EyeOff size={15} /> : <Eye size={15} />}
                    </ActionBtn>
                    {a.permiteRSVP && (
                      <ActionBtn onClick={() => verParticipaciones(a.id)} title="Ver inscritas" color="#8b5cf6">
                        <Users size={15} />
                      </ActionBtn>
                    )}
                    <ActionBtn onClick={() => handleEdit(a)} title="Editar" color="#0284c7">
                      <Edit3 size={15} />
                    </ActionBtn>
                    <ActionBtn onClick={() => handleDelete(a.id)} title="Eliminar" color="#ef4444">
                      <Trash2 size={15} />
                    </ActionBtn>
                  </div>
                </div>

                {/* Panel de participaciones */}
                <AnimatePresence>
                  {viewParts === a.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #e2e8f0' }}>
                      <h4 style={{ margin: '0 0 10px', fontSize: '0.85rem', fontWeight: '950', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={15} /> Gestantes inscritas ({participaciones.length})
                      </h4>
                      {participaciones.length === 0 ? (
                        <p style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: '700', margin: 0 }}>Ninguna gestante se ha inscrito aún.</p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                          {participaciones.map(p => (
                            <div key={p.id} style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '12px', padding: '8px 12px' }}>
                              <p style={{ margin: 0, fontWeight: '900', fontSize: '0.83rem', color: '#5b21b6' }}>{p.gestante?.nombres} {p.gestante?.apellidos}</p>
                              <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#7c3aed', fontWeight: '700' }}>CC {p.gestante?.numeroIdentificacion}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          form > div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// Estilos reutilizables
const lbl = { fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '5px' };
const inp = { width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)', fontWeight: '700', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' };

const ActionBtn = ({ onClick, title, color, children }) => (
  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClick} title={title}
    style={{ width: '34px', height: '34px', borderRadius: '10px', background: `${color}15`, border: `1px solid ${color}30`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
    {children}
  </motion.button>
);
