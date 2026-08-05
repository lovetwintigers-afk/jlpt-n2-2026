# 部署

原始碼放在 GitHub，兩個地方各自部署：

| 平台 | 網址 | 自動更新 |
|---|---|---|
| Cloudflare Pages | `https://jlpt-n2-2026.pages.dev` | push 到 main 就重建 |
| GitHub Pages | `https://lovetwintigers-afk.github.io/jlpt-n2-2026/` | push 到 main 就重建（GitHub Actions） |

兩邊內容一樣，日常用哪個都可以。學習紀錄存在瀏覽器本機，**兩個網址的紀錄是分開的**
—— 固定用同一個網址，不要今天用這個明天用那個。

---

## Cloudflare Pages 設定

在 <https://dash.cloudflare.com> → Workers & Pages → Create → Pages →
Connect to Git，選 `jlpt-n2-2026` 這個 repo，然後填：

| 欄位 | 值 |
|---|---|
| Project name | `jlpt-n2-2026`（**這決定網址**，會變成 `jlpt-n2-2026.pages.dev`） |
| Production branch | `main` |
| Framework preset | `Vite`（沒有的話選 `None`） |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | 留空 |

**環境變數要加一個**（在 Settings → Environment variables）：

| 名稱 | 值 |
|---|---|
| `NODE_VERSION` | `24` |

Cloudflare 預設的 Node 版本偏舊，Vite 8 需要 Node 20.19 以上。不加這個會建置失敗。

設定完按 Save and Deploy，第一次建置約一到兩分鐘。之後每次 push 到 main 都會自動重建。

---

## GitHub Pages 設定

`.github/workflows/deploy.yml` 已經寫好，push 之後到 repo 的
Settings → Pages → Source 選 **GitHub Actions** 即可。

workflow 做的事：安裝套件 → **跑測試** → 建置 → 部署。
測試沒過就不會部署，所以內容 JSON 寫錯時不會把壞掉的版本推上線。

### 若 push workflow 檔案被拒絕

`gh` 的 token 預設沒有 `workflow` 權限，會看到：

```
refusing to allow an OAuth App to create or update workflow ... without `workflow` scope
```

執行這行，照畫面指示在瀏覽器授權一次即可：

```bash
gh auth refresh -s workflow
```

---

## 為什麼不需要改任何路徑設定

`vite.config.ts` 設了 `base: './'`，產出的資源路徑是相對的
（`./assets/index-xxx.js`），所以放在網域根目錄或子目錄都能跑。

路由用的是 HashRouter（網址長得像 `#/week/3`），不需要伺服器端的
rewrite 規則，兩個平台都不用額外設定。

---

## 更新網站

```bash
git add -A
git commit -m "說明改了什麼"
git push
```

推上去之後兩邊會各自重建，一到兩分鐘後生效。新增學習內容也是走同一條路
—— 改完 `content/` 底下的 JSON，commit、push 就好。

推之前建議先在本機確認一次：

```bash
npm run test
```
