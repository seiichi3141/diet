# CLAUDE.md（プロジェクト指示書）

このプロジェクトは個人の減量・体力増強の記録・可視化システム。
計画の全体像は [plan.md](plan.md)、献立と買い物リストは [menu.md](menu.md) を参照。

公開ダッシュボード: **<https://blog.seiichirou.jp/diet/>**（GitHub Pages。main に push すると自動公開）

## 会話

- 常に日本語で会話する

## ユーザーからの報告を受けたら（記録フロー）

ユーザーがチャットで食事・体重・運動・体調を報告したら、以下を実行する:

1. 内容に応じた `log` コマンドを実行（下記コマンド一覧）
2. `node --experimental-strip-types --disable-warning=ExperimentalWarning src/cli.ts build` でダッシュボードを再生成
3. 変更をコミットして `git push`（公開ダッシュボードに1分程度で反映）
4. 記録内容を簡潔に報告（食事は推定カロリー・PFC を添え、推定であることを明示）

報告が複数まとめて来た場合（例: 「朝食と昼食と体重」）はすべて記録してから build を1回実行する。

## コマンド一覧（リポジトリルートから実行）

```sh
# 体重・体脂肪率（date 省略で当日）
node --experimental-strip-types --disable-warning=ExperimentalWarning src/cli.ts log weight 76.8 --body-fat 24.2 [--date 2026-08-06]

# 食事（meal-type: breakfast / lunch / dinner / snack）
node --experimental-strip-types --disable-warning=ExperimentalWarning src/cli.ts log meal --type breakfast --desc "おにぎり2個" --calories 550 --protein 12 --fat 4 --carbs 100

# 運動
node --experimental-strip-types --disable-warning=ExperimentalWarning src/cli.ts log exercise --type 卓球 --minutes 90 [--note "..."]

# 睡眠・体調
node --experimental-strip-types --disable-warning=ExperimentalWarning src/cli.ts log condition --sleep 6.5 [--note "疲れ気味"]

# ダッシュボード再生成
node --experimental-strip-types --disable-warning=ExperimentalWarning src/cli.ts build

# ターミナルで簡易サマリ
node --experimental-strip-types --disable-warning=ExperimentalWarning src/cli.ts summary

# ローカルサーバー起動（スマホから見る場合。同じWi-Fiで http://<PCのIP>:8787 を開く）
npm run serve
```

## 食事のカロリー・PFC 推定ルール

- [menu.md](menu.md) のメニューなら、そこに記載の数値をそのまま使う
- プロテインは**牛乳250ml割り**で飲む。1杯 = **281kcal / P28g / F11g / C15g**（粉110kcal・P20g + 牛乳250ml 171kcal・P8.5g）。ユーザーは水ではなく必ず牛乳で割るため、牛乳分を必ず加算する
- それ以外は一般的な目安で推定し、推定根拠を簡単に添える
- 目標: 1日 **1,450kcal** / P 110–120g（2026-08-16 改定。plan.md の「見直し履歴」参照）

## 質問への答え方

- 「今日の献立は？」→ menu.md の今週メニューから、曜日と食材の消費順に沿って提案
- 「買い物リストは？」→ menu.md の買い物リストを提示
- 「○○の作り方は？」→ recipes.md の該当レシピを提示
- 「進捗どう？」→ `summary` を実行し、計画ペースとの比較も添えて報告

## 開発ルール

- 原則 TDD: 実装変更時は先にテスト（`tests/`）を書き、失敗を確認してから実装
- 一括チェック: `npm run check`（typecheck + prettier + markdownlint + test）
- 個別: `npm test` / `npm run typecheck` / `npm run format` / `npm run lint:md`（自動修正は `npm run fix:md`）
- 技術スタック: Node.js + TypeScript（`--experimental-strip-types`、ランタイム依存なし。devDependencies: typescript / prettier / markdownlint-cli2）
- データは `data/*.jsonl`（1行1レコードのJSON Lines）
