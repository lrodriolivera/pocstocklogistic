import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  TrendingUp,
  Truck,
  Clock,
  DollarSign
} from 'lucide-react';

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'success',
      title: 'Cotización Aceptada',
      message: 'Timber Corp ha aceptado la cotización #1247 por €2,450',
      time: '2 min ago',
      icon: CheckCircle,
      unread: true
    },
    {
      id: 2,
      type: 'info',
      title: 'Nueva Ruta Optimizada',
      message: 'LUC1-COMEX encontró una ruta 15% más eficiente para Madrid-Berlín',
      time: '15 min ago',
      icon: TrendingUp,
      unread: true
    },
    {
      id: 3,
      type: 'warning',
      title: 'Restricción de Tráfico',
      message: 'Detectadas restricciones en A7 Francia. Ruta alternativa sugerida.',
      time: '1 hora ago',
      icon: AlertTriangle,
      unread: false
    },
    {
      id: 4,
      type: 'success',
      title: 'Entrega Completada',
      message: 'Envío #1245 entregado exitosamente en Milano',
      time: '2 horas ago',
      icon: Truck,
      unread: false
    },
    {
      id: 5,
      type: 'info',
      title: 'Actualización de Precios',
      message: 'Precios de combustible actualizados para rutas europeas',
      time: '3 horas ago',
      icon: DollarSign,
      unread: false
    }
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const getTypeStyles = (type) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          iconColor: 'text-green-600'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          iconColor: 'text-yellow-600'
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          iconColor: 'text-blue-600'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          iconColor: 'text-gray-600'
        };
    }
  };

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, unread: false }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, unread: false }))
    );
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 transform transition-all duration-200 origin-top-right">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Notificaciones</h3>
                <p className="text-sm text-gray-500">{unreadCount} sin leer</p>
              </div>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Marcar todas como leídas
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No hay notificaciones</p>
                </div>
              ) : (
                <div className="p-2">
                  {notifications.map((notification) => {
                    const styles = getTypeStyles(notification.type);
                    const Icon = notification.icon;

                    return (
                      <div
                        key={notification.id}
                        className={`relative p-3 rounded-lg mb-2 cursor-pointer transition-all duration-200 hover:shadow-sm ${
                          notification.unread
                            ? `${styles.bg} ${styles.border} border-l-4`
                            : 'bg-gray-50 border border-gray-100'
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-full ${styles.bg}`}>
                            <Icon className={`w-4 h-4 ${styles.iconColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`text-sm font-medium ${
                                notification.unread ? 'text-gray-900' : 'text-gray-700'
                              }`}>
                                {notification.title}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification.id);
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <p className={`text-xs mt-1 ${
                              notification.unread ? 'text-gray-700' : 'text-gray-500'
                            }`}>
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-400">
                                {notification.time}
                              </span>
                              {notification.unread && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200">
              <button className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium py-2">
                Ver todas las notificaciones
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;