import { kv } from "@vercel/kv";

// In development, use in-memory store as fallback
const memoryStore = new Map<string, unknown>();
const isDev = process.env.NODE_ENV !== "production" || !process.env.KV_REST_API_URL;

export async function kvGet<T>(key: string): Promise<T | null> {
  try {
    if (isDev) {
      return (memoryStore.get(key) as T) ?? null;
    }
    return await kv.get<T>(key);
  } catch {
    return (memoryStore.get(key) as T) ?? null;
  }
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  try {
    if (isDev) {
      memoryStore.set(key, value);
      return;
    }
    await kv.set(key, value);
  } catch {
    memoryStore.set(key, value);
  }
}

export async function kvGetOrDefault<T>(key: string, defaultValue: T): Promise<T> {
  const value = await kvGet<T>(key);
  if (value === null) {
    await kvSet(key, defaultValue);
    return defaultValue;
  }
  return value;
}

// Helper to update an array item by ID
export async function kvUpdateItem<T extends { id: string }>(
  key: string,
  id: string,
  updates: Partial<T>
): Promise<T | null> {
  const items = await kvGet<T[]>(key) ?? [];
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...updates };
  await kvSet(key, items);
  return items[index];
}

// Helper to add an item to an array
export async function kvAddItem<T>(key: string, item: T): Promise<void> {
  const items = await kvGet<T[]>(key) ?? [];
  items.push(item);
  await kvSet(key, items);
}

// Helper to delete an item from an array by ID
export async function kvDeleteItem<T extends { id: string }>(key: string, id: string): Promise<void> {
  const items = await kvGet<T[]>(key) ?? [];
  await kvSet(key, items.filter((item) => item.id !== id));
}
