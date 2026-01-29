import { memo } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

interface SortableHeaderProps<T extends string> {
  field: T
  sortBy: T | ''
  sortOrder: 'asc' | 'desc' | ''
  onSort: (field: T) => void
  children: React.ReactNode
  className?: string
}

/**
 * ソート可能なテーブルヘッダーコンポーネント
 * React.memoで最適化済み
 */
function SortableHeaderComponent<T extends string>({
  field,
  sortBy,
  sortOrder,
  onSort,
  children,
  className = ''
}: SortableHeaderProps<T>) {
  const getSortIcon = () => {
    if (sortBy !== field) {
      return <ArrowUpDown className="h-3 w-3" />
    }
    if (sortOrder === 'asc') {
      return <ArrowUp className="h-3 w-3" />
    }
    return <ArrowDown className="h-3 w-3" />
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span>{children}</span>
      <button
        onClick={() => onSort(field)}
        className={`p-0.5 rounded hover:bg-gray-200 ${sortBy === field ? 'text-blue-600' : 'text-gray-400'}`}
        title="並び替え"
      >
        {getSortIcon()}
      </button>
    </div>
  )
}

export const SortableHeader = memo(SortableHeaderComponent) as typeof SortableHeaderComponent
