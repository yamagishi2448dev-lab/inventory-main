Prisma の query engine DLL がロックされて開発サーバーが起動できない問題を修正してください。

## 手順

1. `tasklist` で node.exe プロセスが残っていないか確認する
2. 残っている場合は `powershell -Command "Stop-Process -Name node -Force -ErrorAction SilentlyContinue"` で全て停止する
3. プロセスが停止したことを `tasklist` で確認する
4. `npx prisma generate` を実行して Prisma クライアントを再生成する
5. `npx next dev --port 3000` をバックグラウンドで起動する
6. 起動ログを確認して Ready になったことを報告する

## 背景

Windows 環境では、node.exe プロセスが Prisma の `query_engine-windows.dll.node` をロックしたまま残ることがある。
この状態で `prisma generate` や `npm run dev` を実行すると EPERM エラーになる。

```
EPERM: operation not permitted, rename '...query_engine-windows.dll.node.tmp...' -> '...query_engine-windows.dll.node'
```

全ての node.exe プロセスを停止してから再生成すれば解決する。
