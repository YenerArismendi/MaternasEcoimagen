import React, { useState, useEffect } from 'react';
import api from '../api';
import { 
  Plus, 
  Trash2, 
  Edit2,
  Package, 
  ChevronDown,
  X, 
  Info,
  Stethoscope,
  TestTube,
  FileSpreadsheet,
  Syringe,
  Clock,
  Filter,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '../context/NotificationContext';
import LoadingSpinner from '../components/LoadingSpinner';

const CATEGORIA_CONFIG = {
  CONSULTA: {
    label: 'Consultas y Controles',
    icon: Stethoscope,
    color: '#3B82F6', // Azul
    bgColor: 'rgba(59, 130, 246, 0.06)',
    borderColor: 'rgba(59, 130, 246, 0.2)'
  },
  CONTROL: {
    label: 'Consultas y Controles',
    icon: Stethoscope,
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.06)',
    borderColor: 'rgba(59, 130, 246, 0.2)'
  },
  LABORATORIO: {
    label: 'Laboratorios',
    icon: TestTube,
    color: '#EC4899', // Rosa / Magenta
    bgColor: 'rgba(236, 72, 153, 0.06)',
    borderColor: 'rgba(236, 72, 153, 0.2)'
  },
  ESTUDIO: {
    label: 'Imágenes Diagnósticas',
    icon: FileSpreadsheet,
    color: '#8B5CF6', // Púrpura
    bgColor: 'rgba(139, 92, 246, 0.06)',
    borderColor: 'rgba(139, 92, 246, 0.2)'
  },
  VACUNA: {
    label: 'Vacunas e Inmunizaciones',
    icon: Syringe,
    color: '#10B981', // Esmeralda
    bgColor: 'rgba(16, 185, 129, 0.06)',
    borderColor: 'rgba(16, 185, 129, 0.2)'
  }
};

const Paquetes = () => {
  const [paquetes, setPaquetes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPackage, setCurrentPackage] = useState(null);
  const [activeTrimestreFilter, setActiveTrimestreFilter] = useState('TODOS');
  const [expandedSections, setExpandedSections] = useState({});
  const { notify, confirm } = useNotification();

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    trimestre: '',
    plantillas: []
  });

  const fetchPaquetes = async () => {
    try {
      const res = await api.get('/paquetes');
      setPaquetes(res.data);
      const expandedState = {};
      res.data.forEach(p => { expandedState[p.id] = true; });
      setExpandedSections(expandedState);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaquetes();
  }, []);

  const toggleSection = (id) => {
    setExpandedSections(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleOpenModal = (paquete = null) => {
    if (paquete) {
      setCurrentPackage(paquete);
      setFormData({
        nombre: paquete.nombre,
        descripcion: paquete.descripcion || '',
        trimestre: paquete.trimestre || '',
        plantillas: paquete.plantillas.map(p => ({
          id: p.id,
          tipo: p.tipo || 'ESTUDIO',
          descripcion: p.descripcion || '',
          semanasRelativas: p.semanasRelativas !== undefined ? p.semanasRelativas : 0,
          esObligatorio: p.esObligatorio || false,
          esControl: p.esControl || false,
          codigoCUPS: p.codigoCUPS || '',
          cantidad: p.cantidad || 1,
          trimestre: p.trimestre || paquete.trimestre || ''
        }))
      });
    } else {
      setCurrentPackage(null);
      setFormData({
        nombre: '',
        descripcion: '',
        trimestre: '',
        plantillas: []
      });
    }
    setIsModalOpen(true);
  };

  const handleAddTemplate = () => {
    setFormData(prev => ({
      ...prev,
      plantillas: [
        ...prev.plantillas,
        { 
          id: null, 
          tipo: 'LABORATORIO', 
          descripcion: '', 
          semanasRelativas: 12, 
          esObligatorio: true, 
          esControl: false, 
          cantidad: 1, 
          trimestre: prev.trimestre || '1er Trimestre',
          codigoCUPS: ''
        }
      ]
    }));
  };

  const handleRemoveTemplate = (index) => {
    const newTemplates = [...formData.plantillas];
    newTemplates.splice(index, 1);
    setFormData({ ...formData, plantillas: newTemplates });
  };

  const handleUpdateTemplate = (index, field, value) => {
    const newTemplates = [...formData.plantillas];
    newTemplates[index][field] = value;
    setFormData({ ...formData, plantillas: newTemplates });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (currentPackage) {
        await api.put(`/paquetes/${currentPackage.id}`, formData);
      } else {
        await api.post('/paquetes', formData);
      }
      setIsModalOpen(false);
      notify(currentPackage ? 'Paquete actualizado con éxito' : 'Paquete creado con éxito');
      fetchPaquetes();
    } catch (err) {
      notify(currentPackage ? 'Error al actualizar paquete' : 'Error al crear paquete', 'error');
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: '¿Eliminar Paquete?',
      message: 'Esto no afectará a las pacientes que ya lo tengan aplicado.',
      confirmText: 'Eliminar Paquete',
      type: 'danger'
    });

    if (ok) {
      try {
        await api.delete(`/paquetes/${id}`);
        notify('Paquete eliminado');
        fetchPaquetes();
      } catch (err) {
        notify('Error al eliminar paquete', 'error');
      }
    }
  };

  // Filtrar paquetes según el trimestre activo
  const filteredPaquetes = paquetes.filter(p => {
    if (activeTrimestreFilter === 'TODOS') return true;
    if (p.trimestre === activeTrimestreFilter) return true;
    return p.plantillas.some(tmpl => (tmpl.trimestre || p.trimestre) === activeTrimestreFilter);
  });

  // Agrupar las plantillas de un paquete por Categoría
  const getGroupedCategories = (plantillas, paqueteTrimestre) => {
    const relevantTemplates = plantillas.filter(tmpl => {
      if (activeTrimestreFilter === 'TODOS') return true;
      const t = tmpl.trimestre || paqueteTrimestre;
      return t === activeTrimestreFilter;
    });

    const categories = {
      CONSULTA: [],
      LABORATORIO: [],
      ESTUDIO: [],
      VACUNA: []
    };

    relevantTemplates.forEach(tmpl => {
      let cat = tmpl.tipo;
      if (cat === 'CONTROL') cat = 'CONSULTA';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(tmpl);
    });

    // Ordenar elementos por semana relativa dentro de cada categoría
    Object.keys(categories).forEach(catKey => {
      categories[catKey].sort((a, b) => a.semanasRelativas - b.semanasRelativas);
    });

    return categories;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Background Subtle Gradient Blobs */}
      <div className="blob" style={{ 
        width: '450px', height: '450px', background: 'var(--accent-color)', 
        top: '-120px', right: '-100px', filter: 'blur(120px)', opacity: 0.06 
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ padding: '8px', background: 'var(--primary-color)15', borderRadius: '12px', color: 'var(--primary-color)' }}>
              <Package size={24} />
            </div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: '950', letterSpacing: '-1px', color: 'var(--text-main)', margin: 0 }}>
              Paquetes y Protocolos Médicos
            </h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0, paddingLeft: '44px' }}>
            Estructura por secciones y categorías con semanas objetivo asignadas para el cálculo de alertas.
          </p>
        </div>

        <motion.button 
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleOpenModal()}
          style={{ 
            background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))', 
            color: 'white', 
            border: 'none', 
            padding: '14px 28px', 
            borderRadius: '18px', 
            fontWeight: '900', 
            fontSize: '0.95rem',
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            boxShadow: 'var(--primary-glow) 0 10px 25px',
            cursor: 'pointer'
          }}
        >
          <Plus size={22} /> Nuevo Paquete
        </motion.button>
      </div>

      {/* Filter Tabs por Trimestre */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        marginBottom: '2rem',
        background: 'var(--card-bg)',
        padding: '8px',
        borderRadius: '18px',
        border: '1px solid var(--border-color)',
        overflowX: 'auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 12px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '800' }}>
          <Filter size={16} /> Filtrar Trimestre:
        </div>
        {['TODOS', '1er Trimestre', '2do Trimestre', '3er Trimestre'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTrimestreFilter(tab)}
            style={{
              padding: '10px 20px',
              borderRadius: '14px',
              border: 'none',
              fontWeight: '800',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTrimestreFilter === tab ? 'var(--primary-color)' : 'transparent',
              color: activeTrimestreFilter === tab ? 'white' : 'var(--text-muted)',
              boxShadow: activeTrimestreFilter === tab ? 'var(--primary-glow) 0 4px 12px' : 'none'
            }}
          >
            {tab === 'TODOS' ? '✨ Mostrar Todo' : tab}
          </button>
        ))}
      </div>

      {/* Lista de Paquetes Organizados en Secciones */}
      {filteredPaquetes.length === 0 ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'var(--card-bg)', borderRadius: '28px', border: '2px dashed var(--border-color)' }}>
          <Package size={64} style={{ opacity: 0.15, margin: '0 auto 1.5rem', color: 'var(--primary-color)' }} />
          <h3 style={{ color: 'var(--text-main)', fontWeight: '900', fontSize: '1.4rem' }}>
            {activeTrimestreFilter !== 'TODOS' 
              ? `No hay paquetes configurados para el ${activeTrimestreFilter}`
              : 'No hay paquetes o protocolos creados'}
          </h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '450px', margin: '0 auto 1.5rem' }}>
            {activeTrimestreFilter !== 'TODOS'
              ? 'Selecciona otro trimestre o vuelve a "Mostrar Todo" para ver todos los paquetes disponibles.'
              : 'Crea tu primer paquete médico para definir las consultas, estudios y laboratorios requeridos.'}
          </p>
          {activeTrimestreFilter !== 'TODOS' ? (
            <button
              onClick={() => setActiveTrimestreFilter('TODOS')}
              style={{ 
                background: 'var(--primary-color)', color: 'white', border: 'none', 
                padding: '12px 24px', borderRadius: '14px', fontWeight: '800', cursor: 'pointer' 
              }}
            >
              Ver Todos los Paquetes
            </button>
          ) : (
            <button
              onClick={() => handleOpenModal()}
              style={{ 
                background: 'var(--primary-color)', color: 'white', border: 'none', 
                padding: '12px 24px', borderRadius: '14px', fontWeight: '800', cursor: 'pointer' 
              }}
            >
              Crear Primer Paquete
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {filteredPaquetes.map(p => {
            const isExpanded = expandedSections[p.id] !== false;
            const categories = getGroupedCategories(p.plantillas, p.trimestre);
            const totalEventsInFilter = Object.values(categories).reduce((acc, curr) => acc + curr.length, 0);

            return (
              <motion.div 
                key={p.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="organic-card"
                style={{ 
                  padding: '0', 
                  borderRadius: '24px',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden',
                  background: 'var(--card-bg)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
                }}
              >
                {/* Header del Paquete */}
                <div 
                  style={{ 
                    padding: '1.5rem 2rem', 
                    background: 'linear-gradient(90deg, var(--card-bg) 0%, rgba(233,30,140,0.03) 100%)',
                    borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                  onClick={() => toggleSection(p.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flex: 1 }}>
                    <div style={{ 
                      padding: '14px', 
                      borderRadius: '18px', 
                      background: 'linear-gradient(135deg, var(--primary-color)20, var(--accent-color)20)', 
                      color: 'var(--primary-color)' 
                    }}>
                      <Layers size={26} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ fontSize: '1.35rem', fontWeight: '950', color: 'var(--text-main)', margin: 0 }}>
                          {p.nombre}
                        </h3>
                        {p.trimestre && (
                          <span style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: '800', 
                            padding: '4px 12px', 
                            borderRadius: '20px', 
                            background: 'var(--accent-color)15', 
                            color: 'var(--accent-color)' 
                          }}>
                            {p.trimestre}
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', background: 'var(--bg-color)', padding: '4px 10px', borderRadius: '12px' }}>
                          {totalEventsInFilter} eventos {activeTrimestreFilter !== 'TODOS' ? `en ${activeTrimestreFilter}` : 'totales'}
                        </span>
                      </div>
                      {p.descripcion && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                          {p.descripcion}
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={e => e.stopPropagation()}>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      onClick={() => handleOpenModal(p)} 
                      style={{ 
                        background: 'var(--bg-color)', 
                        border: '1px solid var(--border-color)', 
                        color: 'var(--text-main)', 
                        padding: '10px 16px', 
                        borderRadius: '12px', 
                        cursor: 'pointer',
                        fontWeight: '800',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Edit2 size={16} /> Editar Paquete
                    </motion.button>

                    <button 
                      onClick={() => handleDelete(p.id)} 
                      style={{ 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        border: '1px solid rgba(239, 68, 68, 0.2)', 
                        color: 'var(--error-color)', 
                        padding: '10px', 
                        borderRadius: '12px', 
                        cursor: 'pointer' 
                      }}
                    >
                      <Trash2 size={16} />
                    </button>

                    <div 
                      onClick={() => toggleSection(p.id)}
                      style={{ 
                        padding: '8px', 
                        color: 'var(--text-muted)', 
                        cursor: 'pointer',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s ease'
                      }}
                    >
                      <ChevronDown size={22} />
                    </div>
                  </div>
                </div>

                {/* Contenido del Paquete: Categorías directamente */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      style={{ padding: '1.5rem 2rem', background: 'var(--bg-color)' }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                        {Object.keys(categories).map(catKey => {
                          const items = categories[catKey];
                          if (!items || items.length === 0) return null;

                          const catConfig = CATEGORIA_CONFIG[catKey] || CATEGORIA_CONFIG.CONSULTA;
                          const IconComponent = catConfig.icon;

                          return (
                            <div 
                              key={catKey}
                              style={{ 
                                background: catConfig.bgColor, 
                                borderRadius: '18px', 
                                border: `1px solid ${catConfig.borderColor}`, 
                                padding: '1.4rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem'
                              }}
                            >
                              {/* Título de la Categoría */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${catConfig.borderColor}`, paddingBottom: '0.6rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: catConfig.color }}>
                                  <IconComponent size={20} />
                                  <span style={{ fontWeight: '900', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {catConfig.label}
                                  </span>
                                </div>
                                <span style={{ fontSize: '0.75rem', fontWeight: '900', color: catConfig.color, background: 'var(--card-bg)', padding: '2px 10px', borderRadius: '10px', border: `1px solid ${catConfig.borderColor}` }}>
                                  {items.length} ítems
                                </span>
                              </div>

                              {/* Listado de Eventos */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {items.map((item, idx) => (
                                  <div 
                                    key={idx}
                                    style={{ 
                                      background: 'var(--card-bg)', 
                                      padding: '12px 16px', 
                                      borderRadius: '14px', 
                                      border: '1px solid var(--border-color)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: '12px',
                                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                    }}
                                  >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {item.descripcion}
                                        </span>
                                        {item.esObligatorio && (
                                          <span style={{ fontSize: '0.65rem', fontWeight: '900', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)', padding: '2px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                                            OBLIGATORIO
                                          </span>
                                        )}
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {item.codigoCUPS && (
                                          <span style={{ fontFamily: 'monospace', background: 'var(--bg-color)', padding: '2px 6px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                            CUPS: {item.codigoCUPS}
                                          </span>
                                        )}
                                        {item.cantidad > 1 && (
                                          <span style={{ fontWeight: '800', color: 'var(--primary-color)' }}>
                                            Cant: {item.cantidad}
                                          </span>
                                        )}
                                        {activeTrimestreFilter === 'TODOS' && item.trimestre && (
                                          <span style={{ fontWeight: '700', color: 'var(--accent-color)' }}>
                                            {item.trimestre}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Tag de Semana Programada (Para Alertas) */}
                                    <div style={{ 
                                      padding: '8px 14px', 
                                      borderRadius: '12px', 
                                      background: 'linear-gradient(135deg, rgba(233,30,140,0.1), rgba(59,130,246,0.1))',
                                      border: '1px solid rgba(233,30,140,0.25)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      <Clock size={14} style={{ color: 'var(--primary-color)' }} />
                                      <span style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--primary-color)' }}>
                                        Sem {item.semanasRelativas}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal para Crear / Editar Paquete */}
      <AnimatePresence>
        {isModalOpen && (
          <div style={{ 
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
            padding: '20px'
          }}>
            <motion.div 
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="organic-card"
              style={{ 
                width: '100%', maxWidth: '950px',
                maxHeight: '92vh', overflowY: 'auto',
                padding: '2.5rem',
                boxShadow: 'var(--shadow-xl)',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.7rem', fontWeight: '950', color: 'var(--text-main)', margin: 0 }}>
                    {currentPackage ? 'Editar Paquete Médico' : 'Crear Nuevo Paquete Médico'}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '4px 0 0' }}>
                    Configura la plantilla de eventos organizados por tipo y semanas objetivo para la generación de alertas.
                  </p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '10px', borderRadius: '50%', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--text-main)', marginBottom: '8px', display: 'block' }}>
                      NOMBRE DEL PAQUETE *
                    </label>
                    <input 
                      type="text" 
                      required
                      value={formData.nombre}
                      onChange={e => setFormData({...formData, nombre: e.target.value})}
                      placeholder="Ej. Plan FOMAG Trimestre 1"
                      style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', fontWeight: '700', fontSize: '0.95rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--text-main)', marginBottom: '8px', display: 'block' }}>
                      DESCRIPCIÓN
                    </label>
                    <input 
                      type="text" 
                      value={formData.descripcion}
                      onChange={e => setFormData({...formData, descripcion: e.target.value})}
                      placeholder="Objetivo o protocolo asociado"
                      style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', fontSize: '0.95rem' }}
                    />
                  </div>
                </div>

                {/* Banner Informativo */}
                <div style={{ 
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(233,30,140,0.08))', 
                  padding: '1.2rem 1.5rem', 
                  borderRadius: '18px', 
                  border: '1px solid rgba(59,130,246,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <Info size={24} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.4 }}>
                    <strong>Cálculo Automático de Alertas:</strong> La <strong>Semana Objetivo</strong> especificada para cada evento calculará la fecha estimada en base a la <strong>FUR</strong> (Fecha de Última Regla) de cada paciente al aplicarle el paquete.
                  </p>
                </div>

                {/* Editor de Plantillas/Eventos */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                    <div>
                      <label style={{ fontSize: '0.9rem', fontWeight: '900', color: 'var(--text-main)', display: 'block' }}>
                        EVENTOS Y ESTUDIOS EN PLANTILLA ({formData.plantillas.length})
                      </label>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Asigna la categoría, semana y CUPS a cada uno</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={handleAddTemplate}
                      style={{ 
                        background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))', 
                        color: 'white', 
                        border: 'none', 
                        padding: '10px 18px', 
                        borderRadius: '14px', 
                        fontWeight: '900', 
                        fontSize: '0.8rem', 
                        cursor: 'pointer',
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        boxShadow: 'var(--primary-glow) 0 4px 12px'
                      }}
                    >
                      <Plus size={16} /> Añadir Evento
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {formData.plantillas.length === 0 ? (
                      <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-color)', borderRadius: '20px', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
                        Aún no has agregado eventos a este paquete. Haz clic en "Añadir Evento" para comenzar.
                      </div>
                    ) : (
                      formData.plantillas.map((tmpl, index) => (
                        <div key={index} style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '150px 1fr 110px 110px 110px 60px 40px', 
                          gap: '12px', 
                          alignItems: 'center', 
                          padding: '14px', 
                          background: 'var(--bg-color)', 
                          borderRadius: '16px', 
                          border: '1px solid var(--border-color)' 
                        }}>
                          {/* Categoría / Tipo */}
                          <div>
                            <span style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>CATEGORÍA</span>
                            <select 
                              value={tmpl.tipo}
                              onChange={e => handleUpdateTemplate(index, 'tipo', e.target.value)}
                              style={{ 
                                width: '100%',
                                background: 'var(--card-bg)', 
                                border: '1px solid var(--border-color)', 
                                borderRadius: '10px', 
                                padding: '8px', 
                                fontWeight: '800', 
                                fontSize: '0.78rem', 
                                color: 'var(--text-main)' 
                              }}
                            >
                              <option value="CONSULTA">🩺 CONSULTA</option>
                              <option value="LABORATORIO">🧪 LABORATORIO</option>
                              <option value="ESTUDIO">🔬 IMÁGENES (ESTUDIO)</option>
                              <option value="VACUNA">💉 VACUNA</option>
                              <option value="CONTROL">📋 CONTROL</option>
                            </select>
                          </div>

                          {/* Descripción */}
                          <div>
                            <span style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>DESCRIPCIÓN DEL EVENTO</span>
                            <input 
                              type="text"
                              required
                              value={tmpl.descripcion}
                              onChange={e => handleUpdateTemplate(index, 'descripcion', e.target.value)}
                              placeholder="Ej. Ecografía de detalle anatómico"
                              style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.85rem', fontWeight: '600' }}
                            />
                          </div>

                          {/* Semana Programada (Relativa) */}
                          <div>
                            <span style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--primary-color)', display: 'block', marginBottom: '4px' }}>
                              📅 SEMANA OBJETIVO
                            </span>
                            <input 
                              type="number"
                              min="0"
                              max="42"
                              required
                              value={tmpl.semanasRelativas}
                              onChange={e => handleUpdateTemplate(index, 'semanasRelativas', parseInt(e.target.value) || 0)}
                              placeholder="Semana (ej. 12)"
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--primary-color)40', fontSize: '0.85rem', fontWeight: '900', color: 'var(--primary-color)', textAlign: 'center' }}
                            />
                          </div>

                          {/* Trimestre */}
                          <div>
                            <span style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>TRIMESTRE</span>
                            <select 
                              value={tmpl.trimestre || ''}
                              onChange={e => handleUpdateTemplate(index, 'trimestre', e.target.value)}
                              style={{ width: '100%', padding: '8px', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.78rem', fontWeight: '700' }}
                            >
                              <option value="1er Trimestre">1er Trimestre</option>
                              <option value="2do Trimestre">2do Trimestre</option>
                              <option value="3er Trimestre">3er Trimestre</option>
                              <option value="General / Todo el Embarazo">General</option>
                            </select>
                          </div>

                          {/* CUPS */}
                          <div>
                            <span style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>CUPS</span>
                            <input 
                              type="text"
                              value={tmpl.codigoCUPS || ''}
                              onChange={e => handleUpdateTemplate(index, 'codigoCUPS', e.target.value)}
                              placeholder="Código"
                              style={{ width: '100%', padding: '8px', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.8rem', fontFamily: 'monospace' }}
                            />
                          </div>

                          {/* Obligatorio */}
                          <div style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>OBLIG.</span>
                            <input 
                              type="checkbox"
                              checked={tmpl.esObligatorio}
                              onChange={e => handleUpdateTemplate(index, 'esObligatorio', e.target.checked)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                          </div>

                          {/* Botón Eliminar */}
                          <button 
                            type="button" 
                            onClick={() => handleRemoveTemplate(index)} 
                            style={{ background: 'transparent', border: 'none', color: 'var(--error-color)', cursor: 'pointer', padding: '4px' }}
                          >
                            <X size={20} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    style={{ flex: 1, padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontWeight: '800', cursor: 'pointer', background: 'var(--bg-color)' }}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    style={{ flex: 2, padding: '16px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))', color: 'white', fontWeight: '900', fontSize: '1rem', cursor: 'pointer', boxShadow: 'var(--primary-glow) 0 8px 20px' }}
                  >
                    Guardar Paquete
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Paquetes;
