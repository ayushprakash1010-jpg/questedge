"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, Search, Users, ClipboardList, Ticket, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Org {
  id: string;
  name: string;
  industry: string | null;
  createdAt: string;
  _count: { users: number; hiringPlans: number; supportTickets: number };
  healthScore: number | null;
  riskFlags: string[];
}

interface OrgListResponse {
  data: Org[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

function healthBadge(score: number | null) {
  if (score === null) return <Badge variant="outline">N/A</Badge>;
  if (score >= 80) return <Badge className="bg-green-100 text-green-800">{score}</Badge>;
  if (score >= 50) return <Badge className="bg-yellow-100 text-yellow-800">{score}</Badge>;
  return <Badge className="bg-red-100 text-red-800">{score}</Badge>;
}

export default function OrganizationsPage() {
  const [data, setData] = useState<OrgListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const fetchOrgs = (p: number, q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: "20" });
    if (q) params.set("search", q);
    fetch(`/api/support/organizations?${params}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrgs(page, search);
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    fetchOrgs(1, search);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Organizations</h1>
        <p className="text-muted-foreground">Browse and inspect client organizations</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button onClick={handleSearch} variant="outline">Search</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : !data?.data.length ? (
        <p className="text-muted-foreground py-10 text-center">No organizations found.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.data.map((org) => (
              <Link key={org.id} href={`/organizations/${org.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">{org.name}</CardTitle>
                      </div>
                      {healthBadge(org.healthScore)}
                    </div>
                    {org.industry && (
                      <p className="text-sm text-muted-foreground">{org.industry}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {org._count.users}
                      </span>
                      <span className="flex items-center gap-1">
                        <ClipboardList className="h-3.5 w-3.5" /> {org._count.hiringPlans}
                      </span>
                      <span className="flex items-center gap-1">
                        <Ticket className="h-3.5 w-3.5" /> {org._count.supportTickets}
                      </span>
                    </div>
                    {org.riskFlags && org.riskFlags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(org.riskFlags as string[]).map((flag, i) => (
                          <Badge key={i} variant="destructive" className="text-xs">{flag}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {data.meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {data.meta.page} of {data.meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.meta.totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
