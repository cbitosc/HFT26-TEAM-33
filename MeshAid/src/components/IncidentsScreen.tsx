import React from 'react';
import {
  ShieldAlert,
  HeartPulse,
  Flame,
  Waves,
  AlertOctagon,
  Package,
  MapPin,
  Clock,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { ActiveSos, IncidentStatus, SosCategory, SosPriority } from '../types';
import { formatTime24 } from '../utils';

interface IncidentsScreenProps {
  incidents: ActiveSos[];
  onUpdateIncidentStatus: (incidentId: string, status: IncidentStatus) => void;
  onSelectIncidentForMap: (incident: ActiveSos) => void;
}

const CATEGORY_ICONS: Record<SosCategory, React.FC<{ className?: string }>> = {
  Medical: HeartPulse,
  Fire: Flame,
  Flood: Waves,
  Trapped: AlertOctagon,
  Supplies: Package,
  Security: ShieldAlert,
};

const PRIORITY_ORDER: Record<SosPriority, number> = {
  Critical: 1,
  High: 2,
  Normal: 3,
};

export const IncidentsScreen: React.FC<IncidentsScreenProps> = ({
  incidents,
  onUpdateIncidentStatus,
  onSelectIncidentForMap,
}) => {
  // Sorted by priority (Critical -> High -> Normal) then newest first
  const sortedIncidents = [...incidents].sort((a, b) => {
    const prioA = PRIORITY_ORDER[a.priority || 'Critical'];
    const prioB = PRIORITY_ORDER[b.priority || 'Critical'];
    if (prioA !== prioB) return prioA - prioB;
    return b.timestamp - a.timestamp;
  });

  const criticalCount = incidents.filter((i) => i.priority === 'Critical' && i.incidentStatus !== 'Resolved').length;

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-app)] text-[var(--color-text)] font-['IBM_Plex_Sans',sans-serif]">
      {/* Header */}
      <header className="px-4 py-3 bg-[var(--color-header)] border-b border-[var(--color-border)] flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-[var(--color-sos)]" />
          <div>
            <h1 className="text-base font-semibold text-[var(--color-text)] leading-none">
              Incident Response Console
            </h1>
            <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
              Responder Mesh Dispatch · {incidents.length} Logged Incidents
            </p>
          </div>
        </div>

        {criticalCount > 0 && (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold border border-[var(--color-sos)] text-[var(--color-sos)] bg-[var(--color-sos)]/10 animate-pulse">
            {criticalCount} Critical
          </span>
        )}
      </header>

      {/* Main Table / Incident List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {sortedIncidents.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--color-text-secondary)]">
            No emergency incidents reported on mesh frequency.
          </div>
        ) : (
          sortedIncidents.map((inc) => {
            const Icon = CATEGORY_ICONS[inc.category] || AlertOctagon;
            const hopsCount = inc.relayedNodes ? Math.max(0, inc.relayedNodes.length - 1) : 0;
            const priority = inc.priority || 'Critical';

            return (
              <div
                key={inc.id}
                onClick={() => onSelectIncidentForMap(inc)}
                className={`p-3 rounded-lg border bg-[var(--color-surface)] hover:border-[var(--color-text-secondary)] transition-all cursor-pointer shadow-sm ${
                  inc.incidentStatus === 'Resolved'
                    ? 'opacity-65 border-[var(--color-border)]'
                    : priority === 'Critical'
                    ? 'border-l-4 border-l-[var(--color-sos)] border-y border-r border-[var(--color-border)]'
                    : 'border-[var(--color-border)]'
                }`}
              >
                {/* Top Row: Category + Outlined Priority + Time */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded flex items-center justify-center bg-[var(--color-bg-app)] border border-[var(--color-border)] text-[var(--color-sos)]">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-sm text-[var(--color-text)]">
                      {inc.category}
                    </span>

                    {/* Small Outlined Priority Label */}
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${
                        priority === 'Critical'
                          ? 'border-[var(--color-sos)] text-[var(--color-sos)]'
                          : priority === 'High'
                          ? 'border-amber-500 text-amber-500'
                          : 'border-emerald-500 text-emerald-500'
                      }`}
                    >
                      {priority}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1 text-xs text-[var(--color-text-secondary)]">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime24(inc.timestamp)}</span>
                  </div>
                </div>

                {/* Sender & Coordinates */}
                <div className="grid grid-cols-2 gap-2 text-xs py-1.5 border-y border-[var(--color-border)] my-1.5 text-[var(--color-text-secondary)]">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider block">Sender / Node</span>
                    <span className="text-[var(--color-text)] font-medium truncate block">
                      {inc.senderName || 'Anonymous Mesh Node'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider block">Coordinates</span>
                    <span className="font-['IBM_Plex_Mono',monospace] text-[11px] text-[var(--color-text)] block">
                      {inc.lat.toFixed(5)}, {inc.lng.toFixed(5)}
                    </span>
                  </div>
                </div>

                {/* Bottom Row: Hops & Status Dropdown */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-1.5 text-xs text-[var(--color-text-secondary)]">
                    <Radio className="w-3.5 h-3.5 text-[var(--color-delivered)]" />
                    <span>{hopsCount === 0 ? 'Direct Link' : `${hopsCount} Mesh Hops`}</span>
                  </div>

                  {/* Incident Status Dropdown (New, Acknowledged, Dispatched, Resolved) */}
                  <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                    <label className="text-[10px] text-[var(--color-text-secondary)] uppercase">
                      Status:
                    </label>
                    <select
                      value={inc.incidentStatus}
                      onChange={(e) =>
                        onUpdateIncidentStatus(inc.id, e.target.value as IncidentStatus)
                      }
                      className={`text-xs font-semibold py-1 px-2 rounded border bg-[var(--color-bg-app)] cursor-pointer focus:outline-none ${
                        inc.incidentStatus === 'New'
                          ? 'text-[var(--color-sos)] border-[var(--color-sos)]/50'
                          : inc.incidentStatus === 'Acknowledged'
                          ? 'text-amber-500 border-amber-500/50'
                          : inc.incidentStatus === 'Dispatched'
                          ? 'text-blue-500 border-blue-500/50'
                          : 'text-emerald-500 border-emerald-500/50'
                      }`}
                    >
                      <option value="New">New</option>
                      <option value="Acknowledged">Acknowledged</option>
                      <option value="Dispatched">Dispatched</option>
                      <option value="Resolved">Resolved</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => onSelectIncidentForMap(inc)}
                      className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] rounded border border-[var(--color-border)] cursor-pointer"
                      title="View on Map"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
