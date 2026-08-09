#!/usr/bin/env bash
# 部署到 GitHub Pages。
#
# 用分支部署（把 dist/ 推到 gh-pages 分支），不是 GitHub Actions ——
# 因為 gh 的預設 token 沒有建立 .github/workflows/ 的權限，
# 走這條路就完全不需要額外授權。
#
# 用法：npm run deploy

set -euo pipefail

REPO="https://github.com/lovetwintigers-afk/jlpt-n2-2026.git"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "1/3 執行測試"
npm run test --silent

echo "2/3 建置"
npm run build --silent >/dev/null

echo "3/3 推送到 gh-pages 分支"
cd dist
rm -rf .git
git init -q -b gh-pages
git config user.name "Elaine"
git config user.email "lovetwintigers@gmail.com"
git add -A
git commit -q -m "部署：$(date +%Y-%m-%d\ %H:%M)"
git push -q --force "$REPO" gh-pages:gh-pages
cd "$ROOT"

echo
echo "完成 → https://lovetwintigers-afk.github.io/jlpt-n2-2026/"
echo "（GitHub 需要約一分鐘更新）"
