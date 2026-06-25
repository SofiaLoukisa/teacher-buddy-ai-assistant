import { useCallback, useState } from 'react';

export type Toast = {
  id: string;
  message: string;
  tone?: 'info' | 'success' | 'error';
};

export const useToasts = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((message: string, tone: Toast['tone'] = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => remove(id), 3200);
  }, [remove]);

  return { toasts, push, remove };
};

export const ToastStack = ({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) => {
  if (!toasts.length) return null;
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone || 'info'}`}>
          <span>{t.message}</span>
          <button className="toast-close" aria-label="Dismiss" onClick={() => onClose(t.id)}>×</button>
        </div>
      ))}
    </div>
  );
};
