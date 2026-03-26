"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ArrowLeft, Download, Settings, Trash2, CheckCircle } from "lucide-react";
import Link from "next/link";

interface OrgOption { id: string; name: string; }
interface FeatureFlags { [key: string]: boolean; }

export default function BulkToolsPage() {
  const [tab, setTab] = useState<"export" | "flags" | "bulk">("export");
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [exportTypes, setExportTypes] = useState<string[]>(["users"]);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<any>(null);
  const [flags, setFlags] = useState<FeatureFlags>({});
  const [flagsLoading, setFlagsLoading] = useState(false);
  const [bulkAction, setBulkAction] = useState("close-old-tickets");
  const [bulkDays, setBulkDays] = useState("30");
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/support/organizations?limit=100")
      .then((r) => r.json())
      .then((d) => setOrgs((d.data || []).map((o: any) => ({ id: o.id, name: o.name }))));
  }, []);

  const handleExport = async () => {
    if (!selectedOrg) return;
    setExporting(true);
    setExportResult(null);
    const res = await fetch("/api/support/tools/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: selectedOrg, dataTypes: exportTypes }),
    });
    const data = await res.json();
    setExportResult(data);
    setExporting(false);
  };

  const loadFlags = async (orgId: string) => {
    setSelectedOrg(orgId);
    setFlagsLoading(true);
    const res = await fetch(`/api/support/tools/feature-flags/${orgId}`);
    const data = await res.json();
    setFlags(data.featureFlags || {});
    setFlagsLoading(false);
  };

  const toggleFlag = async (key: string) => {
    const updated = { ...flags, [key]: !flags[key] };
    setFlags(updated);
    await fetch(`/api/support/tools/feature-flags/${selectedOrg}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: !flags[key] }),
    });
  };

  const executeBulk = async () => {
    setBulkResult(null);
    const params: any = { daysOld: parseInt(bulkDays) };
    if (bulkAction === "deactivate-inactive-users") {
      if (!selectedOrg) return;
      params.orgId = selectedOrg;
      params.daysInactive = parseInt(bulkDays);
    }
    const res = await fetch("/api/support/tools/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: bulkAction, params }),
    });
    const data = await res.json();
    setBulkResult(`Action "${data.action}" completed. ${data.affected} records affected.`);
  };

  const dataTypeOptions = ["users", "hiring-plans", "candidates", "audit-logs"];

  const tabs = [
    { key: "export", label: "Data Export" },
    { key: "flags", label: "Feature Flags" },
    { key: "bulk", label: "Bulk Actions" },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/support-admin/tools">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold">Bulk Operations</h1>
      </div>

      <div className="flex gap-2 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "export" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Data Export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Organization</label>
              <Select value={selectedOrg} onChange={(e) => setSelectedOrg(e.target.value)}>
                <option value="">Select organization</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Data Types</label>
              <div className="flex flex-wrap gap-2">
                {dataTypeOptions.map((dt) => (
                  <button
                    key={dt}
                    onClick={() => setExportTypes((prev) =>
                      prev.includes(dt) ? prev.filter((t) => t !== dt) : [...prev, dt]
                    )}
                    className={`px-3 py-1 text-sm rounded-md border ${
                      exportTypes.includes(dt) ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"
                    }`}
                  >
                    {dt}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleExport} disabled={exporting || !selectedOrg}>
              <Download className="h-4 w-4 mr-2" />
              {exporting ? "Exporting..." : "Export Data"}
            </Button>
            {exportResult && (
              <div className="rounded-md border bg-green-50 p-4">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <CheckCircle className="h-4 w-4" />
                  <strong>Export Complete</strong>
                </div>
                <p className="text-sm text-muted-foreground">
                  Exported {exportResult.dataTypes?.join(", ")} for {exportResult.orgName} at {exportResult.exportedAt}
                </p>
                <pre className="mt-2 max-h-[300px] overflow-auto text-xs bg-gray-100 p-2 rounded">
                  {JSON.stringify(exportResult.data, null, 2).substring(0, 2000)}...
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "flags" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Feature Flags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Organization</label>
              <Select value={selectedOrg} onChange={(e) => loadFlags(e.target.value)}>
                <option value="">Select organization</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </Select>
            </div>
            {flagsLoading ? (
              <div className="py-4 text-center text-muted-foreground">Loading flags...</div>
            ) : selectedOrg && Object.keys(flags).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(flags).map(([key, enabled]) => (
                  <div key={key} className="flex items-center justify-between rounded-md border p-3">
                    <span className="text-sm font-medium">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                    <button
                      onClick={() => toggleFlag(key)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        enabled ? "bg-primary" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            ) : selectedOrg ? (
              <p className="text-sm text-muted-foreground">No feature flags configured.</p>
            ) : null}
          </CardContent>
        </Card>
      )}

      {tab === "bulk" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5" /> Bulk Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Action</label>
              <Select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
                <option value="close-old-tickets">Close Old Resolved Tickets</option>
                <option value="deactivate-inactive-users">Deactivate Inactive Users</option>
              </Select>
            </div>
            {bulkAction === "deactivate-inactive-users" && (
              <div>
                <label className="text-sm font-medium">Organization</label>
                <Select value={selectedOrg} onChange={(e) => setSelectedOrg(e.target.value)}>
                  <option value="">Select organization</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">
                {bulkAction === "close-old-tickets" ? "Days since resolved" : "Days inactive"}
              </label>
              <Input type="number" value={bulkDays} onChange={(e) => setBulkDays(e.target.value)} className="max-w-[200px]" />
            </div>
            <Button variant="destructive" onClick={executeBulk}>Execute Bulk Action</Button>
            {bulkResult && (
              <div className="rounded-md border bg-green-50 p-3 text-sm text-green-800">
                <CheckCircle className="h-4 w-4 inline mr-1" /> {bulkResult}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
