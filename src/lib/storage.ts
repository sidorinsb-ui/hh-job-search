const PREFIX = "hh-job-search:";

export function getGeminiKey(): string {
  try {
    return localStorage.getItem(PREFIX + "gemini-key") || "";
  } catch {
    return "";
  }
}

export function setGeminiKey(key: string): void {
  try {
    if (key) localStorage.setItem(PREFIX + "gemini-key", key);
    else localStorage.removeItem(PREFIX + "gemini-key");
  } catch {
    // ignore (private mode etc.)
  }
}

export function getGeminiModel(): string {
  try {
    return localStorage.getItem(PREFIX + "gemini-model") || "";
  } catch {
    return "";
  }
}

export function setGeminiModel(model: string): void {
  try {
    if (model) localStorage.setItem(PREFIX + "gemini-model", model);
    else localStorage.removeItem(PREFIX + "gemini-model");
  } catch {
    // ignore
  }
}

export function getFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(PREFIX + "favorites") || "[]");
  } catch {
    return [];
  }
}

export function toggleFavorite(id: string): string[] {
  const list = getFavorites();
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1);
  else list.push(id);
  try {
    localStorage.setItem(PREFIX + "favorites", JSON.stringify(list));
  } catch {
    // ignore
  }
  return list;
}
