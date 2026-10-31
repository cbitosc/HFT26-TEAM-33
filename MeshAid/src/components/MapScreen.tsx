import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import {
  Crosshair,
  MessageSquare,
  Signal,
  Battery,
  Radio,
  X,
  Route,
  Filter,
  AlertOctagon,
  ChevronUp,
  ChevronDown,
  Layers,
  Download,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { Contact, MeshSettings, ActiveSos, Message, NodeState, SafeZone } from '../types';
import { getDistanceMeters, formatTime24 } from '../utils';

interface MapScreenProps {
  contacts: Contact[];
  settings: MeshSettings;
  userCoords: { lat: number; lng: number };
  activeSos: ActiveSos | null;
  incidents?: ActiveSos[];
  highlightedIncident?: ActiveSos | null;
  safeZones?: SafeZone[];
  onAddSafeZone?: () => void;
  messages: Message[];
  onSelectChat: (contactId: string) => void;
  onNodeLinkEstablished?: (contactId: string) => void;
}

type FilterType = 'all' | 'sos' | 'online';

const TILE_CACHE_NAME = 'meshaid_leaflet_tiles_v1';

// Custom Cached Tile Layer for true offline operation
const createCachedTileLayer = (url: string, subdomains: string[]) => {
  const CachedTileLayerClass = (L.TileLayer as any).extend({
    createTile(coords: L.Coords, done: (error: Error | null, tile: HTMLImageElement) => void) {
      const tile = document.createElement('img');
      const tileUrl = this.getTileUrl(coords);
      tile.setAttribute('role', 'presentation');

      if (typeof window !== 'undefined' && 'caches' in window) {
        caches
          .open(TILE_CACHE_NAME)
          .then((cache) => {
            cache.match(tileUrl).then((response) => {
              if (response) {
                response.blob().then((blob) => {
                  tile.src = URL.createObjectURL(blob);
                  done(null, tile);
                });
              } else {
                fetch(tileUrl, { mode: 'cors' })
                  .then((res) => {
                    if (res.ok) {
                      cache.put(tileUrl, res.clone());
                      return res.blob();
                    }
                    throw new Error('Tile network error');
                  })
                  .then((blob) => {
                    tile.src = URL.createObjectURL(blob);
                    done(null, tile);
                  })
                  .catch(() => {
                    // Fallback to direct URL if cors/fetch has issues
                    tile.src = tileUrl;
                    done(null, tile);
                  });
              }
            });
          })
          .catch(() => {
            tile.src = tileUrl;
            done(null, tile);
          });
      } else {
        tile.src = tileUrl;
        done(null, tile);
      }

      return tile;
    },
  });

  return new CachedTileLayerClass(url, {
    maxZoom: 19,
    subdomains,
    attribution: '',
  });
};

function lon2tile(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function lat2tile(lat: number, zoom: number): number {
  return Math.floor(
    ((1 -
      Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) /
        Math.PI) /
      2) *
      Math.pow(2, zoom)
  );
}

export const MapScreen: React.FC<MapScreenProps> = ({
  contacts,
  settings,
  userCoords,
  activeSos,
  incidents = [],
  highlightedIncident = null,
  safeZones = [],
  onAddSafeZone,
  messages,
  onSelectChat,
  onNodeLinkEstablished,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Layer groups for dynamic cleanup
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const linksLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const animatedDotMarkerRef = useRef<L.Marker | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Selected node bottom sheet
  const [selectedNode, setSelectedNode] = useState<Contact | null>(null);
  const [selectedSosDetails, setSelectedSosDetails] = useState<ActiveSos | null>(null);

  // Offline tile download modal states
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{
    total: number;
    done: number;
    status: 'idle' | 'downloading' | 'complete' | 'error';
  }>({
    total: 0,
    done: 0,
    status: 'idle',
  });
  const [cachedTileCount, setCachedTileCount] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('meshaid_cached_tiles_count') || '0', 10);
    } catch {
      return 0;
    }
  });

  // Calculate all active SOS beacons
  const allSosBeacons = useMemo(() => {
    const list: ActiveSos[] = [];
    if (activeSos) list.push(activeSos);
    if (incidents) {
      incidents.forEach((inc) => {
        if (!list.some((s) => s.id === inc.id)) {
          list.push(inc);
        }
      });
    }
    return list;
  }, [activeSos, incidents]);

  // Controls
  const [filter, setFilter] = useState<FilterType>('all');
  const [showMessagePath, setShowMessagePath] = useState(false);
  const [selectedRouteMsgId, setSelectedRouteMsgId] = useState<string>('');
  const [showLegend, setShowLegend] = useState(false);

  // Dynamic simulated drifting node coordinates
  // Nodes slowly drift a few meters over time
  const [nodePositions, setNodePositions] = useState<Record<string, { lat: number; lng: number }>>(() => {
    const initial: Record<string, { lat: number; lng: number }> = {};
    contacts.forEach((c) => {
      initial[c.id] = {
        lat: c.lat || userCoords.lat + 0.0003,
        lng: c.lng || userCoords.lng + 0.0003,
      };
    });
    return initial;
  });

  // Base positions for stable bounded random drift
  const basePositionsRef = useRef(nodePositions);

  // Determine current theme
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [userCoords.lat, userCoords.lng],
      zoom: 17,
      zoomControl: false,
      attributionControl: false,
    });

    mapRef.current = map;

    // Tile layer: Use OpenStreetMap (100% free, no API key required)
    const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const tileLayer = createCachedTileLayer(tileUrl, ['a', 'b', 'c']);
    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    // Create layer groups
    linksLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);

    // Initial resize trigger
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update tile layer on theme change
  useEffect(() => {
    if (!mapRef.current) return;
    const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }
    const newLayer = createCachedTileLayer(tileUrl, ['a', 'b', 'c']);
    newLayer.addTo(mapRef.current);
    tileLayerRef.current = newLayer;
  }, [isDarkMode]);

  // Simulate nodes slowly moving a few metres so links appear and disappear
  useEffect(() => {
    const driftInterval = setInterval(() => {
      setNodePositions((prev) => {
        const next = { ...prev };

        contacts.forEach((c) => {
          const base = basePositionsRef.current[c.id] || { lat: userCoords.lat, lng: userCoords.lng };

          // If David K. (out of range), when movedCloser is true, drift him into 90m range of Marcus/User
          if (c.id === 'david') {
            if (settings.movedCloser) {
              // Bring David to ~85m of Marcus (lat 17.3611, lng 78.4713)
              next.david = {
                lat: 17.3611 + (Math.random() - 0.5) * 0.0001,
                lng: 78.4713 + (Math.random() - 0.5) * 0.0001,
              };
            } else {
              // Outside range (~260m)
              next.david = {
                lat: 17.3619 + (Math.random() - 0.5) * 0.0001,
                lng: 78.4721 + (Math.random() - 0.5) * 0.0001,
              };
            }
            return;
          }

          // Gentle drift within ±15 meters of base
          const deltaLat = (Math.random() - 0.5) * 0.00008;
          const deltaLng = (Math.random() - 0.5) * 0.00008;

          next[c.id] = {
            lat: base.lat + deltaLat,
            lng: base.lng + deltaLng,
          };
        });

        return next;
      });
    }, 3500);

    return () => clearInterval(driftInterval);
  }, [contacts, settings.movedCloser, userCoords]);

  // Calculate dynamic distances from user
  const dynamicContacts = useMemo(() => {
    return contacts.map((c) => {
      const pos = nodePositions[c.id] || { lat: userCoords.lat, lng: userCoords.lng };
      const dist = getDistanceMeters(userCoords.lat, userCoords.lng, pos.lat, pos.lng);

      // Node state determination
      let state: NodeState = c.nodeState || 'online';
      if (c.id === 'david') {
        state = dist <= 120 || settings.movedCloser ? 'online' : 'offline';
      }

      return {
        ...c,
        distanceMeters: dist,
        lat: pos.lat,
        lng: pos.lng,
        nodeState: state,
        hopsAway: dist <= 100 ? 0 : dist <= 180 ? 1 : 2,
      };
    });
  }, [contacts, nodePositions, userCoords, settings.movedCloser]);

  // Check if link was established with David to auto-send pending messages
  useEffect(() => {
    const davidNode = dynamicContacts.find((c) => c.id === 'david');
    if (davidNode && davidNode.nodeState === 'online') {
      if (onNodeLinkEstablished) {
        onNodeLinkEstablished('david');
      }
    }
  }, [dynamicContacts, onNodeLinkEstablished]);

  // Recenter handler
  const handleRecenter = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.flyTo([userCoords.lat, userCoords.lng], 17, {
        duration: 0.8,
      });
    }
  }, [userCoords]);

  // Update Map Markers & Geometry Layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markersGroup = markersLayerRef.current;
    const linksGroup = linksLayerRef.current;
    if (!markersGroup || !linksGroup) return;

    markersGroup.clearLayers();
    linksGroup.clearLayers();

    // 1. My Location Marker (blue dot with accuracy circle)
    const userIcon = L.divIcon({
      className: '',
      html: '<div class="user-location-marker"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    const userMarker = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon });
    userMarker.bindTooltip('You (NODE-7F42)', { direction: 'top', offset: [0, -8] });
    markersGroup.addLayer(userMarker);

    // Accuracy Circle (15m radius)
    const accuracyCircle = L.circle([userCoords.lat, userCoords.lng], {
      radius: 15,
      color: '#3B82F6',
      weight: 1,
      fillColor: '#3B82F6',
      fillOpacity: 0.18,
    });
    markersGroup.addLayer(accuracyCircle);

    // Dashed Radio Range Circle around me (100 m)
    const radioRangeCircle = L.circle([userCoords.lat, userCoords.lng], {
      radius: 100,
      color: '#3B82F6',
      dashArray: '5, 8',
      weight: 1.5,
      fillColor: '#3B82F6',
      fillOpacity: 0.04,
    });
    markersGroup.addLayer(radioRangeCircle);

    // 2. Active Radio Links (lines between nodes within radio range ~105m)
    const allNodesWithCoords = [
      { id: 'me', name: 'You', lat: userCoords.lat, lng: userCoords.lng, isUser: true },
      ...dynamicContacts.map((c) => ({
        id: c.id,
        name: c.name,
        lat: c.lat,
        lng: c.lng,
        isUser: false,
        state: c.nodeState,
      })),
    ];

    const activePairs: [typeof allNodesWithCoords[0], typeof allNodesWithCoords[0]][] = [];

    for (let i = 0; i < allNodesWithCoords.length; i++) {
      for (let j = i + 1; j < allNodesWithCoords.length; j++) {
        const nodeA = allNodesWithCoords[i];
        const nodeB = allNodesWithCoords[j];

        // Filter out if one is offline
        if ((nodeA as any).state === 'offline' || (nodeB as any).state === 'offline') {
          continue;
        }

        const d = getDistanceMeters(nodeA.lat, nodeA.lng, nodeB.lat, nodeB.lng);
        // Radio range threshold is 105 meters
        if (d <= 105) {
          activePairs.push([nodeA, nodeB]);

          const linkLine = L.polyline(
            [
              [nodeA.lat, nodeA.lng],
              [nodeB.lat, nodeB.lng],
            ],
            {
              color: isDarkMode ? '#383E4A' : '#ADB5BD',
              weight: 1.5,
              dashArray: '3, 4',
              opacity: 0.7,
            }
          );
          linksGroup.addLayer(linkLine);
        }
      }
    }

    // 3. Highlight line in blue when a message is travelling over it, with a small dot moving along the line
    const pendingOrTravelling = messages.find(
      (m) => m.sender === 'me' && (m.status === 'sent' || m.status === 'relayed')
    );

    if (activePairs.length > 0 && (pendingOrTravelling || showMessagePath)) {
      // Highlight direct link from user to first relay (e.g. Sarah or Broadcast)
      const targetLink = activePairs.find((p) => p[0].id === 'me' || p[1].id === 'me');
      if (targetLink) {
        const p1 = [targetLink[0].lat, targetLink[0].lng] as [number, number];
        const p2 = [targetLink[1].lat, targetLink[1].lng] as [number, number];

        const activeLine = L.polyline([p1, p2], {
          color: '#3B82F6',
          weight: 2.5,
          opacity: 0.95,
        });
        linksGroup.addLayer(activeLine);

        // Moving dot along the line
        const dotIcon = L.divIcon({
          className: '',
          html: '<div class="w-2.5 h-2.5 rounded-full bg-[#3B82F6] border border-white shadow-md"></div>',
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });

        const animatedDot = L.marker(p1, { icon: dotIcon });
        linksGroup.addLayer(animatedDot);
        animatedDotMarkerRef.current = animatedDot;

        let progress = 0;
        let direction = 1;
        const animatePacket = () => {
          progress += 0.02 * direction;
          if (progress >= 1) {
            progress = 1;
            direction = -1;
          } else if (progress <= 0) {
            progress = 0;
            direction = 1;
          }

          const curLat = p1[0] + (p2[0] - p1[0]) * progress;
          const curLng = p1[1] + (p2[1] - p1[1]) * progress;
          animatedDot.setLatLng([curLat, curLng]);
          animationFrameRef.current = requestAnimationFrame(animatePacket);
        };
        animationFrameRef.current = requestAnimationFrame(animatePacket);
      }
    }

    // 4. Mesh Node Markers
    // Node colour by state: online = green, relaying = blue, low battery = amber, offline = grey
    const filteredNodes = dynamicContacts.filter((node) => {
      if (filter === 'sos') return activeSos && node.id === 'broadcast';
      if (filter === 'online') return node.nodeState !== 'offline';
      return true;
    });

    filteredNodes.forEach((node) => {
      const state = node.nodeState || 'online';
      const stateClass =
        state === 'online'
          ? 'marker-online'
          : state === 'relaying'
          ? 'marker-relaying'
          : state === 'low battery'
          ? 'marker-low-battery'
          : 'marker-offline';

      const nodeIcon = L.divIcon({
        className: 'mesh-marker-container',
        html: `<div class="mesh-marker ${stateClass}" style="width: 26px; height: 26px;">${node.initials}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([node.lat, node.lng], { icon: nodeIcon });
      marker.on('click', () => {
        setSelectedNode(node);
        setSelectedSosDetails(null);
      });
      markersGroup.addLayer(marker);
    });

    // 5. SOS Markers: Red with slow pulse ring
    if (filter === 'all' || filter === 'sos') {
      allSosBeacons.forEach((beacon) => {
        const isHighlighted = highlightedIncident?.id === beacon.id;
        const sosIcon = L.divIcon({
          className: '',
          html: `
            <div class="relative flex items-center justify-center cursor-pointer">
              <div class="sos-map-pulse-ring ${isHighlighted ? 'scale-125' : ''}"></div>
              <div class="sos-map-marker ${isHighlighted ? 'ring-2 ring-white scale-110' : ''}">SOS</div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const sosMarker = L.marker([beacon.lat, beacon.lng], { icon: sosIcon, zIndexOffset: 2000 });
        sosMarker.on('click', () => {
          setSelectedSosDetails(beacon);
          setSelectedNode(null);
        });
        markersGroup.addLayer(sosMarker);
      });
    }

    // 6. Safe Zones: Emerald / Green shield markers with radius zone
    safeZones.forEach((sz) => {
      const szIcon = L.divIcon({
        className: '',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer">
            <div class="w-7 h-7 rounded-full bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-emerald-400">
              SZ
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const szMarker = L.marker([sz.lat, sz.lng], { icon: szIcon, zIndexOffset: 1200 });
      szMarker.bindTooltip(
        `<div class="p-1 font-sans"><b>SAFE ZONE: ${sz.name}</b><br/>${sz.category} • ${sz.capacity || 'Active'}</div>`,
        { direction: 'top', offset: [0, -10] }
      );
      markersGroup.addLayer(szMarker);

      // Safe Zone perimeter circle (50m)
      const szCircle = L.circle([sz.lat, sz.lng], {
        radius: 50,
        color: '#10B981',
        weight: 1.5,
        fillColor: '#10B981',
        fillOpacity: 0.15,
      });
      markersGroup.addLayer(szCircle);
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [userCoords, dynamicContacts, activeSos, incidents, highlightedIncident, safeZones, filter, isDarkMode, messages, showMessagePath]);

  // Handle "Show message path" Route Rendering
  useEffect(() => {
    const map = mapRef.current;
    const routeGroup = routeLayerRef.current;
    if (!map || !routeGroup) return;

    routeGroup.clearLayers();

    if (!showMessagePath) return;

    // Build route: You -> Sarah (Hop 1) -> Marcus (Hop 2)
    const sarahNode = dynamicContacts.find((c) => c.id === 'sarah');
    const marcusNode = dynamicContacts.find((c) => c.id === 'marcus');

    if (!sarahNode || !marcusNode) return;

    const routeWaypoints = [
      { lat: userCoords.lat, lng: userCoords.lng, label: 'Start (You)' },
      { lat: sarahNode.lat, lng: sarahNode.lng, label: 'Hop 1 (Sarah)' },
      { lat: marcusNode.lat, lng: marcusNode.lng, label: 'Hop 2 (Marcus)' },
    ];

    // Draw multi-hop route polyline in vibrant blue
    const latlngs = routeWaypoints.map((w) => [w.lat, w.lng] as [number, number]);
    const routePolyline = L.polyline(latlngs, {
      color: '#3B82F6',
      weight: 3.5,
      opacity: 0.9,
    });
    routeGroup.addLayer(routePolyline);

    // Hop number badges along the route
    routeWaypoints.forEach((wp, index) => {
      const hopBadgeIcon = L.divIcon({
        className: '',
        html: `
          <div class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#3B82F6] text-white shadow-md border border-white whitespace-nowrap">
            ${index === 0 ? 'TX (You)' : `Hop ${index}`}
          </div>
        `,
        iconSize: [40, 18],
        iconAnchor: [20, 24],
      });

      const hopMarker = L.marker([wp.lat, wp.lng], { icon: hopBadgeIcon, zIndexOffset: 1500 });
      routeGroup.addLayer(hopMarker);
    });
  }, [showMessagePath, dynamicContacts, userCoords]);

  // Fly to highlighted incident when requested from Incidents tab
  useEffect(() => {
    if (highlightedIncident && mapRef.current) {
      mapRef.current.flyTo([highlightedIncident.lat, highlightedIncident.lng], 18, {
        duration: 0.9,
      });
      setSelectedSosDetails(highlightedIncident);
      setSelectedNode(null);
    }
  }, [highlightedIncident]);

  // Download area tiles for offline mesh operation
  const downloadAreaTiles = async () => {
    if (typeof window === 'undefined' || !('caches' in window)) return;
    setDownloadProgress({ total: 0, done: 0, status: 'downloading' });
    try {
      const cache = await caches.open(TILE_CACHE_NAME);
      const zoomLevels = [14, 15, 16];
      const delta = 0.015; // ~1.5km radius bounding box around user
      const minLat = userCoords.lat - delta;
      const maxLat = userCoords.lat + delta;
      const minLng = userCoords.lng - delta;
      const maxLng = userCoords.lng + delta;

      const tileUrls: string[] = [];
      const subdomains = ['a', 'b', 'c'];

      for (const z of zoomLevels) {
        const minX = lon2tile(minLng, z);
        const maxX = lon2tile(maxLng, z);
        const minY = lat2tile(maxLat, z);
        const maxY = lat2tile(minLat, z);

        for (let x = Math.min(minX, maxX); x <= Math.max(minX, maxX); x++) {
          for (let y = Math.min(minY, maxY); y <= Math.max(minY, maxY); y++) {
            const s = subdomains[(x + y) % subdomains.length];
            const url = `https://${s}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
            tileUrls.push(url);
          }
        }
      }

      setDownloadProgress({ total: tileUrls.length, done: 0, status: 'downloading' });

      let completed = 0;
      for (let i = 0; i < tileUrls.length; i += 6) {
        const batch = tileUrls.slice(i, i + 6);
        await Promise.all(
          batch.map(async (url) => {
            try {
              const matched = await cache.match(url);
              if (!matched) {
                const res = await fetch(url, { mode: 'cors' });
                if (res.ok) {
                  await cache.put(url, res);
                }
              }
            } catch {
              // ignore offline error for individual tiles
            } finally {
              completed++;
            }
          })
        );
        setDownloadProgress({ total: tileUrls.length, done: completed, status: 'downloading' });
      }

      const totalCount = (cachedTileCount || 0) + completed;
      setCachedTileCount(totalCount);
      localStorage.setItem('meshaid_cached_tiles_count', totalCount.toString());
      setDownloadProgress({ total: tileUrls.length, done: completed, status: 'complete' });
    } catch (err) {
      console.error('Offline download error:', err);
      setDownloadProgress((prev) => ({ ...prev, status: 'error' }));
    }
  };

  const clearOfflineTiles = async () => {
    if (typeof window !== 'undefined' && 'caches' in window) {
      await caches.delete(TILE_CACHE_NAME);
      setCachedTileCount(0);
      localStorage.setItem('meshaid_cached_tiles_count', '0');
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[var(--color-bg-app)] text-[var(--color-text)] overflow-hidden font-['IBM_Plex_Sans',sans-serif]">
      {/* Top Header Bar */}
      <header className="px-4 py-2.5 bg-[var(--color-header)] border-b border-[var(--color-border)] flex items-center justify-between shrink-0 z-30 shadow-sm">
        <div className="flex items-center space-x-2">
          <Radio className="w-4 h-4 text-[var(--color-text-secondary)]" />
          <div>
            <h1 className="text-sm font-semibold text-[var(--color-text)] leading-none">
              Mesh Network Map
            </h1>
            <p className="text-[10px] text-[var(--color-text-secondary)] mt-0.5 font-['IBM_Plex_Mono',monospace]">
              {userCoords.lat.toFixed(5)}, {userCoords.lng.toFixed(5)} · 100m Range
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1 bg-[var(--color-bg-app)] p-0.5 rounded-md border border-[var(--color-border)] text-xs">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-[var(--color-surface)] text-[var(--color-text)] font-semibold shadow-xs'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter('online')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              filter === 'online'
                ? 'bg-[var(--color-surface)] text-[var(--color-text)] font-semibold shadow-xs'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            Online
          </button>
          <button
            type="button"
            onClick={() => setFilter('sos')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              filter === 'sos'
                ? 'bg-[var(--color-sos)] text-white font-semibold shadow-xs'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            SOS
          </button>
        </div>
      </header>

      {/* Active SOS Quick-Focus Banner */}
      {allSosBeacons.length > 0 && (
        <div
          onClick={() => {
            const first = allSosBeacons[0];
            if (mapRef.current) {
              mapRef.current.flyTo([first.lat, first.lng], 18, { duration: 0.8 });
            }
            setSelectedSosDetails(first);
            setSelectedNode(null);
          }}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 flex items-center justify-between text-xs cursor-pointer shadow-md z-30 transition-colors animate-pulse"
        >
          <div className="flex items-center space-x-1.5">
            <AlertOctagon className="w-4 h-4 shrink-0" />
            <span className="font-bold">
              {allSosBeacons.length} ACTIVE SOS BEACON{allSosBeacons.length > 1 ? 'S' : ''} DETECTED
            </span>
          </div>
          <span className="text-[10px] bg-white text-red-700 font-extrabold px-2 py-0.5 rounded-full uppercase">
            Focus Location
          </span>
        </div>
      )}

      {/* Main Map View Area */}
      <div className="flex-1 relative w-full h-full">
        {/* Leaflet map container */}
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Map Top-Right Floating Controls */}
        <div className="absolute top-3 right-3 z-30 flex flex-col space-y-2">
          {/* Recenter Button */}
          <button
            type="button"
            onClick={handleRecenter}
            className="w-9 h-9 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] flex items-center justify-center shadow-md hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
            title="Recenter Map"
            aria-label="Recenter"
          >
            <Crosshair className="w-4 h-4 text-[var(--color-delivered)]" />
          </button>

          {/* Mark Safe Zone Button (Available for Responders) */}
          {settings.role === 'Responder' && onAddSafeZone && (
            <button
              type="button"
              onClick={onAddSafeZone}
              className="w-9 h-9 rounded-lg bg-emerald-600 border border-emerald-400 text-white flex items-center justify-center shadow-lg hover:bg-emerald-500 transition-transform active:scale-95 cursor-pointer"
              title="Mark Safe Zone"
              aria-label="Mark Safe Zone"
            >
              <ShieldCheck className="w-4.5 h-4.5" />
            </button>
          )}

          {/* Download Offline Map Area Button */}
          <button
            type="button"
            onClick={() => setShowOfflineModal(true)}
            className="w-9 h-9 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] flex items-center justify-center shadow-md hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
            title="Download Offline Area"
            aria-label="Download Offline Map"
          >
            <Download className="w-4 h-4 text-emerald-500" />
          </button>

          {/* Toggle Route Path Button */}
          <button
            type="button"
            onClick={() => setShowMessagePath(!showMessagePath)}
            className={`h-9 px-2.5 rounded-lg border flex items-center space-x-1.5 shadow-md transition-colors cursor-pointer text-xs font-medium ${
              showMessagePath
                ? 'bg-[#3B82F6] border-white text-white'
                : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
            }`}
            title="Toggle Message Path"
          >
            <Route className="w-4 h-4" />
            <span className="text-[11px]">Path</span>
          </button>

          {/* Legend Toggle Button */}
          <button
            type="button"
            onClick={() => setShowLegend(!showLegend)}
            className="w-9 h-9 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] flex items-center justify-center shadow-md hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
            title="Map Legend"
          >
            <Layers className="w-4 h-4 text-[var(--color-text-secondary)]" />
          </button>
        </div>

        {/* Floating Legend Card (Collapsible) */}
        {showLegend && (
          <div className="absolute top-14 right-3 z-30 w-44 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-2.5 shadow-lg text-[11px] animate-message-in">
            <div className="flex items-center justify-between pb-1.5 border-b border-[var(--color-border)] font-semibold text-[var(--color-text)]">
              <span>Node States</span>
              <button
                type="button"
                onClick={() => setShowLegend(false)}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-2 space-y-1.5 text-[var(--color-text-secondary)]">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded bg-[#30A46C] shrink-0" />
                <span className="text-[var(--color-text)]">Online</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded bg-[#3B82F6] shrink-0" />
                <span className="text-[var(--color-text)]">Relaying</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded bg-[#F59E0B] shrink-0" />
                <span className="text-[var(--color-text)]">Low Battery</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded bg-[#6B7280] shrink-0" />
                <span className="text-[var(--color-text)]">Offline</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-[var(--color-sos)] shrink-0" />
                <span className="text-[var(--color-sos)] font-semibold">Active SOS</span>
              </div>
            </div>
          </div>
        )}

        {/* Selected SOS Details Card (When SOS Marker Tapped) */}
        {selectedSosDetails && (
          <div className="absolute bottom-2 left-2 right-2 z-40 bg-[var(--color-surface)] border-l-4 border-l-[var(--color-sos)] border-y border-r border-[var(--color-border)] rounded-lg p-3.5 shadow-xl animate-message-in">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-1.5 text-[var(--color-sos)] font-bold text-xs uppercase tracking-wide">
                <AlertOctagon className="w-4 h-4" />
                <span>Active SOS Beacon</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSosDetails(null)}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-[var(--color-text-secondary)] block">Sender</span>
                <span className="font-semibold text-[var(--color-text)] truncate block">
                  {selectedSosDetails.senderName || 'NODE-7F42 (You)'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--color-text-secondary)] block">Category & Priority</span>
                <div className="flex items-center space-x-1 mt-0.5">
                  <span className="font-semibold text-[var(--color-text)]">{selectedSosDetails.category}</span>
                  <span
                    className={`text-[9px] font-bold px-1 rounded border uppercase ${
                      selectedSosDetails.priority === 'Critical'
                        ? 'border-[var(--color-sos)] text-[var(--color-sos)]'
                        : selectedSosDetails.priority === 'High'
                        ? 'border-amber-500 text-amber-500'
                        : 'border-emerald-500 text-emerald-500'
                    }`}
                  >
                    {selectedSosDetails.priority || 'Critical'}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-[10px] text-[var(--color-text-secondary)] block">Time</span>
                <span className="text-[var(--color-text)]">{formatTime24(selectedSosDetails.timestamp)}</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--color-text-secondary)] block">Status</span>
                <span className="capitalize font-medium text-[var(--color-delivered)]">
                  {selectedSosDetails.incidentStatus || selectedSosDetails.status}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] text-[var(--color-text-secondary)] block">Coordinates</span>
                <span className="font-['IBM_Plex_Mono',monospace] text-xs text-[var(--color-text)] font-medium">
                  {selectedSosDetails.lat.toFixed(5)}, {selectedSosDetails.lng.toFixed(5)}
                </span>
              </div>
              <div className="col-span-2 pt-1 border-t border-[var(--color-border)] flex items-center justify-between">
                <span className="text-[10px] text-[var(--color-text-secondary)]">
                  Route: {selectedSosDetails.relayedNodes ? selectedSosDetails.relayedNodes.length : 1} Hops via Mesh
                </span>
                <button
                  type="button"
                  onClick={() => onSelectChat('broadcast')}
                  className="px-2 py-1 bg-[var(--color-bubble-me)] text-[var(--color-text)] rounded text-[11px] font-medium border border-[var(--color-delivered)]/40 hover:bg-[var(--color-bubble-me-hover)] transition-colors cursor-pointer"
                >
                  Open Broadcast
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Offline Map Downloader Modal */}
        {showOfflineModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl p-4 text-[var(--color-text)]">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
                <div className="flex items-center space-x-2">
                  <Download className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-sm">Download Offline Map</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOfflineModal(false)}
                  className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-3 space-y-3 text-xs">
                <p className="text-[var(--color-text-secondary)] leading-relaxed">
                  Download map tiles covering ~3 km around your current GPS location (
                  <span className="font-mono text-[var(--color-text)]">
                    {userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)}
                  </span>
                  ) so you can navigate and locate SOS beacons 100% offline without cell service or Wi-Fi.
                </p>

                <div className="p-2.5 rounded-lg bg-[var(--color-bg-app)] border border-[var(--color-border)] flex items-center justify-between">
                  <span className="text-[var(--color-text-secondary)]">Currently Stored Tiles:</span>
                  <span className="font-mono font-bold text-emerald-500">{cachedTileCount} tiles</span>
                </div>

                {downloadProgress.status === 'downloading' && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-emerald-500 font-medium">Downloading tiles...</span>
                      <span className="font-mono">
                        {downloadProgress.done} / {downloadProgress.total}
                      </span>
                    </div>
                    <div className="w-full bg-[var(--color-bg-app)] h-2 rounded-full overflow-hidden border border-[var(--color-border)]">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-200"
                        style={{
                          width: `${
                            downloadProgress.total
                              ? Math.round((downloadProgress.done / downloadProgress.total) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {downloadProgress.status === 'complete' && (
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Area downloaded successfully! Works 100% offline.</span>
                  </div>
                )}

                {downloadProgress.status === 'error' && (
                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Download failed. Check internet connection and try again.</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-[var(--color-border)] flex space-x-2">
                <button
                  type="button"
                  disabled={downloadProgress.status === 'downloading'}
                  onClick={downloadAreaTiles}
                  className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm transition-transform active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {downloadProgress.status === 'downloading' ? 'Downloading...' : 'Download Current Area'}
                  </span>
                </button>
                {cachedTileCount > 0 && (
                  <button
                    type="button"
                    onClick={clearOfflineTiles}
                    className="py-2 px-3 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] hover:text-red-400 cursor-pointer"
                  >
                    Clear Cache
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Selected Node Bottom Sheet (When Node Tapped) */}
        {selectedNode && !selectedSosDetails && (
          <div className="absolute bottom-2 left-2 right-2 z-40 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3.5 shadow-xl animate-message-in">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
              <div className="flex items-center space-x-2.5">
                <div
                  className={`w-8 h-8 rounded-md flex items-center justify-center font-bold text-xs ${
                    selectedNode.nodeState === 'online'
                      ? 'bg-[#30A46C] text-white'
                      : selectedNode.nodeState === 'relaying'
                      ? 'bg-[#3B82F6] text-white'
                      : selectedNode.nodeState === 'low battery'
                      ? 'bg-[#F59E0B] text-black'
                      : 'bg-[#6B7280] text-white'
                  }`}
                >
                  {selectedNode.initials}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-text)] leading-tight">
                    {selectedNode.name}
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-secondary)] capitalize leading-tight">
                    {selectedNode.nodeState}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer p-1"
                aria-label="Close sheet"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Node Telemetry Grid */}
            <div className="grid grid-cols-4 gap-2 my-2.5 text-center text-xs">
              <div className="bg-[var(--color-bg-app)] p-1.5 rounded border border-[var(--color-border)]">
                <div className="flex items-center justify-center text-[var(--color-text-secondary)] mb-0.5">
                  <Battery className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-[var(--color-text-secondary)] block">Battery</span>
                <span className="font-semibold text-[var(--color-text)] text-[11px]">
                  {selectedNode.batteryPercent || 75}%
                </span>
              </div>

              <div className="bg-[var(--color-bg-app)] p-1.5 rounded border border-[var(--color-border)]">
                <div className="flex items-center justify-center text-[var(--color-text-secondary)] mb-0.5">
                  <Signal className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-[var(--color-text-secondary)] block">Signal</span>
                <span className="font-semibold text-[var(--color-text)] text-[11px]">
                  {selectedNode.signalDbm || -72} dBm
                </span>
              </div>

              <div className="bg-[var(--color-bg-app)] p-1.5 rounded border border-[var(--color-border)]">
                <span className="text-[10px] text-[var(--color-text-secondary)] block mt-0.5">Distance</span>
                <span className="font-semibold text-[var(--color-text)] text-[11px]">
                  {selectedNode.distanceMeters}m
                </span>
              </div>

              <div className="bg-[var(--color-bg-app)] p-1.5 rounded border border-[var(--color-border)]">
                <span className="text-[10px] text-[var(--color-text-secondary)] block mt-0.5">Hops</span>
                <span className="font-semibold text-[var(--color-text)] text-[11px]">
                  {selectedNode.hopsAway === 0 ? 'Direct' : `${selectedNode.hopsAway} Hops`}
                </span>
              </div>
            </div>

            {/* Open Chat Action */}
            <button
              type="button"
              onClick={() => onSelectChat(selectedNode.id)}
              className="w-full py-2 bg-[var(--color-bubble-me)] hover:bg-[var(--color-bubble-me-hover)] text-xs font-semibold text-[var(--color-text)] rounded border border-[var(--color-delivered)]/40 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Message {selectedNode.name.split(' ')[0]}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
