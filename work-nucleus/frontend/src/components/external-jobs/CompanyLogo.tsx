"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";

interface CompanyLogoProps {
  companyName: string;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const KNOWN_DOMAINS: Record<string, string> = {
  cursor: "cursor.com",
  elastic: "elastic.co",
  sigmoid: "sigmoid.com",
  rubrik: "rubrik.com",
  airbnb: "airbnb.com",
  samsara: "samsara.com",
  braze: "braze.com",
  zscaler: "zscaler.com",
  gitlab: "gitlab.com",
  pinterest: "pinterest.com",
  commvault: "commvault.com",
  mixpanel: "mixpanel.com",
  lyft: "lyft.com",
  supabase: "supabase.com",
  netskope: "netskope.com",
  mongodb: "mongodb.com",
  launchdarkly: "launchdarkly.com",
  freshworks: "freshworks.com",
  postman: "postman.com",
  hasura: "hasura.io",
  browserstack: "browserstack.com",
  chargebee: "chargebee.com",
  zeta: "zeta.tech",
  phonepe: "phonepe.com",
  paytm: "paytm.com",
  swiggy: "swiggy.com",
  zomato: "zomato.com",
  cred: "cred.club",
  meesho: "meesho.io",
  dream11: "dream11.com",
  lenskart: "lenskart.com",
  urbancompany: "urbancompany.com",
  zepto: "zeptonow.com",
  rapido: "rapido.bike",
  spinny: "spinny.com",
  jupiter: "jupiter.money",
  zoho: "zoho.com",
  nykaa: "nykaa.com",
  ola: "olacabs.com",
  groww: "groww.in",
  razorpay: "razorpay.com",
};

export function getCompanyDomain(name: string): string {
  if (!name) return "";
  const slug = name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(
      /\b(inc|llc|ltd|corp|corporation|technologies|technology|solutions|services|group|co|international|holdings|labs|cloud)\b/gi,
      ""
    )
    .replace(/[^a-z0-9]/g, "")
    .trim();

  if (KNOWN_DOMAINS[slug]) return KNOWN_DOMAINS[slug];
  if (slug.length > 0) return `${slug}.com`;
  return "";
}

function getMonogramGradient(name: string): string {
  const gradients = [
    "from-emerald-500 to-teal-600",
    "from-blue-500 to-indigo-600",
    "from-purple-500 to-violet-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-cyan-500 to-blue-600",
    "from-indigo-500 to-purple-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

export function CompanyLogo({
  companyName,
  logoUrl,
  size = "md",
  className = "",
}: CompanyLogoProps) {
  const domain = getCompanyDomain(companyName);
  const googleFaviconUrl = domain
    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
    : null;

  // Initial source preference: explicit logoUrl, then Google favicon
  const initialSrc = logoUrl || googleFaviconUrl;
  const [currentSrc, setCurrentSrc] = useState<string | null>(initialSrc);
  const [failed, setFailed] = useState(!initialSrc);

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  }[size];

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  }[size];

  const handleImageError = () => {
    // If the primary logoUrl failed, step down to Google Favicon
    if (currentSrc === logoUrl && googleFaviconUrl && googleFaviconUrl !== logoUrl) {
      setCurrentSrc(googleFaviconUrl);
    } else {
      setFailed(true);
    }
  };

  const initialLetter = companyName
    ? companyName.trim().charAt(0).toUpperCase()
    : "";

  if (failed || !currentSrc) {
    return (
      <div
        className={`${sizeClasses} rounded-xl bg-gradient-to-br ${getMonogramGradient(
          companyName || "Company"
        )} text-white font-bold flex items-center justify-center shrink-0 shadow-xs select-none ${className}`}
        title={companyName}
      >
        {initialLetter ? (
          <span>{initialLetter}</span>
        ) : (
          <Building2 className={`${iconSizes} text-white`} />
        )}
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-xl border border-slate-100 bg-white p-1.5 flex items-center justify-center shrink-0 shadow-xs overflow-hidden ${className}`}
      title={companyName}
    >
      <img
        src={currentSrc}
        alt={companyName}
        className="h-full w-full object-contain rounded-lg"
        loading="lazy"
        onError={handleImageError}
      />
    </div>
  );
}

