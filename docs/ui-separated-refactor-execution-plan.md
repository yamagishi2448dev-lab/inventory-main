# UI分離維持リファクタ実行計画

最終更新: 2026-02-07  
ステータス: Implemented (2026-02-07)

## 目的
- ユーザー体験として、`商品` と `委託品` を画面上で明確に分離する。
- 内部実装は `Item` 統合モデルを活かして共通化し、重複を削減する。
- 実装を段階化し、途中で止まっても次コンテキストで再開できる状態を維持する。

## 絶対要件（この計画の前提）
1. UI上の導線は分離を維持する。  
  `/products` は商品、`/consignments` は委託品として明確に扱う。
2. 内部処理の統合は許容する。  
  API/ロジック/コンポーネントは共通化してよい。
3. 日本語文字化けを再発させない。  
  文字化けが疑われる場合は `Get-Content -Encoding utf8` で実体確認してから編集する。

## 完了条件（Definition of Done）
1. `/products` と `/consignments` のUIが、ラベル・見出し・空状態・操作文言で明確に区別される。
2. 一覧/新規/編集/詳細の主要画面で、重複ロジックが共有層へ移動している。
3. 既存の互換API（`/api/products/*`, `/api/consignments/*`）は動作維持する。
4. `npm run typecheck` が通る。
5. 主要フロー（商品/委託品の一覧・登録・編集・一括操作・印刷）の手動確認が完了する。

## 現状の課題（着手前サマリ）
- 一覧画面の重複が大きい:
  - `app/(dashboard)/products/page.tsx`
  - `app/(dashboard)/consignments/page.tsx`
  - `app/(dashboard)/items/page.tsx`
- 新規/編集画面も高重複:
  - `app/(dashboard)/products/new/page.tsx`
  - `app/(dashboard)/consignments/new/page.tsx`
  - `app/(dashboard)/items/new/page.tsx`
  - `app/(dashboard)/products/[id]/edit/page.tsx`
  - `app/(dashboard)/consignments/[id]/edit/page.tsx`
  - `app/(dashboard)/items/[id]/edit/page.tsx`
- 互換APIのプロキシ実装が分散している:
  - `app/api/products/*`
  - `app/api/consignments/*`
- 文字化け表示はターミナル依存のケースがあるため、確認手順を固定化済み（`AGENTS.md` 追記済み）。

## 設計方針
### 1) UI層
- 画面URLは維持する:
  - `/products`
  - `/consignments`
- 内部では共通ページロジックを使うが、表示テキストは route ごとに分離する。
- `products` と `consignments` を「別画面」として残し、ユーザーが迷わない情報設計を優先する。

### 2) ドメイン/API層
- 正本APIは `items` 系に統一:
  - `/api/items`
  - `/api/items/[id]`
  - `/api/items/bulk/*`
- 互換APIはアダプタとして維持:
  - `/api/products/*`
  - `/api/consignments/*`
- アダプタ共通処理（ヘッダ転送、レスポンス整形、IDキー変換）は `lib` に集約する。

### 3) テキスト/日本語品質
- UI文言・コメントを UTF-8 で確認して扱う。
- 実体の文字化け（mojibake）を残さない。

## 実装フェーズ

### Phase 0: ベースライン固定（先に壊れ方を見える化）
対象:
- `package.json`
- `.eslintrc.json` または `eslint.config.*`（必要に応じて追加）

作業:
1. 現在のチェック状況を記録する:
  - `npm run typecheck`
  - `npm run lint`（失敗する場合は原因を記録）
2. lint 実行コマンドを現行 Next.js に合わせて修正する。
3. この時点でコードの機能変更は入れない。

完了判定:
- 最低限 `npm run typecheck` 通過。
- lint の実行方法がドキュメント化されている。

---

### Phase 1: 一覧UIの「見た目分離 + 内部共通化」
対象（新規追加候補）:
- `components/items/ItemListPageCore.tsx`
- `lib/items/ui-config.ts`
- `lib/hooks/useItemListState.ts`

対象（移行）:
- `app/(dashboard)/products/page.tsx`
- `app/(dashboard)/consignments/page.tsx`
- `app/(dashboard)/items/page.tsx`

作業:
1. 一覧の共通ロジックを `useItemListState` に抽出（検索、ソート、ページング、選択、一括操作）。
2. 共通表示コンポーネント `ItemListPageCore` を作成。
3. `products` / `consignments` は wrapper ページ化し、`itemType` と文言定義のみ渡す。
4. `/items` は統合ビューとして維持してよいが、`products`/`consignments` と責務を明確化する。

完了判定:
- `/products` と `/consignments` の見出し・ボタン文言・空状態文言が混在しない。
- 同一ロジックの重複を大幅削減できている。

---

### Phase 2: 新規/編集/詳細UIの共通化
対象（新規追加候補）:
- `components/items/ItemFormCore.tsx`
- `components/items/ItemDetailCore.tsx`

対象（移行）:
- `app/(dashboard)/products/new/page.tsx`
- `app/(dashboard)/consignments/new/page.tsx`
- `app/(dashboard)/items/new/page.tsx`
- `app/(dashboard)/products/[id]/edit/page.tsx`
- `app/(dashboard)/consignments/[id]/edit/page.tsx`
- `app/(dashboard)/items/[id]/edit/page.tsx`
- `app/(dashboard)/products/[id]/page.tsx`
- `app/(dashboard)/consignments/[id]/page.tsx`
- `app/(dashboard)/items/[id]/page.tsx`

作業:
1. フォーム部品を共通化し、差分を `itemType` と `copy` で制御。
2. 画像・素材編集の共通コードを1箇所に集約。
3. 既存URL遷移は維持（ユーザー導線を壊さない）。

完了判定:
- 商品/委託品UIの文言分離が保たれたまま、重複コードが削減されている。

---

### Phase 3: 互換APIアダプタ整理
対象（新規追加候補）:
- `lib/api/legacy-proxy.ts`
- `lib/api/legacy-mappers.ts`

対象（移行）:
- `app/api/products/route.ts`
- `app/api/consignments/route.ts`
- `app/api/products/bulk/delete/route.ts`
- `app/api/products/bulk/edit/route.ts`
- `app/api/consignments/bulk/route.ts`
- `app/api/consignments/bulk/edit/route.ts`
- `app/api/products/ids/route.ts`
- `app/api/consignments/ids/route.ts`
- `app/api/products/print/route.ts`
- `app/api/consignments/print/route.ts`

作業:
1. 重複している `buildProxyHeaders` を共通化。
2. body key 変換（`productIds` / `consignmentIds` -> `ids`）を統一。
3. レスポンス key 変換（`items` -> `products` / `consignments`）を統一。
4. 互換APIとしての外部契約は維持。

完了判定:
- 互換API実装の重複が減り、挙動差がなくなる。

---

### Phase 4: 表示整合性・文字化け再発防止
対象:
- `components/dashboard/RecentChanges.tsx`
- `app/api/change-logs/route.ts`
- 必要な UI 文言ファイル

作業:
1. `item` エンティティ前提で変更履歴表示を正す（リンク先やラベル不整合を解消）。
2. 日本語文言の統一と UTF-8 確認。
3. `alert/confirm` を段階的に `Dialog`/通知UIへ置換（高頻度画面優先）。

完了判定:
- 主要導線で日本語表示の崩れがない。
- 変更履歴のリンク・ラベルが現在モデルと一致する。

## 検証手順
### 自動チェック
1. `npm run typecheck`
2. `npm run lint`（lint 方式更新後）

### 手動スモーク
1. `/products` 一覧: 検索・フィルタ・一括編集・一括削除・印刷
2. `/consignments` 一覧: 検索・フィルタ・一括編集・一括削除・印刷
3. `/products/new` と `/consignments/new` の文言と必須項目差分
4. `/products/:id/edit` と `/consignments/:id/edit` の更新動作
5. サイドバーで商品/委託品が明確に分離表示されること

## リスクと回避策
1. 互換API破壊リスク  
  先に adapter テスト/手動確認項目を固定し、レスポンス key の互換を守る。
2. 文言混在リスク  
  `copy` 定義を1箇所化し、page側で直書きを減らす。
3. 文字化け再発リスク  
  文字化け疑い時は `Get-Content -Encoding utf8` を必須手順にする。

## 進捗チェックリスト
- [x] Phase 0: ベースライン固定
- [x] Phase 1: 一覧UI共通化（見た目分離維持）
- [x] Phase 2: 新規/編集/詳細UI共通化
- [x] Phase 3: 互換APIアダプタ整理
- [x] Phase 4: 表示整合性・文字化け再発防止

## 次コンテキスト用 実行プロンプト（コピペ用）
以下を新しいコンテキストで最初に貼る:

```text
docs/ui-separated-refactor-execution-plan.md に従って実装を進めてください。
絶対要件:
1) UI上では商品と委託品を明確に分離する（/products と /consignments をわかりやすく維持）
2) 内部処理は共通化してよい
3) 日本語文字化けを発生させない。文字化けが疑われるときは Get-Content -Encoding utf8 で実体確認する

まず Phase 0 から着手し、各Phase完了時に:
- 変更ファイル一覧
- 実行した検証コマンド
- 未解決リスク
を報告してください。
```
