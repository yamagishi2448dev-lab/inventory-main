# Security

- パスワードはbcryptでハッシュ化する（最小8文字推奨）。
- セッションはDB永続化し、Cookieにはランダムトークンのみ保存する。
- Cookie属性: `HttpOnly`, `SameSite=Lax`, 本番は`Secure`。
- `/api/auth/*`以外のAPIは認証必須。
- 入力はZodで検証し、Prismaのパラメータ化クエリでSQLiを防ぐ。
- XSSはReact標準のエスケープで対応。
- CSRFはSameSite + Origin/Refererチェック（将来ダブルサブミット検討）。
- 画像アップロードはJPEG/PNG/WebP、最大5MB、最大5枚。
- アップロード時はファイル名をサニタイズし、ランダム文字列で保存する。
- 開発環境の保存先は`public/uploads`、本番はクラウドストレージ推奨。
- 本番はHTTPS必須（Vercelで自動対応）。
- 機密情報は`.env`で管理し、Git管理しない。
- ログインAPIのレート制限・アカウントロックは将来実装。
