# GEMINI.md - AI アシスタント設定

## 基本ルール

- **必ず日本語で回答する**

## プロジェクト概要

このプロジェクトは、Next.js (App Router) と Prisma (PostgreSQL) を使用した在庫管理システム「Inventory」です。
個人・小規模ビジネス向けに設計されており、商品管理、委託品管理、画像管理、帳票出力などの機能を備えています。

以前の仕様書 `CLAUDE.md` は現在参照できないため、`README.md` および `prisma/schema.prisma` を仕様の正として参照してください。

## 技術スタック

- **Framework**: Next.js 14+ (App Router), React 19
- **Database**: PostgreSQL
- **ORM**: Prisma
- **UI**: Tailwind CSS, shadcn/ui
- **Test**: Vitest, Playwright

## 主要データモデル (v2.1)

- **Product**: 在庫商品 (SKU自動採番, 原価・定価管理)
- **Consignment**: 委託品 (原価0円, 委託管理)
- **Master Data**: Manufacturer (メーカー), Category (品目), Location (場所), Unit (単位)
- **Material**: MaterialType, ProductMaterial, ConsignmentMaterial (素材構成情報)
- **System**: User, Session, ChangeLog (操作ログ), SystemSetting

## よく使うコマンド (Makefile)

- `make dev`: 開発サーバー起動
- `make setup`: 初期セットアップ (依存関係 + DBマイグレーション + Seed)
- `make prisma-studio`: データベース内容確認 (GUI)
- `make check`: リント + 型チェック + テスト
- `make build`: プロダクションビルド

## 重要ファイル

- `README.md`: プロジェクトのセットアップと機能概要
- `prisma/schema.prisma`: データベース定義
- `package.json`: 依存関係とスクリプト
- `Makefile`: コマンドショートカット
