import React from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChildProvider } from './context/ChildContext';
import { NotifProvider } from './context/NotifContext';
import Login from './pages/Login';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import ParentDashboard from './pages/parent/ParentDashboard';
import ChildDashboard from './pages/child/ChildDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import './styles/dashboard.css';

function RoleRedirect() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const rolePath = {
    TEACHER: '/teacher',
    PARENT: '/parent',
    CHILD: '/child'
  }[user.role] || '/login';

  return <Navigate to={rolePath} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/teacher"
        element={(
          <ProtectedRoute requiredRole="TEACHER">
            <TeacherDashboard />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/parent"
        element={(
          <ProtectedRoute requiredRole="PARENT">
            <ParentDashboard />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/child"
        element={(
          <ProtectedRoute requiredRole="CHILD">
            <ChildDashboard />
          </ProtectedRoute>
        )}
      />
      <Route path="/" element={<RoleRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotifProvider>
          <ChildProvider>
            <AppRoutes />
          </ChildProvider>
        </NotifProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
