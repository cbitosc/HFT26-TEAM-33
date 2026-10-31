import React, { useState, useRef, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition as NativeSpeech } from '@capacitor-community/speech-recognition';
import {
  ArrowLeft,
  Mic,
  Send,
  AlertTriangle,
  BatteryMedium,
  BatteryCharging,
  HeartPulse,
  Flame,
  Waves,
  AlertOctagon,
  Package,
  ShieldAlert,
  Lock,
} from 'lucide-react';
import { Contact, Message, SosCategory, SosPriority } from '../types';
import { StatusTick } from './StatusTick';
import { formatTime24 } from '../utils';
import { classifyEmergencyText, ClassifiedResult } from '../classifier';

interface ChatScreenProps {
  contact: Contact;
  messages: Message[];
  effectiveStatusText: string;
  onBack: () => void;
  onSendMessage: (
    text: string,
    isSos?: boolean,
    sosCategory?: SosCategory,
    priority?: SosPriority
  ) => void;
  onLongPressMessage: (message: Message) => void;
}

const CATEGORY_ICONS: Record<SosCategory, React.FC<{ className?: string }>> = {
  Medical: HeartPulse,
  Fire: Flame,
  Flood: Waves,
  Trapped: AlertOctagon,
  Supplies: Package,
  Security: ShieldAlert,
};

export const ChatScreen: React.FC<ChatScreenProps> = ({
  contact,
  messages,
  effectiveStatusText,
  onBack,
  onSendMessage,
  onLongPressMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  // Suggested category state
  const [suggestedCategory, setSuggestedCategory] = useState<ClassifiedResult | null>(null);
  const [ignoredCategory, setIgnoredCategory] = useState<string | null>(null);
  const [acceptedCategory, setAcceptedCategory] = useState<ClassifiedResult | null>(null);

  // Hardware awareness: Emergency Battery State
  const [batteryLevel, setBatteryLevel] = useState<number>(82);
  const [isCharging, setIsCharging] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const longPressTimerRef = useRef<number | null>(null);

  // Check hardware battery if available
  useEffect(() => {
    let batteryObj: any = null;
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any)
        .getBattery()
        .then((battery: any) => {
          batteryObj = battery;
          setBatteryLevel(Math.round(battery.level * 100));
          setIsCharging(battery.charging);

          const updateLevel = () => setBatteryLevel(Math.round(battery.level * 100));
          const updateCharging = () => setIsCharging(battery.charging);

          battery.addEventListener('levelchange', updateLevel);
          battery.addEventListener('chargingchange', updateCharging);
        })
        .catch(() => {});
    }
    return () => {
      if (batteryObj) {
        try {
          batteryObj.removeEventListener('levelchange', () => {});
          batteryObj.removeEventListener('chargingchange', () => {});
        } catch {}
      }
    };
  }, []);

  // Run offline classifier on text change
  const handleInputChange = (text: string) => {
    setInputText(text);

    if (!text.trim()) {
      setSuggestedCategory(null);
      setIgnoredCategory(null);
      setAcceptedCategory(null);
      return;
    }

    if (acceptedCategory) return;

    const classified = classifyEmergencyText(text);
    if (classified && classified.category !== ignoredCategory) {
      setSuggestedCategory(classified);
    } else {
      setSuggestedCategory(null);
    }
  };

  const handleAcceptSuggestion = () => {
    if (suggestedCategory) {
      setAcceptedCategory(suggestedCategory);
      setSuggestedCategory(null);
    }
  };

  const handleIgnoreSuggestion = () => {
    if (suggestedCategory) {
      setIgnoredCategory(suggestedCategory.category);
      setSuggestedCategory(null);
    }
  };

  // Auto-scroll to bottom when messages update or typing starts
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const handleBack = () => {
    setIsExiting(true);
    setTimeout(() => {
      onBack();
    }, 180);
  };

  const handleSend = () => {
    if (!inputText.trim()) return;

    if (acceptedCategory) {
      onSendMessage(
        inputText.trim(),
        true,
        acceptedCategory.category,
        acceptedCategory.priority
      );
      setAcceptedCategory(null);
    } else {
      onSendMessage(inputText.trim());
    }

    setInputText('');
    setSuggestedCategory(null);
    setIgnoredCategory(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleToggleVoice = async () => {
    setSpeechError(null);

    // Inside the Android app the browser API does not work, use the native plugin
    if (Capacitor.isNativePlatform()) {
      try {
        if (isListening) {
          await NativeSpeech.stop();
          setIsListening(false);
          return;
        }
        const { available } = await NativeSpeech.available();
        if (!available) {
          setSpeechError('Voice input is not available on this phone.');
          setTimeout(() => setSpeechError(null), 3500);
          return;
        }
        const perm = await NativeSpeech.requestPermissions();
        if (perm.speechRecognition !== 'granted') {
          setSpeechError('Microphone permission denied.');
          setTimeout(() => setSpeechError(null), 3500);
          return;
        }
        setIsListening(true);
        // change 'en-US' to 'hi-IN' (Hindi) or 'ur-PK' (Urdu) if you want
        const result = await NativeSpeech.start({
          language: 'en-US',
          maxResults: 1,
          prompt: 'Speak your message',
          popup: true,
        });
        if (result.matches && result.matches.length > 0) {
          handleInputChange(result.matches[0]);
        }
      } catch {
        setSpeechError('Voice input failed. Try again.');
        setTimeout(() => setSpeechError(null), 3000);
      } finally {
        setIsListening(false);
      }
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError('Speech recognition is not supported in this browser.');
      setTimeout(() => setSpeechError(null), 3500);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        handleInputChange(transcript);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error !== 'no-speech') {
          setSpeechError(`Voice input error: ${event.error}`);
          setTimeout(() => setSpeechError(null), 3000);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setSpeechError('Unable to access microphone.');
      setTimeout(() => setSpeechError(null), 3000);
    }
  };

  const startLongPress = (msg: Message) => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = window.setTimeout(() => {
      onLongPressMessage(msg);
      longPressTimerRef.current = null;
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <div
      className={`flex flex-col h-full bg-[var(--color-bg-app)] text-[var(--color-text)] ${
        isExiting ? 'animate-slide-out' : 'animate-slide-in'
      }`}
    >
      {/* Chat Header */}
      <header className="px-3 py-2.5 bg-[var(--color-header)] border-b border-[var(--color-border)] flex items-center justify-between shrink-0">
        <div className="flex items-center min-w-0 mr-2">
          <button
            onClick={handleBack}
            className="p-1.5 -ml-1 mr-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
            aria-label="Back to chat list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="w-9 h-9 rounded-full bg-[var(--color-avatar-bg)] border border-[var(--color-border)] flex items-center justify-center text-xs font-semibold text-[var(--color-avatar-text)] shrink-0 mr-2.5">
            {contact.initials}
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[var(--color-text)] truncate leading-tight">
              {contact.name}
            </h2>
            <p className="text-[11px] text-[var(--color-text-secondary)] leading-tight capitalize">
              {effectiveStatusText}
            </p>
          </div>
        </div>

        {/* Battery Status Icon */}
        <div
          className="flex items-center space-x-1 px-2 py-1 rounded bg-[var(--color-bg-app)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] shrink-0"
          title={`Radio Node Battery: ${batteryLevel}% ${isCharging ? '(Charging)' : ''}`}
        >
          {isCharging ? (
            <BatteryCharging className="w-3.5 h-3.5 text-[var(--color-delivered)]" />
          ) : (
            <BatteryMedium className="w-3.5 h-3.5" />
          )}
          <span className="font-mono text-[10px] text-[var(--color-text)]">{batteryLevel}%</span>
        </div>
      </header>

      {/* Out of Range Banner if applicable */}
      {effectiveStatusText === 'out of range' && (
        <div className="px-3 py-1.5 bg-[var(--color-header)] border-b border-[var(--color-border)] flex items-center space-x-2 text-xs text-[var(--color-text-secondary)]">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Contact is out of range. Outgoing messages will stay pending until you move closer.</span>
        </div>
      )}

      {speechError && (
        <div className="px-3 py-1 bg-[var(--color-header)] border-b border-[var(--color-border)] text-[11px] text-[var(--color-text-secondary)] text-center">
          {speechError}
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        <div className="text-center my-2">
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)] bg-[var(--color-header)] px-2.5 py-1 rounded border border-[var(--color-border)]">
            End-to-End Mesh Encrypted · Long-press for GPS
          </span>
        </div>

        {messages.map((msg) => {
          const isMe = msg.sender === 'me';
          const isSos = msg.isSos;
          const CategoryIcon = msg.sosCategory ? CATEGORY_ICONS[msg.sosCategory] : HeartPulse;

          return (
            <div
              key={msg.id}
              className={`flex flex-col animate-message-in ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div
                onTouchStart={() => startLongPress(msg)}
                onTouchEnd={cancelLongPress}
                onTouchMove={cancelLongPress}
                onMouseDown={() => startLongPress(msg)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onLongPressMessage(msg);
                }}
                className={`relative max-w-[85%] px-3.5 py-2.5 rounded-lg text-sm select-none cursor-pointer transition-colors ${
                  isSos
                    ? 'bg-[var(--color-surface)] border-l-4 border-l-[var(--color-sos)] border-y border-r border-[var(--color-border)] shadow-sm'
                    : isMe
                    ? 'bg-[var(--color-bubble-me)] text-[var(--color-text)] border border-[var(--color-bubble-me-border)] rounded-tr-none'
                    : 'bg-[var(--color-bubble-received)] text-[var(--color-text)] border border-[var(--color-bubble-received-border)] rounded-tl-none shadow-sm'
                }`}
              >
                {!isMe && msg.senderName && contact.isGroup && !isSos && (
                  <p className="text-[10px] font-semibold text-[var(--color-text-secondary)] mb-0.5">
                    {msg.senderName}
                  </p>
                )}

                {/* Special SOS Broadcast Header */}
                {isSos && (
                  <div className="mb-1.5 pb-1.5 border-b border-[var(--color-border)]">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center space-x-1.5 text-[var(--color-sos)] font-bold">
                        <CategoryIcon className="w-3.5 h-3.5" />
                        <span>SOS</span>
                        {msg.sosCategory && (
                          <span className="text-[11px] font-semibold text-[var(--color-text)]">
                            {msg.sosCategory}
                          </span>
                        )}
                      </div>

                      {/* Small Outlined Priority Label */}
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wide ${
                          msg.priority === 'Critical' || !msg.priority
                            ? 'border-[var(--color-sos)] text-[var(--color-sos)]'
                            : msg.priority === 'High'
                            ? 'border-amber-500 text-amber-500'
                            : 'border-emerald-500 text-emerald-500'
                        }`}
                      >
                        {msg.priority || 'Critical'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[var(--color-text-secondary)] font-['IBM_Plex_Mono',monospace]">
                      <span>
                        {msg.lat.toFixed(5)}, {msg.lng.toFixed(5)}
                      </span>
                      <span>{formatTime24(msg.timestamp)}</span>
                    </div>
                  </div>
                )}

                <p className="break-words leading-relaxed text-[var(--color-text)]">{msg.text}</p>

                <div className="flex items-center justify-end space-x-1 mt-1 text-[11px] text-[var(--color-text-secondary)]">
                  {msg.isEncrypted !== false && (
                    <span title="Encrypted" className="text-[10px] text-emerald-500 flex items-center mr-0.5">
                      <Lock className="w-2.5 h-2.5 mr-0.5" />
                    </span>
                  )}
                  {!isSos && <span>{formatTime24(msg.timestamp)}</span>}
                  {isMe && <StatusTick status={msg.status} className="w-3 h-3 ml-0.5" />}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Offline Keyword Classifier Suggestion Bar */}
      {suggestedCategory && (
        <div className="px-3 py-1.5 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex items-center justify-between text-xs animate-message-in z-20">
          <div className="flex items-center space-x-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-sos)]" />
            <span className="text-[var(--color-text)]">
              Suggested: <strong className="font-semibold text-[var(--color-sos)]">{suggestedCategory.category}</strong>
            </span>
            <span className="text-[10px] text-[var(--color-text-secondary)]">({suggestedCategory.priority})</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={handleAcceptSuggestion}
              className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--color-sos)] text-white hover:bg-[var(--color-sos-hover)] transition-colors cursor-pointer"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={handleIgnoreSuggestion}
              className="px-2 py-0.5 rounded text-[11px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
            >
              Ignore
            </button>
          </div>
        </div>
      )}

      {/* Active Accepted Category Tag Display */}
      {acceptedCategory && (
        <div className="px-3 py-1 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex items-center justify-between text-xs z-20">
          <div className="flex items-center space-x-1.5 text-[var(--color-sos)] font-semibold text-[11px]">
            <span>Tagged as Emergency: {acceptedCategory.category}</span>
            <span className="text-[10px] uppercase border border-[var(--color-sos)] px-1 rounded">
              {acceptedCategory.priority}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAcceptedCategory(null)}
            className="text-[10px] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer"
          >
            Remove Tag
          </button>
        </div>
      )}

      {/* Bottom Input Bar */}
      <div className="p-2.5 bg-[var(--color-header)] border-t border-[var(--color-border)] flex items-center space-x-2 shrink-0">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening ? 'Listening via microphone...' : 'Type a message'
            }
            className={`w-full bg-[var(--color-input-bg)] text-sm text-[var(--color-text)] placeholder-[var(--color-text-secondary)] px-3.5 py-2.5 rounded-full border ${
              isListening ? 'border-[var(--color-delivered)]' : 'border-[var(--color-border)]'
            } focus:outline-none focus:border-[var(--color-text-secondary)]`}
          />
        </div>

        {/* Microphone Button */}
        <button
          type="button"
          onClick={handleToggleVoice}
          className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
            isListening
              ? 'bg-[var(--color-bubble-me)] border-[var(--color-delivered)] text-[var(--color-delivered)]'
              : 'bg-[var(--color-input-bg)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
          }`}
          title={isListening ? 'Stop listening' : 'Voice to text'}
          aria-label="Microphone"
        >
          <Mic className="w-4 h-4" />
        </button>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!inputText.trim()}
          className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
            inputText.trim()
              ? 'bg-[var(--color-bubble-me)] border-[var(--color-delivered)]/40 text-[var(--color-text)] hover:bg-[var(--color-bubble-me-hover)]'
              : 'bg-[var(--color-input-bg)] border-[var(--color-border)] text-[var(--color-text-secondary)]/40 cursor-not-allowed'
          }`}
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
