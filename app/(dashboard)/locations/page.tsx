'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useMasterDataList } from '@/lib/hooks/useMasterDataList'
import type { NamedEntityWithCount } from '@/lib/types'

export default function LocationsPage() {
    const {
        items: locations,
        loading,
        error,
        refresh,
        createItem,
        updateItem,
        deleteItem,
    } = useMasterDataList<NamedEntityWithCount>({
        endpoint: '/api/locations',
        responseKey: 'locations',
        entityLabel: '場所',
    })
    const [newName, setNewName] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [saving, setSaving] = useState(false)

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newName.trim()) return
        setSaving(true)
        try {
            await createItem(newName.trim())
            setNewName('')
            await refresh()
        } catch (err) {
            alert(err instanceof Error ? err.message : 'エラーが発生しました')
        } finally {
            setSaving(false)
        }
    }

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return
        setSaving(true)
        try {
            await updateItem(id, editName.trim())
            setEditingId(null)
            await refresh()
        } catch (err) {
            alert(err instanceof Error ? err.message : 'エラーが発生しました')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`「${name}」を削除してもよろしいですか？`)) return
        try {
            await deleteItem(id)
            await refresh()
        } catch (err) {
            alert(err instanceof Error ? err.message : 'エラーが発生しました')
        }
    }

    if (error) {
        return (
            <div className="space-y-6">
                {/* Title removed */}
                <div className="text-red-600">{error}</div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Title removed */}

            <Card>
                <CardHeader>
                    <CardTitle>新規場所</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreate} className="flex gap-4">
                        <div className="flex-1">
                            <Label htmlFor="newName" className="sr-only">場所名</Label>
                            <Input
                                id="newName"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="場所名を入力"
                                maxLength={100}
                            />
                        </div>
                        <Button type="submit" disabled={saving || !newName.trim()}>
                            {saving ? '作成中...' : '作成'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {loading ? (
                <div className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ) : (
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>場所名</TableHead>
                                <TableHead className="text-right">商品数</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {locations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-gray-500">
                                        場所が登録されていません
                                    </TableCell>
                                </TableRow>
                            ) : (
                                locations.map((location) => (
                                    <TableRow key={location.id}>
                                        <TableCell>
                                            {editingId === location.id ? (
                                                <Input
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    maxLength={100}
                                                />
                                            ) : (
                                                location.name
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {location._count?.products || 0}
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            {editingId === location.id ? (
                                                <>
                                                    <Button size="sm" onClick={() => handleUpdate(location.id)} disabled={saving}>
                                                        保存
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                                                        キャンセル
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setEditingId(location.id)
                                                            setEditName(location.name)
                                                        }}
                                                    >
                                                        編集
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleDelete(location.id, location.name)}
                                                    >
                                                        削除
                                                    </Button>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}
