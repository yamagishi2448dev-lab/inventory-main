.PHONY: help install setup dev build start test clean migrate seed deploy

# デフォルトターゲット: ヘルプを表示
help:
	@echo "Inventory Management System - Makefile"
	@echo ""
	@echo "Available commands:"
	@echo "  make install        - Install dependencies"
	@echo "  make setup          - Initial setup (install + migrate + seed)"
	@echo "  make dev            - Start development server"
	@echo "  make build          - Build for production"
	@echo "  make start          - Start production server"
	@echo "  make test           - Run tests"
	@echo "  make migrate        - Run database migrations"
	@echo "  make migrate-reset  - Reset database and run migrations"
	@echo "  make seed           - Seed database with initial data"
	@echo "  make prisma-studio  - Open Prisma Studio"
	@echo "  make clean          - Clean build artifacts and dependencies"
	@echo "  make deploy         - Push to remote (Vercel auto deploy)"
	@echo ""

# 依存関係のインストール
install:
	@echo "Installing dependencies..."
	npm install

# 初期セットアップ（インストール + マイグレーション + シード）
setup: install migrate seed
	@echo "Setup completed successfully!"

# 開発サーバー起動
dev:
	@echo "Starting development server..."
	npm run dev

# プロダクションビルド
build:
	@echo "Building for production..."
	npm run build

# プロダクションサーバー起動
start:
	@echo "Starting production server..."
	npm run start

# テスト実行
test:
	@echo "Running tests..."
	npm test

# データベースマイグレーション
migrate:
	@echo "Running database migrations..."
	npx prisma migrate dev

# データベースリセット＆マイグレーション
migrate-reset:
	@echo "Resetting database and running migrations..."
	npx prisma migrate reset --force

# シードデータ投入
seed:
	@echo "Seeding database..."
	npx prisma db seed

# Prisma Studio起動
prisma-studio:
	@echo "Opening Prisma Studio..."
	npx prisma studio

# クリーンアップ
clean:
	@echo "Cleaning build artifacts and dependencies..."
	rm -rf node_modules
	rm -rf .next
	rm -rf out
	@echo "Clean completed!"

# Git pushによる自動デプロイ（Vercelで自動実行）
deploy:
	@echo "Pushing to remote to trigger deployment..."
	git push

# 本番環境のマイグレーション（Vercel）
migrate-prod:
	@echo "Running production migrations..."
	npx prisma migrate deploy

# Prismaクライアント生成
prisma-generate:
	@echo "Generating Prisma Client..."
	npx prisma generate

# フォーマット
format:
	@echo "Formatting code..."
	npm run format

# リント
lint:
	@echo "Running linter..."
	npm run lint

# 型チェック
typecheck:
	@echo "Running type check..."
	npx tsc --noEmit

# フルチェック（リント + 型チェック + テスト）
check: lint typecheck test
	@echo "All checks passed!"
