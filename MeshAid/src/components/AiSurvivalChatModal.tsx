import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Wifi, WifiOff, Sparkles, AlertCircle } from 'lucide-react';

interface AiMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: number;
}

interface AiSurvivalChatModalProps {
  onClose: () => void;
}

// Built-in offline emergency knowledge base for instant survival answers
const OFFLINE_SURVIVAL_KB: { keywords: string[]; answer: string }[] = [
  {
    keywords: ['cpr', 'heart', 'cardiac', 'pulse', 'resuscitate'],
    answer:
      '🩺 ADULT CPR INSTRUCTIONS:\n1. Check responsiveness & breathing.\n2. Call for help immediately.\n3. Hand placement: Center of the chest (lower half of breastbone).\n4. Push HARD and FAST: 100–120 compressions per minute (to the beat of "Stayin\' Alive").\n5. Depth: At least 2 inches (5 cm).\n6. Give 30 compressions followed by 2 rescue breaths (or continuous compressions if untrained).',
  },
  {
    keywords: ['bleed', 'blood', 'wound', 'cut', 'hemorrhage'],
    answer:
      '🩹 SEVERE BLEEDING PROTOCOL:\n1. Apply FIRM, DIRECT PRESSURE using a clean cloth, bandage, or clothing.\n2. Do NOT remove soaked cloths — add more on top.\n3. Elevate injured limb above heart level if possible.\n4. If bleeding does not stop and is life-threatening, apply a tourniquet 2–3 inches above wound (never directly over a joint) and tighten until bleeding ceases.',
  },
  {
    keywords: ['burn', 'fire', 'scald', 'hot'],
    answer:
      '🔥 BURN FIRST AID:\n1. Cool burn immediately with cool running water for at least 10–20 minutes.\n2. Do NOT use ice, butter, or oil.\n3. Cover loosely with sterile, non-stick dressing or clean plastic wrap.\n4. Do NOT pop any blisters.\n5. Keep the victim warm and hydrated.',
  },
  {
    keywords: ['choking', 'airway', 'breathe', 'heimlich'],
    answer:
      '🗣️ CHOKING (HEIMLICH MANEUVER):\n1. Stand behind victim and wrap arms around waist.\n2. Make a fist with one hand, place thumb side just above navel.\n3. Grasp fist with other hand.\n4. Give quick, upward inward thrusts until object is expelled.\n5. If victim becomes unconscious, lower to ground and begin CPR compressions.',
  },
  {
    keywords: ['water', 'purify', 'drink', 'dehydration'],
    answer:
      '💧 EMERGENCY WATER PURIFICATION:\n1. Boiling: Bring water to a rolling boil for at least 1 full minute (3 mins at high altitudes).\n2. Disinfection: Add 2 drops of unscented household bleach per liter of clear water (4 drops if cloudy). Wait 30 minutes before drinking.\n3. Filtration: Filter through clean cloth or sand/charcoal layers before boiling.',
  },
  {
    keywords: ['earthquake', 'quake', 'tremor'],
    answer:
      '🏚️ EARTHQUAKE SAFETY:\n1. DROP to your hands and knees.\n2. COVER your head and neck under a sturdy table or desk.\n3. HOLD ON until shaking stops completely.\n4. Stay away from windows, exterior walls, and falling objects.\n5. If trapped under rubble: Tap on a pipe or wall with an object so rescuers can hear you. Avoid shouting unless necessary to conserve air.',
  },
];

export const AiSurvivalChatModal: React.FC<AiSurvivalChatModalProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: 'ai-welcome',
      sender: 'ai',
      text: 'Hello, I am your Emergency AI Assistant. I can guide you through CPR, trauma first aid, water purification, and survival protocols. When connected to the internet, I can also translate messages or answer custom survival queries!',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : false
  );
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || isLoading) return;

    const userMsg: AiMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // 1. Check local emergency KB first for instantaneous response
    const queryLower = query.toLowerCase();
    const match = OFFLINE_SURVIVAL_KB.find((item) =>
      item.keywords.some((kw) => queryLower.includes(kw))
    );

    if (match) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: 'ai',
            text: match.answer,
            timestamp: Date.now(),
          },
        ]);
        setIsLoading(false);
      }, 500);
      return;
    }

    // 2. If online, connect to live LLM or translation API
    if (isOnline) {
      try {
        const response = await fetch('https://text.pollinations.ai/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content:
                  'You are MeshAid AI, an urgent disaster emergency survival assistant. Keep responses clear, bulleted, concise, and focused on saving lives, first aid, or translating phrases directly.',
              },
              { role: 'user', content: query },
            ],
          }),
        });

        if (response.ok) {
          const aiResponseText = await response.text();
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              sender: 'ai',
              text: aiResponseText,
              timestamp: Date.now(),
            },
          ]);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn('AI online fetch failed:', err);
      }
    }

    // 3. Fallback when offline or API unreachable
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: isOnline
            ? "I encountered an issue connecting to the AI cloud service. For emergencies, please consult the CPR, bleeding, fire, or earthquake protocols."
            : "⚠️ You are currently offline with zero internet. You can still ask me about CPR, bleeding control, burns, choking (Heimlich), water purification, and earthquake survival!",
          timestamp: Date.now(),
        },
      ]);
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-md w-full h-[85dvh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <header className="px-4 py-3 bg-[var(--color-header)] border-b border-[var(--color-border)] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h2 className="text-xs font-bold text-[var(--color-text)]">MeshAid Survival AI</h2>
                <Sparkles className="w-3 h-3 text-amber-400" />
              </div>
              <div className="flex items-center space-x-1 mt-0.5">
                {isOnline ? (
                  <span className="flex items-center text-[10px] text-emerald-400 font-mono">
                    <Wifi className="w-2.5 h-2.5 mr-1" /> ONLINE (Full AI + Translation)
                  </span>
                ) : (
                  <span className="flex items-center text-[10px] text-amber-400 font-mono">
                    <WifiOff className="w-2.5 h-2.5 mr-1" /> OFFLINE (Local Medical KB Active)
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--color-bg-app)]">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs leading-relaxed whitespace-pre-wrap ${
                  m.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] rounded-bl-none'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl rounded-bl-none px-3.5 py-2 text-xs text-[var(--color-text-secondary)] flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span>Consulting survival protocol...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Preset Quick Action Buttons */}
        <div className="px-3 py-2 bg-[var(--color-header)]/60 border-t border-[var(--color-border)] flex items-center space-x-1.5 overflow-x-auto shrink-0">
          {['How to do CPR?', 'Severe bleeding', 'Water purification', 'Translate: Help us'].map(
            (q) => (
              <button
                key={q}
                type="button"
                onClick={() => setInput(q)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-[var(--color-bg-app)] border border-[var(--color-border)] text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer transition-colors"
              >
                {q}
              </button>
            )
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSend}
          className="p-3 bg-[var(--color-header)] border-t border-[var(--color-border)] flex items-center space-x-2 shrink-0"
        >
          <input
            type="text"
            placeholder={
              isOnline
                ? 'Ask medical/survival query or translation...'
                : 'Ask CPR, burns, bleeding, earthquake survival...'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-[var(--color-bg-app)] border border-[var(--color-border)] rounded-full px-4 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white flex items-center justify-center shrink-0 shadow-md cursor-pointer transition-transform active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
