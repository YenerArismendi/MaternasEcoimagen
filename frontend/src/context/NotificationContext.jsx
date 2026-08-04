import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  
  // Lista global de notificaciones del sistema
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('materna_sys_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [pushStatus, setPushStatus] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  // Guardar en localStorage cuando cambie la lista
  useEffect(() => {
    try {
      localStorage.setItem('materna_sys_notifications', JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  // Reproducir sonido sutil de notificación
  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }, []);

  // Solicitar permiso de Push al dispositivo/teléfono
  const requestPushPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    try {
      const perm = await Notification.requestPermission();
      setPushStatus(perm);
      if (perm === 'granted') {
        new Notification('🌸 Ecoimagen Salud - Notificaciones Activadas', {
          body: '¡Excelente! Recibirás alertas inmediatas de citas, anuncios y exámenes en este dispositivo.',
          icon: '/maternal_3d.png'
        });
      }
      return perm;
    } catch {
      return 'denied';
    }
  }, []);

  // Agregar nueva notificación global
  const addNotification = useCallback(({ title, message, category = 'INFO', link = null, id = null }) => {
    const notifId = id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    
    setNotifications(prev => {
      // Evitar duplicados recientes
      if (prev.some(n => n.id === notifId || (n.title === title && n.message === message))) {
        return prev;
      }

      const newNotif = {
        id: notifId,
        title,
        message,
        category, // 'CITA', 'ANUNCIO', 'EXAMEN', 'ALERTA', 'INFO'
        link,
        date: new Date().toISOString(),
        read: false
      };

      // Disparar Notificación Push Nativa del Celular si está concedido
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`🌸 ${title}`, {
            body: message,
            icon: '/maternal_3d.png',
            tag: notifId
          });
        } catch {}
      }

      playNotificationSound();
      return [newNotif, ...prev].slice(0, 50); // Mantener máximo 50
    });
  }, [playNotificationSound]);

  // Toast flotante clásico
  const notify = useCallback((message, type = 'success', duration = 3000) => {
    const toastId = Date.now();
    setToasts(prev => [...prev, { id: toastId, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toastId));
    }, duration);
  }, []);

  // Modal de confirmación
  const confirm = useCallback(({ title, message, onConfirm, confirmText, cancelText, type = 'danger' }) => {
    return new Promise((resolve) => {
      setConfirmState({
        title,
        message,
        confirmText: confirmText || 'Confirmar',
        cancelText: cancelText || 'Cancelar',
        type,
        onConfirm: () => {
          setConfirmState(null);
          onConfirm?.();
          resolve(true);
        },
        onCancel: () => {
          setConfirmState(null);
          resolve(false);
        }
      });
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notify,
      confirm,
      toasts,
      confirmState,
      notifications,
      unreadCount,
      isDrawerOpen,
      setIsDrawerOpen,
      addNotification,
      markAllAsRead,
      markAsRead,
      clearNotifications,
      pushStatus,
      requestPushPermission
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
};
