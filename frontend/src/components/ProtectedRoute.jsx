import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ adminOnly = false, superAdminOnly = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner />;

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Restricción para rol GESTANTE: solo puede ver su propio portal clínico
  if (user.rol === 'GESTANTE') {
    if (user.gestanteId) {
      const personalPath = `/maternas/${user.gestanteId}`;
      if (!location.pathname.startsWith(personalPath)) {
        return <Navigate to={personalPath} replace />;
      }
    } else {
      if (!location.pathname.startsWith('/maternas')) {
        return <Navigate to="/maternas" replace />;
      }
    }
  }

  const isSuperAdmin = user.rol === 'SUPERADMIN' || user.rol === 'SUPER_ROOT';
  const isAdmin = user.rol === 'ADMIN' || isSuperAdmin;

  if (superAdminOnly && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
