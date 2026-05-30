import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import type { ExtractedResume } from "../lib/gemini";
import {
  searchVacancies,
  fetchAreas,
  findAreaId,
  type Vacancy,
  type Experience
} from "../lib/hh-api";
import VacancyCard from "./VacancyCard";
import SearchFilters, { type Filters } from "./SearchFilters";

function experienceFromYears(y: number): Experience | undefined {
  if (y <= 0) return "noExperience";
  if (y < 3) return "between1And3";
  if (y < 6) return "between3And6";
  return "moreThan6";
}

export default function VacancyList({
  resume,
  onBack
}: {
  resume: ExtractedResume;
  onBack: () => void;
}) {
  const [filters, setFilters] = useState<Filters>({
    experience: experienceFromYears(resume.experience_years),
    schedule: undefined,
    onlyWithSalary: false,
    salary: 0
  });
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [found, setFound] = useState(0);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPage(0);
  }, [resume.searchText, resume.area_name, filters]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    (async () => {
      try {
        let areaId: string | null = null;
        if (resume.area_name) {
          const areas = await fetchAreas();
          areaId = findAreaId(areas, resume.area_name);
        }
        const res = await searchVacancies({
          text: resume.searchText,
          area: areaId ?? undefined,
          experience: filters.experience,
          schedule: filters.schedule,
          salary: filters.salary || undefined,
          only_with_salary: filters.onlyWithSalary,
          per_page: 50,
          page
        });
        if (cancelled) return;
        setVacancies(res.items);
        setFound(res.found);
        setTotalPages(res.pages);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resume.searchText, resume.area_name, filters, page]);

  return (
    <div>
      <button
        onClick={onBack}
        className="text-slate-600 hover:text-slate-900 mb-4 flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Изменить параметры
      </button>

      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">Вакансии</h1>
        <span className="text-slate-600 text-sm">
          {loading
            ? "ищем…"
            : found > 0
            ? `найдено ${found.toLocaleString("ru-RU")}, показано ${vacancies.length}`
            : ""}
        </span>
      </div>

      <SearchFilters value={filters} onChange={setFilters} />

      {error && (
        <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="text-sm">{error}</div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {vacancies.map((v) => (
            <VacancyCard key={v.id} vacancy={v} />
          ))}
          {!vacancies.length && !error && (
            <div className="text-center text-slate-500 py-12">
              Ничего не найдено. Попробуйте изменить запрос или регион.
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded disabled:opacity-50 text-sm"
              >
                ← Назад
              </button>
              <span className="text-sm text-slate-600">
                Страница {page + 1} из {Math.min(totalPages, 40)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page + 1 >= Math.min(totalPages, 40)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded disabled:opacity-50 text-sm"
              >
                Вперёд →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
