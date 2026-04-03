import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';

type ToastProps = {
  type?: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
  onClose?: () => void;
};

export default function Toast({ type = 'info', message, duration = 4000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);

    if (!message) return;
    const auto = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose && onClose(), 220);
    }, duration);

    return () => clearTimeout(auto);
  }, [message, duration, onClose]);

  const icon = type === 'success' ? 'mdi:check' : type === 'error' ? 'mdi:alert-circle-outline' : 'mdi:information-outline';
  const title = type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info';

  const borderClass = type === 'success' ? 'border-l-4 border-green-400' : type === 'error' ? 'border-l-4 border-red-400' : 'border-l-4 border-gray-400';
  const iconWrapperClass = type === 'success' ? 'bg-green-50 ring-green-100 text-green-600' : type === 'error' ? 'bg-red-50 ring-red-100 text-red-600' : 'bg-gray-50 ring-gray-100 text-gray-600';
  const titleClass = type === 'success' ? 'text-green-800' : type === 'error' ? 'text-red-800' : 'text-gray-800';

  return (
    <div className="fixed top-6 right-6 z-50 w-80 max-w-sm pointer-events-auto">
      <div
        role={type === 'error' ? 'alert' : 'status'}
        className={`w-full flex items-start gap-3 bg-white ${borderClass} rounded-lg p-4 shadow-xl ring-1 ring-black/5 transform transition-all duration-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
      >
        <div className={`shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full ${iconWrapperClass} ring-1`}> 
          <Icon icon={icon} width="20" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3"> 
            <div className={`text-sm font-semibold ${titleClass} truncate`}>{title}</div>
            <button onClick={() => { setVisible(false); setTimeout(() => onClose && onClose(), 180); }} className="text-gray-400 hover:text-gray-600" aria-label="Close notification">
              <Icon icon="mdi:close" width="16" />
            </button>
          </div>
          <div className="mt-1 text-sm text-gray-700 wrap-break-word">{message}</div>
        </div>
      </div>
    </div>
  );
}
