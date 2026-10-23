// Client HTTP de l'API (cookie de session httpOnly, même origine — proxy Vite en dev).
export async function api(path, { method = 'GET', json, form } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: json ? { 'Content-Type': 'application/json' } : undefined,
    body: form || (json ? JSON.stringify(json) : undefined),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* réponse non JSON */
  }
  if (!res.ok) {
    const e = new Error(data?.error || `Erreur ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return data;
}
