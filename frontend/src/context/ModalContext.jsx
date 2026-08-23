import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, Info, CheckCircle2, XCircle, X } from 'lucide-react';

const ModalContext = createContext(null);

export const ModalProvider = ({ children }) => {
  // Confirm Modal State
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  // Toast Notification State
  const [toasts, setToasts] = useState([]);

  const showConfirm = useCallback(({
    title = 'Are you sure?',
    message = 'This action cannot be undone.',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger', // 'danger' | 'primary' | 'warning'
    onConfirm = async () => {},
  }) => {
    setConfirmConfig({
      title,
      message,
      confirmText,
      cancelText,
      variant,
      onConfirm,
    });
    setIsConfirmOpen(true);
  }, []);

  const closeConfirm = useCallback(() => {
    setIsConfirmOpen(false);
    setConfirmConfig(null);
    setIsConfirmLoading(false);
  }, []);

  const handleConfirmAction = async () => {
    if (!confirmConfig?.onConfirm) return;
    try {
      setIsConfirmLoading(true);
      await confirmConfig.onConfirm();
      closeConfirm();
    } catch (err) {
      showToast({ message: err.message || 'Operation failed', type: 'error' });
      setIsConfirmLoading(false);
    }
  };

  const showToast = useCallback(({ message, type = 'info', duration = 3500 }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ModalContext.Provider value={{ showConfirm, showToast }}>
      {children}

      {/* Reusable Atlassian-style Confirm Modal */}
      {isConfirmOpen && confirmConfig && (
        <div className="modal-overlay" onClick={closeConfirm} style={{ zIndex: 2000 }}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '460px', maxWidth: '90vw' }}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #DFE1E6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {confirmConfig.variant === 'danger' ? (
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#FFEBE6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FF5630',
                    }}
                  >
                    <AlertTriangle size={18} />
                  </div>
                ) : (
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#DEEBFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#0052CC',
                    }}
                  >
                    <Info size={18} />
                  </div>
                )}
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#172B4D', margin: 0 }}>
                  {confirmConfig.title}
                </h3>
              </div>

              <button onClick={closeConfirm} className="jira-btn jira-btn-ghost" style={{ padding: '4px' }}>
                <X size={16} color="#5E6C84" />
              </button>
            </div>

            {/* Message Body */}
            <div style={{ padding: '20px', fontSize: '14px', color: '#172B4D', lineHeight: '1.5' }}>
              {confirmConfig.message}
            </div>

            {/* Actions Footer */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid #DFE1E6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '8px',
                backgroundColor: '#FAFBFC',
              }}
            >
              <button
                type="button"
                onClick={closeConfirm}
                disabled={isConfirmLoading}
                className="jira-btn jira-btn-ghost"
              >
                {confirmConfig.cancelText}
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isConfirmLoading}
                className={`jira-btn ${
                  confirmConfig.variant === 'danger' ? 'jira-btn-danger' : 'jira-btn-primary'
                }`}
              >
                {isConfirmLoading ? 'Processing...' : confirmConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification Container */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 3000,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isSuccess = toast.type === 'success';
          return (
            <div
              key={toast.id}
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                backgroundColor: '#172B4D',
                color: '#FFFFFF',
                borderRadius: '4px',
                boxShadow: 'var(--shadow-lg)',
                fontSize: '13px',
                minWidth: '260px',
                maxWidth: '380px',
                animation: 'fadeIn 0.2s ease-out',
                borderLeft: isError ? '4px solid #FF5630' : isSuccess ? '4px solid #36B37E' : '4px solid #0052CC',
              }}
            >
              {isError ? (
                <XCircle size={18} color="#FF5630" />
              ) : isSuccess ? (
                <CheckCircle2 size={18} color="#36B37E" />
              ) : (
                <Info size={18} color="#4C9AFF" />
              )}
              <span style={{ flex: 1 }}>{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#A5B2C6' }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ModalContext.Provider>
  );
};

export const useModal = () => useContext(ModalContext);
