import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200 text-slate-500 shadow-sm mb-6">
        <FileQuestion className="h-8 w-8" />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mb-8 max-w-md text-sm text-slate-500">
        Sorry, we couldn't find the page you were looking for. It may have been moved or deleted.
      </p>
      <Link
        href="/dashboard"
        className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
