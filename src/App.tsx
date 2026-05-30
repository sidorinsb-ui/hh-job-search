import { useState } from "react";
import { Settings } from "lucide-react";
import ResumeUpload from "./components/ResumeUpload";
import KeywordEditor from "./components/KeywordEditor";
import VacancyList from "./components/VacancyList";
import SettingsDialog from "./components/SettingsDialog";
import type { ExtractedResume } from "./lib/gemini";

type Step = "upload" | "keywords" | "results";

export default function App() {
  const [step, setStep] = useState<Step>("upload");
  const [resume, setResume] = useState<ExtractedResume | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setStep("upload")}
            className="text-xl font-semibold flex items-center gap-2"
          >
            <span aria-hidden>🔍</span>
            HH Job Search
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 hover:bg-slate-100 rounded"
            aria-label="Настройки"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 flex-1">
        {step === "upload" && (
          <ResumeUpload
            onExtracted={(r) => {
              setResume(r);
              setStep("keywords");
            }}
          />
        )}
        {step === "keywords" && resume && (
          <KeywordEditor
            resume={resume}
            onUpdate={setResume}
            onSearch={() => setStep("results")}
            onBack={() => setStep("upload")}
          />
        )}
        {step === "results" && resume && (
          <VacancyList resume={resume} onBack={() => setStep("keywords")} />
        )}
      </main>

      <footer className="border-t bg-white py-3 text-center text-xs text-slate-500">
        Поиск через публичное API hh.ru · разбор резюме через Gemini · open-source на{" "}
        <a
          href="https://github.com/sidorinsb-ui/hh-job-search"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          GitHub
        </a>
      </footer>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
