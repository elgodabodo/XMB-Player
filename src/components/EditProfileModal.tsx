import React, { useState } from 'react';
import { UserProfile } from '../types';
import { soundFx } from '../services/soundFx';
import { User, X, Camera, Upload, Check, Sparkles, Image as ImageIcon } from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
}

// Iconic PlayStation Avatar Presets
export const AVATAR_PRESETS = [
  {
    id: 'sackboy',
    name: 'Sackboy',
    url: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=300&q=80',
  },
  {
    id: 'tux',
    name: 'Linux Tux',
    url: 'https://images.unsplash.com/photo-1598439210625-5067c578f3f6?w=300&q=80',
  },
  {
    id: 'controller',
    name: 'DualShock Cyber',
    url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&q=80',
  },
  {
    id: 'synthwave',
    name: 'Neon Horizon',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&q=80',
  },
  {
    id: 'arcade',
    name: 'Retro Pixel',
    url: 'https://images.unsplash.com/photo-1551103782-8ab07afd45c1?w=300&q=80',
  },
  {
    id: 'cosmic',
    name: 'Supernova',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=300&q=80',
  },
  {
    id: 'mecha',
    name: 'Cyberpunk Pilot',
    url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&q=80',
  },
  {
    id: 'audiophile',
    name: 'Studio Master',
    url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
  },
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
}) => {
  const [username, setUsername] = useState(profile.username);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [statusMessage, setStatusMessage] = useState(profile.statusMessage || '');
  const [customUrlInput, setCustomUrlInput] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          soundFx.playTick();
          setAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectPreset = (url: string) => {
    soundFx.playTick();
    setAvatarUrl(url);
  };

  const handleApplyCustomUrl = () => {
    if (customUrlInput.trim()) {
      soundFx.playTick();
      setAvatarUrl(customUrlInput.trim());
      setCustomUrlInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    soundFx.playSettingChanged();
    onSaveProfile({
      username: username.trim(),
      avatarUrl: avatarUrl || AVATAR_PRESETS[0].url,
      statusMessage: statusMessage.trim() || 'Online on Linux XMB',
      level: profile.level || 18,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-lg bg-slate-950 border border-white/20 rounded-xl shadow-2xl overflow-hidden text-slate-200 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-base font-bold text-white tracking-wide font-sans uppercase">
                Edit User Profile & Avatar
              </h2>
              <p className="text-xs text-white/50 font-mono">
                Customize your PlayStation identity in the Users tab
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playCancel();
              onClose();
            }}
            className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Avatar Preview & Upload */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-white/5 border border-white/10">
            {/* Live Profile Ring */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/80 shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                <img
                  src={avatarUrl}
                  alt={username}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarUrl(AVATAR_PRESETS[0].url)}
                />
              </div>
              <label
                htmlFor="avatar-file-input"
                className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-white text-[10px] font-bold"
              >
                <Camera className="w-4 h-4 mb-0.5" />
                <span>Upload</span>
              </label>
              <input
                id="avatar-file-input"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Current Details */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <span className="text-xs font-mono text-sky-400 block mb-0.5">
                PlayStation Level {profile.level || 18}
              </span>
              <h3 className="text-lg font-bold text-white truncate drop-shadow">
                {username || 'User 1'}
              </h3>
              <p className="text-xs text-white/60 truncate mt-0.5 font-mono">
                {statusMessage || 'Online on Linux XMB'}
              </p>
            </div>
          </div>

          {/* Username Input */}
          <div>
            <label className="text-xs font-semibold text-white/80 uppercase tracking-wider block mb-1.5">
              Username *
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. User 1, PlayStation_Linux, zed"
              className="w-full px-3.5 py-2 bg-black/60 border border-white/15 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:border-sky-400 font-sans"
            />
          </div>

          {/* Status Message */}
          <div>
            <label className="text-xs font-semibold text-white/80 uppercase tracking-wider block mb-1.5">
              Status Message (Optional)
            </label>
            <input
              type="text"
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
              placeholder="e.g. Listening to high-res FLAC, Playing RPCS3"
              className="w-full px-3.5 py-2 bg-black/60 border border-white/15 rounded-lg text-xs text-white/90 placeholder-white/40 focus:outline-none focus:border-sky-400 font-sans"
            />
          </div>

          {/* Preset Avatars Grid */}
          <div>
            <label className="text-xs font-semibold text-white/80 uppercase tracking-wider block mb-2">
              Choose from Classic Avatars:
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {AVATAR_PRESETS.map((p) => {
                const isSelected = avatarUrl === p.url;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p.url)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      isSelected
                        ? 'border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.7)] scale-105'
                        : 'border-white/15 hover:border-white/50 opacity-70 hover:opacity-100'
                    }`}
                    title={p.name}
                  >
                    <img
                      src={p.url}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-sky-500/20 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white drop-shadow" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Avatar URL or Local File Upload */}
          <div>
            <label className="text-xs font-semibold text-white/80 uppercase tracking-wider block mb-1.5">
              Or Paste Custom Image URL / Upload Local Photo:
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApplyCustomUrl())}
                placeholder="https://example.com/my-avatar.png"
                className="flex-1 px-3 py-1.5 bg-black/60 border border-white/15 rounded-lg text-xs text-white placeholder-white/40 focus:outline-none focus:border-sky-400"
              />
              <button
                type="button"
                onClick={handleApplyCustomUrl}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-semibold transition-colors"
              >
                Apply URL
              </button>
              <label
                htmlFor="avatar-file-upload-btn"
                className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-semibold cursor-pointer transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
              </label>
              <input
                id="avatar-file-upload-btn"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                soundFx.playCancel();
                onClose();
              }}
              className="px-4 py-2 text-xs text-white/60 hover:text-white rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs rounded-lg shadow-[0_0_15px_rgba(56,189,248,0.4)] transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Save Profile</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
