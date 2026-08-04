import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Baby, Lock, Mail, Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { user, login } = useAuth();
  const { config } = useTheme();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      if (user.rol === 'GESTANTE') {
        const dest = user.gestanteId ? `/maternas/${user.gestanteId}` : '/maternas';
        navigate(dest, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'var(--bg-color)',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Blobs */}
      <div className="blob" style={{ 
        width: '600px', height: '600px', background: 'var(--primary-color)', 
        top: '-150px', left: '-150px', filter: 'blur(150px)', opacity: 0.15 
      }} />
      <div className="blob" style={{ 
        width: '500px', height: '500px', background: 'var(--secondary-color)', 
        bottom: '-100px', right: '-100px', filter: 'blur(120px)', opacity: 0.1 
      }} />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="organic-card"
        style={{
          width: '100%',
          maxWidth: '500px',
          padding: 'clamp(2.5rem, 8vw, 4rem)',
          boxShadow: 'var(--shadow-xl)',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1
        }}
      >
        <motion.div 
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          style={{ 
            background: 'var(--primary-color)', 
            width: '80px', 
            height: '80px', 
            borderRadius: '24px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'white',
            margin: '0 auto 2rem',
            boxShadow: 'var(--primary-glow) 0 10px 25px',
            transform: 'rotate(-5deg)'
          }}
        >
          <Baby size={45} />
        </motion.div>

        <h2 style={{ fontSize: '2.5rem', fontWeight: '950', marginBottom: '8px', color: 'var(--text-main)', letterSpacing: '-1.5px' }}>
          Bienvenido
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '3rem', fontWeight: '500', fontSize: '1.05rem' }}>
          Acceso al Portal de {config.clinicName}
        </p>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ 
              background: 'var(--error-color)15', 
              color: 'var(--error-color)', 
              padding: '16px', 
              borderRadius: '18px', 
              marginBottom: '2rem',
              fontSize: '0.9rem',
              fontWeight: '700',
              border: '1px solid var(--error-color)30',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              justifyContent: 'center'
            }}
          >
            <AlertTriangle size={18} />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ position: 'relative', textAlign: 'left' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '800', marginBottom: '10px', display: 'block', paddingLeft: '4px', color: 'var(--text-main)', letterSpacing: '0.5px' }}>
              CORREO ELECTRÓNICO
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="email" 
                placeholder="usuario@maternas.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ 
                  paddingLeft: '48px', 
                  background: 'var(--bg-color)', 
                  border: '2px solid var(--border-color)',
                  height: '56px',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}
                className="login-input"
              />
            </div>
          </div>

          <div style={{ position: 'relative', textAlign: 'left' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '800', marginBottom: '10px', display: 'block', paddingLeft: '4px', color: 'var(--text-main)', letterSpacing: '0.5px' }}>
              CONTRASEÑA
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ 
                  paddingLeft: '48px', 
                  paddingRight: '50px',
                  background: 'var(--bg-color)', 
                  border: '2px solid var(--border-color)',
                  height: '56px',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}
                className="login-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'var(--bg-color)',
                  border: 'none',
                  padding: '8px',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '10px'
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit" 
            disabled={loading}
            style={{ 
              background: 'var(--primary-color)', 
              color: 'white', 
              padding: '18px', 
              fontSize: '1.1rem', 
              fontWeight: '900',
              marginTop: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              borderRadius: '20px',
              boxShadow: 'var(--primary-glow) 0 10px 25px',
              letterSpacing: '0.5px',
              opacity: loading ? 0.8 : 1
            }}
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : 'INICIAR SESIÓN'}
          </motion.button>
        </form>

        <div style={{ marginTop: '2rem', padding: '12px 16px', background: '#fce7f3', borderRadius: '16px', border: '1px solid #fbcfe8', textAlign: 'left' }}>
          <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: '950', color: '#be185d' }}>
            🌸 ¿Eres paciente gestante del programa?
          </p>
          <p style={{ margin: '3px 0 0', fontSize: '0.74rem', color: '#831843', fontWeight: '700' }}>
            Ingresa con tu correo <strong>tuDocumento@maternas.com</strong> y tu contraseña inicial (tu número de documento).
          </p>
        </div>

        <p style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>
          © {new Date().getFullYear()} {config.clinicName}
        </p>
      </motion.div>
      <style>{`
        .login-input:focus {
          border-color: var(--primary-color) !important;
          box-shadow: var(--primary-glow) 0 0 0 4px !important;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Login;
