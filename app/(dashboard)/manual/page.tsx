import fs from 'fs'
import path from 'path'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function ManualPage() {
  const filePath = path.join(process.cwd(), 'docs', 'USER_MANUAL.md')
  let content = fs.readFileSync(filePath, 'utf-8')

  // アクセス情報セクションを除外（パスワード等の機密情報）
  content = content.replace(
    /## アクセス情報[\s\S]*?(?=\n---\n)/,
    ''
  )

  // 画像パスを public/docs/screenshots/ に変換
  content = content.replace(
    /\(screenshots\//g,
    '(/docs/screenshots/'
  )

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <article className="prose prose-slate max-w-none prose-headings:scroll-mt-20 prose-img:rounded-lg prose-img:shadow-md prose-img:border prose-table:text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </article>
      </div>
    </div>
  )
}
