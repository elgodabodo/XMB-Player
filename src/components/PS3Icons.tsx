import React from 'react';

/**
 * Authentic PS3 Vector Icons & Sub-Item Bullets
 * Faithfully recreated from original PlayStation 3 XMB firmware
 */

interface IconProps {
  className?: string;
}

// 1. Home / Users
export const PS3HomeIcon: React.FC<IconProps> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M24 6L6 20V42H18V30H30V42H42V20L24 6Z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="24" cy="22" r="3.5" fill="currentColor" />
  </svg>
);

// 2. Settings (The iconic PS3 Toolbox / Briefcase with latches)
export const PS3SettingsIcon: React.FC<IconProps> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Handle */}
    <path
      d="M17 14V10C17 8.9 17.9 8 19 8H29C30.1 8 31 8.9 31 10V14"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    {/* Briefcase Body */}
    <rect
      x="7"
      y="14"
      width="34"
      height="26"
      rx="3"
      stroke="currentColor"
      strokeWidth="2.5"
    />
    {/* Center divider line */}
    <line x1="7" y1="26" x2="41" y2="26" stroke="currentColor" strokeWidth="2" />
    {/* Left Latch */}
    <rect x="13" y="23" width="5" height="6" rx="1" fill="currentColor" />
    {/* Right Latch */}
    <rect x="30" y="23" width="5" height="6" rx="1" fill="currentColor" />
  </svg>
);

// 3. Photo (Camera)
export const PS3PhotoIcon: React.FC<IconProps> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M8 15C8 13.9 8.9 13 10 13H15L17.5 9H30.5L33 13H38C39.1 13 40 13.9 40 15V37C40 38.1 39.1 39 38 39H10C8.9 39 8 38.1 8 37V15Z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <circle cx="24" cy="25" r="7" stroke="currentColor" strokeWidth="2.5" />
    <circle cx="34" cy="18" r="1.5" fill="currentColor" />
  </svg>
);

// 4. Music (Dual Notes)
export const PS3MusicIcon: React.FC<IconProps> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M17 34V12L35 8V30"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line x1="17" y1="18" x2="35" y2="14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <ellipse cx="13" cy="34" rx="4.5" ry="3.5" fill="currentColor" />
    <ellipse cx="31" cy="30" rx="4.5" ry="3.5" fill="currentColor" />
  </svg>
);

// 5. Video (Film Strip)
export const PS3VideoIcon: React.FC<IconProps> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="7" y="10" width="34" height="28" rx="2" stroke="currentColor" strokeWidth="2.5" />
    <line x1="7" y1="17" x2="41" y2="17" stroke="currentColor" strokeWidth="1.8" />
    <line x1="7" y1="31" x2="41" y2="31" stroke="currentColor" strokeWidth="1.8" />
    <rect x="11" y="12" width="3" height="3" fill="currentColor" />
    <rect x="19" y="12" width="3" height="3" fill="currentColor" />
    <rect x="27" y="12" width="3" height="3" fill="currentColor" />
    <rect x="35" y="12" width="3" height="3" fill="currentColor" />
    <rect x="11" y="33" width="3" height="3" fill="currentColor" />
    <rect x="19" y="33" width="3" height="3" fill="currentColor" />
    <rect x="27" y="33" width="3" height="3" fill="currentColor" />
    <rect x="35" y="33" width="3" height="3" fill="currentColor" />
  </svg>
);

// 6. Game (PlayStation DualShock Controller)
export const PS3GameIcon: React.FC<IconProps> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M13 14C9 14 6 22 6 30C6 36 9 38 12 36L17 28H31L36 36C39 38 42 36 42 30C42 22 39 14 35 14H13Z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    {/* D-Pad */}
    <path d="M14 20V26M11 23H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    {/* Buttons */}
    <circle cx="34" cy="20" r="1.2" fill="currentColor" />
    <circle cx="31" cy="23" r="1.2" fill="currentColor" />
    <circle cx="37" cy="23" r="1.2" fill="currentColor" />
    <circle cx="34" cy="26" r="1.2" fill="currentColor" />
    {/* Thumbsticks */}
    <circle cx="20" cy="26" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="28" cy="26" r="2.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

// 7. Network (Globe)
export const PS3NetworkIcon: React.FC<IconProps> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="2.5" />
    <ellipse cx="24" cy="24" rx="8" ry="17" stroke="currentColor" strokeWidth="2" />
    <line x1="7" y1="24" x2="41" y2="24" stroke="currentColor" strokeWidth="2" />
    <line x1="10" y1="16" x2="38" y2="16" stroke="currentColor" strokeWidth="1.5" />
    <line x1="10" y1="32" x2="38" y2="32" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

// 8. Friends / Community (Smileys)
export const PS3FriendsIcon: React.FC<IconProps> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="18" cy="24" r="10" stroke="currentColor" strokeWidth="2.2" />
    <circle cx="15" cy="22" r="1.2" fill="currentColor" />
    <circle cx="21" cy="22" r="1.2" fill="currentColor" />
    <path d="M15 27C16 28.5 18 29 19 28.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

    <circle cx="31" cy="21" r="8" stroke="currentColor" strokeWidth="2" />
    <circle cx="29" cy="19" r="1" fill="currentColor" />
    <circle cx="33" cy="19" r="1" fill="currentColor" />
    <path d="M29 23C30 24 32 24.2 33 23.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/**
 * Authentic PS3 Sub-Item Circle Bullet Glyph
 * A round emblem containing a sub-icon (wrench, note, speaker, clock, display, lock, etc.)
 */
export type PS3BulletType =
  | 'wrench'
  | 'music'
  | 'speaker'
  | 'clock'
  | 'display'
  | 'lock'
  | 'network'
  | 'disc'
  | 'folder'
  | 'equalizer'
  | 'crossfade'
  | 'palette'
  | 'lyrics'
  | 'plus';

interface BulletProps {
  type: PS3BulletType;
  className?: string;
  isFocused?: boolean;
}

export const PS3BulletIcon: React.FC<BulletProps> = ({
  type,
  className = 'w-6 h-6',
  isFocused = false,
}) => {
  return (
    <div
      className={`relative flex items-center justify-center rounded-full transition-all duration-200 ${
        isFocused
          ? 'bg-white text-black shadow-[0_0_12px_rgba(255,255,255,0.9)] scale-110'
          : 'bg-white/15 text-white/90 border border-white/20'
      } ${className}`}
    >
      {type === 'wrench' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-3.5 h-3.5">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      )}

      {type === 'music' && (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
        </svg>
      )}

      {type === 'speaker' && (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
        </svg>
      )}

      {type === 'clock' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-3.5 h-3.5">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
      )}

      {type === 'display' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-3.5 h-3.5">
          <rect x="2" y="4" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="18" x2="12" y2="21" />
        </svg>
      )}

      {type === 'lock' && (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
        </svg>
      )}

      {type === 'network' && (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
          <ellipse cx="12" cy="12" rx="3.5" ry="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      )}

      {type === 'disc' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      )}

      {type === 'folder' && (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
        </svg>
      )}

      {type === 'equalizer' && (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M10 20h4V4h-4v16zm-6 0h4v-8H4v8zM16 9v11h4V9h-4z" />
        </svg>
      )}

      {type === 'crossfade' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-3.5 h-3.5">
          <path d="M4 17l6-6M4 7l16 10M14 7l6 6" />
        </svg>
      )}

      {type === 'palette' && (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19A1 1 0 0 0 5.2 20.5H12c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
        </svg>
      )}

      {type === 'lyrics' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-3.5 h-3.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <line x1="8" y1="9" x2="16" y2="9" />
          <line x1="8" y1="13" x2="13" y2="13" />
        </svg>
      )}

      {type === 'plus' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      )}
    </div>
  );
};

/**
 * Iconic PS3 3D Isometric Cube Focus Icon
 * Shown on the active selected item as seen in image.png!
 */
export const PS3FocusCube: React.FC<{ subBadge?: PS3BulletType; className?: string }> = ({
  subBadge = 'wrench',
  className = 'w-10 h-10',
}) => {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      {/* 3D Wireframe / Shaded Cube */}
      <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]">
        {/* Top face */}
        <polygon points="22,6 38,14 22,22 6,14" fill="rgba(255,255,255,0.3)" stroke="white" strokeWidth="2" strokeLinejoin="round" />
        {/* Left face */}
        <polygon points="6,14 22,22 22,38 6,30" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="2" strokeLinejoin="round" />
        {/* Right face */}
        <polygon points="22,22 38,14 38,30 22,38" fill="rgba(255,255,255,0.22)" stroke="white" strokeWidth="2" strokeLinejoin="round" />
      </svg>

      {/* Top-left circular badge emblem */}
      <div className="absolute -top-1 -left-1">
        <PS3BulletIcon type={subBadge} className="w-4 h-4 text-white bg-slate-900 border border-white/60 shadow-sm" />
      </div>
    </div>
  );
};
