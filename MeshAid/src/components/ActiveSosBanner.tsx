import React, { useState } from 'react';
import { ActiveSos } from '../types';

interface ActiveSosBannerProps {
  activeSos: ActiveSos;
  onOpenSosScreen: () => void;
  onCancelSos: () => void;
}

export const ActiveSosBanner: React.FC<ActiveSosBannerProps> = ({
  activeSos,
  onOpenSosScreen,
  onCancelSos,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <div className="w-full bg-[var(--color-surface)] border-b border-[var(--color-sos)] px-3 py-1.5 flex items-center justify-between text-xs shrink-0 z-30 shadow-sm">
        {/* Clickable indicator & label */}
        <div
          onClick={onOpenSosScreen}
          className="flex items-center space-x-2 cursor-pointer flex-1 min-w-0"
        >
          {/* Repeating soft radar ring behind the active SOS indicator only (nowhere else) */}
          <div className="relative flex items-center justify-center w-4 h-4 shrink-0">
            <span className="absolute w-3.5 h-3.5 rounded-full bg-[var(--color-sos)] animate-sos-radar-ring pointer-events-none" />
            <span className="w-2 h-2 rounded-full bg-[var(--color-sos)] relative z-10" />
          </div>

          <span className="font-medium text-[var(--color-text)] truncate text-[11px]">
            SOS active. 3 nodes relaying.
          </span>
        </div>

        {/* Cancel SOS Option (asks for confirmation) */}
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="px-2 py-0.5 rounded text-[11px] font-semibold text-[var(--color-sos)] hover:bg-[var(--color-sos)] hover:text-white transition-colors border border-[var(--color-sos)]/40 ml-2 shrink-0 cursor-pointer"
        >
          Cancel SOS
        </button>
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="w-full max-w-xs rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] p-4 shadow-2xl text-[var(--color-text)] animate-message-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-[var(--color-text)] mb-2">Cancel Emergency SOS?</h3>
            <p className="text-xs text-[var(--color-text-secondary)] mb-4">
              All nearby mesh nodes and responders will be notified that the emergency state is cleared.
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  onCancelSos();
                  setShowConfirm(false);
                }}
                className="w-full py-2 bg-[var(--color-sos)] hover:bg-[var(--color-sos-hover)] text-white font-semibold text-xs rounded transition-colors cursor-pointer"
              >
                Yes, Cancel SOS
              </button>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="w-full py-2 bg-[var(--color-surface-hover)] text-[var(--color-text)] text-xs font-medium rounded border border-[var(--color-border)] transition-colors cursor-pointer"
              >
                Keep Active
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
