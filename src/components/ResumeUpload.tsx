import { useState } from "react";
import { Upload, Loader2, AlertCircle } from "lucide-react";
import { extractText } from "../lib/resume-parser";
import { extractResume, type ExtractedResume } from "../lib/gemini";
import { getGeminiKey } from "../lib/storage";

export default function ResumeUpload({
  onExtracted
}: {
  onExtracted: (r: ExtractedResume) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    const key = getGeminiKey();
    if (!key) {
      setError(
        "Сначала укажите Gemini API-ключ в настройках (шестерёнка справа вверху). Получить бесплатный ключ: aistudio.google.com/apikey"
      );
      return;
    }
    setError("");
    setLoading(true);
    try {
      const text = await extractText(file);
      if (text.length < 50)
        throw new Error("Не удалось извлечь текст из файла. PDF не должен быть сканом картинок.");
      const resume = await extractResume(key, text);
      onExtracted(resume);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-semibold mb-2">Загрузите резюме</h1>
      <p className="text-slate-600 mb-6">
        Из PDF, DOCX или TXT извлечём ключевые навыки и подберём вакансии на hh.ru.
      </p>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (loading) return;
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        className={`block border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition ${
          dragOver
            ? "border-blue-500 bg-blue-50"
            : "border-slate-300 hover:bg-slate-100"
        } ${loading ? "pointer-events-none opacity-70" : ""}`}
      >
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          disabled={loading}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-slate-500" />
            <span>Разбираем резюме через Gemini…</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-10 h-10 text-slate-400" />
            <span className="text-slate-700">
              Перетащите файл или нажмите, чтобы выбрать
            </span>
            <span className="text-xs text-slate-500">PDF · DOCX · TXT</span>
          </div>
        )}
      </label>

      {error && (
        <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="text-sm whitespace-pre-wrap">{error}</div>
        </div>
      )}

      <div className="mt-8 text-sm text-slate-500">
        <p className="font-medium text-slate-700 mb-1">Приватность</p>
        <p>
          Текст резюме отправляется только в Gemini (Google), Cloudflare сервер
          его не видит. Ключ Gemini хранится у вас в браузере (localStorage).
        </p>
      </div>
    </div>
  );
}
