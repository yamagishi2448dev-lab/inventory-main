import * as XLSX from 'xlsx'
import * as fs from 'fs'

const filePath = '在庫表2025.10.xlsx'

// Excelファイルを読み込む
const workbook = XLSX.readFile(filePath)

// シート名を取得
console.log('シート名:', workbook.SheetNames)

// 各シートのデータを確認
workbook.SheetNames.forEach((sheetName) => {
  console.log(`\n=== ${sheetName} ===`)
  const worksheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

  // 最初の10行を表示
  console.log('データのサンプル:')
  data.slice(0, 10).forEach((row, index) => {
    console.log(`行${index}:`, row)
  })

  // 全データをJSONに変換
  const jsonData = XLSX.utils.sheet_to_json(worksheet)
  console.log(`\n総行数: ${jsonData.length}`)
  if (jsonData.length > 0) {
    const firstRow = jsonData[0] as Record<string, unknown>
    console.log('カラム名:', Object.keys(firstRow))
    console.log('最初のデータ:', firstRow)
  }
})
