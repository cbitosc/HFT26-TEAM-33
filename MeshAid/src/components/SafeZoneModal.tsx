import React, { useState } from 'react';
import { ShieldCheck, X, MapPin, Users, Info } from 'lucide-react';
import { SafeZone } from '../types';

interface SafeZoneModalProps {
  userCoords: { lat: number; lng: number };
  onClose: () => void;
  onCreateSafeZone: (safeZone: Omit<SafeZone, 'id' | 'timestamp' | 'createdBy'>) => void;
}

export const SafeZoneModal: React.FC<SafeZoneModalProps> = ({
  userCoords,
  onClose,
  onCreateSafeZone,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SafeZone['category']>('Shelter');
  const [capacity, setCapacity] = useState('100 people');
  const [details, setDetails] = useState('');
  const [lat, setLat] = useState(userCoords.lat.toString());
  const [lng, setLng] = useState(userCoords.lng.toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onCreateSafeZone({
      name: name.trim(),
      category,
      capacity: capacity.trim() || undefined,
      details: details.trim() || undefined,
      lat: parseFloat(lat) || userCoords.lat,
      lng: parseFloat(lng) || userCoords.lng,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[var(--color-surface)] border border-emerald-500/30 rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--color-text)]">Mark Safe Zone</h2>
              <p className="text-[10px] text-[var(--color-text-secondary)] font-mono">
                BROADCAST OVER MESH MAP
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase">
              Zone Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. City Stadium Relief Camp"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full bg-[var(--color-bg-app)] border border-[var(--color-border)] rounded px-3 py-2 text-xs text-[var(--color-text)] focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SafeZone['category'])}
              className="mt-1 w-full bg-[var(--color-bg-app)] border border-[var(--color-border)] rounded px-3 py-2 text-xs text-[var(--color-text)] focus:border-emerald-500 focus:outline-none"
            >
              <option value="Shelter">Shelter & Camp</option>
              <option value="Medical Post">Medical Post / First Aid</option>
              <option value="Food & Water">Food & Water Distribution</option>
              <option value="Evacuation Point">Evacuation Helicopter / Boat Point</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase">
                Latitude
              </label>
              <input
                type="number"
                step="0.00001"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="mt-1 w-full bg-[var(--color-bg-app)] border border-[var(--color-border)] rounded px-2.5 py-1.5 text-xs text-[var(--color-text)] font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase">
                Longitude
              </label>
              <input
                type="number"
                step="0.00001"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="mt-1 w-full bg-[var(--color-bg-app)] border border-[var(--color-border)] rounded px-2.5 py-1.5 text-xs text-[var(--color-text)] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase">
              Capacity / Status
            </label>
            <input
              type="text"
              placeholder="e.g. 250 beds available"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="mt-1 w-full bg-[var(--color-bg-app)] border border-[var(--color-border)] rounded px-3 py-2 text-xs text-[var(--color-text)]"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase">
              Instructions for Civilians
            </label>
            <textarea
              rows={2}
              placeholder="Entry from North Gate. Medical staff on site."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="mt-1 w-full bg-[var(--color-bg-app)] border border-[var(--color-border)] rounded px-3 py-1.5 text-xs text-[var(--color-text)] resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md cursor-pointer transition-colors"
            >
              Broadcast Safe Zone
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
