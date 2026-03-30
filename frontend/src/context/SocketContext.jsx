import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const newSocket = io(window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    newSocket.on('notification', (data) => {
      setNotifications(prev => [data, ...prev].slice(0, 50));
      // Show toast based on type
      if (data.type === 'quote_accepted') toast.success(data.message);
      else if (data.type === 'quote_rejected') toast.error(data.message);
      else toast(data.message);
    });

    newSocket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    setSocket(newSocket);
    return () => newSocket.close();
  }, [isAuthenticated, token]);

  const clearNotifications = () => setNotifications([]);

  const markAsRead = (index) => {
    setNotifications(prev =>
      prev.map((n, i) => i === index ? { ...n, unread: false } : n)
    );
  };

  return (
    <SocketContext.Provider value={{ socket, notifications, clearNotifications, markAsRead }}>
      {children}
    </SocketContext.Provider>
  );
};
