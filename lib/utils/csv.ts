export function parseCSV(content: string): string[][] {
  const rows: string[][] = []
  const normalized = content.replace(/^\uFEFF/, '')
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i]
    const nextChar = normalized[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && nextChar === '\n') {
        i += 1
      }
      row.push(field)
      field = ''
      if (row.some((cell) => cell !== '')) {
        rows.push(row)
      }
      row = []
      continue
    }

    if (!inQuotes && char === ',') {
      row.push(field)
      field = ''
      continue
    }

    field += char
  }

  row.push(field)
  if (row.some((cell) => cell !== '')) {
    rows.push(row)
  }

  return rows
}
