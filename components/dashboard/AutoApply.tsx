"use client";

import { useSyncExternalStore, useCallback, useState, useEffect } from "react";
import { Zap, RefreshCw } from "lucide-react";

export interface AutoApplySettings {
  enabled: boolean;
  dailyLimit: number;
  appliedToday: number;
  lastResetDate: string;
  lastAutoApplied: { jobTitle: string; companyName: string; timestamp: string } | null;
}

const STORAGE_KEY = "applywise-auto-apply";
const DEFAULT_SETTINGS: AutoApplySettings = {
  enabled: false,
  dailyLimit: 5,
  appliedToday: 0,
  lastResetDate: new Date().toISOString().slice(0, 10),
  lastAutoApplied: null,
};

function readSettings(): AutoApplySettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeSettings(settings: AutoApplySettings): AutoApplySettings {
  if (typeof window === "undefined") return settings;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
  return settings;
}

function resetIfNeeded(settings: AutoApplySettings): AutoApplySettings {
  const today = new Date().toISOString().slice(0, 10);
  if (settings.lastResetDate !== today) {
    return writeSettings({ ...settings, appliedToday: 0, lastResetDate: today });
  }
  return settings;
}

let currentSettings = DEFAULT_SETTINGS;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function getSnapshot(): AutoApplySettings {
  return resetIfNeeded(currentSettings);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAutoApplySettings(): AutoApplySettings {
  return getSnapshot();
}

export function saveAutoApplySettings(partial: Partial<AutoApplySettings>): AutoApplySettings {
  currentSettings = writeSettings({ ...currentSettings, ...partial });
  emit();
  return currentSettings;
}

export function resetAutoApplyIfNeeded(): AutoApplySettings {
  currentSettings = resetIfNeeded(currentSettings);
  emit();
  return currentSettings;
}

export function incrementAutoApply(jobTitle: string, companyName: string): AutoApplySettings {
  const settings = resetAutoApplyIfNeeded();
  return saveAutoApplySettings({
    appliedToday: settings.appliedToday + 1,
    lastAutoApplied: { jobTitle, companyName, timestamp: new Date().toISOString() },
  });
}

interface AutoApplyProps {
  onAutoApply?: () => void;
}

export function AutoApply({ onAutoApply }: AutoApplyProps) {
  // Hydrate module-level state on first client render
  const [hydrated, setHydrated] = useState(false);
  const settings = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_SETTINGS);

  useEffect(() => {
    currentSettings = readSettings();
    emit();
    setHydrated(true);
  }, []);

  const toggleEnabled = useCallback(() => {
    const updated = saveAutoApplySettings({ enabled: !settings.enabled });
    if (updated.enabled && onAutoApply) {
      onAutoApply();
    }
  }, [settings.enabled, onAutoApply]);

  const changeLimit = useCallback((limit: number) => {
    saveAutoApplySettings({ dailyLimit: limit });
  }, []);

  const triggerManualRun = useCallback(() => {
    if (onAutoApply) onAutoApply();
  }, [onAutoApply]);

  const remaining = Math.max(0, settings.dailyLimit - settings.appliedToday);
  const last = settings.lastAutoApplied;

  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const timeAgo = useCallback(
    (ts: string) => {
      if (!now) return "";
      const seconds = Math.floor((now - new Date(ts).getTime()) / 1000);
      if (seconds < 60) return "just now";
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      return `${Math.floor(hours / 24)}d ago`;
    },
    [now]
  );

  if (!hydrated) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-pulse">
        <div className="h-6 bg-zinc-800 rounded w-1/3 mb-4" />
        <div className="h-4 bg-zinc-800 rounded w-2/3" />
      </div>
    );
  }

  return (
    <div className={`bg-zinc-900 border rounded-2xl p-6 animate-slide-up transition-colors ${settings.enabled ? "border-indigo-500/50" : "border-zinc-800"}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${settings.enabled ? "bg-indigo-500/20 text-indigo-400" : "bg-zinc-800 text-zinc-400"}`}>
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Auto Apply</h3>
            <p className="text-sm text-zinc-400">
              {settings.enabled ? "Scanning for high-match jobs" : "Enable automatic applications"}
            </p>
          </div>
        </div>
        <button
          onClick={toggleEnabled}
          className={`relative w-12 h-6 rounded-full transition-colors ${settings.enabled ? "bg-indigo-500" : "bg-zinc-700"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings.enabled ? "translate-x-6" : "translate-x-0"}`}
          />
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Daily limit</span>
          <select
            value={settings.dailyLimit}
            onChange={(e) => changeLimit(parseInt(e.target.value))}
            disabled={!settings.enabled}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            <option value={3}>3</option>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </div>

        <div className="bg-zinc-800/50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Auto-applied today</span>
            <span className="text-white font-medium">
              {settings.appliedToday} / {settings.dailyLimit}
            </span>
          </div>

          {last && (
            <p className="text-xs text-zinc-500">
              Last: {last.jobTitle} at {last.companyName} ({timeAgo(last.timestamp)})
            </p>
          )}

          {settings.enabled && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-zinc-500">
                {remaining > 0 ? `${remaining} applications remaining today` : "Daily limit reached"}
              </span>
              <button
                onClick={triggerManualRun}
                className="flex items-center gap-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1.5 rounded transition"
              >
                <RefreshCw className="w-3 h-3" />
                Run now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
