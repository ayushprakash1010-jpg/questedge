"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { PageHeader } from "@/components/shared/page-header";

interface Settings {
  scoringWeights?: Record<string, number>;
  maxInterviewRounds?: number;
  approvalWorkflowEnabled?: boolean;
}

export default function OrgSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
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
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetch_();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const weights = settings?.scoringWeights || {};
  const totalWeight = Object.values(weights).reduce((s, v) => s + v, 0);

  return (
    <div>
      <PageHeader
        title="Organization Settings"
        subtitle="Configure scoring, pipelines, and preferences."
        actions={
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Scoring Weights (must sum to 100)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(weights).map(([key, value]) => (
                <div key={key} className="space-y-1.5">
                  <Label className="capitalize">{key}</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={value}
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
            <p className="mt-3 text-xs text-slate-400">Total: {totalWeight}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="max-rounds">Max Interview Rounds</Label>
              <Input
                id="max-rounds"
                type="number"
                className="w-32"
                value={settings?.maxInterviewRounds || 6}
                min={1}
                max={10}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxInterviewRounds: parseInt(e.target.value) || 6,
                  })
                }
              />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings?.approvalWorkflowEnabled || false}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      approvalWorkflowEnabled: e.target.checked,
                    })
                  }
                  className="rounded border-slate-300"
                />
                Enable Approval Workflow
              </Label>
              <p className="mt-0.5 text-xs text-slate-500">
                Require approval for decisions before communication is sent
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
