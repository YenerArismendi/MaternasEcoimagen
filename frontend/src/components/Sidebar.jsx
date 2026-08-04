import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  Baby,
  ChevronRight,
  Layers,
  Megaphone,
  Bell
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNotification } from '../context/NotificationContext';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { config } = useTheme();
  const { unreadCount, setIsDrawerOpen } = useNotification();
  const navigate = useNavigate();

  const menuItems = [
    { name: 'Dashboard',    path: '/dashboard',     icon: LayoutDashboard, admin: false },
    { name: 'Maternas',     path: '/maternas',      icon: Baby,            admin: false },
    { name: 'Paquetes',     path: '/paquetes',      icon: Layers,          admin: false },
    { name: 'Anuncios',     path: '/anuncios',      icon: Megaphone,       admin: false },
    { name: 'Usuarios',     path: '/usuarios',      icon: Users,           admin: true },
    { name: 'Configuración', path: '/configuracion', icon: Settings,       admin: true },
  ];

  let filteredMenu = menuItems.filter(item => !item.admin || user?.rol === 'ADMIN');
  if (user?.rol === 'GESTANTE') {
    const portalPath = user?.gestanteId ? `/maternas/${user.gestanteId}` : '/maternas';
    filteredMenu = [
      { name: 'Mi Portal de Salud', path: portalPath, icon: Baby, admin: false }
    ];
  }

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      background: 'var(--card-bg)',
      borderRight: '1px solid var(--border-color)',
      padding: '2.5rem 1.8rem',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      boxShadow: '4px 0 20px rgba(0,0,0,0.02)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '4px' }}>
        <div style={{ 
          background: 'var(--primary-color)', 
          padding: '10px', 
          borderRadius: '16px',
          color: 'white',
          boxShadow: 'var(--primary-glow) 0 4px 10px'
        }}>
          <Baby size={30} />
        </div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: '950', letterSpacing: '-1px', color: 'var(--text-main)' }}>{config.clinicName}</h1>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '2rem', marginLeft: '50px' }}>Ecoimagen salud</p>

      {/* Botón Centro de Notificaciones */}
      <button
        onClick={() => setIsDrawerOpen(prev => !prev)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px', borderRadius: '18px',
          background: 'linear-gradient(135deg, #fff5f8 0%, #fce7f3 100%)',
          border: '1.5px solid #fbcfe8', cursor: 'pointer',
          marginBottom: '1.5rem', width: '100%',
          boxShadow: '0 4px 12px rgba(236,72,153,0.08)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#be185d', fontWeight: '950', fontSize: '0.88rem' }}>
          <Bell size={20} />
          <span>Avisos y Alertas</span>
        </div>
        {unreadCount > 0 ? (
          <span style={{
            background: '#ef4444', color: '#ffffff', fontSize: '0.75rem', fontWeight: '950',
            padding: '2px 8px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(239,68,68,0.4)'
          }}>
            {unreadCount}
          </span>
        ) : (
          <span style={{ color: '#9d174d', fontSize: '0.75rem', fontWeight: '800' }}>0</span>
        )}
      </button>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredMenu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
          >
            {({ isActive }) => (
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px 18px',
                borderRadius: '20px',
                textDecoration: 'none',
                color: isActive ? 'white' : 'var(--text-muted)',
                background: isActive ? 'var(--primary-color)' : 'transparent',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isActive ? 'var(--primary-glow) 0 8px 16px' : 'none',
                fontWeight: isActive ? '800' : '600',
                fontSize: '0.95rem',
                width: '100%'
              }}>
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.name}</span>
                {isActive && (
                  <motion.div layoutId="sidebar-active" style={{ marginLeft: 'auto' }}>
                    <ChevronRight size={18} />
                  </motion.div>
                )}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div style={{ 
        marginTop: 'auto', 
        paddingTop: '2.5rem', 
        borderTop: '2px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '0 8px' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '18px', 
            background: 'var(--secondary-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '900',
            fontSize: '1.2rem',
            boxShadow: '0 4px 10px rgba(59, 130, 246, 0.3)'
          }}>
            {user?.nombre?.charAt(0)}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontWeight: '800', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
              {user?.nombre}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{user?.rol}</p>
          </div>
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
          whileTap={{ scale: 0.98 }}
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '15px',
            width: '100%',
            background: 'rgba(239, 68, 68, 0.08)',
            color: '#ef4444',
            fontWeight: '800',
            fontSize: '0.9rem',
            borderRadius: '18px',
            border: '1px solid rgba(239, 68, 68, 0.1)'
          }}
        >
          <LogOut size={20} />
          Cerrar Sesión
        </motion.button>
      </div>
    </aside>
  );
};

export default Sidebar;
