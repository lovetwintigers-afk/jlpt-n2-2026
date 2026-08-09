# 內容撰寫指南

給未來的自己看的。新增學習內容只要在 `content/` 底下加 JSON 檔，**不需要改任何程式碼**。
存檔後畫面會自動更新；寫錯了會在瀏覽器主控台與 `npm run test` 裡指出檔名與欄位。

## 日文一律用大括號標讀音

```
募{つの}る                →  募る（つの 標在「募」上）
大人{おとな}買{が}い       →  大人買い
今日{きょう}は寒{さむ}い    →  今日は寒い
```

規則只有一條：**`{...}` 標的是緊接在它前面那一串漢字**。不用自己拆陣列。

三個注意事項：

1. **中文說明欄位裡不要用大括號。** `meaningZh`、`explanationZh` 這類欄位是純中文，
   要寫讀音請用全形括號：`「供給（きょうきゅう）」`。寫成大括號會原樣顯示出來。
2. **漢字讀音題的答案字不要標。** 題幹裡要考的那個詞留白，否則答案就寫在題目上了。
3. **不要寫成「漢字（かんじ）」的純文字形式。** 那樣沒辦法用 ruby 排版，也做不出
   「隱藏振假名」的練習模式。

## 檔案放在哪

| 內容 | 路徑 | 說明 |
|---|---|---|
| 每週每天的任務 | `content/weeks/week-03.json` | 只寫「哪一天做哪些內容」，指向下面各檔 |
| 語彙 | `content/vocabulary/w03.json` | 一個檔就是一個語彙集 |
| 文法 | `content/grammar/w03.json` | |
| 文法比較表 | `content/comparisons/w03.json` | 陣列格式 |
| 讀解文章 | `content/reading/w03.json` | |
| 聽解題組 | `content/listening/w03.json` | |
| 題目 | `content/questions/w03.json` | 集中放，可被多個測驗重用 |
| 測驗 | `content/quizzes/w03-review.json` | 只列題目 id |

檔名可以自己取，程式是掃整個資料夾的。照 `w03.json` 這樣命名只是為了好找。

## 最小可用的一週

只要三步：

**1. 語彙** — `content/vocabulary/w03.json`

```json
{
  "setId": "voc-w03",
  "week": 3,
  "title": "第 3 週：常考漢字讀音",
  "items": [
    {
      "id": "v-w03-01",
      "week": 3,
      "word": "滞{とどこお}る",
      "reading": "とどこおる",
      "partOfSpeech": "動詞",
      "meaningZh": "停滯、拖延（工作、付款）。",
      "examples": [
        { "jp": "工事{こうじ}が滞{とどこお}っている。", "zh": "工程停滯不前。" }
      ],
      "difficulty": "N2-core",
      "tags": ["動詞"],
      "source": { "type": "original", "label": "自製" }
    }
  ]
}
```

`reading` 必須與 `word` 裡標的讀音完全一致，測試會檢查。

**2. 把它排進某一天** — `content/weeks/week-03.json`

```json
{
  "week": 3,
  "days": [
    { "dayIndex": 1, "items": [{ "kind": "vocabulary", "setId": "voc-w03" }] }
  ]
}
```

沒寫到的天數會顯示「這一天的學習內容尚未加入」，不會出錯。可以先只寫一天。

**3. 存檔，重新整理瀏覽器。** 完成。

## 任務種類（`items` 裡的 `kind`）

```jsonc
{ "kind": "vocabulary", "setId": "voc-w03", "count": 12 }   // count 可省略，省略就全部
{ "kind": "grammar",    "setId": "gra-w03" }
{ "kind": "comparison", "comparisonIds": ["gc-w03-01"] }
{ "kind": "kanji",      "questionIds": ["q-w03-06"] }
{ "kind": "reading",    "passageIds": ["read-w03-01"], "timeLimitSec": 300 }
{ "kind": "listening",  "exerciseIds": ["lis-w03-01"] }
{ "kind": "quiz",       "quizId": "w03-review" }
{ "kind": "mistake-review", "strategy": "spaced", "lookbackWeeks": 2, "count": 8 }
{ "kind": "note",       "title": "標題", "body": "說明文字，空行分段。" }
```

`note` 最好用 —— 內容還沒寫好時，先放一段說明當作那天的任務，比留白好。

## 著作權：`source` 是必填

漏掉會直接載入失敗。這是故意的。

```jsonc
{ "type": "original",      "label": "自製" }
{ "type": "public-domain", "label": "青空文庫", "url": "https://..." }
{ "type": "cc-licensed",   "label": "Wikipedia 日本語版", "license": "CC BY-SA 4.0", "url": "..." }
{ "type": "user-input",    "label": "自己上課抄的筆記" }
{ "type": "reference",     "label": "參考自某書的概念，例句自己重寫" }
```

三條紅線：

- **不要整段複製市售教材或付費題庫。**（新完全マスター、TRY!、日本語総まとめ 等）
- **不要宣稱題目是官方真題。** 除非確實來自可合法使用的官方公開資料，並在 `source` 註明。
- **例句自己造最好。** 造句本身就是最有效的練習，而且完全沒有授權問題。

可用的合法來源：自己造句、青空文庫（公有領域）、日文版 Wikipedia（CC BY-SA，須標註）、
國際交流基金公開的問題例（確認授權後使用）。

## 題目怎麼寫

```json
{
  "id": "q-w03-01",
  "week": 3,
  "skill": "grammar",
  "questionType": "文法形式の判断",
  "stem": "工事{こうじ}が＿＿、完成{かんせい}が来月{らいげつ}にずれ込{こ}んだ。",
  "options": [
    { "key": "A", "text": "滞{とどこお}り" },
    { "key": "B", "text": "省{はぶ}き" },
    { "key": "C", "text": "補{おぎな}い" },
    { "key": "D", "text": "促{うなが}し" }
  ],
  "answer": "A",
  "explanationZh": "「滞る」＝停滯不前。",
  "distractorNotesZh": { "B": "「省く」是省略。" },
  "difficulty": "N2-core",
  "tags": ["文法形式の判断"],
  "source": { "type": "original", "label": "自製" }
}
```

- 挖空統一用兩個全形底線 `＿＿`。
- 四個選項，`answer` 必須是其中之一。
- `explanationZh` 必填 —— 錯題本完全靠它。
- `distractorNotesZh` 只需寫想說明的那幾個選項，不必四個都寫。
- **正確答案不要都放同一個位置**，測試會擋下超過一半集中在同一個選項的情況。

## 已經出過的題目不能改（重要）

從 2026-08-09 開始使用之後，`content/.lock.json` 裡列出的題目就**不可再改動正解與選項順序**。

原因是進度紀錄存的是「這題我選了 B」。如果之後把 B 和 D 的內容對調，那筆紀錄就指向別的選項了，錯題本會顯示錯誤的資訊。

**可以自由做的事**：新增題目、新增整週內容、修正解說與翻譯的錯字、調整說明文字。

**真的需要改一道已鎖定的題目時**（例如發現答案標錯）：

1. 在 `content/.lock.json` 裡手動刪掉那一題的項目
2. 修改題目
3. 執行 `node scripts/lock-content.mjs` 重新鎖定
4. **記下是哪一題**——那一題的舊紀錄已經不適用了，最好重做一次

新增的題目跑一次 `node scripts/lock-content.mjs` 就會自動加進鎖定檔。

## 自動檢查會抓到什麼

執行 `npm run test`（或存檔後看瀏覽器主控台）：

- 缺少必填欄位、`source` 沒填
- 大括號沒閉合、讀音為空、大括號前面不是漢字
- `reading` 與 `word` 的標註不一致
- 中文欄位裡殘留大括號
- id 在不同檔案重複
- 測驗引用了不存在的題目
- 答案不在選項裡、選項代號重複
- 比較表的欄位數與句型數對不上
- 答案過度集中在同一個選項

## 撰寫節奏的建議

不要想一次寫完 17 週。每週日花 60–90 分鐘寫下一週，保持領先一到兩週就好。

這樣還有一個好處：可以根據自己實際的錯題，動態調整後面幾週的內容 ——
第 8 週要補什麼，等第 7 週的錯題出來再決定，比現在就寫死準確得多。
