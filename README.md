# BookReader

Личная читалка для Android: поиск книг на Flibusta и RanobeLib, скачивание в личную библиотеку, чтение EPUB/FB2 внутри приложения, PDF — во внешнем приложении.

## Что внутри

- **React + Vite + TypeScript** — UI.
- **Capacitor 6** — нативная оболочка Android.
- **CapacitorHttp** — обход CORS через нативный HTTP-стек Android (OkHttp).
- **epubjs** — рендер EPUB.
- **Свой парсер FB2** — через `DOMParser`, поддержка windows-1251.
- **PDF** — открывается внешним приложением через `@capawesome-team/capacitor-file-opener`.

## Требования

- Node.js 20+
- Android Studio **не нужна** — сборка APK идёт в GitHub Actions.

## Установка и запуск

1. Установи зависимости:
```

npm install

```

2. Добавь Android-платформу (создаст папку `android/`, коммитить её не надо — она в `.gitignore`):
```

npx cap add android

```

3. Локальная разработка в браузере (запросы к источникам упадут на CORS — это нормально, для проверки UI):
```

npm run dev

```

## Сборка APK

1. Запушь проект в репозиторий на GitHub (ветка `main`).
2. GitHub Actions автоматически запустит workflow `.github/workflows/android.yml`.
3. Зайди в **Actions** → последний запуск → внизу **Artifacts** → скачай `app-debug.zip`.
4. Внутри — `app-debug.apk`. Установи на телефон (разреши установку из неизвестных источников).

APK собирается без Android Studio: Gradle и Android SDK поднимаются на раннере GitHub.

## Источники

### Flibusta (OPDS)

- Поиск: `https://flibusta.is/opds/search?searchTerm=<query>`
- Форматы: FB2, EPUB, PDF (зависит от книги).
- OPDS — это стандартный XML-каталог, парсится `fast-xml-parser`.

### RanobeLib (API)

- База: `https://api.cdnlibs.org/api`
- Обязательные заголовки (иначе 403): `Site-Id: 3`, `Referer: https://ranobelib.me/`.
- Поиск: `GET /manga?q=<query>&site_id[]=3`
- Главы: `GET /manga/<slug>/chapters`
- Контент главы: `GET /manga/<slug>/chapter?number=<n>&volume=<v>` — приходит ProseMirror JSON, конвертируется в HTML и собирается в EPUB через `jszip`.

## Ограничения

- **RanobeLib API неофициальный.** Может сломаться в любой момент. Если перестанет работать — смотри вкладку Network в браузере на ranobelib.me и правь `src/lib/ranobelib.ts`.
- **PDF только во внешнем приложении.** Встроенная PDF-читалка на телефоне — плохой опыт: нет reflow, темная тема не работает, память жрёт. Используй MuPDF, Xodo или Google Drive PDF.
- **Файлы хранятся в приватной директории приложения.** При удалении приложения книги пропадут. Если нужна сохранность — экспортируй вручную или добавь экспорт в публичную папку (потребует `MANAGE_EXTERNAL_STORAGE`, отдельная возня).
- **Flibusta может быть недоступна в некоторых регионах.** Если запросы падают — проверь доступность сайта с телефона в браузере.

## Структура

```

src/
lib/
http.ts           # CapacitorHttp обёртка (обход CORS)
flibusta.ts       # OPDS-парсер
ranobelib.ts      # API-клиент
epub-builder.ts   # сборка EPUB из глав RanobeLib
fb2.ts            # парсер FB2
storage.ts        # библиотека (Preferences + Filesystem)
opener.ts         # открытие PDF во внешнем приложении
components/
BookCard.tsx
EpubReader.tsx
Fb2Reader.tsx
pages/
Home.tsx          # поиск
Library.tsx       # библиотека
ReaderPage.tsx    # роутер читалки

```

## Если что-то сломалось

- **CORS в браузере при `npm run dev`** — это ожидаемо. CORS обходится только в APK через `CapacitorHttp`.
- **`ActivityNotFoundException` при открытии PDF** — на телефоне нет ни одного PDF-ридера. Поставь любой из Play Store.
- **`Setting up fake worker failed`** — не бывает в этой версии, `pdf.js` не используется.
- **Сборка падает на `npm ci`** — проверь, что закоммичен `package-lock.json`. Если его нет, локально выполни `npm install` и закоммить.
