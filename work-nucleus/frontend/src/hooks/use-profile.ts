"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";

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

export function useProfile() {
  const { user, isLoading: auth0Loading } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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

  return { profile, isLoading: auth0Loading || isLoading, user };
}
