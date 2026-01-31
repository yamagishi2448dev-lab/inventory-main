# Project Context (v2.3)

## Overview
- プロジェクト名: Inventory（在庫管理システム）
- 目的: 商品・委託品を中心に、品目・メーカー・場所・単位・タグ・素材・画像を統合管理
- 対象ユーザー: 小規模店舗オーナー/スタッフ、個人事業主、小規模EC運営者
- 価値提案: シンプル、直感的、将来拡張可能、低コスト運用

## Tech Stack

### Frontend
- Next.js 16+ (App Router)
- React 19
- TypeScript 5.9+
- shadcn/ui (UIコンポーネント)
- Radix UI (プリミティブコンポーネント)
- Tailwind CSS 3.4+
- Lucide React (アイコン)
- SWR 2.2+ (データフェッチング)

### Backend
- Next.js API Routes
- Prisma 5.22+ (ORM)
- bcryptjs (パスワードハッシュ化)
- Zod 4+ (バリデーション)
- Cloudinary SDK (画像ホスティング)

### Database
- PostgreSQL（開発環境・本番環境共通）
- Transaction Pooler対応

### Testing
- Vitest 4+ (単体・統合テスト)
- Playwright 1.57+ (E2Eテスト)
- Testing Library (React)

### Development Tools
- ESLint 9+
- Prettier 3.7+
- TypeScript strict mode
- tsx (スクリプト実行)

## Constraints (MUST/SHOULD/MAY)

### MUST（必須）
- Next.js 16+（App Router）
- 本番PostgreSQL（SQLite禁止）
- セッションベース認証
- `/api/auth/*`以外は認証必須
- bcryptでパスワードハッシュ化
- セッションはDB永続化 + Cookieにランダムトークンのみ
- APIはJSON + `Content-Type: application/json; charset=utf-8`
- 画像保存はCloudinary（本番）

### SHOULD（推奨）
- UIはshadcn/ui
- TypeScript strict mode
- Zodバリデーション
- 変更履歴の記録

### MAY（検討）
- NextAuth.js移行検討
- GraphQL移行検討

## Operations / Budget / Compliance

### デプロイ
- Vercelのみ（他プラットフォームは対象外）
- `main`へのpushで自動デプロイ
- PRはプレビューデプロイ
- デプロイ前のビルド/テスト実行推奨

### コスト
- 開発コスト: 無料サービスのみ
- 運用コスト: $10/月以内を目標
- 10,000件超で有料移行検討

### コンプライアンス
- 個人情報: ユーザー名・メールのみ（最小限）
- GDPR: 対象外（日本国内利用想定）
- データ保持: 削除まで無期限

## Compatibility

### Desktop
- 最新Chrome/Firefox/Safari/Edge
- 最小解像度: 1280x720

### Mobile
- iOS Safari 14+
- Android Chrome
- タブレット: >=768px
- スマホ対応（印刷機能除く）

### 非対応
- IE11

## Data Limits
- 商品/委託品数: 10,000件目安
- 画像: 5MB/ファイル、最大5枚/商品
- マスタデータ: 各100-200件
- Vercel Postgres無料枠: 256MB（商品1,000件で約10MB想定、画像は別保存）

## Assumptions

### 開発スキル
- TypeScript/React/Next.js
- Prisma/Tailwind（推奨）

### 開発環境
- Node.js v18+
- npm v9+
- Git
- VS Code（推奨）

### 初期データ
- 管理者ユーザー1名必須
- 開発用サンプル10件程度

## Environment Variables

### 必須
| 変数名 | 説明 |
|--------|------|
| `DATABASE_URL` | PostgreSQL接続URL（Transaction pooler） |
| `DIRECT_URL` | PostgreSQL直接接続URL（マイグレーション用） |
| `SESSION_SECRET` | セッション暗号化キー |
| `NEXT_PUBLIC_APP_URL` | アプリケーションURL |

### 本番必須
| 変数名 | 説明 |
|--------|------|
| `CLOUDINARY_CLOUD_NAME` | Cloudinaryクラウド名 |
| `CLOUDINARY_API_KEY` | Cloudinary APIキー |
| `CLOUDINARY_API_SECRET` | Cloudinary APIシークレット |

### 開発用オプション
| 変数名 | 説明 |
|--------|------|
| `DEV_AUTO_SEED_ADMIN` | 自動シード有効化 |
| `DEV_ADMIN_USERNAME` | 開発用管理者名 |
| `DEV_ADMIN_PASSWORD` | 開発用管理者パスワード |

## CI/CD
- `main`へのpush: 本番デプロイ
- PR作成: プレビューデプロイ
- ビルド/テスト実行推奨
