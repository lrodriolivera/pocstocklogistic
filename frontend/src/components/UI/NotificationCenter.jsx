import React, { useState } from 'react';
import {
  Bell,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  TrendingUp,
  Truck,
  Clock,
  DollarSign,
  XCircle
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, clearNotifications, markAsRead } = useSocket();

  const unreadCount = notifications.filter(n => n.unread !== false).length;

  const getNotificationConfig = (type) => {
    switch (type) {
      case 'quote_accepted':
        return {
          icon: CheckCircle,
          bg: 'bg-green-50',
          border: 'border-green-200',
          iconColor: 'text-green-600'
        };
      case 'quote_rejected':
        return {
          icon: XCircle,
          bg: 'bg-red-50',
          border: 'border-red-200',
          iconColor: 'text-red-600'
        };
      case 'quote_generated':
        return {
          icon: TrendingUp,
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          iconColor: 'text-blue-600'
        };
      default:
        return {
          icon: Info,
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          iconColor: 'text-gray-600'
        };
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}d`;
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
                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Limpiar todas
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
                  {notifications.map((notification, index) => {
                    const config = getNotificationConfig(notification.type);
                    const Icon = config.icon;
                    const isUnread = notification.unread !== false;

                    return (
                      <div
                        key={`${notification.timestamp}-${index}`}
                        className={`relative p-3 rounded-lg mb-2 cursor-pointer transition-all duration-200 hover:shadow-sm ${
                          isUnread
                            ? `${config.bg} ${config.border} border-l-4`
                            : 'bg-gray-50 border border-gray-100'
                        }`}
                        onClick={() => markAsRead(index)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-full ${config.bg}`}>
                            <Icon className={`w-4 h-4 ${config.iconColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`text-sm font-medium ${
                                isUnread ? 'text-gray-900' : 'text-gray-700'
                              }`}>
                                {notification.title}
                              </p>
                            </div>
                            <p className={`text-xs mt-1 ${
                              isUnread ? 'text-gray-700' : 'text-gray-500'
                            }`}>
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-400">
                                {formatTime(notification.timestamp)}
                              </span>
                              {isUnread && (
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
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200">
                <p className="w-full text-center text-xs text-gray-400 py-1">
                  Notificaciones en tiempo real via WebSocket
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;
