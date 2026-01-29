# 次の実装計画（コンテキスト消去後でも実装可能版）

## 目的
画面遷移の体感速度をさらに改善する（特にダッシュボード初期表示と商品一覧の遷移）。

## 現在の状況（前提）
- アプリ: Next.js App Router / React / Prisma / PostgreSQL
- 直近の短期改善（実装済み）
  - ログイン遷移の遅延撤廃
  - セッション取得の重複DB問い合わせ削減
  - `/api/filters` の追加 + `useFilters` の一括化
  - `/api/products` に `view=list|grid` を追加し include を軽量化
- 実測テスト: `tests/e2e/perf-navigation.spec.ts`

## 現在の計測値（参考）
- login -> dashboard (url): 約1.1s
- login -> dashboard (all api): 約2.8s
- products list (all api): 約1.5s
- products page=2 (api): 約1.4s

## 次にやる改善方針
1. **ダッシュボードのデータ取得をサーバー集約**
2. **商品一覧・詳細のサーバーコンポーネント化**
3. **検索のDB最適化（pg_trgm等のインデックス）**
4. **集計・マスタのキャッシュ強化**

---

## 実装計画（詳細）

### 1) ダッシュボードのデータ取得をサーバー集約
**目的**: APIのウォーターフォールを削減し、初期表示を早くする。

**対象ファイル**
- `app/(dashboard)/dashboard/page.tsx`
- `app/api/dashboard/stats/route.ts`
- `app/api/dashboard/cost-by-manufacturer/route.ts`
- `app/api/change-logs/route.ts`
- `lib/api/response.ts`

**方針**
- ダッシュボードページを Server Component 化し、`Promise.all` で集約取得。
- APIは残すが、ダッシュボードページからは直接 Prisma を使って取得する構造にする。
- `stats` / `cost-by-manufacturer` / `change-logs` にキャッシュヘッダ or `revalidate` を付与。

**手順**
1. `app/(dashboard)/dashboard/page.tsx` を `async` 関数にし、`useSWR` を削除。
2. 取得関数をページ内で `await Promise.all([stats, costByManufacturer, changeLogs, session])`。
3. 取得結果を props で各カードに渡す。
4. `lib/api/response.ts` の `STATS_CACHE_HEADERS` を活用し、API側のキャッシュを統一。

**完了条件**
- `dashboard` が API を呼ばずに表示される。
- `tests/e2e/perf-navigation.spec.ts` で `login -> dashboard (all api)` が改善する。

---

### 2) 商品一覧・詳細のサーバーコンポーネント化
**目的**: 遷移後のAPI fetchを排除し、初期表示の体感を改善。

**対象ファイル**
- `app/(dashboard)/products/page.tsx`
- `app/(dashboard)/products/[id]/page.tsx`
- `app/api/products/route.ts`
- `app/api/products/[id]/route.ts`

**方針**
- 一覧/詳細ページを `async` サーバーコンポーネントへ移行。
- ページ内で Prisma 直接取得し、必要なデータのみ渡す。
- `view=list|grid` は SSR でも適用可能にする。

**手順（一覧）**
1. `app/(dashboard)/products/page.tsx` をサーバーコンポーネント化。
2. `searchParams` を受け取り、`buildProductWhereClause` と `buildProductOrderBy` をサーバーで実行。
3. `include` の切替（list: tags, grid: images1枚）をサーバーで実装。
4. Client専用のUI（選択・バルク操作）は子コンポーネントに切り出す。

**手順（詳細）**
1. `app/(dashboard)/products/[id]/page.tsx` をサーバーコンポーネント化。
2. `prisma.product.findUnique` をページ内で直接呼ぶ。
3. 画像モーダル等のUIはクライアントコンポーネントに分離。

**完了条件**
- `/products` および `/products/[id]` で `fetch('/api/…')` が不要になる。
- `perf-navigation.spec.ts` の `products list (all api)` がさらに改善。

---

### 3) 検索のDB最適化（pg_trgm）
**目的**: `contains` 検索の高速化。

**対象**
- DB (PostgreSQL)
- `lib/products/query.ts`

**方針**
- `pg_trgm` extension を有効化。
- `name`, `specification` に `GIN` インデックス追加。

**手順**
1. `prisma` migration で SQL を追加:
   - `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
   - `CREATE INDEX ... ON products USING gin (name gin_trgm_ops);`
   - `CREATE INDEX ... ON products USING gin (specification gin_trgm_ops);`
2. デプロイ後に `EXPLAIN ANALYZE` で効果確認。

**完了条件**
- 大量データ時の検索速度が改善。

---

### 4) 集計・マスタのキャッシュ強化
**目的**: 高頻度アクセスのAPIを安定化。

**対象**
- `lib/api/response.ts`
- `app/api/dashboard/stats/route.ts`
- `app/api/filters/route.ts`

**方針**
- `Cache-Control` の有効化（短期キャッシュ + SWR）
- 更新イベント発生時に `revalidateTag` を検討

**完了条件**
- ダッシュボード/フィルターAPIの平均応答時間が改善。

---

## テスト・計測
- 計測:
  ```bash
  npx playwright test tests/e2e/perf-navigation.spec.ts --project=chromium --reporter=line --workers=1
  ```
- 回帰テスト:
  ```bash
  npm run test:e2e
  ```

## 期待される改善
- login -> dashboard: 2.8s -> 2.0s以下
- products list: 1.5s -> 1.0s台

## 依存・注意事項
- App Router で Server/Client 混在するため、UIイベントの切り分けが必要。
- 既存の `useFilters` など client hook は、SSR化後に分離する。

---

## 実装完了の判断基準
- Playwright perfテストがパスする。
- 主要遷移が1回のAPI呼び出し内で完了する。
- `npm run lint` / `npm run typecheck` が通る。
