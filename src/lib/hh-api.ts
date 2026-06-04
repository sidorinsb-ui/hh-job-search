// Calls go through our Cloudflare Worker proxy at /api/hh/* — the Worker holds
// the OAuth application token and forwards to api.hh.ru. HH closed anonymous
// access to /vacancies in 2025, so direct browser calls return 403.
const BASE = "/api/hh";

export type Experience =
  | "noExperience"
  | "between1And3"
  | "between3And6"
  | "moreThan6";

export type Schedule =
  | "remote"
  | "flexible"
  | "fullDay"
  | "shift"
  | "flyInFlyOut";

export interface VacancySearchParams {
  text: string;
  area?: string | number;
  experience?: Experience;
  schedule?: Schedule;
  salary?: number;
  only_with_salary?: boolean;
  per_page?: number;
  page?: number;
  professional_role?: string[];
}

export interface Vacancy {
  id: string;
  name: string;
  alternate_url: string;
  employer: { name: string; logo_urls?: { "90"?: string } | null };
  area: { name: string };
  salary: {
    from: number | null;
    to: number | null;
    currency: string;
    gross?: boolean;
  } | null;
  snippet: { requirement: string | null; responsibility: string | null };
  schedule: { name: string } | null;
  experience: { name: string } | null;
  published_at: string;
}

export interface SearchResponse {
  items: Vacancy[];
  found: number;
  pages: number;
  page: number;
  per_page: number;
}

export async function searchVacancies(
  p: VacancySearchParams
): Promise<SearchResponse> {
  const url = new URL(BASE + "/vacancies");
  if (p.text) url.searchParams.set("text", p.text);
  if (p.area !== undefined && p.area !== "")
    url.searchParams.set("area", String(p.area));
  if (p.experience) url.searchParams.set("experience", p.experience);
  if (p.schedule) url.searchParams.set("schedule", p.schedule);
  if (p.salary) url.searchParams.set("salary", String(p.salary));
  if (p.only_with_salary) url.searchParams.set("only_with_salary", "true");
  if (p.professional_role) {
    for (const r of p.professional_role) {
      url.searchParams.append("professional_role", r);
    }
  }
  url.searchParams.set("per_page", String(p.per_page ?? 50));
  url.searchParams.set("page", String(p.page ?? 0));

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HH API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

export interface Area {
  id: string;
  name: string;
  areas: Area[];
}

let areasCache: Area[] | null = null;

export async function fetchAreas(): Promise<Area[]> {
  if (areasCache) return areasCache;
  const res = await fetch(BASE + "/areas");
  if (!res.ok) throw new Error(`HH areas: ${res.status}`);
  areasCache = (await res.json()) as Area[];
  return areasCache;
}

export function findAreaId(areas: Area[], name: string): string | null {
  const n = name.trim().toLowerCase();
  if (!n || n === "россия" || n === "russia") return "113";
  if (n === "удалённо" || n === "удаленно" || n === "remote") return null;
  function walk(list: Area[]): string | null {
    for (const a of list) {
      if (a.name.toLowerCase() === n) return a.id;
      const child = walk(a.areas);
      if (child) return child;
    }
    return null;
  }
  return walk(areas);
}
