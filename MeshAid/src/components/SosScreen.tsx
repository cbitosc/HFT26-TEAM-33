import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  MapPin,
  Flame,
  Waves,
  HeartPulse,
  Package,
  AlertOctagon,
  ShieldAlert,
  CheckCircle,
  Radio,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { ActiveSos, SosCategory, SosPriority } from '../types';
import { formatTime24, triggerVibration } from '../utils';

interface SosScreenProps {
  isOpen: boolean;
  userCoords: { lat: number; lng: number };
  activeSos: ActiveSos | null;
  onClose: () => void;
  onTriggerSos: (category: SosCategory, priority: SosPriority) => void;
  onCancelActiveSos: () => void;
}

export const CATEGORIES: {
  label: SosCategory;
  icon: React.FC<{ className?: string }>;
  defaultPriority: SosPriority;
}[] = [
  { label: 'Medical', icon: HeartPulse, defaultPriority: 'Critical' },
  { label: 'Fire', icon: Flame, defaultPriority: 'Critical' },
  { label: 'Flood', icon: Waves, defaultPriority: 'High' },
  { label: 'Trapped', icon: AlertOctagon, defaultPriority: 'Critical' },
  { label: 'Supplies', icon: Package, defaultPriority: 'Normal' },
  { label: 'Security', icon: ShieldAlert, defaultPriority: 'High' },
];

export const SosScreen: React.FC<SosScreenProps> = ({
  isOpen,
  userCoords,
  activeSos,
  onClose,
  onTriggerSos,
  onCancelActiveSos,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<SosCategory>('Medical');
  const [selectedPriority, setSelectedPriority] = useState<SosPriority>('Critical');
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 1
  const [isHolding, setIsHolding] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [showRedFlash, setShowRedFlash] = useState(false);
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);

  const holdStartTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const vibratedMilestonesRef = useRef<{ [key: number]: boolean }>({});
  const feedbackTimeoutRef = useRef<number | null>(null);

  // Update priority default when category changes
  const handleSelectCategory = (cat: SosCategory) => {
    setSelectedCategory(cat);
    const def = CATEGORIES.find((c) => c.label === cat);
    if (def) setSelectedPriority(def.defaultPriority);
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (feedbackTimeoutRef.current) window.clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  const handleHoldComplete = useCallback(() => {
    setIsHolding(false);
    setHoldProgress(1);

    setShowRedFlash(true);
    setTimeout(() => {
      setShowRedFlash(false);
    }, 300);

    triggerVibration([200, 100, 200, 100, 300]);
    onTriggerSos(selectedCategory, selectedPriority);
  }, [selectedCategory, selectedPriority, onTriggerSos]);

  const updateHold = useCallback(() => {
    if (!holdStartTimeRef.current) return;
    const elapsed = Date.now() - holdStartTimeRef.current;
    const progress = Math.min(1, elapsed / 3000);
    setHoldProgress(progress);

    const currentSecond = Math.floor(elapsed / 1000);
    if (currentSecond >= 1 && !vibratedMilestonesRef.current[currentSecond]) {
      vibratedMilestonesRef.current[currentSecond] = true;
      triggerVibration(80);
    }

    if (progress >= 1) {
      handleHoldComplete();
    } else {
      animationFrameRef.current = requestAnimationFrame(updateHold);
    }
  }, [handleHoldComplete]);

  const startHold = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (activeSos) return;

    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
    setFeedbackMessage(null);

    setIsHolding(true);
    holdStartTimeRef.current = Date.now();
    vibratedMilestonesRef.current = {};
    triggerVibration(40);
    animationFrameRef.current = requestAnimationFrame(updateHold);
  };

  const cancelHold = () => {
    if (!isHolding) return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    holdStartTimeRef.current = null;
    setIsHolding(false);

    let currentP = holdProgress;
    const drain = () => {
      currentP -= 0.08;
      if (currentP > 0) {
        setHoldProgress(currentP);
        requestAnimationFrame(drain);
      } else {
        setHoldProgress(0);
      }
    };
    requestAnimationFrame(drain);

    setFeedbackMessage('Released. SOS not sent.');
    if (feedbackTimeoutRef.current) window.clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFeedbackMessage(null);
    }, 2500);
  };

  if (!isOpen) return null;

  const countdownNumber = holdProgress < 0.33 ? 3 : holdProgress < 0.67 ? 2 : 1;
  const ringRadius = 66;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = ringCircumference * (1 - holdProgress);

  const selectedCatObj = CATEGORIES.find((c) => c.label === (activeSos?.category || selectedCategory));
  const SelectedIcon = selectedCatObj ? selectedCatObj.icon : HeartPulse;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 font-['IBM_Plex_Sans',sans-serif]">
      {showRedFlash && (
        <div className="absolute inset-0 bg-[#E5484D] z-[100] animate-sos-flash pointer-events-none" />
      )}

      {isHolding && (
        <div
          className="absolute inset-0 bg-[#E5484D] pointer-events-none transition-opacity duration-75 z-10"
          style={{ opacity: holdProgress * 0.25 }}
        />
      )}

      <div className="relative w-full max-w-md h-full flex flex-col bg-[var(--color-bg-app)] text-[var(--color-text)] overflow-hidden shadow-2xl border-x border-[var(--color-border)] z-20">
        <header className="px-4 py-3 bg-[var(--color-header)] border-b border-[var(--color-border)] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-sos)]" />
            <h1 className="text-base font-semibold tracking-tight text-[var(--color-text)]">
              Emergency SOS
            </h1>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-3.5">
          {activeSos ? (
            <div className="flex-1 flex flex-col justify-between py-2 space-y-4">
              <div className="space-y-3.5">
                {/* Header status card with outlined priority label and category icon */}
                <div className="bg-[var(--color-surface)] border-l-4 border-l-[var(--color-sos)] border-y border-r border-[var(--color-border)] p-4 rounded-lg shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-bold tracking-wider text-[var(--color-sos)]">
                      SOS Active & Broadcasted
                    </span>
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {formatTime24(activeSos.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-2">
                      <SelectedIcon className="w-5 h-5 text-[var(--color-sos)]" />
                      <h2 className="text-base font-bold text-[var(--color-text)]">
                        {activeSos.category}
                      </h2>
                    </div>

                    {/* Small Outlined Priority Label */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                        activeSos.priority === 'Critical'
                          ? 'border-[var(--color-sos)] text-[var(--color-sos)]'
                          : activeSos.priority === 'High'
                          ? 'border-amber-500 text-amber-500'
                          : 'border-emerald-500 text-emerald-500'
                      }`}
                    >
                      {activeSos.priority || 'Critical'}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--color-text-secondary)] mt-1.5 font-['IBM_Plex_Mono',monospace]">
                    Sent from {activeSos.lat.toFixed(5)}, {activeSos.lng.toFixed(5)}
                  </p>
                </div>

                {/* Live Status Line */}
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-lg shadow-sm">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">
                    Mesh Propagation Status
                  </h3>

                  <div className="flex items-center justify-between text-xs font-medium">
                    <span
                      className={`flex items-center space-x-1 ${
                        activeSos.status === 'pending'
                          ? 'text-[var(--color-sos)] font-bold'
                          : 'text-[var(--color-delivered)]'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Pending</span>
                    </span>
                    <ArrowRight className="w-3 h-3 text-[var(--color-text-secondary)]" />
                    <span
                      className={`flex items-center space-x-1 ${
                        activeSos.status === 'sent'
                          ? 'text-[var(--color-sos)] font-bold'
                          : activeSos.status === 'relayed' || activeSos.status === 'delivered'
                          ? 'text-[var(--color-delivered)]'
                          : 'text-[var(--color-text-secondary)]'
                      }`}
                    >
                      <span>Sent</span>
                    </span>
                    <ArrowRight className="w-3 h-3 text-[var(--color-text-secondary)]" />
                    <span
                      className={`flex items-center space-x-1 ${
                        activeSos.status === 'relayed'
                          ? 'text-[var(--color-sos)] font-bold'
                          : activeSos.status === 'delivered'
                          ? 'text-[var(--color-delivered)]'
                          : 'text-[var(--color-text-secondary)]'
                      }`}
                    >
                      <span>Relayed</span>
                    </span>
                    <ArrowRight className="w-3 h-3 text-[var(--color-text-secondary)]" />
                    <span
                      className={`flex items-center space-x-1 ${
                        activeSos.status === 'delivered'
                          ? 'text-[var(--color-delivered)] font-bold'
                          : 'text-[var(--color-text-secondary)]'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Delivered</span>
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--color-border)] space-y-2">
                    <p className="text-[11px] text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold">
                      Relay Node Route:
                    </p>
                    <ul className="space-y-1 text-xs">
                      {activeSos.relayedNodes.map((node, i) => (
                        <li key={i} className="flex items-center space-x-2 text-[var(--color-text)]">
                          <Radio className="w-3.5 h-3.5 text-[var(--color-delivered)] shrink-0" />
                          <span>{node}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowCancelPrompt(true)}
                  className="w-full py-2.5 bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-xs font-semibold text-[var(--color-sos)] border border-[var(--color-sos)]/40 rounded transition-colors cursor-pointer"
                >
                  Cancel Active SOS Broadcast
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 bg-[var(--color-bubble-me)] hover:bg-[var(--color-bubble-me-hover)] text-xs font-semibold text-[var(--color-text)] border border-[var(--color-delivered)]/40 rounded transition-colors cursor-pointer"
                >
                  View Broadcast Channel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Category selection (6 categories) */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] block mb-1.5">
                  Emergency Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(({ label, icon: Icon }) => {
                    const isSelected = selectedCategory === label;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => handleSelectCategory(label)}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--color-surface)] border-[var(--color-sos)] text-[var(--color-text)] font-semibold shadow-sm'
                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 mb-1 ${
                            isSelected ? 'text-[var(--color-sos)]' : 'text-[var(--color-text-secondary)]'
                          }`}
                        />
                        <span className="text-[11px] leading-tight text-center">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority Selection with small outlined labels */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] block mb-1.5">
                  Priority Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Critical', 'High', 'Normal'] as SosPriority[]).map((p) => {
                    const isSelected = selectedPriority === p;
                    const badgeBorder =
                      p === 'Critical'
                        ? isSelected
                          ? 'border-[var(--color-sos)] bg-[var(--color-sos)]/15 text-[var(--color-sos)]'
                          : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                        : p === 'High'
                        ? isSelected
                          ? 'border-amber-500 bg-amber-500/15 text-amber-500'
                          : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                        : isSelected
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-500'
                        : 'border-[var(--color-border)] text-[var(--color-text-secondary)]';

                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSelectedPriority(p)}
                        className={`py-1.5 px-2 rounded border text-xs font-bold transition-colors cursor-pointer text-center ${badgeBorder}`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Coordinates display in mono font */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-2.5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-[var(--color-sos)] shrink-0" />
                  <span className="text-xs text-[var(--color-text-secondary)]">Broadcast Location:</span>
                </div>
                <span className="font-['IBM_Plex_Mono',monospace] text-xs font-semibold text-[var(--color-text)]">
                  {userCoords.lat.toFixed(5)}, {userCoords.lng.toFixed(5)}
                </span>
              </div>

              {/* Hold 3 SEC Button Area */}
              <div className="flex-1 flex flex-col items-center justify-center py-4 select-none">
                <div className="relative flex items-center justify-center">
                  <svg
                    className="w-40 h-40 -rotate-90 pointer-events-none"
                    viewBox="0 0 160 160"
                  >
                    <circle
                      cx="80"
                      cy="80"
                      r={ringRadius}
                      fill="none"
                      stroke="var(--color-border)"
                      strokeWidth="6"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r={ringRadius}
                      fill="none"
                      stroke="var(--color-sos)"
                      strokeWidth="6"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    />
                  </svg>

                  <div
                    onMouseDown={startHold}
                    onMouseUp={cancelHold}
                    onMouseLeave={cancelHold}
                    onTouchStart={startHold}
                    onTouchEnd={cancelHold}
                    onTouchCancel={cancelHold}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{
                      transform: isHolding ? 'scale(1.08)' : 'scale(1)',
                    }}
                    className="absolute w-28 h-28 rounded-full bg-[var(--color-sos)] text-white flex flex-col items-center justify-center shadow-lg transition-transform duration-100 ease-out cursor-pointer active:brightness-95 select-none"
                  >
                    {isHolding ? (
                      <>
                        <span className="font-['IBM_Plex_Mono',monospace] text-2xl font-bold leading-none">
                          {countdownNumber}
                        </span>
                        <span className="text-[10px] uppercase font-semibold tracking-wider mt-1 opacity-90">
                          Hold
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertOctagon className="w-7 h-7 mb-0.5" />
                        <span className="text-[11px] uppercase font-bold tracking-wider leading-none">
                          HOLD 3 SEC
                        </span>
                        <span className="text-[9px] opacity-80 mt-1 uppercase">For SOS</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="h-6 mt-3 flex items-center justify-center text-center">
                  {feedbackMessage ? (
                    <p className="text-xs text-[var(--color-text-secondary)] animate-message-in">
                      {feedbackMessage}
                    </p>
                  ) : (
                    <p className="text-[11px] text-[var(--color-text-secondary)]">
                      Hold continuously to broadcast priority distress packet
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showCancelPrompt && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowCancelPrompt(false)}
        >
          <div
            className="w-full max-w-xs rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] p-4 shadow-xl text-[var(--color-text)] animate-message-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-[var(--color-text)] mb-2">Cancel Active SOS?</h3>
            <p className="text-xs text-[var(--color-text-secondary)] mb-4">
              All nearby mesh nodes and responders will be notified that the emergency state is cleared.
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  onCancelActiveSos();
                  setShowCancelPrompt(false);
                }}
                className="w-full py-2 bg-[var(--color-sos)] hover:bg-[var(--color-sos-hover)] text-white font-semibold text-xs rounded transition-colors cursor-pointer"
              >
                Yes, Cancel SOS
              </button>
              <button
                type="button"
                onClick={() => setShowCancelPrompt(false)}
                className="w-full py-2 bg-[var(--color-surface-hover)] text-[var(--color-text)] text-xs font-medium rounded border border-[var(--color-border)] transition-colors cursor-pointer"
              >
                Keep Active
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
