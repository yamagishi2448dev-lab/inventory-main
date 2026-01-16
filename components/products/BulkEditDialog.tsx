/**
 * 一括編集ダイアログ
 * 選択した商品を一括で編集するためのフォーム
 */

'use client'

import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Category, Manufacturer, Location, QuantityMode, TagV2 } from '@/lib/types'

interface BulkEditDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    selectedCount: number
    categories: Category[]
    manufacturers: Manufacturer[]
    locations: Location[]
    tags: TagV2[]  // v2.2追加
    onSubmit: (updates: {
        locationId?: string
        manufacturerId?: string
        categoryId?: string
        tagIds?: string[]  // v2.2追加
        quantity?: {
            mode: QuantityMode
            value: number
        }
    }) => void
    isLoading?: boolean
}

// 「変更しない」発生時に使用する特別な値
const NO_CHANGE_VALUE = '__none__'

export function BulkEditDialog({
    open,
    onOpenChange,
    selectedCount,
    categories,
    manufacturers,
    locations,
    tags,  // v2.2追加
    onSubmit,
    isLoading = false,
}: BulkEditDialogProps) {
    const [locationId, setLocationId] = useState<string>(NO_CHANGE_VALUE)
    const [manufacturerId, setManufacturerId] = useState<string>(NO_CHANGE_VALUE)
    const [categoryId, setCategoryId] = useState<string>(NO_CHANGE_VALUE)
    const [quantityMode, setQuantityMode] = useState<QuantityMode>('set')
    const [quantityValue, setQuantityValue] = useState<string>('')
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])  // v2.2追加
    const [tagChangeMode, setTagChangeMode] = useState<boolean>(false)  // v2.2追加: タグ変更モード

    const handleSubmit = () => {
        const updates: {
            locationId?: string
            manufacturerId?: string
            categoryId?: string
            tagIds?: string[]  // v2.2追加
            quantity?: {
                mode: QuantityMode
                value: number
            }
        } = {}

        if (locationId && locationId !== NO_CHANGE_VALUE) {
            updates.locationId = locationId
        }
        if (manufacturerId && manufacturerId !== NO_CHANGE_VALUE) {
            updates.manufacturerId = manufacturerId
        }
        if (categoryId && categoryId !== NO_CHANGE_VALUE) {
            updates.categoryId = categoryId
        }
        // v2.2追加: タグ変更モードが有効な場合のみtagIdsを含める
        if (tagChangeMode) {
            updates.tagIds = selectedTagIds
        }
        if (quantityValue) {
            const value = parseInt(quantityValue, 10)
            if (!isNaN(value)) {
                updates.quantity = {
                    mode: quantityMode,
                    value,
                }
            }
        }

        // 少なくとも1つのフィールドが選択されているかチェック
        if (Object.keys(updates).length === 0) {
            alert('少なくとも1つのフィールドを選択してください')
            return
        }

        onSubmit(updates)
    }

    const handleClose = () => {
        setLocationId(NO_CHANGE_VALUE)
        setManufacturerId(NO_CHANGE_VALUE)
        setCategoryId(NO_CHANGE_VALUE)
        setQuantityMode('set')
        setQuantityValue('')
        setSelectedTagIds([])  // v2.2追加
        setTagChangeMode(false)  // v2.2追加
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>商品を一括編集</DialogTitle>
                    <DialogDescription>
                        選択した{selectedCount}件の商品を編集します。変更したいフィールドのみ選択してください。
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* 場所 */}
                    <div className="grid gap-2">
                        <Label htmlFor="location">場所</Label>
                        <Select value={locationId} onValueChange={setLocationId}>
                            <SelectTrigger id="location">
                                <SelectValue placeholder="変更しない" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NO_CHANGE_VALUE}>変更しない</SelectItem>
                                {locations.map((location) => (
                                    <SelectItem key={location.id} value={location.id}>
                                        {location.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* メーカー */}
                    <div className="grid gap-2">
                        <Label htmlFor="manufacturer">メーカー</Label>
                        <Select
                            value={manufacturerId}
                            onValueChange={setManufacturerId}
                        >
                            <SelectTrigger id="manufacturer">
                                <SelectValue placeholder="変更しない" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NO_CHANGE_VALUE}>変更しない</SelectItem>
                                {manufacturers.map((manufacturer) => (
                                    <SelectItem
                                        key={manufacturer.id}
                                        value={manufacturer.id}
                                    >
                                        {manufacturer.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 品目 */}
                    <div className="grid gap-2">
                        <Label htmlFor="category">品目</Label>
                        <Select value={categoryId} onValueChange={setCategoryId}>
                            <SelectTrigger id="category">
                                <SelectValue placeholder="変更しない" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NO_CHANGE_VALUE}>変更しない</SelectItem>
                                {categories.map((category) => (
                                    <SelectItem key={category.id} value={category.id}>
                                        {category.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 個数 */}
                    <div className="grid gap-2">
                        <Label>個数</Label>
                        <div className="flex gap-2">
                            <Select value={quantityMode} onValueChange={(value) => setQuantityMode(value as QuantityMode)}>
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="set">設定</SelectItem>
                                    <SelectItem value="increment">増減</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input
                                type="number"
                                placeholder={quantityMode === 'set' ? '個数を入力' : '+/- を入力'}
                                value={quantityValue}
                                onChange={(e) => setQuantityValue(e.target.value)}
                                className="flex-1"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {quantityMode === 'set'
                                ? '全ての商品を同じ個数に設定します'
                                : '現在の個数に加算/減算します（負の数で減算）'}
                        </p>
                    </div>

                    {/* タグ v2.2追加 */}
                    <div className="grid gap-2">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="tag-change-mode"
                                checked={tagChangeMode}
                                onCheckedChange={(checked) => {
                                    setTagChangeMode(checked as boolean)
                                    if (!checked) setSelectedTagIds([])
                                }}
                            />
                            <Label htmlFor="tag-change-mode">タグを変更</Label>
                        </div>
                        {tagChangeMode && (
                            <div className="border rounded-md p-3 max-h-32 overflow-y-auto">
                                {tags.length === 0 ? (
                                    <p className="text-sm text-gray-400">タグがありません</p>
                                ) : (
                                    <div className="flex flex-wrap gap-3">
                                        {tags.map((tag) => (
                                            <label key={tag.id} className="flex items-center gap-2 cursor-pointer">
                                                <Checkbox
                                                    checked={selectedTagIds.includes(tag.id)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setSelectedTagIds([...selectedTagIds, tag.id])
                                                        } else {
                                                            setSelectedTagIds(selectedTagIds.filter((id) => id !== tag.id))
                                                        }
                                                    }}
                                                />
                                                <span className="text-sm">{tag.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {tagChangeMode && (
                            <p className="text-xs text-muted-foreground">
                                選択したタグが全ての商品に設定されます（既存のタグは上書きされます）
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={isLoading}
                    >
                        キャンセル
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isLoading}
                    >
                        {isLoading ? '保存中...' : '保存'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
