# 部署

## 現在的網址

**<https://lovetwintigers-afk.github.io/jlpt-n2-2026/>**

已經上線，手機和電腦都能開。學習紀錄存在瀏覽器本機，固定用這個網址就好。

## 更新網站

改完內容之後跑這一行：

```bash
npm run deploy
```

它會依序做三件事：跑測試 → 建置 → 推上線。**測試沒過就不會部署**，所以內容 JSON 寫錯時不會把壞掉的版本推上去。約一分鐘後生效。

原始碼本身另外用 `git push` 推到 `main` 分支保存，兩者互不影響。

---

## 為什麼不用 GitHub Actions

`gh` 命令列工具的預設權限不能建立 `.github/workflows/` 底下的檔案，會被 GitHub 擋下來。所以改用**分支部署**——把建置好的 `dist/` 直接推到 `gh-pages` 分支，GitHub Pages 從那個分支取檔案。效果一樣，而且不需要任何額外授權。

原本寫好的 Actions 設定檔保留在 `docs/github-pages-workflow.yml`。如果哪天想改用自動部署，把它移回 `.github/workflows/` 就可以，但那需要先執行一次 `gh auth refresh -s workflow`。**不做也完全沒關係。**

---

## 如果想要 pages.dev 的網址（選用）

`.pages.dev` 網址只有 Cloudflare 會給。這一步需要你自己註冊帳號並在瀏覽器裡授權，我沒辦法代做。

**但你原本卡住的那一步已經不需要了**——Node 版本現在寫在 repo 根目錄的 `.node-version` 檔案裡，Cloudflare 會自動讀取，不必再去儀表板找環境變數的設定畫面。

步驟：

1. 到 <https://dash.cloudflare.com> 註冊或登入
2. 左側選單 **Compute (Workers)** → **Workers & Pages**
3. 按 **Create** → 切到 **Pages** 分頁 → **Connect to Git**
4. 授權 GitHub，選 `jlpt-n2-2026` 這個 repo
5. 建置設定填：

   | 欄位 | 值 |
   |---|---|
   | Project name | `jlpt-n2-2026`（這決定網址） |
   | Production branch | `main` |
   | Framework preset | `Vite` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |

6. 按 **Save and Deploy**

網址會是 `https://jlpt-n2-2026.pages.dev`。之後 `git push` 到 main 就會自動重建。

**找不到設定畫面也沒關係**——Cloudflare 的介面常改版，而 GitHub Pages 的網址已經能用了。這一步純粹是換一個好看的網址，功能完全一樣。

---

## 兩個網址的學習紀錄是分開的

進度存在瀏覽器的 localStorage，綁在網域上。如果之後真的加了 pages.dev，**決定用哪一個就固定用它**，不要交替使用。要搬移的話，在設定頁匯出備份、到另一個網址匯入。

---

## 為什麼不需要改任何路徑設定

`vite.config.ts` 設了 `base: './'`，產出的資源路徑是相對的，所以放在網域根目錄或子目錄都能跑。路由用 HashRouter（網址像 `#/week/3`），不需要伺服器端的 rewrite 規則。
