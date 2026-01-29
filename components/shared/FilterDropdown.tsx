import { memo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Filter, X, Search } from 'lucide-react'

interface FilterDropdownProps {
  field: string
  options: { id: string; name: string }[]
  currentValue: string
  label: string
  onValueChange: (field: string, value: string) => void
}

/**
 * フィルタードロップダウンコンポーネント（検索機能付き）
 * React.memoで最適化済み
 */
function FilterDropdownComponent({
  field,
  options,
  currentValue,
  label,
  onValueChange
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const [filterSearch, setFilterSearch] = useState('')

  const filteredOptions = options.filter((option) =>
    option.name.toLowerCase().includes(filterSearch.toLowerCase())
  )

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) {
        setFilterSearch('')
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={currentValue ? 'bg-blue-50 border-blue-300' : ''}
        >
          <Filter className="h-3 w-3 mr-1" />
          {label}
          {currentValue && (
            <button
              onClick={(event) => {
                event.stopPropagation()
                onValueChange(field, '')
              }}
              className="ml-1 hover:bg-red-100 rounded-full p-0.5"
            >
              <X className="h-3 w-3 text-red-600" />
            </button>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              type="text"
              placeholder="検索..."
              value={filterSearch}
              onChange={(event) => setFilterSearch(event.target.value)}
              className="pl-7 h-8 text-xs"
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  onValueChange(field, option.id)
                  setOpen(false)
                }}
                className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 ${currentValue === option.id ? 'bg-blue-50 text-blue-600' : ''}`}
              >
                {option.name}
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">該当なし</p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export const FilterDropdown = memo(FilterDropdownComponent)
