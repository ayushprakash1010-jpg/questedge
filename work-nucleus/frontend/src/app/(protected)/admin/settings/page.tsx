"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { BrandLoader } from "@/components/ui/brand-loader";
import { toast } from "@/components/ui/toaster";
import { PageHeader } from "@/components/shared/page-header";
import { readResponseError } from "@/lib/api";

interface Settings {
  scoringWeights?: Record<string, number>;
  maxInterviewRounds?: number;
  approvalWorkflowEnabled?: boolean;
  autoTriggerBgvOnOfferAccept?: boolean;
  bgvProvider?: string;
  defaultPipelineStages?: string[];
  notificationPreferences?: Record<string, boolean>;
}

export default function OrgSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) {
        throw new Error(await readResponseError(res, "Failed to load organization settings"));
      }
      const data = await res.json();
      setSettings(data.settings || {});
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load organization settings";
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        throw new Error(await readResponseError(res, "Save failed"));
      }
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <BrandLoader fullscreen={false} message="Loading workspace settings..." />;
  }

  const weights = settings?.scoringWeights || {};
  const weightEntries = Object.entries(weights);
  const totalWeight = weightEntries.reduce((s, [, v]) => s + v, 0);
  const hasWeights = weightEntries.length > 0;
  const isWeightValid = !hasWeights || totalWeight === 100;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Organization Settings"
        subtitle="Configure scoring, pipelines, and preferences."
        actions={
          <Button size="sm" onClick={handleSave} disabled={saving || !isWeightValid}>
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        }
      />

      <div className="space-y-6">
        {loadError && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <span>{loadError}</span>
            <Button variant="outline" size="sm" onClick={loadSettings}>
              Retry
            </Button>
          </div>
        )}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">
              Scoring Weights
            </CardTitle>
            {hasWeights && (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isWeightValid
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800"
                    : "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800"
                }`}
              >
                Total: {totalWeight}% {!isWeightValid ? "(must equal 100%)" : ""}
              </span>
            )}
          </CardHeader>
          <CardContent>
            {hasWeights ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {weightEntries.map(([key, value]) => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={`weight-${key}`} className="capitalize text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {key}
                    </Label>
                    <div className="relative">
                      <Input
                        id={`weight-${key}`}
                        type="number"
                        className="pr-8 tabular-nums"
                        value={value}
                        min={0}
                        max={100}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            scoringWeights: {
                              ...weights,
                              [key]: parseInt(e.target.value, 10) || 0,
                            },
                          })
                        }
                      />
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400"
                      >
                        %
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No scoring weights configured.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-slate-200/80 p-3.5 dark:border-slate-800">
              <div>
                <Label htmlFor="max-rounds" className="font-semibold">
                  Max Interview Rounds
                </Label>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Maximum number of structured evaluation rounds allowed per mandate
                </p>
              </div>
              <Input
                id="max-rounds"
                type="number"
                className="w-24 tabular-nums shrink-0"
                value={settings?.maxInterviewRounds || 6}
                min={1}
                max={10}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxInterviewRounds: parseInt(e.target.value, 10) || 6,
                  })
                }
              />
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-slate-200/80 p-3.5 cursor-pointer hover:bg-slate-50/70 transition-colors dark:border-slate-800 dark:hover:bg-slate-800/40">
              <input
                type="checkbox"
                checked={settings?.approvalWorkflowEnabled || false}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    approvalWorkflowEnabled: e.target.checked,
                  })
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Enable Approval Workflow
                </span>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Require approval for decisions before communication is sent
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-slate-200/80 p-3.5 cursor-pointer hover:bg-slate-50/70 transition-colors dark:border-slate-800 dark:hover:bg-slate-800/40">
              <input
                type="checkbox"
                checked={settings?.autoTriggerBgvOnOfferAccept || false}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    autoTriggerBgvOnOfferAccept: e.target.checked,
                  })
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Auto-trigger Background Verification (BGV)
                </span>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Automatically start standard BGV checks when an offer is signed and accepted.
                </p>
              </div>
            </label>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-slate-200/80 p-3.5 dark:border-slate-800">
              <div>
                <Label htmlFor="bgv-provider" className="font-semibold">
                  Default BGV Provider
                </Label>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Vendor used when initiating new background verification profiles
                </p>
              </div>
              <Select
                id="bgv-provider"
                className="w-44 shrink-0"
                value={settings?.bgvProvider || "authbridge"}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    bgvProvider: e.target.value,
                  })
                }
              >
                <option value="authbridge">AuthBridge</option>
                <option value="ongrid">OnGrid</option>
                <option value="idfy">IDfy</option>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
