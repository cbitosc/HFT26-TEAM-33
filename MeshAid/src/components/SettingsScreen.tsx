import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Navigation,
  Radio,
  Database,
  RotateCcw,
  ShieldCheck,
  Sun,
  Moon,
  Laptop,
  Languages,
  Lock,
  Check,
} from 'lucide-react';
import { MeshSettings, ThemeMode } from '../types';
import { LanguageCode, SUPPORTED_LANGUAGES, translate } from '../i18n';
import { getStoredEncryptionPassphrase, setStoredEncryptionPassphrase } from '../crypto';

interface SettingsScreenProps {
  settings: MeshSettings;
  userCoords: { lat: number; lng: number };
  messageCount: number;
  currentLang: LanguageCode;
  onChangeLanguage: (lang: LanguageCode) => void;
  onUpdateSettings: (newSettings: Partial<MeshSettings>) => void;
  onThemeChange: (theme: ThemeMode) => void;
  onRefreshGps: () => void;
  onResetData: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  userCoords,
  messageCount,
  currentLang,
  onChangeLanguage,
  onUpdateSettings,
  onThemeChange,
  onRefreshGps,
  onResetData,
}) => {
  const currentTheme = settings.theme || 'dark';
  const t = (k: string) => translate(currentLang, k);

  const [encryptionKey, setEncryptionKey] = useState<string>(getStoredEncryptionPassphrase());
  const [keySaved, setKeySaved] = useState(false);

  const handleSaveKey = () => {
    setStoredEncryptionPassphrase(encryptionKey);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-app)] text-[var(--color-text)]">
      {/* Header */}
      <header className="px-4 py-3 bg-[var(--color-header)] border-b border-[var(--color-border)] flex items-center space-x-2.5 shrink-0">
        <SettingsIcon className="w-5 h-5 text-[var(--color-text-secondary)]" />
        <h1 className="text-base font-semibold text-[var(--color-text)]">{t('settings')}</h1>
      </header>

      {/* Settings List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Multi-Lingual Support Section */}
        <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4 shadow-sm">
          <div className="flex items-center space-x-2 mb-3">
            <Languages className="w-4 h-4 text-emerald-500" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              {t('language_select')}
            </h2>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-[var(--color-text-secondary)]">
              Choose your preferred language for offline disaster communications.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => onChangeLanguage(lang.code)}
                  className={`flex items-center justify-between py-2 px-3 rounded text-xs font-medium border transition-colors cursor-pointer ${
                    currentLang === lang.code
                      ? 'bg-[var(--color-bubble-me)] border-[var(--color-delivered)] text-[var(--color-text)] font-semibold shadow-xs'
                      : 'bg-[var(--color-bg-app)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                  }`}
                >
                  <span>{lang.nativeLabel}</span>
                  <span className="text-[10px] text-[var(--color-text-secondary)] font-mono">
                    {lang.code.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Message Encryption Section */}
        <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4 shadow-sm">
          <div className="flex items-center space-x-2 mb-3">
            <Lock className="w-4 h-4 text-emerald-500" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              {t('encryption_key_title')}
            </h2>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-[var(--color-text-secondary)]">
              {t('encryption_key_desc')}
            </p>

            <div className="flex space-x-2 pt-1">
              <input
                type="text"
                value={encryptionKey}
                onChange={(e) => setEncryptionKey(e.target.value)}
                placeholder="Cluster Passphrase..."
                className="flex-1 bg-[var(--color-bg-app)] text-[var(--color-text)] text-xs px-3 py-2 rounded border border-[var(--color-border)] font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleSaveKey}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
              >
                {keySaved ? <Check className="w-3.5 h-3.5" /> : null}
                <span>{keySaved ? 'Saved' : 'Update'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Theme Setting Section */}
        <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4 shadow-sm">
          <div className="flex items-center space-x-2 mb-3">
            <Sun className="w-4 h-4 text-[var(--color-text-secondary)]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              {t('theme')}
            </h2>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onThemeChange('dark')}
                className={`flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded text-xs font-medium border transition-colors cursor-pointer ${
                  currentTheme === 'dark'
                    ? 'bg-[var(--color-bubble-me)] border-[var(--color-delivered)] text-[var(--color-text)] font-semibold'
                    : 'bg-[var(--color-bg-app)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>{t('dark')}</span>
              </button>

              <button
                type="button"
                onClick={() => onThemeChange('light')}
                className={`flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded text-xs font-medium border transition-colors cursor-pointer ${
                  currentTheme === 'light'
                    ? 'bg-[var(--color-bubble-me)] border-[var(--color-delivered)] text-[var(--color-text)] font-semibold'
                    : 'bg-[var(--color-bg-app)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>{t('light')}</span>
              </button>

              <button
                type="button"
                onClick={() => onThemeChange('system')}
                className={`flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded text-xs font-medium border transition-colors cursor-pointer ${
                  currentTheme === 'system'
                    ? 'bg-[var(--color-bubble-me)] border-[var(--color-delivered)] text-[var(--color-text)] font-semibold'
                    : 'bg-[var(--color-bg-app)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>{t('system')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Operating Role Section (User or Responder) */}
        <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4 shadow-sm">
          <div className="flex items-center space-x-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-[var(--color-text-secondary)]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              {t('role')}
            </h2>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onUpdateSettings({ role: 'User' })}
                className={`flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded text-xs font-medium border transition-colors cursor-pointer ${
                  settings.role !== 'Responder'
                    ? 'bg-[var(--color-bubble-me)] border-[var(--color-delivered)] text-[var(--color-text)] font-semibold'
                    : 'bg-[var(--color-bg-app)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                }`}
              >
                <span>{t('role_civilian')}</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ role: 'Responder' })}
                className={`flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded text-xs font-medium border transition-colors cursor-pointer ${
                  settings.role === 'Responder'
                    ? 'bg-[var(--color-sos)] border-[var(--color-sos)] text-white font-semibold shadow-xs'
                    : 'bg-[var(--color-bg-app)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                }`}
              >
                <span>{t('role_responder')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* GPS Coordinates Section */}
        <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-[var(--color-text-secondary)]" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                {t('coordinates')}
              </h2>
            </div>
            <button
              type="button"
              onClick={onRefreshGps}
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] px-2 py-1 bg-[var(--color-bg-app)] border border-[var(--color-border)] rounded cursor-pointer"
            >
              Update
            </button>
          </div>

          <div className="bg-[var(--color-bg-app)] p-3 rounded border border-[var(--color-border)] space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">Latitude</span>
              <span className="font-mono text-[var(--color-text)]">{userCoords.lat.toFixed(5)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">Longitude</span>
              <span className="font-mono text-[var(--color-text)]">{userCoords.lng.toFixed(5)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">{t('device_id')}</span>
              <span className="font-mono text-[var(--color-text)]">{settings.userNodeId}</span>
            </div>
          </div>
        </div>

        {/* Local Storage & Reset */}
        <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4 shadow-sm">
          <div className="flex items-center space-x-2 mb-3">
            <Database className="w-4 h-4 text-[var(--color-text-secondary)]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Local Storage
            </h2>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mb-3">
            {messageCount} messages stored locally in offline storage.
          </p>

          <button
            type="button"
            onClick={onResetData}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-[var(--color-bg-app)] hover:bg-[var(--color-surface-hover)] text-xs font-medium text-[var(--color-text)] border border-[var(--color-border)] rounded transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
            <span>{t('reset_data')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
