export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error ?? 'API error'), { status: res.status, data });
  return data as T;
}
