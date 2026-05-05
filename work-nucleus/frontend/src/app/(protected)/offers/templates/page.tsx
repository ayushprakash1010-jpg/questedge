"use client";

import { useEffect, useState } from "react";
import { Plus, Save, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import { PageHeader } from "@/components/shared/page-header";

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
      const res = await fetch(
        `/api/v2/offer-templates${isNew ? "" : `/${editing.id}`}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editing.name,
            body: editing.body,
            variables: editing.variables ?? [],
            brandingJson: editing.brandingJson ?? null,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to save");
      await load();
      setEditing(null);
      toast.success(isNew ? "Template created" : "Template saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Offer Letter Templates"
        subtitle="Reusable templates with variables that fill from offer + candidate data."
        actions={
          !editing ? (
            <Button
              size="sm"
              onClick={() =>
                setEditing({ name: "", body: STARTER_BODY, variables: [] })
              }
            >
              <Plus className="h-4 w-4" /> New template
            </Button>
          ) : null
        }
      />

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {editing.id ? `Edit: ${editing.name}` : "New template"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Name</Label>
              <Input
                id="tpl-name"
                value={editing.name ?? ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-body">
                Body (HTML, supports {`{{variable}}`} interpolation)
              </Label>
              <Textarea
                id="tpl-body"
                rows={16}
                value={editing.body ?? ""}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
              />
            </div>
            <div className="rounded-md border border-slate-200/60 bg-slate-50 p-3 text-xs text-slate-600">
              Available variables: <code>{`{{candidate.name}}`}</code>,{" "}
              <code>{`{{role.title}}`}</code>, <code>{`{{org.name}}`}</code>,{" "}
              <code>{`{{compensation.fixedAnnual}}`}</code>,{" "}
              <code>{`{{offer.expiresAt}}`}</code>
            </div>
            <div className="flex gap-2">
              <Button onClick={save} disabled={busy}>
                <Save className="h-4 w-4" /> Save
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="No templates yet"
          description="Create one to start sending offer letters."
          action={
            <Button
              size="sm"
              onClick={() =>
                setEditing({ name: "", body: STARTER_BODY, variables: [] })
              }
            >
              <Plus className="h-4 w-4" /> New template
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card
              key={t.id}
              className="card-hover cursor-pointer"
              onClick={() => setEditing(t)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{t.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      v{t.version} · updated{" "}
                      {new Date(t.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={t.isActive ? "success" : "secondary"}>
                    {t.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="mt-3 line-clamp-3 text-xs text-slate-600">
                  {t.body.replace(/<[^>]+>/g, "").slice(0, 160)}…
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
