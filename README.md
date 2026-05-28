# PetLens 寵物照片辨識

前端是 Vite + React + TypeScript，可部署到 GitHub Pages。照片辨識在瀏覽器端用 TensorFlow.js + MobileNet 執行；後端只負責保存「辨識後討論案例」。

## 本機開發

```bash
npm install
npm run dev
```

前端環境變數：

```bash
cp .env.example .env
```

`VITE_API_BASE` 指向 Cloudflare Workers 後端，例如：

```bash
VITE_API_BASE=https://petlens-api.example.workers.dev
```

沒有設定 `VITE_API_BASE` 時，網站仍可辨識照片，案例會存在瀏覽器 localStorage。

## 前端部署：GitHub Pages

此 repo 已包含 `.github/workflows/deploy-pages.yml`。

1. 將專案 push 到 GitHub `main` branch。
2. 到 GitHub repo 的 `Settings -> Pages`。
3. `Build and deployment` 選 `GitHub Actions`。
4. 如果已部署後端，到 `Settings -> Secrets and variables -> Actions -> Variables` 新增：

```text
VITE_API_BASE=https://你的-worker.workers.dev
```

之後每次 push 到 `main` 都會自動 build 並部署 `dist` 到 GitHub Pages。

## 後端部署：Cloudflare Workers + D1

後端在 `backend/`。它提供：

- `GET /health`
- `GET /api/cases`
- `POST /api/cases`

部署步驟：

```bash
cd backend
npm install
npx wrangler login
npx wrangler d1 create petlens-db
```

把輸出的 `database_id` 填回 `backend/wrangler.jsonc`：

```jsonc
"database_id": "REPLACE_WITH_D1_DATABASE_ID"
```

套用資料庫 migration：

```bash
npm run db:migrate
```

部署 Worker：

```bash
npm run deploy
```

部署後把 Worker URL 設成 GitHub Actions variable `VITE_API_BASE`，再 push 一次前端即可。

## 驗證

```bash
npm run lint
npm run build
```

後端本機開發：

```bash
cd backend
npm run dev
```
