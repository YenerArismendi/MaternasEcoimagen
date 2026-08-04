import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, X, Info, AlertTriangle } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import NotificationCenterDrawer from './NotificationCenterDrawer';

const NotificationSystem = () => {
    const { toasts, confirmState } = useNotification();

    return (
        <>
            <NotificationCenterDrawer />

            {/* Global Toasts */}
            <div style={{
                position: 'fixed', bottom: '2rem', right: '2rem',
                display: 'flex', flexDirection: 'column', gap: '10px',
                zIndex: 9999, pointerEvents: 'none'
            }}>
                <AnimatePresence>
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, x: 20, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                            style={{
                                pointerEvents: 'auto',
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)',
                                padding: '12px 20px',
                                borderRadius: '18px',
                                boxShadow: 'var(--shadow-xl)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                minWidth: '250px'
                            }}
                        >
                            <div style={{ color: toast.type === 'error' ? 'var(--error-color)' : 'var(--success-color)' }}>
                                {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                            </div>
                            <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-main)' }}>{toast.message}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Global Confirm Modal */}
            <AnimatePresence>
                {confirmState && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 10000, padding: '20px'
                    }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 10 }}
                            className="organic-card"
                            style={{
                                width: '100%', maxWidth: '400px', padding: '2rem',
                                textAlign: 'center', boxShadow: 'var(--primary-glow) 0 20px 40px -20px'
                            }}
                        >
                            <div style={{
                                width: '60px', height: '60px', borderRadius: '20px',
                                background: confirmState.type === 'danger' ? 'var(--error-color)15' : 'var(--primary-color)15',
                                color: confirmState.type === 'danger' ? 'var(--error-color)' : 'var(--primary-color)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 1.5rem'
                            }}>
                                <AlertTriangle size={30} />
                            </div>
                            <h3 style={{ fontSize: '1.4rem', fontWeight: '950', marginBottom: '0.5rem', color: 'var(--text-main)' }}>{confirmState.title}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.5' }}>{confirmState.message}</p>
                            
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={confirmState.onCancel}
                                    style={{
                                        flex: 1, padding: '12px', borderRadius: '14px',
                                        background: 'var(--bg-color)', border: '1px solid var(--border-color)',
                                        color: 'var(--text-muted)', fontWeight: '800', cursor: 'pointer'
                                    }}
                                >
                                    {confirmState.cancelText}
                                </button>
                                <button
                                    onClick={confirmState.onConfirm}
                                    style={{
                                        flex: 1, padding: '12px', borderRadius: '14px',
                                        background: confirmState.type === 'danger' ? 'var(--error-color)' : 'var(--primary-color)',
                                        border: 'none', color: 'white', fontWeight: '900', cursor: 'pointer',
                                        boxShadow: confirmState.type === 'danger' ? 'var(--error-color)40 0 10px' : 'var(--primary-color)40 0 10px'
                                    }}
                                >
                                    {confirmState.confirmText}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default NotificationSystem;
