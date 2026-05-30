import { useState } from "react";
import { Star, ExternalLink } from "lucide-react";
import { getFavorites, toggleFavorite } from "../lib/storage";
import type { Vacancy } from "../lib/hh-api";

export default function VacancyCard({ vacancy }: { vacancy: Vacancy }) {
  const [favs, setFavs] = useState<string[]>(getFavorites());
  const isFav = favs.includes(vacancy.id);

  function formatSalary(): string | null {
    if (!vacancy.salary) return null;
    const { from, to, currency } = vacancy.salary;
    const c = currency === "RUR" ? "₽" : currency;
    const fmt = (n: number) => n.toLocaleString("ru-RU");
    if (from && to) return `${fmt(from)} – ${fmt(to)} ${c}`;
    if (from) return `от ${fmt(from)} ${c}`;
    if (to) return `до ${fmt(to)} ${c}`;
    return null;
  }

  function stripHl(s: string | null): string {
    if (!s) return "";
    return s.replace(/<\/?highlighttext>/g, "");
  }

  const salary = formatSalary();
  const snippet =
    [stripHl(vacancy.snippet.responsibility), stripHl(vacancy.snippet.requirement)]
      .filter(Boolean)
      .join(" · ");

  return (
    <article className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg leading-snug">
            <a
              href={vacancy.alternate_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600"
            >
              {vacancy.name}
              <ExternalLink className="inline w-3.5 h-3.5 ml-1 -translate-y-px" />
            </a>
          </h3>
          <div className="text-sm text-slate-700 mt-0.5">
            {vacancy.employer.name}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {vacancy.area.name}
            {vacancy.schedule && ` · ${vacancy.schedule.name}`}
            {vacancy.experience && ` · ${vacancy.experience.name}`}
          </div>
          {salary && (
            <div className="text-sm font-medium text-emerald-700 mt-2">
              {salary}
            </div>
          )}
          {snippet && (
            <p className="text-sm text-slate-600 mt-2 line-clamp-3">{snippet}</p>
          )}
        </div>
        <button
          onClick={() => setFavs(toggleFavorite(vacancy.id))}
          className={`p-1.5 rounded hover:bg-slate-100 ${
            isFav ? "text-amber-500" : "text-slate-400"
          }`}
          aria-label={isFav ? "Убрать из избранного" : "В избранное"}
        >
          <Star className={`w-5 h-5 ${isFav ? "fill-amber-500" : ""}`} />
        </button>
      </div>
    </article>
  );
}
