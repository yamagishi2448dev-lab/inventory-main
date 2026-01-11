# Project Context

## Overview
- プロジェクト名: Inventory（在庫管理システム）
- 目的: 商品マスタを中心に、品目・メーカー・場所・単位・画像を統合管理
- 対象ユーザー: 小規模店舗オーナー/スタッフ、個人事業主、小規模EC運営者
- 価値提案: シンプル、直感的、将来拡張可能、低コスト運用

## Tech Stack
- Frontend: Next.js 14+ (App Router), React 19, TypeScript, shadcn/ui, Tailwind CSS, Radix UI
- Backend: Next.js API Routes, Prisma, bcrypt, Zod
- Database: PostgreSQL（開発環境含む）
- Auth: カスタムのセッションベース認証（将来的にNextAuth.js移行はMAY）
- Infra: Vercel（必須）, Vercel Postgres推奨（代替: Supabase/AWS RDS）
- Tools: Vitest, Playwright, ESLint, Prettier

## Constraints (MUST/SHOULD/MAY)
- MUST: Next.js 14+, 本番PostgreSQL, セッション認証, `/api/auth/*`以外は認証必須
- MUST: bcryptでハッシュ化, セッションはDB永続化 + Cookieにランダムトークンのみ
- MUST: APIはJSON + `Content-Type: application/json; charset=utf-8`
- SHOULD: UIはshadcn/ui, TS strict
- MAY: NextAuth.js移行検討, GraphQL移行検討

## Operations / Budget / Compliance
- デプロイ: Vercelのみ（他プラットフォームは対象外）
- 開発コスト: 無料サービスのみ（Phase 1-5相当）
- 運用コスト: $10/月以内を目標、10,000件超で有料移行検討
- 個人情報: ユーザー名・メールのみ（最小限）
- GDPR: 対象外（日本国内利用想定）
- データ保持: 削除まで無期限

## Compatibility
- Desktop: 最新Chrome/Firefox/Safari/Edge
- Mobile: iOS Safari 14+, Android Chrome
- IE11: 非対応
- 画面解像度: デスクトップ最小1280x720、タブレット>=768、スマホ対応

## Data Limits
- 商品数: 10,000件目安
- 画像: 5MB/ファイル、最大5枚/商品
- 品目/場所の件数目安: 100-200件
- Vercel Postgres無料枠: 256MB（商品1,000件で約10MB想定、画像は別保存）

## Assumptions
- スキル: TypeScript/React/Next.js（Prisma/Tailwindは推奨）
- 開発環境: Node.js v18+, npm v9+, Git, VS Code
- 初期データ: 管理者ユーザー1名必須、開発用サンプル10件程度

## Deployment / CI
- 環境変数: `DATABASE_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`
- `main`へのpushで自動デプロイ、PRはプレビューデプロイ
- デプロイ前のビルド/テスト実行は推奨
