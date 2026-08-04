import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Baby,
  Users,
  Settings,
  LogOut,
  Layers,
  MoreHorizontal,
  X,
  Calendar,
  Microscope,
  ShieldAlert,
  UserCircle2,
  Megaphone,
} from 'lucide-react';

const MAX_VISIBLE = 3;

// ─── Tabs específicos del Portal Gestante ───────────────────────────────────
const GESTANTE_TABS = [
  { id: 'citas',    label: 'Mis Citas',  Icon: Calendar,   color: '#ec4899' },
  { id: 'examenes', label: 'Exámenes',   Icon: Microscope,  color: '#0284c7' },
  { id: 'alarma',   label: 'Alertas',    Icon: ShieldAlert, color: '#ef4444' },
  { id: 'anuncios', label: 'Anuncios',   Icon: Megaphone,   color: '#7c3aed' },
  { id: 'perfil',   label: 'Mi Perfil',  Icon: UserCircle2, color: '#10b981' },
];

// ─── Navegación móvil exclusiva para GESTANTE ───────────────────────────────
const GestanteBottomNav = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState(window.__gestanteActiveTab || 'citas');
  const [counts, setCounts] = useState(window.__gestanteCounts || {});

  React.useEffect(() => {
    const handleCountsUpdate = (e) => {
      if (e.detail) setCounts(e.detail);
    };
    window.addEventListener('gestante:counts', handleCountsUpdate);
    return () => window.removeEventListener('gestante:counts', handleCountsUpdate);
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    window.__gestanteActiveTab = tabId;
    window.dispatchEvent(new CustomEvent('gestante:tabchange', { detail: { tab: tabId } }));
  };

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      zIndex: 1000,
      background: 'rgba(255,255,255,0.97)',
      borderTop: '2px solid #fce7f3',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      boxShadow: '0 -4px 30px rgba(236,72,153,0.15)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '6px 4px',
        maxWidth: '520px',
        margin: '0 auto',
      }}>
        {GESTANTE_TABS.map(({ id, label, Icon, color }) => {
          const isActive = activeTab === id;
          const count = counts[id] || 0;
          return (
                <motion.button
                  key={id}
                  whileTap={{ scale: 0.82 }}
                  onClick={() => handleTabChange(id)}
                  style={{
                    flex: 1,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: '3px', padding: '8px 2px',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  {count > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '2px',
                      right: 'calc(50% - 16px)',
                      background: id === 'alarma' ? '#ef4444' : '#be185d',
                      color: '#ffffff',
                      fontSize: '9px',
                      fontWeight: '950',
                      borderRadius: '10px',
                      minWidth: '15px',
                      height: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 3px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                      border: '1.5px solid #ffffff',
                      zIndex: 2
                    }}>
                      {count}
                    </span>
                  )}
              {isActive && (
                <motion.div
                  layoutId="gestante-nav-pill"
                  style={{
                    position: 'absolute', top: 0,
                    left: '50%', transform: 'translateX(-50%)',
                    width: '32px', height: '3px',
                    borderRadius: '0 0 4px 4px',
                    background: color,
                    boxShadow: `0 2px 8px ${color}60`,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <motion.div
                animate={{ color: isActive ? color : '#94a3b8', scale: isActive ? 1.15 : 1 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              </motion.div>
              <motion.span
                animate={{ color: isActive ? color : '#94a3b8', fontWeight: isActive ? '800' : '500' }}
                style={{ fontSize: '9px', letterSpacing: '0.2px' }}
              >
                {label}
              </motion.span>
            </motion.button>
          );
        })}

        {/* Salir */}
        <motion.button
          whileTap={{ scale: 0.82 }}
          onClick={onLogout}
          style={{
            flex: 1,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '3px', padding: '8px 2px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#ef4444',
          }}
        >
          <LogOut size={22} strokeWidth={1.8} />
          <span style={{ fontSize: '9px', fontWeight: '500', letterSpacing: '0.2px' }}>Salir</span>
        </motion.button>
      </div>
    </nav>
  );
};

// ─── Navegación móvil general (Admin / Enfermera) ───────────────────────────
const BottomNav = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Menú exclusivo GESTANTE
  if (user?.rol === 'GESTANTE') {
    return <GestanteBottomNav onLogout={handleLogout} />;
  }

  // Menú general
  const allItems = [
    { name: 'Inicio',   path: '/dashboard',    icon: LayoutDashboard, admin: false },
    { name: 'Maternas', path: '/maternas',      icon: Baby,            admin: false },
    { name: 'Paquetes', path: '/paquetes',      icon: Layers,          admin: false },
    { name: 'Usuarios', path: '/usuarios',      icon: Users,           admin: true  },
    { name: 'Config',   path: '/configuracion', icon: Settings,        admin: true  },
  ];

  const filtered = allItems.filter(item => !item.admin || user?.rol === 'ADMIN');
  const visibleItems = filtered.slice(0, MAX_VISIBLE);
  const overflowItems = filtered.slice(MAX_VISIBLE);
  const hasOverflow = overflowItems.length > 0;

  const handleLogoutGeneral = () => {
    setMoreOpen(false);
    logout();
    navigate('/');
  };

  const NavItem = ({ item }) => (
    <NavLink to={item.path} style={{ textDecoration: 'none', flex: 1 }}>
      {({ isActive }) => (
        <motion.div
          whileTap={{ scale: 0.82 }}
          style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '3px', padding: '8px 2px', position: 'relative',
          }}
        >
          {isActive && (
            <motion.div
              layoutId="bottom-nav-pill"
              style={{
                position: 'absolute', top: 0, left: '50%',
                transform: 'translateX(-50%)',
                width: '32px', height: '3px',
                borderRadius: '0 0 4px 4px',
                background: 'var(--primary-color)',
                boxShadow: '0 2px 8px var(--primary-glow)',
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <motion.div
            animate={{ color: isActive ? 'var(--primary-color)' : 'var(--text-muted)', scale: isActive ? 1.1 : 1 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <item.icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
          </motion.div>
          <motion.span
            animate={{ color: isActive ? 'var(--primary-color)' : 'var(--text-muted)', fontWeight: isActive ? '800' : '500' }}
            style={{ fontSize: '9px', letterSpacing: '0.2px' }}
          >
            {item.name}
          </motion.span>
        </motion.div>
      )}
    </NavLink>
  );

  return (
    <>
      {/* Overflow sheet */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 998, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              style={{
                position: 'fixed', bottom: '64px', left: 0, right: 0, zIndex: 999,
                background: 'var(--card-bg)', borderRadius: '24px 24px 0 0',
                borderTop: '1px solid var(--border-color)', padding: '16px 20px 20px',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
              }}
            >
              <div style={{ width: '36px', height: '4px', borderRadius: '4px', background: 'var(--border-color)', margin: '0 auto 16px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {overflowItems.map(item => (
                  <NavLink key={item.path} to={item.path} onClick={() => setMoreOpen(false)} style={{ textDecoration: 'none' }}>
                    {({ isActive }) => (
                      <motion.div
                        whileTap={{ scale: 0.97 }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '14px',
                          padding: '13px 16px', borderRadius: '16px',
                          background: isActive ? 'var(--primary-color)12' : 'transparent',
                          border: isActive ? '1px solid var(--primary-color)25' : '1px solid transparent',
                        }}
                      >
                        <div style={{
                          width: '38px', height: '38px', borderRadius: '12px',
                          background: isActive ? 'var(--primary-color)20' : 'var(--bg-color)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: isActive ? 'var(--primary-color)' : 'var(--text-muted)',
                          border: '1px solid var(--border-color)', flexShrink: 0,
                        }}>
                          <item.icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
                        </div>
                        <span style={{ fontSize: '0.95rem', fontWeight: isActive ? '900' : '700', color: isActive ? 'var(--primary-color)' : 'var(--text-main)' }}>
                          {item.name}
                        </span>
                      </motion.div>
                    )}
                  </NavLink>
                ))}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleLogoutGeneral}
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 16px', borderRadius: '16px', background: 'transparent', border: '1px solid transparent', cursor: 'pointer', marginTop: '4px' }}
                >
                  <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'var(--error-color)15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--error-color)', border: '1px solid var(--error-color)25', flexShrink: 0 }}>
                    <LogOut size={18} />
                  </div>
                  <span style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--error-color)' }}>Cerrar sesión</span>
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Nav bar */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
        background: 'var(--card-bg)', borderTop: '1px solid var(--border-color)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -4px 30px rgba(0,0,0,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '6px 4px', maxWidth: '480px', margin: '0 auto' }}>
          {visibleItems.map(item => <NavItem key={item.path} item={item} />)}
          {hasOverflow && (
            <motion.button
              whileTap={{ scale: 0.82 }}
              onClick={() => setMoreOpen(v => !v)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', padding: '8px 2px', background: 'transparent', border: 'none', cursor: 'pointer', color: moreOpen ? 'var(--primary-color)' : 'var(--text-muted)' }}
            >
              <motion.div animate={{ rotate: moreOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                {moreOpen ? <X size={22} strokeWidth={2} /> : <MoreHorizontal size={22} strokeWidth={1.8} />}
              </motion.div>
              <span style={{ fontSize: '9px', fontWeight: moreOpen ? '800' : '500', letterSpacing: '0.2px' }}>{moreOpen ? 'Cerrar' : 'Más'}</span>
            </motion.button>
          )}
          {!hasOverflow && (
            <motion.button
              whileTap={{ scale: 0.82 }}
              onClick={handleLogoutGeneral}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', padding: '8px 2px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}
            >
              <LogOut size={22} strokeWidth={1.8} />
              <span style={{ fontSize: '9px', fontWeight: '500', letterSpacing: '0.2px' }}>Salir</span>
            </motion.button>
          )}
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
