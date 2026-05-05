/**
 * PWA helpers — service worker registration, push subscription, and
 * IndexedDB-backed offline mutation queue. Imported lazily from client pages
 * that need it (the appraisal self-assessment form is the first user).
 */

const QUEUE_DB = "wn-offline-queue";
const QUEUE_STORE = "mutations";

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (err) {
    console.warn("SW registration failed:", err);
    return null;
  }
}

export async function subscribeToPush(vapidPublicKey: string): Promise<boolean> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
  const json = sub.toJSON();
  const res = await fetch("/api/v2/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      userAgent: navigator.userAgent,
    }),
  });
  return res.ok;
}

// ── Offline mutation queue ──────────────────────────────────────

export interface QueuedMutation {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  ts: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(QUEUE_DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(QUEUE_STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueMutation(m: Omit<QueuedMutation, "id" | "ts">): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(QUEUE_STORE, "readwrite");
  tx.objectStore(QUEUE_STORE).add({
    ...m,
    id: crypto.randomUUID(),
    ts: Date.now(),
  });
  await txDone(tx);
}

export async function flushQueue(): Promise<{ flushed: number; failed: number }> {
  const db = await openDb();
  const list = await new Promise<QueuedMutation[]>((resolve, reject) => {
    const req = db.transaction(QUEUE_STORE).objectStore(QUEUE_STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedMutation[]);
    req.onerror = () => reject(req.error);
  });
  let flushed = 0;
  let failed = 0;
  for (const m of list) {
    try {
      const res = await fetch(m.url, { method: m.method, headers: m.headers, body: m.body });
      if (res.ok) {
        await deleteFromQueue(m.id);
        flushed++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }
  return { flushed, failed };
}

async function deleteFromQueue(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(QUEUE_STORE, "readwrite");
  tx.objectStore(QUEUE_STORE).delete(id);
  await txDone(tx);
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i);
  return out;
}
