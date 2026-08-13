import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  XCircle,
  X,
  User,
  Shield,
  Stethoscope,
  HeartHandshake,
  Baby,
  Key,
  Phone,
  Building2,
  Calendar,
  Lock,
  Eye,
  Sparkles,
  UserCheck,
  UserX,
  RefreshCw,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

const Users = () => {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const { user: userAuth } = useAuth();
  const isSuperAdmin = userAuth?.rol === 'SUPERADMIN' || userAuth?.rol === 'SUPER_ROOT';

  const [activeTab, setActiveTab] = useState('administrativos'); // 'administrativos' | 'maternas'
  const [users, setUsers] = useState([]);
  const [maternas, setMaternas] = useState([]);
  const [ipsList, setIpsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMaternaModalOpen, setIsMaternaModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentMaterna, setCurrentMaterna] = useState(null);

  // Formulario Usuario Administrativo / Médico
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'ADMIN',
    ipsId: '',
    activo: true
  });

  // Formulario Acceso Portal Materna
  const [maternaAuthData, setMaternaAuthData] = useState({
    nombre: '',
    email: '',
    password: '',
    activo: true
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resUsers, resMaternas, resIPS] = await Promise.all([
        api.get('/users'),
        api.get('/maternas'),
        api.get('/ips')
      ]);
      setUsers(resUsers.data || []);
      setMaternas(resMaternas.data || []);
      setIpsList(resIPS.data || []);
    } catch (err) {
      console.error(err);
      notify('Error al cargar la información de usuarios', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  // Abrir modal de Usuario Administrativo
  const handleOpenModal = (user = null) => {
    if (user) {
      setCurrentUser(user);
      setFormData({ 
        nombre: user.nombre, 
        email: user.email, 
        password: '', 
        rol: user.rol, 
        ipsId: user.ipsId || '', 
        activo: user.activo 
      });
    } else {
      setCurrentUser(null);
      setFormData({ 
        nombre: '', 
        email: '', 
        password: '', 
        rol: 'ADMIN', 
        ipsId: '', 
        activo: true 
      });
    }
    setIsModalOpen(true);
  };

  // Abrir modal de Credencial para Materna
  const handleOpenMaternaModal = (mat) => {
    setCurrentMaterna(mat);
    // Buscar si ya tiene usuario registrado por su número de documento
    const existingUser = users.find(u => u.email === mat.numeroIdentificacion || u.email === `${mat.numeroIdentificacion}@maternas.com`);
    
    setMaternaAuthData({
      nombre: `${mat.nombres} ${mat.apellidos}`,
      email: existingUser ? existingUser.email : mat.numeroIdentificacion,
      password: existingUser ? '' : mat.numeroIdentificacion,
      activo: existingUser ? existingUser.activo : true
    });
    setIsMaternaModalOpen(true);
  };

  // Enviar guardado de Usuario Administrativo
  const handleSubmitUser = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        ipsId: formData.ipsId ? parseInt(formData.ipsId) : null
      };

      if (currentUser) {
        await api.put(`/users/${currentUser.id}`, payload);
      } else {
        await api.post('/users', payload);
      }
      setIsModalOpen(false);
      fetchData();
      notify(currentUser ? 'Usuario administrativo actualizado' : 'Nuevo usuario creado con éxito');
    } catch (err) {
      notify(err.response?.data?.error || 'Error al guardar usuario', 'error');
    }
  };

  // Enviar guardado de Acceso para Materna
  const handleSubmitMaternaAuth = async (e) => {
    e.preventDefault();
    try {
      const existingUser = users.find(u => u.email === maternaAuthData.email);
      if (existingUser) {
        await api.put(`/users/${existingUser.id}`, {
          nombre: maternaAuthData.nombre,
          email: maternaAuthData.email,
          password: maternaAuthData.password || undefined,
          rol: 'GESTANTE',
          activo: maternaAuthData.activo
        });
        notify('Credenciales de la materna actualizadas correctamente');
      } else {
        await api.post('/users', {
          nombre: maternaAuthData.nombre,
          email: maternaAuthData.email,
          password: maternaAuthData.password || 'Materna1234',
          rol: 'GESTANTE',
          activo: true
        });
        notify('🌸 ¡Acceso al Portal Materna creado con éxito!');
      }
      setIsMaternaModalOpen(false);
      fetchData();
    } catch (err) {
      notify(err.response?.data?.error || 'Error al asignar credencial a la materna', 'error');
    }
  };

  // Alternar estado de usuario
  const handleToggleStatus = async (user) => {
    try {
      await api.put(`/users/${user.id}`, { activo: !user.activo });
      fetchData();
      notify('Estado de usuario actualizado');
    } catch (err) {
      notify('Error al cambiar estado', 'error');
    }
  };

  const [expandedIps, setExpandedIps] = useState({});

  const toggleIpsExpand = (ipsId) => {
    setExpandedIps(prev => ({
      ...prev,
      [ipsId]: prev[ipsId] === undefined ? false : !prev[ipsId] // Por defecto abierto (undefined = abierto)
    }));
  };

  // Filtros
  const adminUsers = users.filter(u => {
    if (u.rol === 'GESTANTE' || u.rol === 'MATERNA') return false;
    if (!isSuperAdmin && userAuth?.ipsId) {
      return u.ipsId === userAuth.ipsId || u.ips?.id === userAuth.ipsId;
    }
    return true;
  });
  
  const filteredAdminUsers = adminUsers.filter(u => 
    u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.rol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Agrupamiento por IPS para vista Super Root
  const groupedUsersByIps = useMemo(() => {
    if (!isSuperAdmin) return [];

    const groups = [];

    ipsList.forEach(ips => {
      const ipsUsers = filteredAdminUsers.filter(u => u.ipsId === ips.id || u.ips?.id === ips.id);
      const adminUsersOfIps = ipsUsers.filter(u => u.rol === 'ADMIN');
      groups.push({
        id: ips.id,
        nombre: ips.nombre,
        nit: ips.nit,
        admins: adminUsersOfIps,
        users: ipsUsers
      });
    });

    const globalUsers = filteredAdminUsers.filter(u => !u.ipsId && !u.ips);
    if (globalUsers.length > 0) {
      const globalAdmins = globalUsers.filter(u => u.rol === 'ADMIN' || u.rol === 'SUPERADMIN' || u.rol === 'SUPER_ROOT');
      groups.push({
        id: 'global',
        nombre: 'Acceso Global / Super Root',
        nit: 'N/A',
        admins: globalAdmins,
        users: globalUsers
      });
    }

    return groups;
  }, [ipsList, filteredAdminUsers, isSuperAdmin]);

  const filteredMaternas = maternas.filter(m => 
    `${m.nombres} ${m.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.numeroIdentificacion.includes(searchTerm) ||
    (m.ipsAtencion && m.ipsAtencion.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getRolBadge = (rol) => {
    switch(rol) {
      case 'SUPERADMIN':
      case 'SUPER_ROOT':
        return { label: 'Super Root Administrator', bg: '#fae8ff', color: '#86198f', icon: <Shield size={14} /> };
      case 'ADMIN': 
        return { label: 'Administrador IPS', bg: '#dbeafe', color: '#1e40af', icon: <Shield size={14} /> };
      case 'MEDICO': 
        return { label: 'Médico Especialista', bg: '#dcfce7', color: '#15803d', icon: <Stethoscope size={14} /> };
      case 'ENFERMERA': 
        return { label: 'Enfermera de Gestión', bg: '#fce7f3', color: '#be185d', icon: <HeartHandshake size={14} /> };
      case 'AUDITOR': 
        return { label: 'Auditor FOMAG', bg: '#fef3c7', color: '#b45309', icon: <Sparkles size={14} /> };
      default: 
        return { label: rol, bg: '#f3f4f6', color: '#4b5563', icon: <User size={14} /> };
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header del Módulo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: 'clamp(1.4rem, 4vw, 2.2rem)', fontWeight: '950', letterSpacing: '-0.8px', color: 'var(--text-main)', margin: 0 }}>
            Gestión de Usuarios y Roles
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '700', margin: '4px 0 0' }}>
            Directorio dividido entre personal asistencial/administrativo y gestantes del programa.
          </p>
        </div>

        {activeTab === 'administrativos' && (
          <motion.button 
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => handleOpenModal()}
            style={{ 
              background: 'linear-gradient(135deg, var(--primary-color) 0%, #0369a1 100%)', 
              color: 'white', padding: '12px 22px', display: 'flex', alignItems: 'center', gap: '10px', 
              fontWeight: '950', borderRadius: '18px', fontSize: '0.9rem', border: 'none', cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(2, 132, 199, 0.25)' 
            }}
          >
            <Plus size={18} />
            <span>Nuevo Usuario Administrativo</span>
          </motion.button>
        )}
      </div>

      {/* Pestañas de Selección de Segmento */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem', background: '#ffffff', padding: '8px', borderRadius: '22px', border: '1px solid #e2e8f0', boxShadow: '0 4px 18px rgba(0,0,0,0.03)' }}>
        <button
          onClick={() => setActiveTab('administrativos')}
          style={{
            flex: 1, padding: '14px 20px', borderRadius: '16px', border: 'none',
            background: activeTab === 'administrativos' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'transparent',
            color: activeTab === 'administrativos' ? '#ffffff' : '#64748b',
            fontWeight: '950', fontSize: '0.92rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            boxShadow: activeTab === 'administrativos' ? '0 8px 20px rgba(2, 132, 199, 0.25)' : 'none',
            transition: 'all 0.3s ease'
          }}
        >
          <UserCheck size={20} />
          👥 PERSONAL ADMINISTRATIVO Y ASISTENCIAL ({adminUsers.length})
        </button>

        <button
          onClick={() => setActiveTab('maternas')}
          style={{
            flex: 1, padding: '14px 20px', borderRadius: '16px', border: 'none',
            background: activeTab === 'maternas' ? 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' : 'transparent',
            color: activeTab === 'maternas' ? '#ffffff' : '#64748b',
            fontWeight: '950', fontSize: '0.92rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            boxShadow: activeTab === 'maternas' ? '0 8px 20px rgba(236, 72, 153, 0.25)' : 'none',
            transition: 'all 0.3s ease'
          }}
        >
          <Baby size={20} />
          🌸 GESTANTES Y MATERNAS REGISTRADAS ({maternas.length})
        </button>
      </div>

      {/* Contenedor Principal */}
      <div className="organic-card" style={{ overflow: 'hidden', padding: 0, borderRadius: '24px', background: '#ffffff', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
        
        {/* Barra de Búsqueda */}
        <div style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <div style={{ position: 'relative', maxWidth: '500px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder={activeTab === 'administrativos' ? "Buscar por nombre, email o rol..." : "Buscar por nombre de materna, cédula o IPS..."}
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '44px', background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '16px', padding: '12px 18px 12px 44px', width: '100%', fontSize: '0.9rem', fontWeight: '700' }}
            />
          </div>
        </div>

        {/* ─── PESTAÑA 1: PERSONAL ADMINISTRATIVO Y ASISTENCIAL ─── */}
        {activeTab === 'administrativos' && (
          <div>
            {isSuperAdmin ? (
              /* VISTA SUPER ROOT: AGRUPADA POR IPS CON DESPLEGABLES */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '1.2rem' }}>
                {groupedUsersByIps.map(group => {
                  const isExpanded = expandedIps[group.id] ?? true; // Por defecto desplegado
                  return (
                    <div key={group.id} style={{
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '20px',
                      overflow: 'hidden',
                      background: '#ffffff',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.02)'
                    }}>
                      {/* Encabezado de IPS / Administrador */}
                      <div 
                        onClick={() => toggleIpsExpand(group.id)}
                        style={{
                          padding: '1.2rem 1.5rem',
                          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          userSelect: 'none',
                          borderBottom: isExpanded ? '1.5px solid #e2e8f0' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{
                            width: '46px', height: '46px', borderRadius: '14px',
                            background: '#e0f2fe', color: '#0284c7',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <Building2 size={24} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '950', color: '#0f172a' }}>
                                {group.nombre}
                              </h3>
                              <span style={{
                                fontSize: '0.75rem', fontWeight: '900', color: '#0369a1',
                                background: '#bae6fd', padding: '3px 10px', borderRadius: '10px'
                              }}>
                                {group.users.length} {group.users.length === 1 ? 'Usuario' : 'Usuarios'}
                              </span>
                            </div>

                            {/* Muestra Administrador(es) de la IPS */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                              <Shield size={14} color="#0284c7" />
                              <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#475569' }}>
                                Administrador(es): {' '}
                                {group.admins.length > 0 ? (
                                  group.admins.map(a => `${a.nombre} (${a.email})`).join(', ')
                                ) : (
                                  <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sin administrador asignado</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>
                            {isExpanded ? 'Ocultar personal' : 'Desplegar personal'}
                          </span>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: '#ffffff', border: '1px solid #cbd5e1',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#0f172a'
                          }}>
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </div>
                        </div>
                      </div>

                      {/* Tabla de Usuarios Desplegada */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ overflowX: 'auto' }}
                          >
                            {group.users.length === 0 ? (
                              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem', fontWeight: '700' }}>
                                No hay usuarios asignados a esta IPS.
                              </div>
                            ) : (
                              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '650px' }}>
                                <thead>
                                  <tr style={{ background: '#ffffff', color: '#64748b', fontSize: '0.72rem', fontWeight: '900', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>
                                    <th style={{ padding: '1rem 1.4rem' }}>USUARIO / EMAIL</th>
                                    <th style={{ padding: '1rem 1.4rem' }}>ROL ASIGNADO</th>
                                    <th style={{ padding: '1rem 1.4rem' }}>ESTADO</th>
                                    <th style={{ padding: '1rem 1.4rem', textAlign: 'right' }}>ACCIONES</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.users.map(u => {
                                    const rolBadge = getRolBadge(u.rol);
                                    return (
                                      <tr key={u.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                        <td style={{ padding: '1rem 1.4rem' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '950', fontSize: '0.85rem' }}>
                                              {u.nombre.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                              <p style={{ margin: 0, fontWeight: '950', color: '#0f172a', fontSize: '0.88rem' }}>{u.nombre}</p>
                                              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>{u.email}</p>
                                            </div>
                                          </div>
                                        </td>

                                        <td style={{ padding: '1rem 1.4rem' }}>
                                          <span style={{ padding: '4px 12px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: '950', background: rolBadge.bg, color: rolBadge.color, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            {rolBadge.icon} {rolBadge.label}
                                          </span>
                                        </td>

                                        <td style={{ padding: '1rem 1.4rem' }}>
                                          <span style={{ padding: '4px 10px', borderRadius: '8px', background: u.activo ? '#f0fdf4' : '#fff1f2', color: u.activo ? '#166534' : '#991b1b', fontSize: '0.72rem', fontWeight: '900', border: `1px solid ${u.activo ? '#bbf7d0' : '#fecdd3'}` }}>
                                            {u.activo ? 'ACTIVO' : 'INACTIVO'}
                                          </span>
                                        </td>

                                        <td style={{ padding: '1rem 1.4rem', textAlign: 'right' }}>
                                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                            <button 
                                              onClick={() => handleOpenModal(u)} 
                                              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 10px', color: '#334155', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '900', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                            >
                                              <Edit2 size={12} /> Editar
                                            </button>
                                            <button 
                                              onClick={() => handleToggleStatus(u)} 
                                              style={{ background: u.activo ? '#fff1f2' : '#f0fdf4', border: `1px solid ${u.activo ? '#fda4af' : '#86efac'}`, padding: '6px 10px', color: u.activo ? '#e11d48' : '#15803d', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '900', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                            >
                                              {u.activo ? <UserX size={12} /> : <UserCheck size={12} />}
                                              {u.activo ? 'Desactivar' : 'Activar'}
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* VISTA ESTÁNDAR PARA ADMINISTRADOR DE IPS: SOLO SUS USUARIOS */
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '650px' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      <th style={{ padding: '1.2rem 1.4rem' }}>PERSONAL / USUARIO</th>
                      <th style={{ padding: '1.2rem 1.4rem' }}>IPS ASOCIADA</th>
                      <th style={{ padding: '1.2rem 1.4rem' }}>ROL ASIGNADO</th>
                      <th style={{ padding: '1.2rem 1.4rem' }}>ESTADO DE ACCESO</th>
                      <th style={{ padding: '1.2rem 1.4rem', textAlign: 'right' }}>ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAdminUsers.map(u => {
                      const rolBadge = getRolBadge(u.rol);
                      return (
                        <tr key={u.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '1.2rem 1.4rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '950', flexShrink: 0 }}>
                                {u.nombre.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p style={{ margin: 0, fontWeight: '950', color: '#0f172a', fontSize: '0.92rem' }}>{u.nombre}</p>
                                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: '700' }}>{u.email}</p>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '1.2rem 1.4rem' }}>
                            {u.ips ? (
                              <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0369a1', background: '#e0f2fe', padding: '6px 12px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid #bae6fd' }}>
                                <Building2 size={14} /> {u.ips.nombre}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '8px' }}>
                                Mi IPS
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '1.2rem 1.4rem' }}>
                            <span style={{ padding: '6px 14px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '950', background: rolBadge.bg, color: rolBadge.color, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              {rolBadge.icon} {rolBadge.label}
                            </span>
                          </td>

                          <td style={{ padding: '1.2rem 1.4rem' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '10px', background: u.activo ? '#f0fdf4' : '#fff1f2', color: u.activo ? '#166534' : '#991b1b', fontSize: '0.78rem', fontWeight: '900', border: `1px solid ${u.activo ? '#bbf7d0' : '#fecdd3'}` }}>
                              {u.activo ? <CheckCircle size={14} /> : <XCircle size={14} />}
                              {u.activo ? 'ACTIVO' : 'INACTIVO'}
                            </div>
                          </td>

                          <td style={{ padding: '1.2rem 1.4rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              <button 
                                onClick={() => handleOpenModal(u)} 
                                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', color: '#334155', borderRadius: '10px', fontSize: '0.78rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Edit2 size={14} /> Editar
                              </button>

                              <button 
                                onClick={() => handleToggleStatus(u)} 
                                style={{ background: u.activo ? '#fff1f2' : '#f0fdf4', border: `1px solid ${u.activo ? '#fda4af' : '#86efac'}`, padding: '8px 12px', color: u.activo ? '#e11d48' : '#15803d', borderRadius: '10px', fontSize: '0.78rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                {u.activo ? <UserX size={14} /> : <UserCheck size={14} />}
                                {u.activo ? 'Desactivar' : 'Activar'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── PESTAÑA 2: GESTANTES Y MATERNAS REGISTRADAS ─── */}
        {activeTab === 'maternas' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: '#fdf2f8', color: '#9d174d', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  <th style={{ padding: '1.2rem 1.4rem' }}>GESTANTE / MATERNA</th>
                  <th style={{ padding: '1.2rem 1.4rem' }}>IDENTIFICACIÓN / CONTACTO</th>
                  <th style={{ padding: '1.2rem 1.4rem' }}>IPS ATENCIÓN</th>
                  <th style={{ padding: '1.2rem 1.4rem' }}>ACCESO PORTAL MATERNA</th>
                  <th style={{ padding: '1.2rem 1.4rem', textAlign: 'right' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredMaternas.map(m => {
                  const gestanteUser = users.find(u => u.email === m.numeroIdentificacion || u.email === `${m.numeroIdentificacion}@maternas.com`);
                  const isUserActive = gestanteUser ? gestanteUser.activo : false;

                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1.2rem 1.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: '#fce7f3', color: '#db2777', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '950', flexShrink: 0 }}>
                            🌸
                          </div>
                          <div>
                            <p style={{ margin: 0, fontWeight: '950', color: '#0f172a', fontSize: '0.92rem' }}>{m.nombres} {m.apellidos}</p>
                            <span style={{ fontSize: '0.74rem', color: '#be185d', fontWeight: '800' }}>
                              Consecutivo: #{m.consecutivo || m.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '1.2rem 1.4rem' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '900', color: '#334155' }}>
                          {m.tipoIdentificacion} {m.numeroIdentificacion}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={12} /> {m.telefonoCel1 || 'Sin celular'}
                        </p>
                      </td>

                      <td style={{ padding: '1.2rem 1.4rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Building2 size={14} color="#0284c7" /> {m.ipsAtencion || 'No asignada'}
                        </span>
                      </td>

                      <td style={{ padding: '1.2rem 1.4rem' }}>
                        {gestanteUser ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '10px', background: isUserActive ? '#f0fdf4' : '#fff1f2', color: isUserActive ? '#166534' : '#991b1b', fontSize: '0.75rem', fontWeight: '900', border: `1px solid ${isUserActive ? '#bbf7d0' : '#fecdd3'}` }}>
                            <Lock size={12} /> {isUserActive ? 'PORTAL HABILITADO' : 'ACCESO BLOQUEADO'}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            SIN CREDENCIAL PORTAL
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '1.2rem 1.4rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button 
                            onClick={() => handleOpenMaternaModal(m)} 
                            style={{ background: '#fce7f3', border: '1px solid #fbcfe8', padding: '8px 12px', color: '#db2777', borderRadius: '10px', fontSize: '0.78rem', fontWeight: '950', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Key size={14} /> {gestanteUser ? 'Gestionar Clave' : 'Crear Acceso Portal'}
                          </button>

                          <button 
                            onClick={() => navigate(`/maternas/${m.id}`)} 
                            style={{ background: '#0284c7', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: '950', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 4px 10px rgba(2,132,199,0.25)' }}
                          >
                            <Eye size={14} /> Ver Ficha
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ─── MODAL 1: NUEVO / EDITAR USUARIO ADMINISTRATIVO Y MÉDICO ─── */}
      <AnimatePresence>
        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={{ background: '#ffffff', width: '100%', maxWidth: '480px', borderRadius: '24px', padding: '1.8rem', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.4rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '950', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={22} color="#0284c7" /> {currentUser ? 'Editar Usuario Personal' : 'Nuevo Usuario Personal / Médico'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmitUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '900', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Nombre Completo</label>
                  <input type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} required placeholder="Ej. Dr. Juan Pérez" style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1.5px solid #cbd5e1', fontWeight: '800', fontSize: '0.9rem' }} />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '900', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Correo Electrónico (Login)</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required placeholder="medico@maternas.com" style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1.5px solid #cbd5e1', fontWeight: '800', fontSize: '0.9rem' }} />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '900', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Contraseña {currentUser && <span style={{ fontWeight: '500', textTransform: 'none', color: '#94a3b8' }}>(Dejar en blanco para no cambiar)</span>}
                  </label>
                  <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!currentUser} placeholder="••••••••" style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1.5px solid #cbd5e1', fontWeight: '800', fontSize: '0.9rem' }} />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '900', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Rol en el Sistema</label>
                  <select value={formData.rol} onChange={e => setFormData({...formData, rol: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1.5px solid #cbd5e1', fontWeight: '800', fontSize: '0.9rem' }}>
                    <option value="ADMIN">Administrador del Sistema / IPS</option>
                    <option value="ENFERMERA">Enfermera de Gestión CPN</option>
                    <option value="MEDICO">Médico Especialista / Obstetra</option>
                    <option value="AUDITOR">Auditor de Cohorte FOMAG</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '900', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>IPS Institucional Asociada</label>
                  <select value={formData.ipsId} onChange={e => setFormData({...formData, ipsId: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1.5px solid #cbd5e1', fontWeight: '800', fontSize: '0.9rem' }}>
                    <option value="">-- Sin IPS (Acceso Administrador Global / Multitenant) --</option>
                    {ipsList.map(ips => (
                      <option key={ips.id} value={ips.id}>
                        {ips.nombre} ({ips.codigoHabilitacion})
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', marginTop: '4px', display: 'block' }}>
                    Al asociar una IPS, la plantilla y datos de este usuario se segmentarán automáticamente para esa institución.
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '14px', background: '#f1f5f9', border: 'none', fontWeight: '900', cursor: 'pointer', color: '#475569' }}>Cancelar</button>
                  <button type="submit" style={{ flex: 1.5, padding: '12px', borderRadius: '14px', background: '#0284c7', color: 'white', border: 'none', fontWeight: '950', cursor: 'pointer', boxShadow: '0 6px 16px rgba(2,132,199,0.3)' }}>
                    {currentUser ? 'Guardar Cambios' : 'Crear Usuario'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 2: GESTIONAR CREDENCIAL DEL PORTAL PARA MATERNA ─── */}
      <AnimatePresence>
        {isMaternaModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={{ background: '#ffffff', width: '100%', maxWidth: '460px', borderRadius: '24px', padding: '1.8rem', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '950', color: '#be185d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Key size={20} color="#db2777" /> Acceso al Portal Gestante
                </h3>
                <button onClick={() => setIsMaternaModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
              </div>

              <div style={{ background: '#fdf2f8', padding: '12px 14px', borderRadius: '14px', border: '1px solid #fbcfe8', marginBottom: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: '950', color: '#831843' }}>{currentMaterna?.nombres} {currentMaterna?.apellidos}</p>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', fontWeight: '800', color: '#9d174d' }}>
                  Identificación: {currentMaterna?.tipoIdentificacion} {currentMaterna?.numeroIdentificacion}
                </p>
              </div>

              <form onSubmit={handleSubmitMaternaAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '900', color: '#64748b', display: 'block', marginBottom: '4px' }}>USUARIO / CORREO DE INGRESO:</label>
                  <input type="text" value={maternaAuthData.email} onChange={e => setMaternaAuthData({...maternaAuthData, email: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1.5px solid #cbd5e1', fontWeight: '800', fontSize: '0.9rem' }} />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '900', color: '#64748b', display: 'block', marginBottom: '4px' }}>NUEVA CONTRASEÑA PORTAL:</label>
                  <input type="password" value={maternaAuthData.password} onChange={e => setMaternaAuthData({...maternaAuthData, password: e.target.value})} placeholder="Ej. Materna1234" style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1.5px solid #cbd5e1', fontWeight: '800', fontSize: '0.9rem' }} />
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', marginTop: '4px', display: 'block' }}>Por defecto puedes dejar: Materna1234</span>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setIsMaternaModalOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '14px', background: '#f1f5f9', border: 'none', fontWeight: '900', cursor: 'pointer', color: '#475569' }}>Cancelar</button>
                  <button type="submit" style={{ flex: 1.5, padding: '12px', borderRadius: '14px', background: '#db2777', color: 'white', border: 'none', fontWeight: '950', cursor: 'pointer', boxShadow: '0 6px 16px rgba(219,39,119,0.3)' }}>
                    GUARDAR CREDENCIAL PORTAL
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

export default Users;
