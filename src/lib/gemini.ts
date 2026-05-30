import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ExtractedResume {
  position: string;
  skills: string[];
  keywords: string[];
  experience_years: number;
  area_name: string;
  searchText: string;
}

const PROMPT = `Ты — ассистент по подбору вакансий на hh.ru. Тебе дан текст резюме.
Извлеки структурированно и верни СТРОГО JSON без markdown-обёрток и без пояснений:

{
  "position": "основная желаемая должность одной строкой на русском",
  "skills": ["короткие названия технических и профессиональных навыков"],
  "keywords": ["10-20 наиболее релевантных ключевых слов для поиска вакансий"],
  "experience_years": целое_число_лет_общего_опыта_или_0,
  "area_name": "предпочитаемый город или регион (если есть в резюме, иначе Россия)",
  "searchText": "краткая поисковая строка для поля text в hh.ru API: 3-7 слов, синонимы через OR, без точек"
}

Резюме:
---
{RESUME}
---`;

export async function extractResume(
  apiKey: string,
  resumeText: string
): Promise<ExtractedResume> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
  });
  const prompt = PROMPT.replace("{RESUME}", resumeText.slice(0, 30000));
  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();
  const cleaned = raw
    .replace(/^```json\s*/, "")
    .replace(/^```\s*/, "")
    .replace(/```\s*$/, "")
    .trim();
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error("Gemini вернул невалидный JSON. Ответ: " + cleaned.slice(0, 200));
  }
  return {
    position: String(parsed.position || ""),
    skills: Array.isArray(parsed.skills) ? parsed.skills.map(String) : [],
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map(String) : [],
    experience_years: Number(parsed.experience_years) || 0,
    area_name: String(parsed.area_name || "Россия"),
    searchText: String(parsed.searchText || parsed.position || "")
  };
}
