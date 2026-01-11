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
- GET `/api/products`（page, limit, search, manufacturerId, categoryId, locationId, arrivalDate）
- 一覧レスポンスは`products[]`と`pagination{total,page,limit,totalPages}`を含む
- GET `/api/products/:id`
- POST `/api/products`（SKUは自動採番）
- PUT `/api/products/:id`
- PATCH `/api/products/:id/stock`
- DELETE `/api/products/:id`
- DELETE `/api/products/:id/images/:imageId`

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

## Upload / Dashboard
- POST `/api/upload`（multipart/form-data）
- GET `/api/dashboard/stats`
- GET `/api/dashboard/cost-by-manufacturer`（sort=asc|desc）
- GET `/api/dashboard/recent`
