# UI & Structure (v2.3)

## Screens（画面一覧）

### 認証
| パス | 説明 |
|------|------|
| `/login` | ログイン画面（ロゴ、ユーザー名、パスワード、エラー表示） |

### ダッシュボード
| パス | 説明 |
|------|------|
| `/dashboard` | 統計カード、メーカー別原価合計、最近の更新 |

### 商品管理
| パス | 説明 |
|------|------|
| `/products` | 商品一覧（検索/フィルタ、ビュー切替、一括操作、印刷） |
| `/products/new` | 商品登録フォーム |
| `/products/:id` | 商品詳細（画像ギャラリー、素材情報、タグ） |
| `/products/:id/edit` | 商品編集フォーム |
| `/products/print` | 商品印刷（A4 2x2レイアウト） |

### 委託品管理
| パス | 説明 |
|------|------|
| `/consignments` | 委託品一覧（商品一覧と同等の機能） |
| `/consignments/new` | 委託品登録フォーム |
| `/consignments/:id` | 委託品詳細 |
| `/consignments/:id/edit` | 委託品編集フォーム |
| `/consignments/print` | 委託品印刷 |

### マスタ管理
| パス | 説明 |
|------|------|
| `/manufacturers` | メーカー管理（CRUD、参照カウント表示） |
| `/categories` | 品目管理 |
| `/locations` | 場所管理 |
| `/units` | 単位管理 |
| `/tags` | タグ管理（v2.2） |
| `/material-types` | 素材項目管理（v2.1） |

### 管理者
| パス | 説明 |
|------|------|
| `/admin/console` | ユーザー管理（ADMIN権限のみ） |

---

## UI Components（主要コンポーネント）

### Layout
| ファイル | 説明 |
|---------|------|
| `components/layout/Header.tsx` | ヘッダー（ユーザーメニュー、パスワード変更） |
| `components/layout/Sidebar.tsx` | サイドバーナビゲーション |

### Products / Consignments
| ファイル | 説明 |
|---------|------|
| `components/products/ProductGridView.tsx` | グリッドビュー（2列カード） |
| `components/products/ImageUpload.tsx` | 画像アップロード（DnD対応） |
| `components/products/BulkActionsBar.tsx` | 一括操作ツールバー |
| `components/products/BulkEditDialog.tsx` | 一括編集ダイアログ |
| `components/products/MaterialEditor.tsx` | 素材情報エディタ |

### Dashboard
| ファイル | 説明 |
|---------|------|
| `components/dashboard/RecentChanges.tsx` | 最近の変更表示 |
| `components/dashboard/CostByManufacturer.tsx` | メーカー別原価グラフ |
| `components/dashboard/OperationRulesCard.tsx` | 運用ルール表示 |

### UI (shadcn/ui)
| ファイル | 説明 |
|---------|------|
| `components/ui/button.tsx` | ボタン |
| `components/ui/dialog.tsx` | ダイアログ |
| `components/ui/table.tsx` | テーブル |
| `components/ui/select.tsx` | セレクトボックス |
| `components/ui/checkbox.tsx` | チェックボックス |
| `components/ui/popover.tsx` | ポップオーバー |
| `components/ui/badge.tsx` | バッジ |
| その他多数 | shadcn/uiコンポーネント群 |

---

## UI Notes（UI仕様）

### ヘッダー
- 右上メニューから管理者コンソール/パスワード変更にアクセス
- ADMINのみ管理者コンソールリンク表示

### 一覧画面
- テーブルビュー / グリッドビュー切替
- 検索: 300msデバウンス
- フィルタ: メーカー/品目/場所/タグ/販売済み
- ソート: 各カラムヘッダークリック
- ページネーション: 20件/ページ

### 一括操作
- チェックボックスで選択
- 選択件数表示
- 一括操作バー表示（選択時）

### ロールバッジ
- ADMIN: 赤
- USER: グレー

### 印刷
- A4固定レイアウト（2列×2行）
- スマホは印刷機能非対応

### レスポンシブ
- デスクトップ: サイドバー表示
- タブレット: サイドバー折りたたみ
- スマホ: ハンバーガーメニュー

---

## Directory Structure（ディレクトリ構造）

```
inventory-main/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── products/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   ├── print/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── edit/page.tsx
│   │   ├── consignments/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   ├── print/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── edit/page.tsx
│   │   ├── manufacturers/page.tsx
│   │   ├── categories/page.tsx
│   │   ├── locations/page.tsx
│   │   ├── units/page.tsx
│   │   ├── tags/page.tsx
│   │   ├── material-types/page.tsx
│   │   └── admin/console/page.tsx
│   └── api/
│       ├── auth/
│       ├── products/
│       ├── consignments/
│       ├── manufacturers/
│       ├── categories/
│       ├── locations/
│       ├── units/
│       ├── tags/
│       ├── material-types/
│       ├── dashboard/
│       ├── change-logs/
│       ├── settings/
│       ├── users/
│       ├── upload/
│       └── filters/
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   ├── products/
│   │   ├── ProductGridView.tsx
│   │   ├── ImageUpload.tsx
│   │   ├── BulkActionsBar.tsx
│   │   ├── BulkEditDialog.tsx
│   │   └── MaterialEditor.tsx
│   ├── consignments/
│   │   └── (商品と同等のコンポーネント)
│   ├── dashboard/
│   │   ├── RecentChanges.tsx
│   │   ├── CostByManufacturer.tsx
│   │   └── OperationRulesCard.tsx
│   └── ui/
│       └── (shadcn/uiコンポーネント群)
├── lib/
│   ├── auth/
│   │   ├── session.ts
│   │   ├── password.ts
│   │   └── middleware.ts
│   ├── db/
│   │   └── prisma.ts
│   ├── products/
│   │   └── query.ts
│   ├── consignments/
│   │   └── query.ts
│   ├── utils/
│   │   ├── sku.ts
│   │   ├── csv.ts
│   │   └── date.ts
│   ├── validations/
│   │   ├── product.ts
│   │   ├── consignment.ts
│   │   ├── category.ts
│   │   ├── tag.ts
│   │   └── user.ts
│   ├── hooks/
│   │   ├── useFilters.ts
│   │   ├── useMasterDataList.ts
│   │   └── useUserManagement.ts
│   ├── types.ts
│   ├── changelog.ts
│   ├── cloudinary.ts
│   ├── constants.ts
│   └── utils.ts
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── public/
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
└── README.md
```

---

## API Structure（API構造）

```
/api
├── auth/
│   ├── login/route.ts
│   ├── logout/route.ts
│   ├── session/route.ts
│   └── change-password/route.ts
├── products/
│   ├── route.ts (GET, POST)
│   ├── ids/route.ts
│   ├── print/route.ts
│   ├── export/route.ts
│   ├── import/route.ts
│   ├── import/template/route.ts
│   ├── bulk/delete/route.ts
│   ├── bulk/edit/route.ts
│   └── [id]/
│       ├── route.ts (GET, PUT, DELETE)
│       ├── stock/route.ts
│       ├── materials/route.ts
│       └── images/[imageId]/route.ts
├── consignments/
│   └── (productsと同等の構造)
├── manufacturers/
│   ├── route.ts
│   └── [id]/route.ts
├── categories/
│   ├── route.ts
│   └── [id]/route.ts
├── locations/
│   ├── route.ts
│   └── [id]/route.ts
├── units/
│   ├── route.ts
│   └── [id]/route.ts
├── tags/
│   ├── route.ts
│   └── [id]/route.ts
├── material-types/
│   ├── route.ts
│   └── [id]/route.ts
├── dashboard/
│   ├── stats/route.ts
│   ├── cost-by-manufacturer/route.ts
│   └── recent/route.ts
├── change-logs/route.ts
├── settings/[key]/route.ts
├── users/
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       └── reset-password/route.ts
├── upload/route.ts
└── filters/route.ts
```
