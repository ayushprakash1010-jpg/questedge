"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shared/page-header";
import {
  User,
  Building2,
  Shield,
  Key,
  ExternalLink,
  LogOut,
  CheckCircle2,
  Mail,
  Fingerprint,
  RefreshCw,
  Clock,
  Sparkles,
} from "lucide-react";

export default function UnifiedProfilePage() {
  const router = useRouter();
  const { user } = useUser();
  const { profile, isLoading } = useProfile();

  // Role-based auto-redirection for Candidate and Recruiter personas
  useEffect(() => {
    if (!profile || isLoading) return;
    const uType = (profile as any).userType;
    if (uType === "CANDIDATE") {
      router.replace("/candidate/profile");
    } else if (uType === "RECRUITER") {
      router.replace("/recruiter/profile");
    }
  }, [profile, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const uType = (profile as any)?.userType || "COMPANY_USER";
  const role = profile?.role || "USER";
  const org = profile?.organization;
  const isSuperAdmin = role === "SUPPORT_ADMIN" || uType === "PLATFORM_ADMIN";

  const displayName = profile?.name || user?.name || "User";
  const displayEmail = profile?.email || user?.email || "";
  const displayPicture = (profile as any)?.avatarUrl || user?.picture || undefined;

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const supportAdminUrl =
    process.env.NEXT_PUBLIC_SUPPORT_ADMIN_URL || "https://questedge-support-admin.vercel.app";

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Account & Profile"
        subtitle="Manage your personal credentials, organizational profile, and security preferences."
      />

      {/* User Hero Banner */}
      <Card className="border-slate-200/80 bg-gradient-to-r from-slate-900 to-indigo-950 text-white overflow-hidden shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <Avatar className="h-20 w-20 border-2 border-indigo-400/40 shadow-md">
                <AvatarImage src={displayPicture} />
                <AvatarFallback className="bg-indigo-600 text-white font-bold text-xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-bold tracking-tight text-white">{displayName}</h2>
                  <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-400/30 text-xs font-semibold">
                    {role.replace(/_/g, " ")}
                  </Badge>
                  {isSuperAdmin && (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs font-semibold">
                      Super Admin
                    </Badge>
                  )}
                </div>
                <p className="text-slate-300 text-sm flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-indigo-400" />
                  {displayEmail}
                </p>
                {org && (
                  <p className="text-slate-400 text-xs flex items-center gap-1.5 pt-0.5">
                    <Building2 className="h-3 w-3 text-slate-400" />
                    {org.name} {org.industry ? `• ${org.industry}` : ""}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions in Hero */}
            <div className="flex flex-wrap sm:flex-col gap-2 w-full sm:w-auto">
              {isSuperAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(supportAdminUrl, "_blank")}
                  className="bg-indigo-500/10 border-indigo-400/40 text-indigo-200 hover:bg-indigo-500/20 hover:text-white"
                >
                  <Shield className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
                  Support Admin Portal
                  <ExternalLink className="h-3 w-3 ml-1.5 opacity-70" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = "/auth/logout")}
                className="bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5 text-rose-400" />
                Sign Out
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details */}
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-600" />
              Personal Credentials
            </CardTitle>
            <CardDescription className="text-xs">
              Account identity verified via Auth0 SSO
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Full Name</span>
              <span className="font-medium text-slate-900">{displayName}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Email Address</span>
              <span className="font-medium text-slate-900 flex items-center gap-1.5">
                {displayEmail}
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Account Type</span>
              <Badge variant="outline" className="font-mono text-xs">
                {uType}
              </Badge>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Platform Role</span>
              <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-xs font-semibold">
                {role}
              </Badge>
            </div>
            {profile?.id && (
              <div className="flex justify-between py-2">
                <span className="text-slate-500 flex items-center gap-1">
                  <Fingerprint className="h-3.5 w-3.5" /> User ID
                </span>
                <span className="font-mono text-xs text-slate-600 max-w-[200px] truncate" title={profile.id}>
                  {profile.id}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Organization Info */}
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-600" />
              Active Organization
            </CardTitle>
            <CardDescription className="text-xs">
              Tenant workspace and company associations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {org ? (
              <>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Company Name</span>
                  <span className="font-medium text-slate-900">{org.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Industry</span>
                  <span className="font-medium text-slate-900">{org.industry || "General"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Tenant ID</span>
                  <span className="font-mono text-xs text-slate-600 max-w-[200px] truncate" title={org.id}>
                    {org.id}
                  </span>
                </div>
                <div className="pt-2 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => router.push("/admin/settings")}
                  >
                    Organization Settings
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => router.push("/admin/users")}
                  >
                    Manage Team
                  </Button>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-slate-500 text-sm">
                <p>No organization assigned yet.</p>
                <Button
                  size="sm"
                  className="mt-3 bg-indigo-600 text-white"
                  onClick={() => router.push("/onboarding")}
                >
                  Complete Onboarding
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Security & Access Management */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-indigo-600" />
            Security & Identity Preferences
          </CardTitle>
          <CardDescription className="text-xs">
            Manage authentication state, session control, and persona re-provisioning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/60">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-indigo-600" />
                Change Account Persona / Role
              </h4>
              <p className="text-xs text-slate-500 max-w-xl">
                Reset your account role provisioning to switch between Employer, Recruiter, and Candidate onboarding flows.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs shrink-0"
              onClick={async () => {
                const confirmed = window.confirm(
                  "Are you sure you want to reset your account role? You will be redirected to onboarding to choose a new persona."
                );
                if (!confirmed) return;
                try {
                  const res = await fetch("/api/auth/reset-role", { method: "POST" });
                  if (!res.ok) {
                    const data = await res.json();
                    alert(data.error || "Cannot change role right now.");
                    return;
                  }
                  window.location.href = "/onboarding";
                } catch {
                  alert("Failed to reset role.");
                }
              }}
            >
              Reset Role
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/60">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Key className="h-4 w-4 text-indigo-600" />
                Authentication Provider
              </h4>
              <p className="text-xs text-slate-500 max-w-xl">
                Your session is secured using Auth0 SSO. Password resets and multi-factor authentication are managed through your identity provider.
              </p>
            </div>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs shrink-0">
              Active SSO Session
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
