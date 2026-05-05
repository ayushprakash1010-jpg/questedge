"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Search, Users, ClipboardList, X } from "lucide-react";

interface SearchResults {
  candidates: { id: string; name: string; email: string; currentRole: string | null }[];
  hiringPlans: { id: string; title: string; department: string; status: string }[];
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        setResults(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setResults(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const navigate = (url: string) => {
    router.push(url);
    setOpen(false);
    setQuery("");
    setResults(null);
  };

  const hasResults = results && (results.candidates.length > 0 || results.hiringPlans.length > 0);

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-400 hover:border-slate-300 hover:text-slate-500"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 text-[10px] font-medium text-slate-400 sm:inline">
          ⌘K
        </kbd>
      </button>

      {/* Modal */}
      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-0 top-[15%] z-50 mx-auto w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl">
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => handleInput(e.target.value)}
                placeholder="Search candidates, plans..."
                className="flex-1 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto p-2">
              {loading && (
                <div className="py-8 text-center text-sm text-slate-400">Searching...</div>
              )}
              {!loading && query.length >= 2 && !hasResults && (
                <div className="py-8 text-center text-sm text-slate-400">No results found</div>
              )}
              {!loading && hasResults && (
                <>
                  {results!.candidates.length > 0 && (
                    <div className="mb-2">
                      <p className="px-2 py-1 text-xs font-medium text-slate-400">Candidates</p>
                      {results!.candidates.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => navigate(`/candidates`)}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50"
                        >
                          <Users className="h-4 w-4 text-slate-400" />
                          <div>
                            <p className="text-sm font-medium text-slate-900">{c.name}</p>
                            <p className="text-xs text-slate-500">{c.email}{c.currentRole ? ` · ${c.currentRole}` : ""}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {results!.hiringPlans.length > 0 && (
                    <div>
                      <p className="px-2 py-1 text-xs font-medium text-slate-400">Hiring Plans</p>
                      {results!.hiringPlans.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => navigate(`/hiring-plans/${p.id}`)}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50"
                        >
                          <ClipboardList className="h-4 w-4 text-slate-400" />
                          <div>
                            <p className="text-sm font-medium text-slate-900">{p.title}</p>
                            <p className="text-xs text-slate-500">{p.department} · {p.status}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              {!loading && query.length < 2 && (
                <div className="py-8 text-center text-sm text-slate-400">
                  Type at least 2 characters to search
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
