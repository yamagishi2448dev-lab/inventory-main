-- 運用ルール初期データ投入（既存の場合はスキップ）
INSERT INTO "system_settings" ("id", "key", "value", "updatedAt")
SELECT
    gen_random_uuid()::text,
    'operation_rules',
    E'【在庫管理ルール】\n・入荷時は必ず個数と場所を登録する\n・原価単価は税抜き価格で入力する\n・販売済み商品は「販売済み」に切り替える\n・委託品の原価は登録不要（自動でnull）\n\n【画像登録】\n・1枚目にメイン画像を設定する\n・最大5枚まで登録可能\n\n【CSV入出力】\n・タグはパイプ「|」で区切る\n・インポート時、存在しないマスタは自動作成される',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM "system_settings" WHERE "key" = 'operation_rules'
);
