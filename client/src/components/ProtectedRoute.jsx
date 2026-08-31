import { Navigate } from 'react-router-dom';
import { getToken, getUser } from '../auth';

function ProtectedRoute({ allowedRoles, children }) {
  const token = getToken();
  const user = getUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
