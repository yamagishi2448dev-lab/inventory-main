// Excelシリアル日付を「YYYY年M月」形式に変換
export function convertExcelSerialDate(value: string | undefined): string | null {
  if (!value || value.trim() === '') return null
  const trimmed = value.trim()

  // 既に年月形式の場合はそのまま返す
  if (trimmed.includes('年')) return trimmed

  // 数値の場合はExcelシリアル日付として変換
  const serialNumber = parseInt(trimmed, 10)
  if (isNaN(serialNumber) || serialNumber < 1) return trimmed

  // Excel日付 → JavaScript Date変換
  // Excelの日付シリアル値は1900年1月1日を1とする（1900年2月29日のバグあり）
  const excelEpochDiff = 25569 // 1970-01-01からの日数差
  const millisecondsPerDay = 86400 * 1000
  // Excel 1900年バグ対応: 60（1900年2月29日）より大きい場合は1日減らす
  const adjustedSerial = serialNumber > 59 ? serialNumber - 1 : serialNumber
  const date = new Date((adjustedSerial - excelEpochDiff) * millisecondsPerDay)

  return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月`
}
