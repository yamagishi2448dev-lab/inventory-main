/**
 * 一括操作ツールバー（委託品用）
 * 委託品が選択されている場合に表示される
 */

'use client'

import { Button } from '@/components/ui/button'
import { Trash2, Edit } from 'lucide-react'

interface BulkActionsBarProps {
    selectedCount: number
    onClearSelection: () => void
    onBulkDelete: () => void
    onBulkEdit: () => void
}

export function BulkActionsBar({
    selectedCount,
    onClearSelection,
    onBulkDelete,
    onBulkEdit,
}: BulkActionsBarProps) {
    if (selectedCount === 0) {
        return null
    }

    return (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex items-center gap-2">
                <span className="font-semibold text-primary">
                    {selectedCount}件選択中
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearSelection}
                    className="h-8 text-muted-foreground hover:text-foreground"
                >
                    選択解除
                </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onBulkEdit}
                    className="h-8"
                >
                    <Edit className="w-4 h-4 mr-2" />
                    一括編集
                </Button>
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={onBulkDelete}
                    className="h-8"
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    一括削除
                </Button>
            </div>
        </div>
    )
}
