"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Save, Eye } from "lucide-react";

interface Template {
  id: string;
  name: string;
  body: string;
  variables: Array<{ key: string; label: string; type: string; required?: boolean }>;
  brandingJson: Record<string, unknown> | null;
  version: number;
  isActive: boolean;
  updatedAt: string;
}

const STARTER_BODY = `<p>This letter confirms our offer to {{candidate.name}} for the role of <strong>{{role.title}}</strong> at {{org.name}}.</p>

<p>Your annual fixed compensation will be {{compensation.currency}} {{compensation.fixedAnnual}}.</p>

<p>Please review the attached terms and sign electronically by {{offer.expiresAt}}.</p>

<p>We look forward to welcoming you to the team.</p>`;

export default function OfferTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Partial<Template> | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/v2/offer-templates");
    if (res.ok) setTemplates(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!editing?.name || !editing?.body) return;
    setBusy(true);
    try {
      const isNew = !editing.id;
      const res = await fetch(`/api/v2/offer-templates${isNew ? "" : `/${editing.id}`}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editing.name,
          body: editing.body,
          variables: editing.variables ?? [],
          brandingJson: editing.brandingJson ?? null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      await load();
      setEditing(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Offer Letter Templates</h1>
          <p className="text-sm text-slate-500">Reusable templates with variables that fill from offer + candidate data.</p>
        </div>
        <Button
          onClick={() =>
            setEditing({
              name: "",
              body: STARTER_BODY,
              variables: [],
            })
          }
        >
          <Plus className="w-4 h-4 mr-1" /> New template
        </Button>
      </div>

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>{editing.id ? `Edit: ${editing.name}` : "New template"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-slate-500">Name</label>
              <Input
                value={editing.name ?? ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Body (HTML, supports {`{{variable}}`} interpolation)</label>
              <Textarea
                rows={16}
                value={editing.body ?? ""}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
              />
            </div>
            <div className="bg-slate-50 border rounded-md p-3 text-xs text-slate-600">
              Available variables: <code>{`{{candidate.name}}`}</code>, <code>{`{{role.title}}`}</code>,{" "}
              <code>{`{{org.name}}`}</code>, <code>{`{{compensation.fixedAnnual}}`}</code>,{" "}
              <code>{`{{offer.expiresAt}}`}</code>
            </div>
            <div className="flex gap-2">
              <Button onClick={save} disabled={busy}>
                <Save className="w-4 h-4 mr-1" /> Save
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <Card key={t.id} className="cursor-pointer hover:shadow-md transition" onClick={() => setEditing(t)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-slate-500">v{t.version} · updated {new Date(t.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <Badge>{t.isActive ? "Active" : "Inactive"}</Badge>
                </div>
                <p className="mt-3 text-xs text-slate-600 line-clamp-3">{t.body.replace(/<[^>]+>/g, "").slice(0, 160)}…</p>
              </CardContent>
            </Card>
          ))}
          {templates.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-slate-500">
                No templates yet. Create one to start sending offer letters.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
