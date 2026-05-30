import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  getGeminiKey,
  setGeminiKey,
  getGeminiModel,
  setGeminiModel
} from "../lib/storage";
import { GEMINI_MODELS, DEFAULT_MODEL } from "../lib/gemini";

export default function SettingsDialog({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [key, setKey] = useState("");
  const [model, setModel] = useState<string>(DEFAULT_MODEL);

  useEffect(() => {
    if (open) {
      setKey(getGeminiKey());
      setModel(getGeminiModel() || DEFAULT_MODEL);
    }
  }, [open]);

  if (!open) return null;

  function save() {
    setGeminiKey(key.trim());
    setGeminiModel(model);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Настройки</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium">Gemini API-ключ</span>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AIza…"
              className="mt-1 w-full border border-slate-300 rounded px-3 py-2 font-mono text-sm"
              autoComplete="off"
            />
          </label>
          <p className="text-xs text-slate-500">
            Получить бесплатный ключ:{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              aistudio.google.com/apikey
            </a>
            . Ключ хранится только в вашем браузере (localStorage) и используется
            для запроса напрямую к Google.
          </p>

          <label className="block">
            <span className="text-sm font-medium">Модель Gemini</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
            >
              {GEMINI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Если получаете 429 «quota exceeded» — переключитесь на 2.5 Flash или
              2.5 Flash Lite. Free-tier лимиты Google меняются.
            </p>
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-slate-700 hover:bg-slate-100 rounded text-sm"
          >
            Отмена
          </button>
          <button
            onClick={save}
            className="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded text-sm"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
