import React from 'react';
import { useAuth } from '../../context/AuthContext';
import Login from './Login';
import LoadingSpinner from '../UI/LoadingSpinner';

const ProtectedRoute = ({ children, requiredRole = null, requiredPermission = null }) => {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (requiredRole && !hasPermission(requiredRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center bg-red-100 rounded-lg">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.729-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Acceso Denegado</h2>
            <p className="mt-2 text-gray-600">
              No tienes permisos suficientes para acceder a esta página.
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Rol requerido: <span className="font-medium">{requiredRole}</span>
            </p>
            <p className="text-sm text-gray-500">
              Tu rol: <span className="font-medium">{user.role}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (requiredPermission && !requiredPermission(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center bg-red-100 rounded-lg">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.729-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Acceso Denegado</h2>
            <p className="mt-2 text-gray-600">
              No tienes permisos para realizar esta acción.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;