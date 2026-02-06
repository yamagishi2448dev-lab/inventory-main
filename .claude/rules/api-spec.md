# API Spec (v3.0)

## Common Rules
- Base: `/api`
- 認証: `/api/auth/*`以外は必須
- Content-Type: `application/json; charset=utf-8`
- 文字コード: UTF-8
- 日時: ISO 8601形式（`YYYY-MM-DDTHH:mm:ss.sssZ`）

## Error Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "...",
    "details": { "field": "name" }
  }
}
```

または簡易形式:
```json
{ "error": "エラーメッセージ" }
```

## Status Codes
- 200 Success
- 201 Created
- 400 Validation error
- 401 Unauthorized
- 403 Forbidden
- 404 Not found
- 409 Conflict (SKU重複など)
- 500 Server error

---

## Auth（認証）

### POST `/api/auth/login`
ログイン処理。セッション作成。
- Body: `{ username, password }`
- Response: `{ success: true, user: { id, username, role } }`
- Cookie: `inventory_session` を設定

### POST `/api/auth/logout`
ログアウト処理。セッション削除。
- Response: `{ success: true }`
- Cookie: `inventory_session` を削除

### GET `/api/auth/session`
現在のセッション情報を取得。
- Response: `{ user: { id, username, role } }` または `{ user: null }`

### POST `/api/auth/change-password`
パスワード変更。
- Body: `{ currentPassword, newPassword }`
- Response: `{ success: true }`
- 効果: 全セッション削除

---

## Items（アイテム）⭐ v3.0 統合API

> v3.0で商品（Product）と委託品（Consignment）を統合。
> `type` パラメータで種別を指定。

### GET `/api/items`
アイテム一覧取得。
- Query:
  - `page`: ページ番号（デフォルト: 1）
  - `limit`: 件数（デフォルト: 20）
  - `type`: アイテム種別フィルタ（`PRODUCT` | `CONSIGNMENT`）
  - `search`: アイテム名/仕様で検索
  - `manufacturerId`: メーカーでフィルタ
  - `categoryId`: 品目でフィルタ
  - `locationId`: 場所でフィルタ
  - `tagIds`: タグでフィルタ（カンマ区切り、OR条件）
  - `includeSold`: 販売済みを含む（true/false）
  - `sortBy`: ソートフィールド（name, manufacturer, category, location, quantity, costPrice, specification）
  - `sortOrder`: asc/desc
- Response:
```json
{
  "items": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### GET `/api/items/:id`
アイテム詳細取得。
- Response: アイテムオブジェクト（images, materials, tags含む、totalCost計算済み）

### POST `/api/items`
アイテム作成。SKUは自動採番。
- Body:
```json
{
  "itemType": "PRODUCT",
  "name": "商品名",
  "costPrice": "10000",
  "manufacturerId": "...",
  "categoryId": "...",
  "images": [{ "url": "...", "order": 0 }],
  "tagIds": ["tag-id-1"]
}
```
- 商品（PRODUCT）: costPrice必須
- 委託品（CONSIGNMENT）: costPrice=null
- Response: `{ success: true, item: {...} }`

### PUT `/api/items/:id`
アイテム更新。SKUとitemTypeは編集不可。
- Body: 更新データ（images, tagIdsも含む）
- Response: `{ success: true, item: {...} }`

### DELETE `/api/items/:id`
アイテム削除（物理削除）。画像はCloudinaryからも削除。
- Response: `{ success: true, message: "..." }`

### GET `/api/items/ids`
アイテムIDリスト取得（フィルタ適用可能）。
- Query: GET `/api/items`と同じフィルタ
- Response: `{ ids: ["id1", "id2", ...] }`

### PUT `/api/items/:id/materials`
アイテムの素材情報を一括更新。
- Body:
```json
{
  "materials": [
    { "materialTypeId": "...", "description": "...", "imageUrl": "...", "order": 0 }
  ]
}
```
- Response: `{ success: true, materials: [...] }`

---

## Items Bulk（アイテム一括操作）

### POST `/api/items/bulk/delete`
アイテム一括削除（最大100件）。
- Body: `{ ids: ["id1", "id2", ...] }`
- Response: `{ success: true, message: "..." }`

### POST `/api/items/bulk/edit`
アイテム一括編集。
- Body:
```json
{
  "ids": ["id1", "id2"],
  "updates": {
    "locationId": "loc-id",
    "manufacturerId": "mfr-id",
    "categoryId": "cat-id",
    "tagIds": ["tag1", "tag2"],
    "quantity": { "mode": "set", "value": 10 }
  }
}
```
- quantity.mode: `set`（設定）または `adjust`（増減）
- Response: `{ success: true, message: "..." }`

---

## Items CSV（アイテムCSV）

### GET `/api/items/export`
アイテムCSVエクスポート。
- Query: GET `/api/items`と同じフィルタ + `type`
- Response: CSV（BOM付きUTF-8、日本語ヘッダー）
- ヘッダー: ID, SKU, 種別, 商品名, メーカー, 品目, 仕様, サイズ, 張地/カラー, 個数, 単位, 原価単価, 定価単価, 入荷年月, 場所, デザイナー, タグ, 備考, 販売済み, 販売日時, 作成日時, 更新日時
- 種別: 商品/委託品
- タグ: パイプ区切り（例: `タグ1|タグ2|タグ3`）

### GET `/api/items/import/template`
CSVインポートテンプレート取得。
- Response: 空のCSVテンプレート

### POST `/api/items/import`
アイテムCSVインポート。
- Body: `multipart/form-data` with CSV file
- Response:
```json
{
  "success": true,
  "imported": 10,
  "errors": [
    { "row": 3, "message": "商品名は必須です" }
  ]
}
```
- 機能: マスタデータ自動作成（存在しない場合）

---

## Items Print（アイテム印刷）

### GET `/api/items/print`
印刷用データ取得。
- Query: `ids` - カンマ区切りのアイテムID
- Response: `{ items: [...] }`（印刷に必要な情報のみ）

---

## Legacy API（v2.x互換、リダイレクト）

> 以下のエンドポイントは307リダイレクトで `/api/items` へ転送されます。

### Products（商品）→ `/api/items?type=PRODUCT`
- `/api/products` → `/api/items?type=PRODUCT`
- `/api/products/:id` → `/api/items/:id`
- `/api/products/bulk/*` → `/api/items/bulk/*`
- `/api/products/export` → `/api/items/export?type=PRODUCT`
- `/api/products/import/*` → `/api/items/import/*`
- `/api/products/print` → `/api/items/print`

### Consignments（委託品）→ `/api/items?type=CONSIGNMENT`
- `/api/consignments` → `/api/items?type=CONSIGNMENT`
- `/api/consignments/:id` → `/api/items/:id`
- `/api/consignments/bulk/*` → `/api/items/bulk/*`
- `/api/consignments/export` → `/api/items/export?type=CONSIGNMENT`
- `/api/consignments/import/*` → `/api/items/import/*`
- `/api/consignments/print` → `/api/items/print`

---

## Master Data（マスタデータ）

### Manufacturers（メーカー）
- GET `/api/manufacturers` - 一覧（_count.items含む）
- POST `/api/manufacturers` - 作成
- GET `/api/manufacturers/:id` - 詳細
- PUT `/api/manufacturers/:id` - 更新
- DELETE `/api/manufacturers/:id` - 削除（参照SetNull）

### Categories（品目）
- GET `/api/categories` - 一覧（_count.items含む）
- POST `/api/categories` - 作成
- GET `/api/categories/:id` - 詳細
- PUT `/api/categories/:id` - 更新
- DELETE `/api/categories/:id` - 削除

### Locations（場所）
- GET `/api/locations` - 一覧（_count.items含む）
- POST `/api/locations` - 作成
- GET `/api/locations/:id` - 詳細
- PUT `/api/locations/:id` - 更新
- DELETE `/api/locations/:id` - 削除

### Units（単位）
- GET `/api/units` - 一覧（_count.items含む）
- POST `/api/units` - 作成
- GET `/api/units/:id` - 詳細
- PUT `/api/units/:id` - 更新
- DELETE `/api/units/:id` - 削除

---

## Tags（タグ）

### GET `/api/tags`
タグ一覧取得。
- Response: `[{ id, name, _count: { itemTags } }, ...]`

### POST `/api/tags`
タグ作成。
- Body: `{ name }`

### PUT `/api/tags/:id`
タグ更新。

### DELETE `/api/tags/:id`
タグ削除（Cascade）。

---

## Material Types（素材項目）

### GET `/api/material-types`
素材項目一覧取得（order順）。

### POST `/api/material-types`
素材項目作成。
- Body: `{ name, order? }`

### PUT `/api/material-types/:id`
素材項目更新。

### DELETE `/api/material-types/:id`
素材項目削除。

---

## Dashboard（ダッシュボード）

### GET `/api/dashboard/stats`
統計情報取得。
- Response:
```json
{
  "totalProducts": 150,
  "totalCategories": 12,
  "totalManufacturers": 8,
  "totalCost": 1500000
}
```

### GET `/api/dashboard/cost-by-manufacturer`
メーカー別原価合計。
- Query: `sort=asc|desc`

### GET `/api/dashboard/recent`
最近の変更（追加/更新）。

---

## Change Logs（変更履歴）

### GET `/api/change-logs`
変更履歴一覧取得。
- Query: `page`, `limit`, `entityType`

---

## Settings（システム設定）

### GET `/api/settings/:key`
設定値取得。

### PUT `/api/settings/:key`
設定値更新（ADMIN権限）。

---

## Users（ユーザー管理）※ADMIN権限

### GET `/api/users`
ユーザー一覧取得。

### POST `/api/users`
ユーザー作成。
- Body: `{ username, password, role }`

### PUT `/api/users/:id`
ユーザー更新。

### DELETE `/api/users/:id`
ユーザー削除。
- 制約: 自分自身/最後のADMINは削除不可

### POST `/api/users/:id/reset-password`
パスワードリセット。

---

## Upload（画像アップロード）

### POST `/api/upload`
画像アップロード。
- Body: `multipart/form-data` with file
- Response: `{ success: true, url: "https://..." }`

---

## Filters（フィルタオプション）

### GET `/api/filters`
フィルタ用マスタデータ一括取得。

---

## Endpoint Summary

| カテゴリ | エンドポイント数 |
|---------|-----------------|
| Auth | 4 |
| Items | 7 |
| Items Bulk | 2 |
| Items CSV | 3 |
| Items Print | 1 |
| Legacy Products (redirect) | 9 |
| Legacy Consignments (redirect) | 8 |
| Manufacturers | 5 |
| Categories | 5 |
| Locations | 5 |
| Units | 5 |
| Tags | 4 |
| Material Types | 4 |
| Dashboard | 3 |
| Change Logs | 1 |
| Settings | 2 |
| Users | 5 |
| Upload | 1 |
| Filters | 1 |
| **合計** | **約75** |
