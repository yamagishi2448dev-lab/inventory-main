# API Spec (v2.3)

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

## Products（商品）

### GET `/api/products`
商品一覧取得。
- Query:
  - `page`: ページ番号（デフォルト: 1）
  - `limit`: 件数（デフォルト: 20）
  - `search`: 商品名/仕様で検索
  - `manufacturerId`: メーカーでフィルタ
  - `categoryId`: 品目でフィルタ
  - `locationId`: 場所でフィルタ
  - `tagIds`: タグでフィルタ（カンマ区切り、OR条件）
  - `isSold`: 販売済みフィルタ（true/false）
  - `sortField`: ソートフィールド
  - `sortOrder`: asc/desc
- Response:
```json
{
  "products": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### GET `/api/products/:id`
商品詳細取得。
- Response: 商品オブジェクト（images, materials, tags含む）

### POST `/api/products`
商品作成。SKUは自動採番。
- Body: 商品データ（name, costPrice必須）
- Response: `{ success: true, product: {...} }`

### PUT `/api/products/:id`
商品更新。
- Body: 更新データ
- Response: `{ success: true, product: {...} }`

### DELETE `/api/products/:id`
商品削除（物理削除）。
- Response: `{ success: true }`

### PATCH `/api/products/:id/stock`
在庫数更新。
- Body: `{ quantity: number }`
- Response: `{ success: true, product: {...} }`

### DELETE `/api/products/:id/images/:imageId`
商品画像削除。
- Response: `{ success: true }`

### GET `/api/products/ids`
商品IDリスト取得（フィルタ適用可能）。
- Query: GET `/api/products`と同じフィルタ
- Response: `{ ids: ["id1", "id2", ...] }`

### POST `/api/products/:id/materials`
商品に素材情報を追加。
- Body: `{ materialTypeId, description?, imageUrl?, order? }`
- Response: `{ success: true, material: {...} }`

---

## Products Bulk（商品一括操作）

### POST `/api/products/bulk/delete`
商品一括削除（最大100件）。
- Body: `{ ids: ["id1", "id2", ...] }`
- Response: `{ success: true, deletedCount: 5 }`

### POST `/api/products/bulk/edit`
商品一括編集。
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
- Response: `{ success: true, updatedCount: 2 }`

---

## Products CSV（商品CSV）

### GET `/api/products/export`
商品CSVエクスポート。
- Query: GET `/api/products`と同じフィルタ
- Response: CSV（BOM付きUTF-8、日本語ヘッダー）
- ヘッダー: ID, SKU, 商品名, メーカー, 品目, 仕様, サイズ, 張地/カラー, 個数, 単位, 原価単価, 定価単価, 入荷年月, 場所, デザイナー, タグ, 備考, 販売済み, 販売日時, 作成日時, 更新日時
- タグ: パイプ区切り（例: `タグ1|タグ2|タグ3`）

### GET `/api/products/import/template`
CSVインポートテンプレート取得。
- Response: 空のCSVテンプレート

### POST `/api/products/import`
商品CSVインポート。
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

## Products Print（商品印刷）

### GET `/api/products/print`
印刷用データ取得。
- Query: `ids` - カンマ区切りの商品ID
- Response: 商品配列（印刷に必要な情報のみ）

---

## Consignments（委託品）

商品APIと同等の構造。costPriceは常に0。SKUはCSG-形式。

### GET `/api/consignments`
委託品一覧取得。Query: `/api/products`と同じ。

### GET `/api/consignments/:id`
委託品詳細取得。

### POST `/api/consignments`
委託品作成。SKUは自動採番（CSG-形式）。

### PUT `/api/consignments/:id`
委託品更新。

### DELETE `/api/consignments/:id`
委託品削除。

### GET `/api/consignments/ids`
委託品IDリスト取得。

### POST `/api/consignments/:id/materials`
委託品に素材情報を追加。

### POST `/api/consignments/:id/images`
委託品に画像を追加。

---

## Consignments Bulk（委託品一括操作）

### POST `/api/consignments/bulk`
委託品一括削除。
- Body: `{ ids: [...] }`

### POST `/api/consignments/bulk/edit`
委託品一括編集。Body: `/api/products/bulk/edit`と同じ。

---

## Consignments CSV（委託品CSV）

### GET `/api/consignments/export`
委託品CSVエクスポート。

### GET `/api/consignments/import/template`
CSVインポートテンプレート取得。

### POST `/api/consignments/import`
委託品CSVインポート。

---

## Consignments Print（委託品印刷）

### GET `/api/consignments/print`
印刷用データ取得。

---

## Master Data（マスタデータ）

### Manufacturers（メーカー）
- GET `/api/manufacturers` - 一覧（_count含む）
- POST `/api/manufacturers` - 作成
- GET `/api/manufacturers/:id` - 詳細
- PUT `/api/manufacturers/:id` - 更新
- DELETE `/api/manufacturers/:id` - 削除（参照SetNull）

### Categories（品目）
- GET `/api/categories` - 一覧
- POST `/api/categories` - 作成
- GET `/api/categories/:id` - 詳細
- PUT `/api/categories/:id` - 更新
- DELETE `/api/categories/:id` - 削除

### Locations（場所）
- GET `/api/locations` - 一覧
- POST `/api/locations` - 作成
- GET `/api/locations/:id` - 詳細
- PUT `/api/locations/:id` - 更新
- DELETE `/api/locations/:id` - 削除

### Units（単位）
- GET `/api/units` - 一覧
- POST `/api/units` - 作成
- GET `/api/units/:id` - 詳細
- PUT `/api/units/:id` - 更新
- DELETE `/api/units/:id` - 削除

---

## Tags（タグ）

### GET `/api/tags`
タグ一覧取得。
- Response: `[{ id, name, _count: { products, consignments } }, ...]`

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
| Products | 9 |
| Products Bulk | 2 |
| Products CSV | 3 |
| Products Print | 1 |
| Consignments | 8 |
| Consignments Bulk | 2 |
| Consignments CSV | 3 |
| Consignments Print | 1 |
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
| **合計** | **約74** |
