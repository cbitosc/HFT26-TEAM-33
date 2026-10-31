import React from 'react';
import { AlertOctagon, VolumeX, MapPin, HeartPulse, Flame, Waves, Package, ShieldAlert } from 'lucide-react';
import { ActiveSos, SosCategory } from '../types';
import { LanguageCode, translate } from '../i18n';

interface IncomingSosModalProps {
  sos: ActiveSos;
  language: LanguageCode;
  onMuteAlarm: () => void;
  onViewOnMap: () => void;
  onDismiss: () => void;
}

const CATEGORY_ICONS: Record<SosCategory, React.FC<{ className?: string }>> = {
  Medical: HeartPulse,
  Fire: Flame,
  Flood: Waves,
  Trapped: AlertOctagon,
  Supplies: Package,
  Security: ShieldAlert,
};

export const IncomingSosModal: React.FC<IncomingSosModalProps> = ({
  sos,
  language,
  onMuteAlarm,
  onViewOnMap,
  onDismiss,
}) => {
  const t = (k: string) => translate(language, k);
  const IconComponent = CATEGORY_ICONS[sos.category] || AlertOctagon;

  const categoryKey = `cat_${sos.category.toLowerCase()}`;
  const translatedCategory = t(categoryKey) !== categoryKey ? t(categoryKey) : sos.category;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--color-bg-app)] border-2 border-red-600 shadow-[0_0_50px_rgba(239,68,68,0.6)] overflow-hidden flex flex-col">
        {/* Pulsing Red Header */}
        <div className="bg-red-600 px-4 py-3 flex items-center justify-between text-white animate-pulse">
          <div className="flex items-center space-x-2">
            <AlertOctagon className="w-6 h-6 shrink-0" />
            <h2 className="text-sm font-black tracking-wider uppercase">
              {t('critical_sos_received')}
            </h2>
          </div>
          <span className="text-[10px] bg-white text-red-700 font-bold px-2 py-0.5 rounded-full">
            {sos.priority}
          </span>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3.5 text-[var(--color-text)]">
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <div className="w-10 h-10 rounded-lg bg-red-600/20 text-red-500 flex items-center justify-center shrink-0">
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] text-[var(--color-text-secondary)] font-mono uppercase">
                {t('category')}
              </div>
              <div className="text-base font-bold text-red-500">
                {translatedCategory}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-[10px] text-[var(--color-text-secondary)] block">
                {t('sender')}
              </span>
              <span className="font-mono font-bold truncate block">
                {sos.senderName || sos.senderNodeId || 'Nearby Node'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-[10px] text-[var(--color-text-secondary)] block">
                {t('coordinates')}
              </span>
              <span className="font-mono font-bold block">
                {sos.lat.toFixed(4)}, {sos.lng.toFixed(4)}
              </span>
            </div>
          </div>

          <p className="text-xs text-[var(--color-text-secondary)] italic leading-relaxed text-center">
            {t('sos_broadcast_desc')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="p-3 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex flex-col space-y-2">
          <button
            onClick={onViewOnMap}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-red-600 hover:bg-red-700 text-white shadow-lg flex items-center justify-center space-x-2 transition-transform active:scale-95 cursor-pointer"
          >
            <MapPin className="w-4 h-4" />
            <span>{t('view_on_map')}</span>
          </button>

          <div className="flex space-x-2">
            <button
              onClick={onMuteAlarm}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-[var(--color-bg-app)] hover:bg-zinc-800 text-[var(--color-text)] border border-[var(--color-border)] flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <VolumeX className="w-3.5 h-3.5 text-amber-500" />
              <span>{t('mute_alarm')}</span>
            </button>
            <button
              onClick={onDismiss}
              className="py-2 px-3 rounded-lg text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
