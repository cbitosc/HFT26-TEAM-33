import { Contact, Message, MeshSettings, ThemeMode, ActiveSos, UserRole, IncidentStatus, SosPriority, SosCategory } from './types';

export const INITIAL_SETTINGS: MeshSettings = {
  movedCloser: false,
  userNodeId: 'NODE-7F42',
  autoRepliesEnabled: true,
  theme: 'dark',
  role: 'User',
};

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'broadcast',
    name: 'Nearby (Broadcast)',
    initials: 'NB',
    isGroup: true,
    baseStatusText: 'nearby',
    distanceMeters: 42,
    lastSeen: 'just now',
    unreadCount: 0,
    batteryPercent: 92,
    signalDbm: -65,
    nodeState: 'relaying',
    lat: 17.36035,
    lng: 78.47025,
    hopsAway: 0,
  },
  {
    id: 'sarah',
    name: 'Sarah Jenkins',
    initials: 'SJ',
    baseStatusText: 'nearby',
    distanceMeters: 48,
    lastSeen: '2m ago',
    unreadCount: 1,
    batteryPercent: 75,
    signalDbm: -68,
    nodeState: 'online',
    lat: 17.36030,
    lng: 78.47040,
    hopsAway: 0,
  },
  {
    id: 'marcus',
    name: 'Marcus Vance',
    initials: 'MV',
    baseStatusText: 'via 1 hop',
    distanceMeters: 135,
    lastSeen: '12m ago',
    unreadCount: 0,
    batteryPercent: 88,
    signalDbm: -82,
    nodeState: 'relaying',
    lat: 17.36095,
    lng: 78.47110,
    hopsAway: 1,
  },
  {
    id: 'elena',
    name: 'Elena Rostova (Medic)',
    initials: 'ER',
    baseStatusText: 'nearby',
    distanceMeters: 80,
    lastSeen: '25m ago',
    unreadCount: 0,
    batteryPercent: 22,
    signalDbm: -74,
    nodeState: 'low battery',
    lat: 17.35940,
    lng: 78.46950,
    hopsAway: 0,
  },
  {
    id: 'david',
    name: 'David K. (Radio OP)',
    initials: 'DK',
    baseStatusText: 'out of range',
    outOfRangeByDefault: true,
    distanceMeters: 260,
    lastSeen: '3h ago',
    unreadCount: 0,
    batteryPercent: 64,
    signalDbm: -98,
    nodeState: 'offline',
    lat: 17.36190,
    lng: 78.47210,
    hopsAway: 2,
  },
];

export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

const now = Date.now();

export const INITIAL_MESSAGES: Message[] = [
  {
    id: 'msg-b1',
    chatId: 'broadcast',
    sender: 'contact',
    senderName: 'Mesh Relay 01',
    text: 'EMERGENCY BROADCAST: Cellular networks offline. Mesh packet routing active.',
    timestamp: now - 18 * 60 * 1000,
    status: 'delivered',
    lat: 17.3612,
    lng: 78.4725,
  },
  {
    id: 'msg-b2',
    chatId: 'broadcast',
    sender: 'contact',
    senderName: 'Node 04',
    text: 'Relay antenna operational on ridge. 868MHz clear.',
    timestamp: now - 12 * 60 * 1000,
    status: 'delivered',
    lat: 17.3621,
    lng: 78.471,
  },
  {
    id: 'msg-s1',
    chatId: 'sarah',
    sender: 'contact',
    text: 'Are you near the muster point?',
    timestamp: now - 8 * 60 * 1000,
    status: 'delivered',
    lat: 17.3605,
    lng: 78.4704,
  },
  {
    id: 'msg-s2',
    chatId: 'sarah',
    sender: 'me',
    text: 'Yes, standing by at the north gate.',
    timestamp: now - 5 * 60 * 1000,
    status: 'delivered',
    lat: 17.36,
    lng: 78.47,
  },
  {
    id: 'msg-s3',
    chatId: 'sarah',
    sender: 'contact',
    text: 'Stay there, moving toward your coordinates with supplies.',
    timestamp: now - 2 * 60 * 1000,
    status: 'delivered',
    lat: 17.3606,
    lng: 78.4703,
  },
  {
    id: 'msg-m1',
    chatId: 'marcus',
    sender: 'contact',
    text: 'Relaying your packets via Node 03. Signal strength is stable.',
    timestamp: now - 35 * 60 * 1000,
    status: 'delivered',
    lat: 17.3635,
    lng: 78.4682,
  },
  {
    id: 'msg-e1',
    chatId: 'elena',
    sender: 'contact',
    text: 'First aid post established at Sector 2 community center.',
    timestamp: now - 50 * 60 * 1000,
    status: 'delivered',
    lat: 17.3592,
    lng: 78.4715,
  },
  {
    id: 'msg-d1',
    chatId: 'david',
    sender: 'contact',
    text: 'Radio check from mountain outpost. Signal marginal.',
    timestamp: now - 180 * 60 * 1000,
    status: 'delivered',
    lat: 17.375,
    lng: 78.482,
  },
];

export function formatTime24(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function getCurrentCoordinates(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: Number(pos.coords.latitude.toFixed(5)),
            lng: Number(pos.coords.longitude.toFixed(5)),
          });
        },
        () => {
          resolve({ lat: 17.36, lng: 78.47 });
        },
        { timeout: 2500, enableHighAccuracy: true }
      );
    } else {
      resolve({ lat: 17.36, lng: 78.47 });
    }
  });
}

const STORAGE_KEY_CONTACTS = 'meshaid_contacts_v1';
const STORAGE_KEY_MESSAGES = 'meshaid_messages_v1';
const STORAGE_KEY_SETTINGS = 'meshaid_settings_v1';
const STORAGE_KEY_THEME = 'meshaid_theme_v1';

export function getStoredTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved === 'dark' || saved === 'light' || saved === 'system') {
      return saved as ThemeMode;
    }
  } catch {}
  return 'dark';
}

export function applyTheme(theme: ThemeMode, withTransition = true) {
  if (typeof window === 'undefined') return;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const root = document.documentElement;
  if (withTransition) {
    root.classList.add('theme-fade');
    window.setTimeout(() => {
      root.classList.remove('theme-fade');
    }, 250);
  }

  if (isDark) {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }

  try {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  } catch {}
}

export function loadSavedContacts(): Contact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONTACTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to load contacts from localStorage', e);
  }
  return INITIAL_CONTACTS;
}

export function saveContacts(contacts: Contact[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(contacts));
  } catch (e) {
    console.error('Failed to save contacts', e);
  }
}

export function loadSavedMessages(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MESSAGES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to load messages from localStorage', e);
  }
  return INITIAL_MESSAGES;
}

export function saveMessages(messages: Message[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
  } catch (e) {
    console.error('Failed to save messages', e);
  }
}

export function loadSavedSettings(): MeshSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    const storedTheme = getStoredTheme();
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...INITIAL_SETTINGS, ...parsed, theme: parsed.theme || storedTheme };
    }
    return { ...INITIAL_SETTINGS, theme: storedTheme };
  } catch (e) {
    console.error('Failed to load settings', e);
  }
  return { ...INITIAL_SETTINGS, theme: getStoredTheme() };
}

export function saveSettings(settings: MeshSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    localStorage.setItem(STORAGE_KEY_THEME, settings.theme);
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

const STORAGE_KEY_ACTIVE_SOS = 'meshaid_active_sos_v1';
const STORAGE_KEY_INCIDENTS = 'meshaid_incidents_v1';

export const INITIAL_INCIDENTS: ActiveSos[] = [
  {
    id: 'inc-01',
    category: 'Medical',
    priority: 'Critical',
    incidentStatus: 'New',
    timestamp: now - 14 * 60 * 1000,
    lat: 17.36000,
    lng: 78.47000,
    status: 'delivered',
    relayedNodes: ['Local Node NODE-7F42 (Hop 0)', 'Node 04 (Ridge Repeater - Hop 1)'],
    senderName: 'Sarah Jenkins',
    senderNodeId: 'NODE-SJ01',
  },
  {
    id: 'inc-02',
    category: 'Fire',
    priority: 'Critical',
    incidentStatus: 'Acknowledged',
    timestamp: now - 35 * 60 * 1000,
    lat: 17.36210,
    lng: 78.47100,
    status: 'delivered',
    relayedNodes: ['Node 04 (Sector 4 Ridge Repeater - Hop 1)'],
    senderName: 'Elena Rostova',
    senderNodeId: 'NODE-04',
  },
  {
    id: 'inc-03',
    category: 'Supplies',
    priority: 'Normal',
    incidentStatus: 'Dispatched',
    timestamp: now - 65 * 60 * 1000,
    lat: 17.36095,
    lng: 78.47110,
    status: 'delivered',
    relayedNodes: ['Node 03', 'Node 08 Base'],
    senderName: 'Marcus Vance',
    senderNodeId: 'NODE-MV03',
  },
];

export function loadSavedActiveSos(): ActiveSos | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_SOS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function saveActiveSos(sos: ActiveSos | null): void {
  try {
    if (sos) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_SOS, JSON.stringify(sos));
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_SOS);
    }
  } catch {}
}

export function loadSavedIncidents(): ActiveSos[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_INCIDENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_INCIDENTS;
}

export function saveIncidents(incidents: ActiveSos[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_INCIDENTS, JSON.stringify(incidents));
  } catch (e) {
    console.error('Failed to save incidents', e);
  }
}

export function triggerVibration(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {}
}

export const AUTO_REPLIES: Record<string, string[]> = {
  broadcast: [
    'Node 04: Copy that. Relayed across Sector 4 mesh.',
    'Node 02: Emergency beacon acknowledged.',
    'Node 09: Standby on UHF backup channel.',
    'Relay Alpha: Packet distributed to 4 active nodes.',
  ],
  sarah: [
    'Copy that. Staying in place at north checkpoint.',
    'Battery is at 75%. Radio connection clear.',
    'Understood, will ping you if position changes.',
    'Received your packet. We have medical supplies ready.',
  ],
  marcus: [
    'Received via 1 hop. Signal quality 88%.',
    'Relayed your transmission to the hill repeater.',
    'Loud and clear. Standing by for updates.',
  ],
  elena: [
    'Elena here: First aid station has power and bandages.',
    'Copy. Alerting volunteer team in Sector 2.',
    'Acknowledged. Keeping emergency channel open.',
  ],
  david: [
    'Loud and clear! Signal reached the mountain outpost.',
    'David here. Direct mesh packet acknowledged.',
    'Repeater link working smoothly now.',
  ],
};
