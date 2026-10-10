"use client";

import { useEffect, useState } from "react";
import { Trophy, Star, TrendingUp, Medal, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/shared/page-header";

interface LeaderboardEntry {
  id: string;
  name: string;
  avatarUrl?: string;
  isVerified: boolean;
  reputationTier: string;
  hiredCount: number;
  totalEarnings: number;
}

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const tokenRes = await fetch("/api/auth/token");
        const { accessToken } = await tokenRes.json();
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

        const res = await fetch(`${API_URL}/api/v1/recruiter/leaderboard`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (res.ok) {
          const data = await res.json();
          setLeaders(data);
        }
      } catch (err) {
        console.error("Failed to load leaderboard", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Top Recruiters Leaderboard"
        subtitle="See how you stack up against the best recruiters on the platform."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-900">Highest Earnings</p>
              <h3 className="text-xl font-bold text-amber-700">
                {leaders.length > 0 ? `₹${(leaders[0].totalEarnings / 1000).toFixed(0)}K+` : "..."}
              </h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
              <Star className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-indigo-900">Top Placements</p>
              <h3 className="text-xl font-bold text-indigo-700">
                {leaders.length > 0 ? Math.max(...leaders.map(l => l.hiredCount)) : "..."} Hires
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-900">Total Paid Out</p>
              <h3 className="text-xl font-bold text-emerald-700">
                ₹{(leaders.reduce((sum, l) => sum + l.totalEarnings, 0) / 100000).toFixed(1)}L
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Spinner />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Rank</th>
                <th className="px-6 py-4">Recruiter</th>
                <th className="px-6 py-4">Tier</th>
                <th className="px-6 py-4">Placements</th>
                <th className="px-6 py-4 text-right">Earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaders.map((leader, index) => (
                <tr key={leader.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 font-bold text-slate-700">
                      {index === 0 && <Medal className="h-5 w-5 text-yellow-500" />}
                      {index === 1 && <Medal className="h-5 w-5 text-slate-400" />}
                      {index === 2 && <Medal className="h-5 w-5 text-amber-700" />}
                      {index > 2 && <span className="w-5 text-center text-slate-400">#{index + 1}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center overflow-hidden">
                        {leader.avatarUrl ? (
                          <img src={leader.avatarUrl} alt={leader.name} className="h-full w-full object-cover" />
                        ) : (
                          leader.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          {leader.name}
                          {leader.isVerified && <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                      {leader.reputationTier}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700">
                    {leader.hiredCount}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-600">
                    ₹{leader.totalEarnings.toLocaleString()}
                  </td>
                </tr>
              ))}
              {leaders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No data available for the leaderboard yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
