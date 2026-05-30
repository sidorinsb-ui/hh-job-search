# HH Job Search

Веб-приложение для поиска вакансий на [hh.ru](https://hh.ru) по ключевым словам, извлечённым из вашего резюме (PDF / DOCX / TXT) через Gemini API.

> **Демо:** https://hh-job-search.sidorinsb.workers.dev

## Как это работает

1. Загружаете резюме (PDF / DOCX / TXT).
2. Текст извлекается локально в браузере (`pdfjs-dist`, `mammoth`).
3. Gemini вытягивает должность, ключевые слова, навыки, регион и поисковую строку.
4. Можно отредактировать всё перед поиском.
5. Поиск идёт через публичное API hh.ru (`GET https://api.hh.ru/vacancies`) — без бэкенда, прямо из браузера.
6. Избранные вакансии и Gemini-ключ хранятся в `localStorage`. На сервер ничего не уходит.

## Конфигурация

Gemini API-ключ запрашивается в UI (шестерёнка в правом верхнем углу). Получить бесплатный ключ: [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

## Локальная разработка

```bash
pnpm install
pnpm dev   # http://localhost:3000
```

Сборка:

```bash
pnpm build
```

## Деплой

CI/CD: [GitHub Actions](.github/workflows/deploy.yml) → Cloudflare Workers (статика через `[assets]`, SPA fallback).

Секреты, которые должны быть выставлены в репо (Settings → Secrets and variables → Actions):

| Secret | Что |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Токен с правом «Edit Cloudflare Workers» |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID из дашборда Cloudflare |

## Стек

- React 18 + TypeScript + Vite
- Tailwind CSS
- [`@google/generative-ai`](https://www.npmjs.com/package/@google/generative-ai) — Gemini
- [`pdfjs-dist`](https://www.npmjs.com/package/pdfjs-dist) — извлечение текста из PDF
- [`mammoth`](https://www.npmjs.com/package/mammoth) — извлечение текста из DOCX
- Cloudflare Workers (`wrangler`) — хостинг

## hh.ru API — что используется

- `GET /vacancies` — основной поиск
- `GET /areas` — справочник регионов (кешируется в памяти)

Документация: <https://api.hh.ru/openapi/redoc>

## Лицензия

MIT.
