/**
 * 商品画像マッチング ドライランスクリプト
 *
 * 使い方:
 *   npx tsx scripts/product-image-match.ts
 *
 * ファイル一覧.csv の画像ファイル名と DB の Item.name を突合し、
 * マッチング結果を CSV レポートとして出力する。
 *
 * マッチング戦略:
 *   1. 正規化後の完全一致
 *   2. 型番（先頭数字）一致 + 追加トークン一致
 *   3. 英語名のトークン一致（DB名に含まれる / DB名を含む）
 *   4. スコアベースのトークン重複マッチング
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

// ========================================
// 英語→カタカナ 商品名辞書
// ========================================
// ファイル名の英語商品名 → DB側のカタカナ名をマッピング
const EN_TO_KANA: Record<string, string[]> = {
  // スツール系
  'boccone': ['ボッコーネ'],
  'clessidra': ['クレッシードラ'],
  'credo': ['クレド'],
  'falo': ['ファロ'],
  'montebello': ['モンテベロ'],
  'mushroom': ['マッシュルーム'],
  'plain': ['プレーン'],
  'quodo': ['クォード', 'クオード'],
  'pinna': ['ピンナ'],
  // ソファ
  'marenco': ['マレンコ'],
  'fred': ['フレッド'],
  'kastor': ['カストール'],
  'magenta': ['マジェンタ'],
  'milan': ['ミラン'],
  'soffio': ['ソフィオ'],
  'sona': ['ソーナ', 'ソナ'],
  'vasca': ['バスカ'],
  'louis': ['ルイス'],
  'barita': ['バリタ'],
  'quod': ['クオード', 'クォード'],
  // ダイニングチェア
  'arco': ['アルコ'],
  'challenge': ['チャレンジ'],
  'chelsea': ['チェルシー'],
  'flute': ['フルーテ'],
  'harmony': ['ハーモニー'],
  'harmonuy': ['ハーモニー'],  // typo in CSV
  'incisa': ['インチーザ'],
  'joy': ['ジョイ'],
  'rinn': ['リン'],
  'round': ['ラウンド'],
  'svelte': ['スヴェルト'],
  'tango': ['タンゴ'],
  'vera': ['ヴェラ'],
  'nina': ['ニーナ'],
  'membrane': ['メンブレン'],
  'haru': ['ハル'],
  'line': ['ライン'],
  // ダイニングテーブル
  'acca': ['アッカ'],
  'column': ['コラム'],
  'gram': ['グラム'],
  'iena': ['イエナ'],
  'orea': ['オレア'],
  'vivo': ['ヴィーヴォ'],
  'nine': ['ナイン'],
  // テレビボード
  'breath': ['ブレス'],
  'mol': ['モル'],
  'sayl': ['セイル'],
  'aeron': ['アーロン'],
  // ベッド
  'notte': ['ノッテ'],
  'vakna': ['ヴァクナ'],
  'brera': ['ブレラ'],
  // ラウンジチェア
  'giulio': ['ジュリオ'],
  'lucia': ['ルチア'],
  'elsa': ['エルサ'],
  'panetune': ['パネトゥーン'],
  'normandie': ['ノルマンディ'],
  // リビングテーブル
  'arena': ['アレーナ'],
  'castello': ['カステッロ'],
  'clips': ['クリップス'],
  'elips': ['エリプス'],
  'mela': ['メラ'],
  'premier': ['プルミエ'],
  'rivoli': ['リヴォリ'],
  'stelo': ['ステロ'],
  'treppi': ['トレピ'],
  'trocadero': ['トロカデロ'],
  'piloti': ['ピロティ'],
  'bong': ['ボン'],
  'bowy': ['ボーウィ'],
  // 収納
  'grad': ['グラード'],
  // 照明
  'twiggy': ['ツィギー'],
  'snoopy': ['スヌーピー'],
  'toio': ['トイオ'],
  'arco_light': ['アルコ'],  // 照明のARCOもアルコ
  'kogabe': ['コガベ'],
  'kogane': ['コガネ'],
}

const prisma = new PrismaClient()

// ========================================
// テキスト正規化ユーティリティ
// ========================================

/** 半角カタカナ → 全角カタカナ */
function halfToFullKatakana(str: string): string {
  const map: Record<string, string> = {
    'ｦ': 'ヲ', 'ｧ': 'ァ', 'ｨ': 'ィ', 'ｩ': 'ゥ', 'ｪ': 'ェ', 'ｫ': 'ォ',
    'ｬ': 'ャ', 'ｭ': 'ュ', 'ｮ': 'ョ', 'ｯ': 'ッ', 'ｰ': 'ー',
    'ｱ': 'ア', 'ｲ': 'イ', 'ｳ': 'ウ', 'ｴ': 'エ', 'ｵ': 'オ',
    'ｶ': 'カ', 'ｷ': 'キ', 'ｸ': 'ク', 'ｹ': 'ケ', 'ｺ': 'コ',
    'ｻ': 'サ', 'ｼ': 'シ', 'ｽ': 'ス', 'ｾ': 'セ', 'ｿ': 'ソ',
    'ﾀ': 'タ', 'ﾁ': 'チ', 'ﾂ': 'ツ', 'ﾃ': 'テ', 'ﾄ': 'ト',
    'ﾅ': 'ナ', 'ﾆ': 'ニ', 'ﾇ': 'ヌ', 'ﾈ': 'ネ', 'ﾉ': 'ノ',
    'ﾊ': 'ハ', 'ﾋ': 'ヒ', 'ﾌ': 'フ', 'ﾍ': 'ヘ', 'ﾎ': 'ホ',
    'ﾏ': 'マ', 'ﾐ': 'ミ', 'ﾑ': 'ム', 'ﾒ': 'メ', 'ﾓ': 'モ',
    'ﾔ': 'ヤ', 'ﾕ': 'ユ', 'ﾖ': 'ヨ',
    'ﾗ': 'ラ', 'ﾘ': 'リ', 'ﾙ': 'ル', 'ﾚ': 'レ', 'ﾛ': 'ロ',
    'ﾜ': 'ワ', 'ﾝ': 'ン',
    'ﾞ': '゛', 'ﾟ': '゜',
  }

  // 濁点・半濁点の結合
  const dakuten: Record<string, string> = {
    'カ゛': 'ガ', 'キ゛': 'ギ', 'ク゛': 'グ', 'ケ゛': 'ゲ', 'コ゛': 'ゴ',
    'サ゛': 'ザ', 'シ゛': 'ジ', 'ス゛': 'ズ', 'セ゛': 'ゼ', 'ソ゛': 'ゾ',
    'タ゛': 'ダ', 'チ゛': 'ヂ', 'ツ゛': 'ヅ', 'テ゛': 'デ', 'ト゛': 'ド',
    'ハ゛': 'バ', 'ヒ゛': 'ビ', 'フ゛': 'ブ', 'ヘ゛': 'ベ', 'ホ゛': 'ボ',
    'ウ゛': 'ヴ',
    'ハ゜': 'パ', 'ヒ゜': 'ピ', 'フ゜': 'プ', 'ヘ゜': 'ペ', 'ホ゜': 'ポ',
  }

  let result = ''
  for (const ch of str) {
    result += map[ch] || ch
  }

  // 濁点結合
  for (const [from, to] of Object.entries(dakuten)) {
    result = result.replaceAll(from, to)
  }

  return result
}

/** 全角英数 → 半角英数 */
function fullToHalfAlphaNum(str: string): string {
  return str.replace(/[\uff01-\uff5e]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
  )
}

/** テキスト正規化: 半角カタカナ→全角、全角英数→半角、空白正規化、小文字化 */
function normalize(str: string): string {
  let s = str
  s = halfToFullKatakana(s)
  s = fullToHalfAlphaNum(s)
  s = s.replace(/[\s　]+/g, ' ').trim()
  s = s.toLowerCase()
  return s
}

/** カテゴリワード（マッチングのノイズになるもの） */
const CATEGORY_WORDS = new Set([
  // 家具カテゴリ
  'ソファ', 'チェア', 'テーブル', 'スツール', 'ベンチ', 'ベッド',
  'ラウンジチェア', 'アームチェア', 'サイドチェア', 'アームレスチェア',
  'カウンターチェア', 'セミアームチェア', 'スタッキングチェア',
  'ダイニングチェア', 'ダイニングテーブル', 'リビングテーブル',
  'コーヒーテーブル', 'サイドテーブル', 'センターテーブル',
  'コンソールテーブル', 'ローテーブル', 'エクステンションテーブル',
  'テレビボード', 'シアターボード', 'ブックシェルフ',
  'フロア', 'ペンダント', 'ラウンジ',
  'シェルフ', 'キャビネット', 'ボード', 'オットマン',
  // 構成要素
  'アーム', 'アームレス', 'ハイ', 'ロー', 'ラウンド',
  'セット', 'タイプ', 'システム', 'カバー',
  // 一般的な後置語・注記
  'セット販売', '※廃番', '※廃盤', '※製造停止', '在庫',
])

/** カタカナトークンがカテゴリワードかどうかを判定 */
function isCategoryWord(token: string): boolean {
  if (CATEGORY_WORDS.has(token)) return true
  return false
}

/** 正規化文字列からカテゴリワードを除去 */
function removeCategoryWords(normalized: string): string {
  let result = normalized
  // 長いワードから順に除去（部分一致問題を回避）
  const sorted = [...CATEGORY_WORDS].sort((a, b) => b.length - a.length)
  for (const cw of sorted) {
    const lower = cw.toLowerCase()
    // カタカナはそのまま
    result = result.replaceAll(cw, '')
    // ローマ字版も除去（小文字化済み）
    result = result.replaceAll(lower, '')
  }
  return result.replace(/[\s　]+/g, ' ').trim()
}

/** トークン抽出: 正規化後の文字列を意味のあるトークンに分割 */
function extractTokens(normalized: string): string[] {
  const tokens: string[] = []

  // 英数字+ハイフンの塊を取得し、数字と英字の境界でさらに分割
  const alphaMatches = normalized.match(/[a-z0-9][-a-z0-9.]*/g) || []
  for (const m of alphaMatches) {
    tokens.push(m) // 元の塊も残す（"236mister" 全体）
    // 数字→英字、英字→数字の境界で分割
    const subTokens = m.split(/(?<=[0-9])(?=[a-z])|(?<=[a-z])(?=[0-9])/).filter((t) => t.length > 0)
    if (subTokens.length > 1) {
      tokens.push(...subTokens) // "236", "mister" を追加
    }
  }

  // カタカナの塊
  const katakanaMatches = normalized.match(/[ァ-ヴー]+/g) || []
  tokens.push(...katakanaMatches)

  // 漢字の塊
  const kanjiMatches = normalized.match(/[\u4e00-\u9fff]+/g) || []
  tokens.push(...kanjiMatches)

  // 重複除去 + 1文字トークン除外
  return [...new Set(tokens)].filter((t) => t.length > 1)
}

/** ファイル名からベース名を抽出（拡張子と _NNN サフィックス除去） */
function extractBaseName(filename: string): string {
  // 拡張子を除去
  let base = filename.replace(/\.[^.]+$/, '')
  // _NNN サフィックスを除去
  base = base.replace(/_\d{3}$/, '')
  return base
}

/** 先頭の型番を抽出（数字のみ） */
function extractModelNumber(name: string): string | null {
  const match = name.match(/^(\d{2,5})(?=[^0-9]|$)/)
  return match ? match[1] : null
}

// ========================================
// マッチングロジック
// ========================================

interface DbItem {
  id: string
  sku: string
  name: string
  itemType: string
  imageCount: number
  normalized: string
  tokens: string[]
  modelNumber: string | null
}

interface ImageGroup {
  baseName: string
  folder: string
  files: string[]
  normalized: string
  tokens: string[]
  modelNumber: string | null
}

interface MatchCandidate {
  item: DbItem
  score: number
  strategy: string
}

interface MatchResult {
  imageGroup: ImageGroup
  candidates: MatchCandidate[]
  bestMatch: MatchCandidate | null
  status: 'matched' | 'ambiguous' | 'unmatched'
}

function computeMatchScore(img: ImageGroup, item: DbItem): MatchCandidate | null {
  let score = 0
  const strategies: string[] = []

  const imgNorm = img.normalized
  const itemNorm = item.normalized

  // Strategy 1: 正規化後の完全一致（スコア100）
  if (imgNorm === itemNorm) {
    return { item, score: 100, strategy: '完全一致' }
  }

  // Strategy 2: 片方がもう片方を含む（スコア80-90）
  // カテゴリワード除去後、十分な長さ（5文字以上）がある場合のみ
  const imgNormNoCat = removeCategoryWords(imgNorm)
  const itemNormNoCat = removeCategoryWords(itemNorm)

  if (itemNorm.includes(imgNormNoCat) && imgNormNoCat.length >= 5) {
    score = Math.max(score, 85 + Math.min(imgNormNoCat.length / itemNorm.length * 10, 10))
    strategies.push('DB名が画像名を含む')
  }
  if (imgNorm.includes(itemNormNoCat) && itemNormNoCat.length >= 5) {
    score = Math.max(score, 80 + Math.min(itemNormNoCat.length / imgNorm.length * 10, 10))
    strategies.push('画像名がDB名を含む')
  }

  // Strategy 3: 型番一致（スコア60-80）
  if (img.modelNumber && item.modelNumber && img.modelNumber === item.modelNumber) {
    // 型番が一致 + 他のトークンも一致すればさらに高スコア
    const imgOtherTokens = img.tokens.filter((t) => t !== img.modelNumber)
    const itemOtherTokens = item.tokens.filter((t) => t !== item.modelNumber)

    let additionalMatch = 0
    for (const it of imgOtherTokens) {
      for (const dt of itemOtherTokens) {
        if (it === dt || it.includes(dt) || dt.includes(it)) {
          additionalMatch++
          break
        }
      }
    }

    const baseScore = 65
    score = Math.max(score, baseScore + additionalMatch * 10)
    strategies.push(`型番一致(${img.modelNumber})`)
  }

  // Strategy 3.5: 英語→カタカナ辞書マッチ（スコア75-90）
  const imgAlphaForDict = img.tokens.filter((t) => /^[a-z]/.test(t) && t.length >= 3)
  for (const engToken of imgAlphaForDict) {
    const kanaVariants = EN_TO_KANA[engToken]
    if (!kanaVariants) continue

    for (const kana of kanaVariants) {
      const kanaLower = kana.toLowerCase()
      if (itemNorm.includes(kanaLower) || itemNorm.includes(kana)) {
        // 辞書マッチ成功。追加で型番も一致すればボーナス
        let dictScore = 80
        if (img.modelNumber && item.modelNumber && img.modelNumber === item.modelNumber) {
          dictScore = 90
        }
        if (dictScore > score) {
          score = dictScore
          strategies.push(`辞書マッチ(${engToken}→${kana})`)
        }
      }
    }
  }

  // 英語ストップワード（家具一般用語の英語）
  const ALPHA_STOP = new Set([
    'sofa', 'chair', 'table', 'stool', 'bench', 'bed', 'side', 'arm',
    'high', 'low', 'set', 'type', 'floor', 'light', 'lamp',
  ])

  // Strategy 4: 英語トークン一致（スコア40-70）— ストップワード除外
  const imgAlphaTokens = img.tokens.filter(
    (t) => /^[a-z]/.test(t) && t.length >= 3 && !ALPHA_STOP.has(t)
  )
  const itemAlphaTokens = item.tokens.filter(
    (t) => /^[a-z]/.test(t) && t.length >= 3 && !ALPHA_STOP.has(t)
  )

  if (imgAlphaTokens.length > 0 && itemAlphaTokens.length > 0) {
    let matchCount = 0
    for (const it of imgAlphaTokens) {
      for (const dt of itemAlphaTokens) {
        if (it === dt) {
          matchCount++
          break
        }
      }
    }
    if (matchCount > 0) {
      const matchRatio = matchCount / Math.max(imgAlphaTokens.length, 1)
      const tokenScore = 40 + matchRatio * 30
      if (tokenScore > score) {
        score = tokenScore
        strategies.push(`英語トークン一致(${matchCount}/${imgAlphaTokens.length})`)
      }
    }
  }

  // Strategy 5: カタカナトークン一致（スコア40-70）— カテゴリワード除外
  const imgKanaTokens = img.tokens.filter(
    (t) => /^[ァ-ヴ]/.test(t) && t.length >= 2 && !isCategoryWord(t)
  )
  const itemKanaTokens = item.tokens.filter(
    (t) => /^[ァ-ヴ]/.test(t) && t.length >= 2 && !isCategoryWord(t)
  )

  if (imgKanaTokens.length > 0 && itemKanaTokens.length > 0) {
    let matchCount = 0
    for (const it of imgKanaTokens) {
      for (const dt of itemKanaTokens) {
        if (it === dt || it.includes(dt) || dt.includes(it)) {
          matchCount++
          break
        }
      }
    }
    if (matchCount > 0) {
      const matchRatio = matchCount / Math.max(imgKanaTokens.length, 1)
      const tokenScore = 40 + matchRatio * 30
      if (tokenScore > score) {
        score = tokenScore
        strategies.push(`カタカナ一致(${matchCount}/${imgKanaTokens.length})`)
      }
    }
  }

  if (score < 30) return null

  return { item, score, strategy: strategies.join(' + ') }
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('========================================')
  console.log('商品画像マッチング ドライラン')
  console.log('========================================\n')

  // CSV読み込み
  const csvPath = path.join(process.cwd(), '商品画像', 'ファイル一覧.csv')
  if (!fs.existsSync(csvPath)) {
    console.error('エラー: ファイル一覧.csv が見つかりません')
    process.exit(1)
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const csvLines = csvContent.split('\n').filter((l) => l.trim())
  const csvHeader = csvLines[0]
  const csvRows = csvLines.slice(1).map((line) => {
    const [folder, filename] = line.split(',').map((s) => s.trim())
    return { folder, filename }
  })

  console.log(`CSV: ${csvRows.length}件のエントリ\n`)

  // 画像をグループ化（ベース名でまとめる）
  const groupMap = new Map<string, ImageGroup>()
  for (const row of csvRows) {
    const baseName = extractBaseName(row.filename)
    const key = `${row.folder}/${baseName}`

    if (!groupMap.has(key)) {
      const norm = normalize(baseName)
      groupMap.set(key, {
        baseName,
        folder: row.folder,
        files: [],
        normalized: norm,
        tokens: extractTokens(norm),
        modelNumber: extractModelNumber(norm),
      })
    }
    groupMap.get(key)!.files.push(row.filename)
  }

  const imageGroups = Array.from(groupMap.values())
  console.log(`画像グループ: ${imageGroups.length}件（重複除去後）\n`)

  // DB からアイテム取得
  const dbItems = await prisma.item.findMany({
    select: {
      id: true,
      sku: true,
      name: true,
      itemType: true,
      _count: { select: { images: true } },
    },
  })

  const items: DbItem[] = dbItems.map((item) => {
    const norm = normalize(item.name)
    return {
      id: item.id,
      sku: item.sku,
      name: item.name,
      itemType: item.itemType,
      imageCount: item._count.images,
      normalized: norm,
      tokens: extractTokens(norm),
      modelNumber: extractModelNumber(norm),
    }
  })

  console.log(`DBアイテム: ${items.length}件\n`)

  // マッチング実行
  const results: MatchResult[] = []

  for (const img of imageGroups) {
    const candidates: MatchCandidate[] = []

    for (const item of items) {
      const match = computeMatchScore(img, item)
      if (match) {
        candidates.push(match)
      }
    }

    // スコア降順でソート
    candidates.sort((a, b) => b.score - a.score)

    // 上位5件に絞る
    const topCandidates = candidates.slice(0, 5)

    let status: MatchResult['status'] = 'unmatched'
    let bestMatch: MatchCandidate | null = null

    if (topCandidates.length > 0) {
      bestMatch = topCandidates[0]

      if (bestMatch.score >= 65) {
        // 2位との差が十分あれば確定
        if (topCandidates.length < 2 || bestMatch.score - topCandidates[1].score >= 10) {
          status = 'matched'
        } else {
          status = 'ambiguous'
        }
      } else if (bestMatch.score >= 40) {
        status = 'ambiguous'
      }
    }

    results.push({
      imageGroup: img,
      candidates: topCandidates,
      bestMatch,
      status,
    })
  }

  // 結果サマリー
  const matched = results.filter((r) => r.status === 'matched')
  const ambiguous = results.filter((r) => r.status === 'ambiguous')
  const unmatched = results.filter((r) => r.status === 'unmatched')

  console.log('========================================')
  console.log('マッチング結果サマリー')
  console.log('========================================')
  console.log(`確定マッチ: ${matched.length}件`)
  console.log(`曖昧（要確認）: ${ambiguous.length}件`)
  console.log(`未マッチ: ${unmatched.length}件`)
  console.log('')

  // 既存画像ありでスキップ対象
  const withExistingImages = matched.filter(
    (r) => r.bestMatch && r.bestMatch.item.imageCount > 0
  )
  if (withExistingImages.length > 0) {
    console.log(`※ うち既存画像あり（スキップ対象）: ${withExistingImages.length}件`)
  }
  console.log('')

  // 詳細出力
  console.log('========================================')
  console.log('確定マッチ詳細')
  console.log('========================================')
  for (const r of matched) {
    const m = r.bestMatch!
    const skip = m.item.imageCount > 0 ? ' [既存画像あり→スキップ]' : ''
    console.log(
      `[${m.score.toFixed(0)}] "${r.imageGroup.baseName}" → ${m.item.sku} "${m.item.name}" (${m.strategy})${skip}`
    )
  }

  if (ambiguous.length > 0) {
    console.log('')
    console.log('========================================')
    console.log('曖昧マッチ詳細（要確認）')
    console.log('========================================')
    for (const r of ambiguous) {
      console.log(`\n"${r.imageGroup.baseName}" (${r.imageGroup.folder}):`)
      for (const c of r.candidates.slice(0, 3)) {
        const skip = c.item.imageCount > 0 ? ' [既存画像あり]' : ''
        console.log(
          `  [${c.score.toFixed(0)}] ${c.item.sku} "${c.item.name}" (${c.strategy})${skip}`
        )
      }
    }
  }

  if (unmatched.length > 0) {
    console.log('')
    console.log('========================================')
    console.log('未マッチ（DB に該当なし）')
    console.log('========================================')
    for (const r of unmatched) {
      console.log(`  "${r.imageGroup.baseName}" (${r.imageGroup.folder})`)
    }
  }

  // CSV レポート出力
  const reportPath = path.join(process.cwd(), '商品画像', 'マッチング結果.csv')
  const BOM = '\ufeff'
  const csvOutputLines: string[] = [
    'ステータス,フォルダ,画像ベース名,画像ファイル数,マッチSKU,マッチ商品名,マッチタイプ,スコア,戦略,既存画像数,候補2_SKU,候補2_名前,候補2_スコア,候補3_SKU,候補3_名前,候補3_スコア',
  ]

  for (const r of results) {
    const img = r.imageGroup
    const best = r.bestMatch
    const c2 = r.candidates[1]
    const c3 = r.candidates[2]

    const row = [
      r.status === 'matched' ? '確定' : r.status === 'ambiguous' ? '要確認' : '未マッチ',
      img.folder,
      `"${img.baseName}"`,
      img.files.length,
      best ? best.item.sku : '',
      best ? `"${best.item.name}"` : '',
      best ? best.item.itemType : '',
      best ? best.score.toFixed(0) : '',
      best ? `"${best.strategy}"` : '',
      best ? best.item.imageCount : '',
      c2 ? c2.item.sku : '',
      c2 ? `"${c2.item.name}"` : '',
      c2 ? c2.score.toFixed(0) : '',
      c3 ? c3.item.sku : '',
      c3 ? `"${c3.item.name}"` : '',
      c3 ? c3.score.toFixed(0) : '',
    ]
    csvOutputLines.push(row.join(','))
  }

  fs.writeFileSync(reportPath, BOM + csvOutputLines.join('\n'), 'utf-8')
  console.log(`\nレポートを出力しました: ${reportPath}`)

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('エラー:', error)
  process.exit(1)
})
