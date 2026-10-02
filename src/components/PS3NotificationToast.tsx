import React, { useEffect, useRef } from 'react';
import { SettingNotification } from '../types';
import { Check, Palette, Volume2, Sliders, Wrench, Sparkles } from 'lucide-react';

interface PS3NotificationToastProps {
  notification: SettingNotification | null;
  onDismiss: () => void;
}

export const PS3NotificationToast: React.FC<PS3NotificationToastProps> = ({
  notification,
  onDismiss,
}) => {
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      onDismissRef.current();
    }, 2500);
    return () => clearTimeout(timer);
  }, [notification?.id]);

  if (!notification) return null;

  const renderIcon = () => {
    switch (notification.iconType) {
      case 'palette':
        return <Palette className="w-4 h-4 text-sky-400" />;
      case 'crossfade':
      case 'speaker':
        return <Volume2 className="w-4 h-4 text-emerald-400" />;
      case 'wrench':
        return <Wrench className="w-4 h-4 text-amber-400" />;
      default:
        return <Check className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="fixed top-14 right-6 z-50 pointer-events-none animate-in slide-in-from-right fade-in duration-300">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-black/85 backdrop-blur-md border border-white/20 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.8)] text-white select-none">
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white/10 border border-white/20 shrink-0">
          {renderIcon()}
        </div>
        <div className="flex flex-col min-w-0 pr-2">
          <span className="text-xs font-bold text-white tracking-wide truncate drop-shadow-[0_0_8px_rgba(255,255,255,0.7)] font-sans">
            {notification.title}
          </span>
          <span className="text-[11px] text-white/70 truncate font-mono">
            {notification.detail}
          </span>
        </div>
      </div>
    </div>
  );
};
