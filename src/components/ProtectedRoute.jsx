import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children, requiredRole = null }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="screen-center">Loading KidTrack...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
