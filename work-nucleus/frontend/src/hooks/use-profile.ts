"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import { useEffect, useState } from "react";

interface UserProfile {
  isProvisioned: boolean;
  id?: string;
  email: string;
  name?: string;
  role?: string;
  avatarUrl?: string;
  organization?: {
    id: string;
    name: string;
    industry?: string;
  };
}

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export function useProfile() {
  const { user, isLoading: auth0Loading } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In mock mode, fetch profile directly (no Auth0 user needed)
    if (IS_MOCK) {
      fetch("/api/profile")
        .then((res) => res.json())
        .then((data) => setProfile(data))
        .catch(() => setProfile(null))
        .finally(() => setIsLoading(false));
      return;
    }

    if (auth0Loading || !user) {
      setIsLoading(false);
      return;
    }

    async function fetchProfile() {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        setProfile(data);
      } catch {
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, [user, auth0Loading]);

  return {
    profile,
    isLoading: IS_MOCK ? isLoading : auth0Loading || isLoading,
    user: IS_MOCK ? ({ email: "admin@acme.com", name: "Priya Sharma" } as typeof user) : user,
  };
}
