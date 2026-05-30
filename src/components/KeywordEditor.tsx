import { useState } from "react";
import { X, Plus, Search, ArrowLeft } from "lucide-react";
import type { ExtractedResume } from "../lib/gemini";

export default function KeywordEditor({
  resume,
  onUpdate,
  onSearch,
  onBack
}: {
  resume: ExtractedResume;
  onUpdate: (r: ExtractedResume) => void;
  onSearch: () => void;
  onBack: () => void;
}) {
  const [newKw, setNewKw] = useState("");

  function update<K extends keyof ExtractedResume>(k: K, v: ExtractedResume[K]) {
    onUpdate({ ...resume, [k]: v });
  }

  function removeKw(i: number) {
    update(
      "keywords",
      resume.keywords.filter((_, idx) => idx !== i)
    );
  }

  function addKw() {
    const v = newKw.trim();
    if (!v) return;
    if (!resume.keywords.includes(v))
      update("keywords", [...resume.keywords, v]);
    setNewKw("");
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={onBack}
        className="text-slate-600 hover:text-slate-900 mb-4 flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Загрузить другое резюме
      </button>

      <h1 className="text-2xl font-semibold mb-6">Проверьте параметры поиска</h1>

      <div className="space-y-5 bg-white rounded-lg p-6 shadow-sm">
        <div>
          <label className="block text-sm font-medium mb-1">Должность</label>
          <input
            type="text"
            value={resume.position}
            onChange={(e) => update("position", e.target.value)}
            className="w-full border border-slate-300 rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Регион / город</label>
          <input
            type="text"
            value={resume.area_name}
            onChange={(e) => update("area_name", e.target.value)}
            placeholder="Москва, Санкт-Петербург, Россия…"
            className="w-full border border-slate-300 rounded px-3 py-2"
          />
          <p className="text-xs text-slate-500 mt-1">
            Точное совпадение по справочнику hh.ru. «Россия» = по всей стране.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Поисковая строка hh.ru
          </label>
          <input
            type="text"
            value={resume.searchText}
            onChange={(e) => update("searchText", e.target.value)}
            className="w-full border border-slate-300 rounded px-3 py-2 font-mono text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">
            Поддерживается синтаксис hh.ru: OR, AND, NOT, кавычки для точной фразы.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Опыт работы (лет)</label>
          <input
            type="number"
            min={0}
            value={resume.experience_years}
            onChange={(e) =>
              update("experience_years", Number(e.target.value) || 0)
            }
            className="w-32 border border-slate-300 rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Ключевые слова из резюме ({resume.keywords.length})
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {resume.keywords.map((kw, i) => (
              <span
                key={`${kw}-${i}`}
                className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm"
              >
                {kw}
                <button
                  onClick={() => removeKw(i)}
                  className="hover:text-blue-900"
                  aria-label={`Убрать ${kw}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {!resume.keywords.length && (
              <span className="text-sm text-slate-500">пусто</span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newKw}
              onChange={(e) => setNewKw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKw())}
              placeholder="Добавить ключевое слово"
              className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm"
            />
            <button
              onClick={addKw}
              className="bg-slate-100 hover:bg-slate-200 px-3 rounded"
              aria-label="Добавить"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {resume.skills.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Навыки (из резюме, для информации)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {resume.skills.map((s, i) => (
                <span
                  key={`${s}-${i}`}
                  className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onSearch}
        disabled={!resume.searchText.trim()}
        className="mt-6 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
      >
        <Search className="w-5 h-5" />
        Искать вакансии на hh.ru
      </button>
    </div>
  );
}
