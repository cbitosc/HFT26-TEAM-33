import React from 'react';
import { Clock, Check, CheckCheck } from 'lucide-react';
import { MessageStatus } from '../types';

interface StatusTickProps {
  status: MessageStatus;
  className?: string;
}

export const StatusTick: React.FC<StatusTickProps> = ({ status, className = 'w-3.5 h-3.5' }) => {
  return (
    <span key={status} className="animate-tick-change" title={status} aria-label={status}>
      {status === 'pending' && (
        <Clock className={`${className} text-[var(--color-text-secondary)]`} />
      )}
      {status === 'sent' && (
        <Check className={`${className} text-[var(--color-text-secondary)]`} />
      )}
      {status === 'relayed' && (
        <CheckCheck className={`${className} text-[var(--color-text-secondary)]`} />
      )}
      {status === 'delivered' && (
        <CheckCheck className={`${className} text-[var(--color-delivered)]`} />
      )}
    </span>
  );
};
