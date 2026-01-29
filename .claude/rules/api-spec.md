# API Spec (Summary)

## Common Rules
- Base: `/api`
- 認証: `/api/auth/*`以外は必須
- Content-Type: `application/json; charset=utf-8`
- 文字コード: UTF-8
- 日時: `YYYY-MM-DDTHH:mm:ssZ`（UTC）

## Error Format
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": { "field": "name" } } }
```

## Status Codes
- 400 Validation error
- 401 Unauthorized
- 403 Forbidden
- 404 Not found
- 409 Conflict (SKU重複など)
- 500 Server error

## Auth
- POST `/api/auth/login`
- POST `/api/auth/logout`
- GET `/api/auth/session`
- POST `/api/auth/change-password`

## Products
- GET `/api/products`（page, limit, search, manufacturerId, categoryId, locationId, tagIds, arrivalDate）
- 一覧レスポンスは`products[]`と`pagination{total,page,limit,totalPages}`を含む
- GET `/api/products/:id`
- POST `/api/products`（SKUは自動採番、tagIds配列でタグ関連付け）
- PUT `/api/products/:id`（tagIds配列でタグ更新）
- PATCH `/api/products/:id/stock`
- DELETE `/api/products/:id`
- DELETE `/api/products/:id/images/:imageId`
- POST `/api/products/:id/materials`（素材追加）
- GET `/api/products/ids`（選択商品ID取得、フィルタ条件対応）
- GET `/api/products/print`（印刷用データ取得）

## Products - Bulk Operations
- DELETE `/api/products/bulk/delete`（一括削除）
- PUT `/api/products/bulk/edit`（一括編集）

## Products - CSV Import/Export
- GET `/api/products/export`（CSV形式でエクスポート、タグ対応）
- POST `/api/products/import`（CSVインポート、タグ対応）
- GET `/api/products/import/template`（インポート用CSVテンプレート）

## Consignments（委託品）
- GET `/api/consignments`（page, limit, search, manufacturerId, categoryId, locationId, tagIds）
- GET `/api/consignments/:id`
- POST `/api/consignments`（SKUは自動採番 CSG-XXXXX形式、tagIds配列対応）
- PUT `/api/consignments/:id`
- DELETE `/api/consignments/:id`
- POST `/api/consignments/:id/images`（画像追加）
- POST `/api/consignments/:id/materials`（素材追加）
- GET `/api/consignments/ids`
- GET `/api/consignments/print`

## Consignments - Bulk Operations
- POST `/api/consignments/bulk`（一括操作）
- PUT `/api/consignments/bulk/edit`（一括編集）

## Consignments - CSV Import/Export
- GET `/api/consignments/export`（CSV形式でエクスポート、タグ対応）
- POST `/api/consignments/import`（CSVインポート、タグ対応）
- GET `/api/consignments/import/template`（インポート用CSVテンプレート）

## Tags（v2.2追加）
- GET `/api/tags`（タグ一覧、商品数・委託品数を含む）
- POST `/api/tags`（タグ新規作成）
- GET `/api/tags/:id`
- PUT `/api/tags/:id`
- DELETE `/api/tags/:id`

## Material Types
- GET `/api/material-types`
- POST `/api/material-types`
- GET `/api/material-types/:id`
- PUT `/api/material-types/:id`
- DELETE `/api/material-types/:id`

## Master Data
- Manufacturers: GET/POST `/api/manufacturers`, GET/PUT/DELETE `/api/manufacturers/:id`
- Categories: GET/POST `/api/categories`, GET/PUT/DELETE `/api/categories/:id`
- Locations: GET/POST `/api/locations`, GET/PUT/DELETE `/api/locations/:id`
- Units: GET/POST `/api/units`, GET/PUT/DELETE `/api/units/:id`

## Users (ADMIN only)
- GET `/api/users`
- POST `/api/users`
- PUT `/api/users/:id`
- DELETE `/api/users/:id`
- POST `/api/users/:id/reset-password`

## System
- GET `/api/change-logs`（変更履歴取得）
- GET `/api/settings/:key`（システム設定取得）
- PUT `/api/settings/:key`（システム設定更新）

## Upload / Dashboard
- POST `/api/upload`（multipart/form-data、本番環境はGoogle Drive保存）
- GET `/api/dashboard/stats`
- GET `/api/dashboard/cost-by-manufacturer`（sort=asc|desc）
- GET `/api/dashboard/recent`
