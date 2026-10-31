export type MessageStatus = 'pending' | 'sent' | 'relayed' | 'delivered';
export type ThemeMode = 'dark' | 'light' | 'system';
export type SosCategory = 'Medical' | 'Fire' | 'Flood' | 'Trapped' | 'Supplies' | 'Security';
export type SosPriority = 'Critical' | 'High' | 'Normal';
export type IncidentStatus = 'New' | 'Acknowledged' | 'Dispatched' | 'Resolved';
export type UserRole = 'User' | 'Responder';
export type NodeState = 'online' | 'relaying' | 'low battery' | 'offline';

export interface SafeZone {
  id: string;
  name: string;
  category: 'Shelter' | 'Medical Post' | 'Food & Water' | 'Evacuation Point';
  lat: number;
  lng: number;
  capacity?: string;
  details?: string;
  createdBy: string;
  timestamp: number;
}

export interface ActiveSos {
  id: string;
  category: SosCategory;
  priority: SosPriority;
  incidentStatus: IncidentStatus;
  timestamp: number;
  lat: number;
  lng: number;
  status: MessageStatus;
  relayedNodes: string[];
  senderName?: string;
  senderNodeId?: string;
}

export interface Message {
  id: string;
  chatId: string;
  sender: 'me' | 'contact';
  senderName?: string;
  text: string;
  timestamp: number; // Unix timestamp in ms
  status: MessageStatus;
  lat: number;
  lng: number;
  isSos?: boolean;
  sosCategory?: SosCategory;
  priority?: SosPriority;
  relayedNodes?: string[];
  isEncrypted?: boolean;
}

export interface Contact {
  id: string;
  name: string;
  initials: string;
  isGroup?: boolean;
  baseStatusText: 'nearby' | 'via 1 hop' | 'via 2 hops' | 'out of range';
  outOfRangeByDefault?: boolean;
  distanceMeters: number;
  lastSeen: string;
  unreadCount: number;
  isSos?: boolean;
  batteryPercent?: number;
  signalDbm?: number;
  nodeState?: NodeState;
  lat?: number;
  lng?: number;
  hopsAway?: number;
}

export interface MeshSettings {
  movedCloser: boolean;
  userNodeId: string;
  autoRepliesEnabled: boolean;
  theme: ThemeMode;
  role: UserRole;
}
