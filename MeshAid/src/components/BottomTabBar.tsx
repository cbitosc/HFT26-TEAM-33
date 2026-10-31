import React from 'react';
import { MessageSquare, MapPin, Settings, ShieldAlert } from 'lucide-react';
import { UserRole } from '../types';
import { LanguageCode, translate } from '../i18n';

export type TabType = 'chats' | 'map' | 'settings' | 'incidents';

interface BottomTabBarProps {
  activeTab: TabType;
  totalUnreadCount: number;
  role: UserRole;
  activeIncidentCount?: number;
  language?: LanguageCode;
  onSelectTab: (tab: TabType) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  totalUnreadCount,
  role,
  activeIncidentCount = 0,
  language = 'en',
  onSelectTab,
}) => {
  const isResponder = role === 'Responder';
  const t = (k: string) => translate(language, k);

  return (
    <nav className="h-14 bg-[var(--color-header)] border-t border-[var(--color-border)] flex items-center justify-around shrink-0 z-20">
      {/* Chats Tab */}
      <button
        type="button"
        onClick={() => onSelectTab('chats')}
        className={`flex-1 h-full flex flex-col items-center justify-center space-y-1 transition-all duration-200 ease-out cursor-pointer ${
          activeTab === 'chats'
            ? 'text-[var(--color-text)]'
            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
        }`}
      >
        <div className="relative">
          <MessageSquare
            className={`w-5 h-5 transition-transform duration-200 ease-out ${
              activeTab === 'chats' ? 'scale-110 text-[var(--color-text)]' : 'scale-100'
            }`}
          />
          {totalUnreadCount > 0 && (
            <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-[var(--color-bubble-me)] text-[var(--color-delivered)] text-[10px] font-semibold flex items-center justify-center border border-[var(--color-delivered)]/40">
              {totalUnreadCount}
            </span>
          )}
        </div>
        <span className="text-[11px] font-medium leading-none">{t('chats')}</span>
      </button>

      {/* Map Tab */}
      <button
        type="button"
        onClick={() => onSelectTab('map')}
        className={`flex-1 h-full flex flex-col items-center justify-center space-y-1 transition-all duration-200 ease-out cursor-pointer ${
          activeTab === 'map'
            ? 'text-[var(--color-text)]'
            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
        }`}
      >
        <MapPin
          className={`w-5 h-5 transition-transform duration-200 ease-out ${
            activeTab === 'map' ? 'scale-110 text-[var(--color-text)]' : 'scale-100'
          }`}
        />
        <span className="text-[11px] font-medium leading-none">{t('map')}</span>
      </button>

      {/* 4th Tab: Incidents (Only visible when role is Responder) */}
      {isResponder && (
        <button
          type="button"
          onClick={() => onSelectTab('incidents')}
          className={`flex-1 h-full flex flex-col items-center justify-center space-y-1 transition-all duration-200 ease-out cursor-pointer ${
            activeTab === 'incidents'
              ? 'text-[var(--color-sos)] font-semibold'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
          }`}
        >
          <div className="relative">
            <ShieldAlert
              className={`w-5 h-5 transition-transform duration-200 ease-out ${
                activeTab === 'incidents' ? 'scale-110 text-[var(--color-sos)]' : 'scale-100'
              }`}
            />
            {activeIncidentCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-[var(--color-sos)] text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                {activeIncidentCount}
              </span>
            )}
          </div>
          <span className="text-[11px] font-medium leading-none">{t('incidents')}</span>
        </button>
      )}

      {/* Settings Tab */}
      <button
        type="button"
        onClick={() => onSelectTab('settings')}
        className={`flex-1 h-full flex flex-col items-center justify-center space-y-1 transition-all duration-200 ease-out cursor-pointer ${
          activeTab === 'settings'
            ? 'text-[var(--color-text)]'
            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
        }`}
      >
        <Settings
          className={`w-5 h-5 transition-transform duration-200 ease-out ${
            activeTab === 'settings' ? 'scale-110 text-[var(--color-text)]' : 'scale-100'
          }`}
        />
        <span className="text-[11px] font-medium leading-none">{t('settings')}</span>
      </button>
    </nav>
  );
};
