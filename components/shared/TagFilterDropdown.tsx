import { memo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Filter } from 'lucide-react'

interface TagFilterDropdownProps {
  tags: { id: string; name: string }[]
  selectedTagIds: string[]
  onTagsChange: (tagIds: string[]) => void
}

/**
 * タグフィルタードロップダウンコンポーネント（複数選択・検索機能付き）
 * React.memoで最適化済み
 */
function TagFilterDropdownComponent({
  tags,
  selectedTagIds,
  onTagsChange
}: TagFilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const [filterSearch, setFilterSearch] = useState('')

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(filterSearch.toLowerCase())
  )

  const toggleTag = (tagId: string) => {
    const newTagIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId]
    onTagsChange(newTagIds)
  }

  const clearTags = () => {
    onTagsChange([])
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) setFilterSearch('')
    }}>
      <PopoverTrigger asChild>
        <button
          className={`p-0.5 rounded hover:bg-gray-200 ${selectedTagIds.length > 0 ? 'text-blue-600' : 'text-gray-400'}`}
          title="タグでフィルター"
        >
          <Filter className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="space-y-2">
          <Input
            placeholder="タグを検索..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="h-7 text-xs"
          />
          <div className="space-y-1 max-h-48 overflow-y-auto">
            <button
              onClick={clearTags}
              className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 ${selectedTagIds.length === 0 ? 'bg-blue-50 text-blue-600' : ''}`}
            >
              すべて
            </button>
            {filteredTags.map((tag) => (
              <label
                key={tag.id}
                className="flex items-center gap-2 px-2 py-1 text-xs rounded hover:bg-gray-100 cursor-pointer"
              >
                <Checkbox
                  checked={selectedTagIds.includes(tag.id)}
                  onCheckedChange={() => toggleTag(tag.id)}
                />
                {tag.name}
              </label>
            ))}
            {filteredTags.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">該当なし</p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export const TagFilterDropdown = memo(TagFilterDropdownComponent)
