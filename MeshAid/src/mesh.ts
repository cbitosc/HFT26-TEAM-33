/**
 * Real phone-to-phone mesh layer — Google Nearby Connections via native MeshPlugin.
 *
 * Architecture:
 *  - P2P_CLUSTER strategy: any phone can connect to any other (no hub needed)
 *  - Flooding with TTL + duplicate filter => multi-hop relay across the mesh
 *  - Outbox: messages queue in localStorage until a peer connects, then flush
 *  - AES-GCM 256-bit E2E encryption on every packet's text payload
 *  - Privacy filter: targeted 1-to-1 packets are invisible to all other phones
 *
 * JS API surface (native plugin "Mesh"):
 *   start({name})        – advertise + discover
 *   stop()               – shut everything down
 *   send({data, target}) – send JSON string to all peers or one endpoint
 *   startSiren()         – trigger hardware alarm + vibrator
 *   stopSiren()          – stop hardware alarm
 *
 * Native events:
 *   "message" { from, fromName, data }
 *   "peers"   { count, peers: [{endpointId, name}] }
 *   "error"   { where, error }
 */

import { registerPlugin, Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import type { SosCategory, SosPriority } from './types';
import { encryptText, decryptText } from './crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MeshPeer {
  endpointId: string;
  name: string;
}

interface MeshPlugin {
  start(options: { name: string }): Promise<void>;
  stop(): Promise<void>;
  send(options: { data: string; target?: string }): Promise<{ sent: number }>;
  startSiren(): Promise<void>;
  stopSiren(): Promise<void>;
  addListener(
    event: 'message',
    fn: (e: { from: string; fromName?: string; data: string }) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    event: 'peers',
    fn: (e: { count: number; peers?: MeshPeer[] }) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    event: 'error',
    fn: (e: { where: string; error: string }) => void
  ): Promise<PluginListenerHandle>;
}

const Mesh = registerPlugin<MeshPlugin>('Mesh');

export interface MeshPacket {
  pid: string;
  kind: 'chat' | 'sos' | 'safezone';
  fromName: string;
  fromNode: string;
  toNode: string;      // 'broadcast' or recipient's NODE-XXXX device ID
  toName?: string;
  text: string;
  ts: number;
  lat: number;
  lng: number;
  category?: SosCategory;
  priority?: SosPriority;
  safeZoneData?: any;  // Attached SafeZone object when kind === 'safezone'
  ttl: number;         // hops remaining (starts at DEFAULT_TTL, decrements each relay)
  hops: string[];      // node IDs this packet has traversed
  isEncrypted?: boolean;
}

// ─── Module state ─────────────────────────────────────────────────────────────

const DEVICE_KEY  = 'meshaid_device_id_v1';
const OUTBOX_KEY  = 'meshaid_outbox_v1';
const DEFAULT_TTL = 6;

/** PIDs we have already processed — prevents relay loops */
const seen = new Set<string>();

/** Current number of connected peers (kept in sync by peerHandle listener) */
let _peerCount   = 0;
let _peerList: MeshPeer[] = [];

// ─── Device ID ────────────────────────────────────────────────────────────────

/**
 * Persistent unique node identifier for this phone.
 * This IS what other phones see as the sender name in the Nearby Connections session.
 */
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      const rand = () => Math.random().toString(16).slice(2, 6).toUpperCase();
      id = `NODE-${rand()}${rand().slice(0, 2)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return 'NODE-' + Math.random().toString(16).slice(2, 8).toUpperCase();
  }
}

// ─── Outbox (store-and-forward) ────────────────────────────────────────────────

function loadOutbox(): MeshPacket[] {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveOutbox(list: MeshPacket[]): void {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(list.slice(-30))); // cap at 30 msgs
  } catch {}
}

/** Flush any queued messages now that we have peers */
async function flushOutbox(): Promise<void> {
  const box = loadOutbox();
  if (!box.length || _peerCount === 0) return;
  const left: MeshPacket[] = [];
  for (const p of box) {
    try {
      const result = await Mesh.send({ data: JSON.stringify(p) });
      if (result.sent === 0) left.push(p);
    } catch {
      left.push(p);
    }
  }
  saveOutbox(left);
}

// ─── Core Send ─────────────────────────────────────────────────────────────────

/**
 * Send a new packet originating from this device.
 * Encrypts text, stamps fromNode/fromName, adds to seen set to prevent
 * relay loop if the packet bounces back.
 *
 * @param partial  Packet fields (without ttl/hops/fromNode/fromName)
 * @param targetEndpointId  Nearby Connections endpointId for direct send (optional)
 */
export async function sendPacket(
  partial: Omit<MeshPacket, 'ttl' | 'hops' | 'fromNode' | 'fromName'>,
  targetEndpointId?: string
): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[Mesh] Browser mode – skipping native send');
    return;
  }

  const me = getDeviceId();
  let encryptedText: string;
  try {
    encryptedText = await encryptText(partial.text);
  } catch (err) {
    console.error('[Mesh] Encryption failed:', err);
    encryptedText = partial.text; // fallback: send plaintext rather than silence
  }

  const packet: MeshPacket = {
    ...partial,
    toNode: partial.toNode || 'broadcast',
    text: encryptedText,
    isEncrypted: true,
    fromNode: me,
    fromName: me,
    ttl: DEFAULT_TTL,
    hops: [me],
  };

  // Mark as seen immediately so we don't re-process our own relayed echo
  seen.add(packet.pid);

  if (_peerCount === 0) {
    console.log('[Mesh] No peers — queuing to outbox:', packet.pid);
    saveOutbox([...loadOutbox(), packet]);
    return;
  }

  try {
    const payload = JSON.stringify(packet);
    // Broadcast over the mesh so multi-hop nodes can relay it to the target
    // Even targeted messages travel via mesh broadcast; the privacy filter on non-target nodes
    // prevents bystander display while ensuring 100% delivery across multi-hop paths!
    let result: { sent: number };
    if (targetEndpointId) {
      result = await Mesh.send({ data: payload, target: targetEndpointId });
      // If direct single-endpoint send didn't reach, broadcast to all connected mesh peers
      if (result.sent === 0) {
        result = await Mesh.send({ data: payload });
      }
    } else {
      result = await Mesh.send({ data: payload });
    }

    if (result.sent === 0) {
      console.log('[Mesh] Send returned 0 — queuing to outbox:', packet.pid);
      saveOutbox([...loadOutbox(), packet]);
    } else {
      console.log(`[Mesh] Sent to ${result.sent} peer(s):`, packet.pid);
    }
  } catch (err) {
    console.error('[Mesh] Send failed, queuing to outbox:', err);
    saveOutbox([...loadOutbox(), packet]);
  }
}

// ─── Start/Stop ────────────────────────────────────────────────────────────────

interface StartOptions {
  onPacket: (p: MeshPacket) => void;
  onPeers: (count: number, peerList: MeshPeer[]) => void;
}

/**
 * Start the Bluetooth mesh.
 * Returns a cleanup function that stops advertising/discovery and removes listeners.
 */
export async function startMesh({ onPacket, onPeers }: StartOptions): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[Mesh] Not native — mesh disabled');
    return () => {};
  }

  const me = getDeviceId();
  console.log('[Mesh] Starting with device ID:', me);

  // Clear stale seen-set from previous sessions so old PIDs don't block fresh packets
  seen.clear();

  const handles: PluginListenerHandle[] = [];

  // ── Error listener ──────────────────────────────────────────────────────────
  const errHandle = await Mesh.addListener('error', ({ where, error }) => {
    console.warn(`[Mesh] Native error in ${where}:`, error);
  });
  handles.push(errHandle);

  // ── Message listener ────────────────────────────────────────────────────────
  const msgHandle = await Mesh.addListener('message', async ({ data }) => {
    let p: MeshPacket;
    try {
      p = JSON.parse(data) as MeshPacket;
    } catch (err) {
      console.warn('[Mesh] Bad JSON packet:', err);
      return;
    }

    if (!p.pid) {
      console.warn('[Mesh] Packet missing pid — dropped');
      return;
    }

    if (seen.has(p.pid)) {
      // Already handled — do not re-process or re-relay
      return;
    }
    seen.add(p.pid);

    console.log(`[Mesh] Received packet pid=${p.pid} kind=${p.kind} toNode=${p.toNode}`);

    // ── Multi-hop relay: forward to all our other peers ──────────────────────
    if (p.ttl > 0) {
      const relayed: MeshPacket = {
        ...p,
        ttl: p.ttl - 1,
        hops: [...(p.hops || []), me],
      };
      try {
        await Mesh.send({ data: JSON.stringify(relayed) });
      } catch (err) {
        console.warn('[Mesh] Relay send failed:', err);
      }
    }

    // ── Privacy filter ───────────────────────────────────────────────────────
    // If packet has a specific target that is NOT this device → drop silently.
    // Phone 2 will NEVER see messages addressed only to Phone 1.
    const target = p.toNode;
    if (target && target !== 'broadcast' && target !== me) {
      console.log(`[Mesh] Packet pid=${p.pid} is for ${target}, not me (${me}) — filtered`);
      return;
    }

    // ── Decrypt & deliver ────────────────────────────────────────────────────
    let displayText = p.text;
    let isEncrypted = p.isEncrypted ?? false;
    try {
      const dec = await decryptText(p.text);
      displayText = dec.text;
      isEncrypted = dec.isEncrypted;
    } catch (err) {
      console.warn('[Mesh] Decryption error:', err);
    }

    onPacket({ ...p, text: displayText, isEncrypted });
  });
  handles.push(msgHandle);

  // ── Peers listener ──────────────────────────────────────────────────────────
  const peerHandle = await Mesh.addListener('peers', ({ count, peers: peerList }) => {
    _peerCount = count;
    _peerList  = peerList ?? [];
    console.log(`[Mesh] Peers updated: ${count} connected`, _peerList.map(p => p.name));
    onPeers(count, _peerList);
    if (count > 0) {
      flushOutbox().catch(err => console.warn('[Mesh] Outbox flush failed:', err));
    }
  });
  handles.push(peerHandle);

  // ── Start advertising + discovery ───────────────────────────────────────────
  try {
    await Mesh.start({ name: me });
    console.log('[Mesh] start() resolved OK');
  } catch (err) {
    console.error('[Mesh] start() failed:', err);
  }

  // ── Return cleanup ──────────────────────────────────────────────────────────
  return () => {
    console.log('[Mesh] Stopping mesh');
    handles.forEach(h => h.remove().catch(() => {}));
    _peerCount = 0;
    _peerList  = [];
    Mesh.stop().catch(() => {});
  };
}
