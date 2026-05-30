import type { Experience, Schedule } from "../lib/hh-api";

export interface Filters {
  experience: Experience | undefined;
  schedule: Schedule | undefined;
  salary: number;
  onlyWithSalary: boolean;
}

export default function SearchFilters({
  value,
  onChange
}: {
  value: Filters;
  onChange: (v: Filters) => void;
}) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm grid grid-cols-2 md:grid-cols-4 gap-3">
      <div>
        <label className="block text-xs text-slate-600 mb-1">Опыт</label>
        <select
          value={value.experience ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              experience: (e.target.value || undefined) as Experience | undefined
            })
          }
          className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
        >
          <option value="">Любой</option>
          <option value="noExperience">Без опыта</option>
          <option value="between1And3">1–3 года</option>
          <option value="between3And6">3–6 лет</option>
          <option value="moreThan6">Более 6 лет</option>
        </select>
      </div>

      <div>
        <label className="block text-xs text-slate-600 mb-1">График</label>
        <select
          value={value.schedule ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              schedule: (e.target.value || undefined) as Schedule | undefined
            })
          }
          className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
        >
          <option value="">Любой</option>
          <option value="remote">Удалёнка</option>
          <option value="flexible">Гибкий</option>
          <option value="fullDay">Полный день</option>
          <option value="shift">Сменный</option>
        </select>
      </div>

      <div>
        <label className="block text-xs text-slate-600 mb-1">ЗП от, ₽</label>
        <input
          type="number"
          min={0}
          step={10000}
          value={value.salary || ""}
          onChange={(e) =>
            onChange({ ...value, salary: Number(e.target.value) || 0 })
          }
          placeholder="0"
          className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
        />
      </div>

      <div className="flex items-end">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={value.onlyWithSalary}
            onChange={(e) =>
              onChange({ ...value, onlyWithSalary: e.target.checked })
            }
            className="rounded"
          />
          Только с указанной ЗП
        </label>
      </div>
    </div>
  );
}
