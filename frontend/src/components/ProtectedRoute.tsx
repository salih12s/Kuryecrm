import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_HOME, type Role } from '../types';

interface Props {
  allowedRoles: Role[];
  children: React.ReactNode;
}

/**
 * Frontend route guard. Note this is convenience only — the backend role
 * guards are the real enforcement. An unauthenticated user is sent to /login;
 * an authenticated user with the wrong role is sent to their own home panel.
 */
export default function ProtectedRoute({ allowedRoles, children }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted">
        Yükleniyor...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }

  return <>{children}</>;
}
