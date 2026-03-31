"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Save, Settings } from "lucide-react";

export default function OrgSettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetch_() {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings(data.settings || {});
        }
      } catch {} finally {
        setLoading(false);
      }
    }
    fetch_();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
    } catch {} finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const weights = settings?.scoringWeights || {};

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Organization Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Configure scoring, pipelines, and preferences.</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <div className="mt-6 space-y-6">
        {/* Scoring Weights */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Scoring Weights (must sum to 100)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(weights).map(([key, value]) => (
                <div key={key}>
                  <label className="text-sm font-medium text-slate-700 capitalize">{key}</label>
                  <div className="mt-1 flex items-center gap-1">
                    <Input
                      type="number"
                      value={value as number}
                      min={0}
                      max={100}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          scoringWeights: {
                            ...weights,
                            [key]: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                    />
                    <span className="text-sm text-slate-400">%</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Total: {Object.values(weights).reduce((s: number, v: any) => s + (v as number), 0)}%
            </p>
          </CardContent>
        </Card>

        {/* Max Interview Rounds */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Max Interview Rounds</label>
              <Input
                type="number"
                className="mt-1 w-32"
                value={settings?.maxInterviewRounds || 6}
                min={1}
                max={10}
                onChange={(e) =>
                  setSettings({ ...settings, maxInterviewRounds: parseInt(e.target.value) || 6 })
                }
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={settings?.approvalWorkflowEnabled || false}
                  onChange={(e) =>
                    setSettings({ ...settings, approvalWorkflowEnabled: e.target.checked })
                  }
                  className="rounded"
                />
                Enable Approval Workflow
              </label>
              <p className="mt-0.5 text-xs text-slate-500">Require approval for decisions before communication is sent</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
