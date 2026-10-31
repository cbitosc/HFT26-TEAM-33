/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Contact,
  Message,
  MessageStatus,
  MeshSettings,
  ThemeMode,
  ActiveSos,
  SosCategory,
  SosPriority,
  IncidentStatus,
} from './types';
import {
  INITIAL_CONTACTS,
  INITIAL_MESSAGES,
  INITIAL_SETTINGS,
  loadSavedContacts,
  saveContacts,
  loadSavedMessages,
  saveMessages,
  loadSavedSettings,
  saveSettings,
  loadSavedActiveSos,
  saveActiveSos,
  loadSavedIncidents,
  saveIncidents,
  applyTheme,
  getCurrentCoordinates,
} from './utils';
import { ChatsList } from './components/ChatsList';
import { ChatScreen } from './components/ChatScreen';
import { MapScreen } from './components/MapScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { IncidentsScreen } from './components/IncidentsScreen';
import { BottomTabBar, TabType } from './components/BottomTabBar';
import { MessageDetailModal } from './components/MessageDetailModal';
import { SosScreen } from './components/SosScreen';
import { ActiveSosBanner } from './components/ActiveSosBanner';
import { SplashScreen } from './components/SplashScreen';
import { IncomingSosModal } from './components/IncomingSosModal';
import { SafeZoneModal } from './components/SafeZoneModal';
import { AiSurvivalChatModal } from './components/AiSurvivalChatModal';
import { playSosAlarm, stopSosAlarm } from './alarm';
import { LanguageCode, getSavedLanguage, saveLanguage } from './i18n';
import { AlertOctagon, Bot } from 'lucide-react';
import { startMesh, sendPacket, MeshPeer } from './mesh';
import { SafeZone } from './types';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('chats');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const [contacts, setContacts] = useState<Contact[]>(loadSavedContacts);
  const [messages, setMessages] = useState<Message[]>(loadSavedMessages);
  const [settings, setSettings] = useState<MeshSettings>(loadSavedSettings);
  const [activeSos, setActiveSos] = useState<ActiveSos | null>(loadSavedActiveSos);
  const [incidents, setIncidents] = useState<ActiveSos[]>(loadSavedIncidents);
  const [highlightedIncident, setHighlightedIncident] = useState<ActiveSos | null>(null);
  const [peerCount, setPeerCount] = useState(0); // real phones connected right now
  const [meshPeers, setMeshPeers] = useState<MeshPeer[]>([]); // list of connected mesh phones

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({
    lat: 17.36,
    lng: 78.47,
  });

  const [inspectedMessage, setInspectedMessage] = useState<Message | null>(null);
  const [isSosScreenOpen, setIsSosScreenOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<LanguageCode>(getSavedLanguage);
  const [incomingCriticalSos, setIncomingCriticalSos] = useState<ActiveSos | null>(null);

  // Safe Zones & AI Bot State
  const [safeZones, setSafeZones] = useState<SafeZone[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('meshaid_safezones_v1') || '[]');
    } catch {
      return [];
    }
  });
  const [isSafeZoneModalOpen, setIsSafeZoneModalOpen] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  // Animation states
  const [recentlyUpdatedChatId, setRecentlyUpdatedChatId] = useState<string | null>(null);

  // Active timers for mesh progression
  const activeTimersRef = useRef<{ [key: string]: number[] }>({});
  const highlightTimeoutRef = useRef<number | null>(null);

  // Apply theme on mount and whenever theme changes
  useEffect(() => {
    applyTheme(settings.theme || 'dark', false);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (settings.theme === 'system') {
        applyTheme('system', true);
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange);
    };
  }, [settings.theme]);

  // Fetch real browser geolocation on mount
  useEffect(() => {
    getCurrentCoordinates().then((coords) => {
      setUserCoords(coords);
    });
  }, []);

  // Sync to localStorage
  useEffect(() => {
    saveContacts(contacts);
  }, [contacts]);

  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveActiveSos(activeSos);
  }, [activeSos]);

  useEffect(() => {
    saveIncidents(incidents);
  }, [incidents]);

  useEffect(() => {
    try {
      localStorage.setItem('meshaid_safezones_v1', JSON.stringify(safeZones));
    } catch {}
  }, [safeZones]);

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      Object.values(activeTimersRef.current).forEach((timerList) => {
        timerList.forEach((t) => window.clearTimeout(t));
      });
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  const triggerRowHighlight = useCallback((chatId: string) => {
    setRecentlyUpdatedChatId(chatId);
    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = window.setTimeout(() => {
      setRecentlyUpdatedChatId(null);
    }, 650);
  }, []);

  const isContactOutOfRange = useCallback(
    (contactId: string) => {
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact) return false;
      return contact.outOfRangeByDefault && !settings.movedCloser;
    },
    [contacts, settings.movedCloser]
  );

  const progressMessageTransmission = useCallback(
    (msgId: string, chatId: string) => {
      if (activeTimersRef.current[msgId]) {
        activeTimersRef.current[msgId].forEach((t) => window.clearTimeout(t));
      }
      activeTimersRef.current[msgId] = [];

      const setStatus = (status: MessageStatus) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, status } : m))
        );
      };

      const t1 = window.setTimeout(() => {
        setStatus('sent');

        const t2 = window.setTimeout(() => {
          setStatus('relayed');

          const t3 = window.setTimeout(() => {
            setStatus('delivered');
          }, 1200);

          activeTimersRef.current[msgId]?.push(t3);
        }, 1300);

        activeTimersRef.current[msgId]?.push(t2);
      }, 1100);

      activeTimersRef.current[msgId].push(t1);
    },
    []
  );

  useEffect(() => {
    if (settings.movedCloser) {
      const pendingMsgs = messages.filter(
        (m) => m.sender === 'me' && m.status === 'pending'
      );

      pendingMsgs.forEach((msg) => {
        progressMessageTransmission(msg.id, msg.chatId);
      });
    }
  }, [settings.movedCloser, messages, progressMessageTransmission]);

  // ---- REAL MESH: start Bluetooth/Wi-Fi mesh and receive packets from other phones ----
  useEffect(() => {
    let stopMesh: (() => void) | undefined;
    let cancelled = false;
    startMesh({
      onPeers: (count, peerList) => {
        setPeerCount(count);
        setMeshPeers(peerList);

        // Dynamically add or update discovered real mesh phones in the Contacts list
        setContacts((prev) => {
          const list = [...prev];
          peerList.forEach((peer, idx) => {
            const peerId = peer.name;
            const peerLabel = peer.name.startsWith('NODE-')
              ? `Phone ${idx + 1} (${peer.name})`
              : peer.name;

            const existingIdx = list.findIndex((c) => c.id === peerId);
            if (existingIdx >= 0) {
              list[existingIdx] = {
                ...list[existingIdx],
                name: peerLabel,
                baseStatusText: 'nearby',
                lastSeen: 'online now',
                nodeState: 'online',
              };
            } else {
              list.push({
                id: peerId,
                name: peerLabel,
                initials: `P${idx + 1}`,
                isGroup: false,
                baseStatusText: 'nearby',
                distanceMeters: 10 + idx * 8,
                lastSeen: 'online now',
                unreadCount: 0,
                nodeState: 'online',
                batteryPercent: 85,
                signalDbm: -65,
                lat: userCoords.lat + (idx + 1) * 0.0002,
                lng: userCoords.lng + (idx + 1) * 0.0002,
                hopsAway: 0,
              });
            }
          });
          return list;
        });
      },
      onPacket: (p) => {
        // Determine conversation channel:
        // Broadcasts & SOS go to 'broadcast', while targeted 1-on-1 messages go to p.fromNode!
        const targetChatId = (p.toNode && p.toNode !== 'broadcast') ? p.fromNode : 'broadcast';

        // Auto-register peer in contacts list if not yet present
        setContacts((prev) => {
          const exists = prev.some((c) => c.id === p.fromNode);
          if (exists) {
            return prev.map((c) => {
              if (c.id === p.fromNode) {
                return {
                  ...c,
                  lastSeen: 'just now',
                  unreadCount: activeChatId === targetChatId ? 0 : (c.unreadCount || 0) + 1,
                };
              }
              return c;
            });
          }
          const initials = (p.fromName || p.fromNode).slice(0, 2).toUpperCase();
          const newPeerContact: Contact = {
            id: p.fromNode,
            name: p.fromName || `Phone (${p.fromNode})`,
            initials,
            isGroup: false,
            baseStatusText: 'nearby',
            distanceMeters: 12,
            lastSeen: 'just now',
            unreadCount: activeChatId === targetChatId ? 0 : 1,
            batteryPercent: 80,
            signalDbm: -70,
            nodeState: 'online',
            lat: p.lat,
            lng: p.lng,
            hopsAway: 0,
          };
          return [...prev, newPeerContact];
        });

        setMessages((prev) =>
          prev.some((m) => m.id === p.pid)
            ? prev
            : [
                ...prev,
                {
                  id: p.pid,
                  chatId: targetChatId,
                  sender: 'contact',
                  senderName: p.fromName,
                  text: p.text,
                  timestamp: p.ts,
                  status: 'delivered',
                  lat: p.lat,
                  lng: p.lng,
                  isSos: p.kind === 'sos',
                  sosCategory: p.category,
                  priority: p.priority,
                  relayedNodes: p.hops,
                  isEncrypted: p.isEncrypted,
                },
              ]
        );
        if (p.kind === 'sos' && p.category) {
          const incId = `inc-${p.pid}`;
          const incomingData: ActiveSos = {
            id: incId,
            category: p.category as SosCategory,
            priority: p.priority ?? 'Critical',
            incidentStatus: 'New',
            timestamp: p.ts,
            lat: p.lat,
            lng: p.lng,
            status: 'delivered',
            relayedNodes: p.hops,
            senderName: p.fromName,
            senderNodeId: p.fromNode,
          };
          setIncidents((prev) =>
            prev.some((i) => i.id === incId) ? prev : [incomingData, ...prev]
          );

          // SOUND BUZZER & VIBRATION + FULL-SCREEN POPUP NOTIFICATION
          playSosAlarm();
          setIncomingCriticalSos(incomingData);
        }

        // Receive SafeZone broadcast over mesh
        if (p.kind === 'safezone' && p.safeZoneData) {
          const sz = p.safeZoneData as SafeZone;
          setSafeZones((prev) =>
            prev.some((item) => item.id === sz.id) ? prev : [sz, ...prev]
          );
        }

        triggerRowHighlight(targetChatId);
      },
    })
      .then((stop) => {
        if (cancelled) stop();
        else stopMesh = stop;
      })
      .catch((e) => console.error('Mesh start failed', e));
    return () => {
      cancelled = true;
      stopMesh?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle sending message with optional classified category & priority
  const handleSendMessage = async (
    text: string,
    isEmergency = false,
    sosCategory?: SosCategory,
    priority?: SosPriority
  ) => {
    if (!activeChatId) return;

    const coords = await getCurrentCoordinates();
    setUserCoords(coords);

    const isOutOfRange = isContactOutOfRange(activeChatId);
    const isBroadcast = activeChatId === 'broadcast';
    const destinationNode = isBroadcast ? 'broadcast' : activeChatId;

    const newMsg: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      chatId: activeChatId,
      sender: 'me',
      text,
      timestamp: Date.now(),
      status: 'pending',
      lat: coords.lat,
      lng: coords.lng,
      isSos: isEmergency,
      sosCategory,
      priority,
      isEncrypted: true,
    };

    setMessages((prev) => [...prev, newMsg]);
    triggerRowHighlight(activeChatId);

    // Look up connected peer endpoint if doing direct 1-to-1 transmission
    const matchedPeer = meshPeers.find(
      (p) => p.name === activeChatId || p.endpointId === activeChatId
    );

    // REAL MESH: Transmit packet via Nearby Connections.
    // Targeted packets (toNode = Phone 1) are dropped by Phone 2's privacy filter,
    // so Phone 2 never sees messages sent between you and Phone 1!
    await sendPacket(
      {
        pid: newMsg.id,
        kind: isEmergency && sosCategory ? 'sos' : 'chat',
        toNode: destinationNode,
        toName: isBroadcast ? 'Broadcast' : activeContact?.name,
        text,
        ts: newMsg.timestamp,
        lat: coords.lat,
        lng: coords.lng,
        category: sosCategory,
        priority,
      },
      matchedPeer?.endpointId
    ).catch(err => console.error('[App] sendPacket failed:', err));

    // If accepted emergency category from keyword classifier, log as incident for responders
    if (isEmergency && sosCategory) {
      const newInc: ActiveSos = {
        id: `inc-${Date.now()}`,
        category: sosCategory,
        priority: priority || 'High',
        incidentStatus: 'New',
        timestamp: Date.now(),
        lat: coords.lat,
        lng: coords.lng,
        status: 'pending',
        relayedNodes: ['Local Node NODE-7F42 (Hop 0)'],
        senderName: 'Local Transmitter (You)',
        senderNodeId: settings.userNodeId,
      };
      setIncidents((prev) => [newInc, ...prev]);
    }

    if (!isOutOfRange) {
      progressMessageTransmission(newMsg.id, activeChatId);
    }
  };

  // Trigger Proper Emergency SOS
  const handleTriggerSos = async (category: SosCategory, priority: SosPriority = 'Critical') => {
    // Immediately sound loud hardware buzzer & siren locally (works 100% offline without Wi-Fi)
    playSosAlarm();

    const coords = await getCurrentCoordinates();
    setUserCoords(coords);

    const now = Date.now();
    const sosId = `sos-${now}`;

    const newActiveSos: ActiveSos = {
      id: sosId,
      category,
      priority,
      incidentStatus: 'New',
      timestamp: now,
      lat: coords.lat,
      lng: coords.lng,
      status: 'pending',
      relayedNodes: ['Local Node NODE-7F42 (Hop 0)'],
      senderName: 'NODE-7F42 (You)',
      senderNodeId: settings.userNodeId,
    };

    setActiveSos(newActiveSos);
    setIncidents((prev) => [newActiveSos, ...prev]);

    const sosMsg: Message = {
      id: `msg-${sosId}`,
      chatId: 'broadcast',
      sender: 'me',
      text: `EMERGENCY [${category.toUpperCase()}] BROADCAST: Immediate assistance requested at coordinates ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}. Mesh packet priority 0.`,
      timestamp: now,
      status: 'pending',
      lat: coords.lat,
      lng: coords.lng,
      isSos: true,
      sosCategory: category,
      priority,
      relayedNodes: ['Local Node NODE-7F42 (Hop 0)'],
    };

    // REAL MESH: broadcast the SOS to every phone in range (relayed hop by hop)
    await sendPacket({
      pid: sosMsg.id,
      kind: 'sos',
      text: sosMsg.text,
      ts: now,
      lat: coords.lat,
      lng: coords.lng,
      category,
      priority,
    });

    // SOS goes ahead of all normal pending messages
    setMessages((prev) => {
      const nonPending = prev.filter((m) => m.status !== 'pending');
      const pending = prev.filter((m) => m.status === 'pending');
      return [...nonPending, sosMsg, ...pending];
    });

    triggerRowHighlight('broadcast');

    // Progression of SOS broadcast
    setTimeout(() => {
      setActiveSos((prev) =>
        prev && prev.id === sosId
          ? {
              ...prev,
              status: 'sent',
              relayedNodes: [...prev.relayedNodes, 'Node 04 (Sector 4 Ridge Repeater - Hop 1)'],
            }
          : prev
      );
      setIncidents((prev) =>
        prev.map((i) =>
          i.id === sosId
            ? { ...i, status: 'sent', relayedNodes: [...i.relayedNodes, 'Node 04 (Repeater - Hop 1)'] }
            : i
        )
      );
      setMessages((prev) =>
        prev.map((m) =>
          m.id === `msg-${sosId}`
            ? { ...m, status: 'sent', relayedNodes: ['Node 04 (Sector 4 Ridge Repeater - Hop 1)'] }
            : m
        )
      );

      setTimeout(() => {
        setActiveSos((prev) =>
          prev && prev.id === sosId
            ? {
                ...prev,
                status: 'relayed',
                relayedNodes: [
                  ...prev.relayedNodes,
                  'Node 08 (Emergency Base Station - Hop 2)',
                ],
              }
            : prev
        );
        setIncidents((prev) =>
          prev.map((i) =>
            i.id === sosId
              ? {
                  ...i,
                  status: 'relayed',
                  incidentStatus: 'Acknowledged',
                  relayedNodes: [...i.relayedNodes, 'Node 08 (Base - Hop 2)'],
                }
              : i
          )
        );
        setMessages((prev) =>
          prev.map((m) =>
            m.id === `msg-${sosId}`
              ? {
                  ...m,
                  status: 'relayed',
                  relayedNodes: [
                    'Node 04 (Sector 4 Ridge Repeater - Hop 1)',
                    'Node 08 (Emergency Base Station - Hop 2)',
                  ],
                }
              : m
          )
        );

        setTimeout(() => {
          setActiveSos((prev) =>
            prev && prev.id === sosId
              ? {
                  ...prev,
                  status: 'delivered',
                  relayedNodes: [
                    ...prev.relayedNodes,
                    'Regional Volunteer Rescue Unit (Delivered)',
                  ],
                }
              : prev
          );
          setIncidents((prev) =>
            prev.map((i) =>
              i.id === sosId
                ? {
                    ...i,
                    status: 'delivered',
                    relayedNodes: [...i.relayedNodes, 'Rescue Unit Sector 4'],
                  }
                : i
            )
          );
          setMessages((prev) =>
            prev.map((m) =>
              m.id === `msg-${sosId}`
                ? {
                    ...m,
                    status: 'delivered',
                    relayedNodes: [
                      'Node 04 (Sector 4 Ridge Repeater - Hop 1)',
                      'Node 08 (Emergency Base Station - Hop 2)',
                      'Regional Volunteer Rescue Unit (Delivered)',
                    ],
                  }
                : m
            )
          );

          setTimeout(() => {
            const ackMsg: Message = {
              id: `reply-sos-${Date.now()}`,
              chatId: 'broadcast',
              sender: 'contact',
              senderName: 'Emergency Mesh Dispatch',
              text: `DISPATCH ACK: Priority SOS [${category} - ${priority}] confirmed. Response team dispatched to ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}. Keep radio on 868MHz.`,
              timestamp: Date.now(),
              status: 'delivered',
              lat: Number((coords.lat + 0.002).toFixed(5)),
              lng: Number((coords.lng + 0.002).toFixed(5)),
            };
            setMessages((prev) => [...prev, ackMsg]);
            triggerRowHighlight('broadcast');
          }, 2000);
        }, 1300);
      }, 1400);
    }, 1000);
  };

  const handleCancelActiveSos = () => {
    // Stop emergency siren and buzzer
    stopSosAlarm();

    if (activeSos) {
      setIncidents((prev) =>
        prev.map((i) => (i.id === activeSos.id ? { ...i, incidentStatus: 'Resolved' } : i))
      );
    }
    setActiveSos(null);

    const cancelMsg: Message = {
      id: `msg-cancel-${Date.now()}`,
      chatId: 'broadcast',
      sender: 'me',
      text: 'EMERGENCY CLEARED: SOS broadcast cancelled by local transmitter. All stations stand down.',
      timestamp: Date.now(),
      status: 'delivered',
      lat: userCoords.lat,
      lng: userCoords.lng,
      isSos: false,
    };

    setMessages((prev) => [...prev, cancelMsg]);
    triggerRowHighlight('broadcast');
  };

  // Update incident status from Incidents Tab
  const handleUpdateIncidentStatus = (incidentId: string, status: IncidentStatus) => {
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === incidentId ? { ...inc, incidentStatus: status } : inc))
    );

    if (activeSos && activeSos.id === incidentId) {
      setActiveSos((prev) => (prev ? { ...prev, incidentStatus: status } : null));
    }
  };

  // Select incident to highlight on Map
  const handleSelectIncidentForMap = (incident: ActiveSos) => {
    setHighlightedIncident(incident);
    setActiveChatId(null);
    setActiveTab('map');
  };

  const handleSelectChat = (contactId: string) => {
    setActiveChatId(contactId);
    setActiveTab('chats');

    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, unreadCount: 0 } : c))
    );
  };

  const handleThemeChange = (newTheme: ThemeMode) => {
    applyTheme(newTheme, true);
    setSettings((prev) => ({ ...prev, theme: newTheme }));
  };

  const handleResetData = () => {
    Object.values(activeTimersRef.current).forEach((timerList) => {
      timerList.forEach((t) => window.clearTimeout(t));
    });
    activeTimersRef.current = {};

    setContacts(INITIAL_CONTACTS);
    setMessages(INITIAL_MESSAGES);
    setSettings(INITIAL_SETTINGS);
    setActiveSos(null);
    setIncidents(loadSavedIncidents());
    setHighlightedIncident(null);
    setActiveChatId(null);
    applyTheme('dark', true);
  };

  const totalUnreadCount = contacts.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const activeContact = activeChatId ? contacts.find((c) => c.id === activeChatId) : null;
  const activeIncidentCount = incidents.filter((i) => i.incidentStatus !== 'Resolved').length;

  const getEffectiveStatusText = (contact: Contact) => {
    if (contact.isGroup) return 'nearby (5 nodes active)';
    if (contact.outOfRangeByDefault && !settings.movedCloser) return 'out of range';
    return contact.baseStatusText;
  };

  return (
    <>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      <div className="flex justify-center w-full h-[100dvh] bg-[var(--color-bg-app)] overflow-hidden font-['IBM_Plex_Sans',sans-serif]">
        <div className="w-full max-w-md h-full flex flex-col bg-[var(--color-bg-app)] relative overflow-hidden shadow-2xl border-x border-[var(--color-border)]">
        {/* Real mesh status: phones connected right now */}
        <div className="absolute top-1 right-2 z-50 px-2 py-0.5 rounded-full text-[10px] font-mono bg-[var(--color-bg-app)]/80 border border-[var(--color-border)] text-[var(--color-text-secondary)] pointer-events-none">
          MESH: {peerCount} {peerCount === 1 ? 'phone' : 'phones'}
        </div>
        {/* Top Active SOS Banner */}
        {activeSos && (
          <ActiveSosBanner
            activeSos={activeSos}
            onOpenSosScreen={() => setIsSosScreenOpen(true)}
            onCancelSos={handleCancelActiveSos}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden relative flex flex-col">
          {activeChatId && activeContact ? (
            /* Screen 2: Chat Screen */
            <ChatScreen
              contact={activeContact}
              messages={messages.filter((m) => m.chatId === activeChatId)}
              effectiveStatusText={getEffectiveStatusText(activeContact)}
              onBack={() => setActiveChatId(null)}
              onSendMessage={handleSendMessage}
              onLongPressMessage={(msg) => setInspectedMessage(msg)}
            />
          ) : (
            /* Tab Screens */
            <>
              {activeTab === 'chats' && (
                <ChatsList
                  contacts={contacts}
                  messages={messages}
                  activeChatId={activeChatId}
                  recentlyUpdatedChatId={recentlyUpdatedChatId}
                  onSelectChat={handleSelectChat}
                  onTriggerSos={() => setIsSosScreenOpen(true)}
                />
              )}

              {activeTab === 'map' && (
                <MapScreen
                  contacts={contacts}
                  settings={settings}
                  userCoords={userCoords}
                  activeSos={activeSos}
                  incidents={incidents}
                  highlightedIncident={highlightedIncident}
                  safeZones={safeZones}
                  onAddSafeZone={() => setIsSafeZoneModalOpen(true)}
                  messages={messages}
                  onSelectChat={handleSelectChat}
                  onNodeLinkEstablished={(contactId) => {
                    const pendingMsgs = messages.filter(
                      (m) => m.chatId === contactId && m.sender === 'me' && m.status === 'pending'
                    );
                    pendingMsgs.forEach((msg) => {
                      progressMessageTransmission(msg.id, msg.chatId);
                    });
                  }}
                />
              )}

              {/* 4th Tab: Incidents (for Responder Role) */}
              {activeTab === 'incidents' && settings.role === 'Responder' && (
                <IncidentsScreen
                  incidents={incidents}
                  onUpdateIncidentStatus={handleUpdateIncidentStatus}
                  onSelectIncidentForMap={handleSelectIncidentForMap}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsScreen
                  settings={settings}
                  userCoords={userCoords}
                  messageCount={messages.length}
                  currentLang={currentLang}
                  onChangeLanguage={(lang) => {
                    setCurrentLang(lang);
                    saveLanguage(lang);
                  }}
                  onUpdateSettings={(newSettings) =>
                    setSettings((prev) => ({ ...prev, ...newSettings }))
                  }
                  onThemeChange={handleThemeChange}
                  onRefreshGps={async () => {
                    const coords = await getCurrentCoordinates();
                    setUserCoords(coords);
                  }}
                  onResetData={handleResetData}
                />
              )}
            </>
          )}
        </main>

        {/* Always Reachable Floating Circular SOS Button */}
        {!isSosScreenOpen && (
          <div
            className={`absolute right-4 z-30 flex items-center justify-center transition-all ${
              activeChatId ? 'bottom-16' : 'bottom-18'
            }`}
          >
            {activeSos && (
              <span className="absolute w-12 h-12 rounded-full bg-[var(--color-sos)] animate-sos-radar-ring pointer-events-none" />
            )}
            <button
              type="button"
              onClick={() => setIsSosScreenOpen(true)}
              className="w-12 h-12 rounded-full bg-[var(--color-sos)] hover:bg-[var(--color-sos-hover)] text-white flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer font-bold text-[11px] tracking-wider leading-none"
              title="Open Emergency SOS"
              aria-label="Emergency SOS"
            >
              <AlertOctagon className="w-5 h-5 mb-0.5" />
              <span>SOS</span>
            </button>
          </div>
        )}

        {/* AI Survival Chatbot Floating Trigger (Left Bottom) */}
        {!isSosScreenOpen && !activeChatId && (
          <div className="absolute left-4 z-30 bottom-18">
            <button
              type="button"
              onClick={() => setIsAiChatOpen(true)}
              className="w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex flex-col items-center justify-center shadow-lg border border-blue-400 active:scale-95 transition-all cursor-pointer"
              title="Open AI Survival Assistant"
              aria-label="AI Survival Assistant"
            >
              <Bot className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Screen: Bottom tab bar */}
        {!activeChatId && (
          <BottomTabBar
            activeTab={activeTab}
            totalUnreadCount={totalUnreadCount}
            role={settings.role}
            activeIncidentCount={activeIncidentCount}
            language={currentLang}
            onSelectTab={(tab) => {
              setActiveChatId(null);
              setActiveTab(tab);
            }}
          />
        )}

        {/* Full-Screen SOS Screen */}
        <SosScreen
          isOpen={isSosScreenOpen}
          userCoords={userCoords}
          activeSos={activeSos}
          onClose={() => setIsSosScreenOpen(false)}
          onTriggerSos={handleTriggerSos}
          onCancelActiveSos={handleCancelActiveSos}
        />

        {/* Incoming Critical SOS Buzzer & Alert Modal */}
        {incomingCriticalSos && (
          <IncomingSosModal
            sos={incomingCriticalSos}
            language={currentLang}
            onMuteAlarm={stopSosAlarm}
            onViewOnMap={() => {
              stopSosAlarm();
              setHighlightedIncident(incomingCriticalSos);
              setActiveChatId(null);
              setActiveTab('map');
              setIncomingCriticalSos(null);
            }}
            onDismiss={() => {
              stopSosAlarm();
              setIncomingCriticalSos(null);
            }}
          />
        )}

        {/* Message Telemetry Details Modal (Shown on Long Press) */}
        <MessageDetailModal
          message={inspectedMessage}
          onClose={() => setInspectedMessage(null)}
        />

        {/* Safe Zone Creator Modal for Responders */}
        {isSafeZoneModalOpen && (
          <SafeZoneModal
            userCoords={userCoords}
            onClose={() => setIsSafeZoneModalOpen(false)}
            onCreateSafeZone={(szData) => {
              const newSafeZone: SafeZone = {
                ...szData,
                id: `sz-${Date.now()}`,
                createdBy: settings.userNodeId,
                timestamp: Date.now(),
              };
              setSafeZones((prev) => [newSafeZone, ...prev]);

              // Broadcast Safe Zone over Bluetooth Mesh to all civilians!
              sendPacket({
                pid: `sz-pkt-${Date.now()}`,
                kind: 'safezone',
                toNode: 'broadcast',
                toName: 'Broadcast',
                text: `SAFE ZONE: ${newSafeZone.name} (${newSafeZone.category}) at ${newSafeZone.lat.toFixed(4)}, ${newSafeZone.lng.toFixed(4)}`,
                ts: Date.now(),
                lat: newSafeZone.lat,
                lng: newSafeZone.lng,
                safeZoneData: newSafeZone,
              }).catch((e) => console.error('SafeZone broadcast error:', e));
            }}
          />
        )}

        {/* AI Survival Chatbot Modal */}
        {isAiChatOpen && (
          <AiSurvivalChatModal onClose={() => setIsAiChatOpen(false)} />
        )}
      </div>
    </div>
    </>
  );
}
