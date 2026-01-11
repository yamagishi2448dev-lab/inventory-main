# Testing

- 単体/統合テストはVitest、E2EはPlaywrightを使用する。
- 追加・変更したロジックには該当レベルのテストを追加する。
- テスト配置: `tests/unit`, `tests/integration`, `tests/e2e`
- カバレッジ目標: ユーティリティ80%+, API 70%+, 主要フローはE2Eで網羅
