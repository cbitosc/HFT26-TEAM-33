import React from 'react';
import { X, MapPin, Clock, Radio } from 'lucide-react';
import { Message } from '../types';
import { formatTime24 } from '../utils';

interface MessageDetailModalProps {
  message: Message | null;
  onClose: () => void;
}

export const MessageDetailModal: React.FC<MessageDetailModalProps> = ({ message, onClose }) => {
  if (!message) return null;

  const latFormatted = message.lat.toFixed(5);
  const lngFormatted = message.lng.toFixed(5);
  const locationString = `Sent from ${latFormatted}, ${lngFormatted}`;

  const statusLabel = {
    pending: 'Pending transmission (out of range or queue)',
    sent: 'Sent to local radio buffer (hop 0)',
    relayed: 'Relayed across mesh node network',
    delivered: 'Delivered to recipient node',
  }[message.status];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] p-5 shadow-lg text-[var(--color-text)] animate-message-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-[var(--color-text-secondary)]" />
            <span className="font-semibold text-sm tracking-wide">Packet Telemetry</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          <div className="bg-[var(--color-bg-app)] p-3 rounded border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-secondary)] mb-1">Message Content</p>
            <p className="text-[var(--color-text)] break-words">{message.text}</p>
          </div>

          <div className="bg-[var(--color-bg-app)] p-3 rounded border border-[var(--color-border)] space-y-2">
            <div className="flex items-start space-x-2.5">
              <MapPin className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Location Coordinates</p>
                <p className="font-medium text-[var(--color-text)]">{locationString}</p>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 pt-2 border-t border-[var(--color-border)]">
              <Clock className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Time & Status</p>
                <p className="text-[var(--color-text)]">
                  {formatTime24(message.timestamp)} · {statusLabel}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-[var(--color-surface-hover)] hover:bg-[var(--color-border)] text-xs font-medium rounded text-[var(--color-text)] border border-[var(--color-border)] transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
