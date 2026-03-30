import React, { useState } from 'react';
import { Truck, Settings, User, LogOut, UserCircle, Menu, X } from 'lucide-react';
import NotificationCenter from '../UI/NotificationCenter';
import { useAuth } from '../../context/AuthContext';

const Header = () => {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getRoleDisplay = (role) => {
    const roleMap = {
      'agente_comercial': 'Agente Comercial',
      'supervisor': 'Supervisor',
      'alta_gerencia': 'Alta Gerencia'
    };
    return roleMap[role] || role;
  };

  const getRoleBadgeColor = (role) => {
    const colorMap = {
      'agente_comercial': 'bg-blue-100 text-blue-800',
      'supervisor': 'bg-yellow-100 text-yellow-800',
      'alta_gerencia': 'bg-red-100 text-red-800'
    };
    return colorMap[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <header className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo y Titulo */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Truck className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">AXEL</h1>
                <p className="text-xs text-gray-600 hidden sm:block">Sistema de Cotizaciones Inteligente</p>
              </div>
            </div>
          </div>

          {/* Centro - Espacio para navegacion controlada por App.js */}
          <div className="flex-1"></div>

          {/* Derecha - Acciones (desktop) */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Badge de LUC1 Status */}
            <div className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              LUC1-COMEX Online
            </div>

            {/* Role Badge */}
            {user && (
              <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                {getRoleDisplay(user.role)}
              </div>
            )}

            {/* Notificaciones */}
            <NotificationCenter />

            {/* Configuracion */}
            <button className="p-2 text-gray-400 hover:text-gray-500">
              <Settings className="w-5 h-5" />
            </button>

            {/* Usuario */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="ml-2 text-gray-700 font-medium">
                  {user ? user.fullName || `${user.firstName} ${user.lastName}` : 'Usuario'}
                </span>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {user ? user.fullName || `${user.firstName} ${user.lastName}` : 'Usuario'}
                    </p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    <p className="text-xs text-gray-500">{getRoleDisplay(user?.role)}</p>
                  </div>

                  <button
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <UserCircle className="w-4 h-4 mr-3" />
                    Perfil
                  </button>

                  <button
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Cerrar Sesion
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile: notification + hamburger */}
          <div className="flex items-center space-x-2 md:hidden">
            <NotificationCenter />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white shadow-lg">
          <div className="px-4 py-3 space-y-3">
            {/* Status badges */}
            <div className="flex items-center justify-between">
              <div className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                LUC1-COMEX Online
              </div>
              {user && (
                <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                  {getRoleDisplay(user.role)}
                </div>
              )}
            </div>

            {/* User info */}
            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {user ? user.fullName || `${user.firstName} ${user.lastName}` : 'Usuario'}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Mobile actions */}
            <div className="border-t border-gray-100 pt-3 space-y-1">
              <button
                className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                <UserCircle className="w-4 h-4 mr-3" />
                Perfil
              </button>
              <button
                className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Settings className="w-4 h-4 mr-3" />
                Configuracion
              </button>
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center w-full px-3 py-2 text-sm text-red-700 hover:bg-red-50 rounded-md"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Cerrar Sesion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close menus when clicking outside */}
      {(showUserMenu || mobileMenuOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowUserMenu(false);
            setMobileMenuOpen(false);
          }}
        ></div>
      )}
    </header>
  );
};

export default Header;
