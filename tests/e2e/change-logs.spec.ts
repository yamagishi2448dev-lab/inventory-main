import { test, expect } from '@playwright/test'
import { acceptAllDialogs, login } from './helpers/auth'

type ChangeLogField = {
  field: string
  label: string
  from?: string
  to?: string
}

type ChangeLog = {
  id: string
  entityType: string
  entityId: string
  entityName: string
  entitySku: string
  action: 'create' | 'update' | 'delete'
  changes: { fields: ChangeLogField[] } | null
  userId: string
  userName: string
  itemType?: string | null
  createdAt: string
}

async function fetchChangeLogs(page: import('@playwright/test').Page, limit = 100): Promise<ChangeLog[]> {
  const res = await page.request.get(`/api/change-logs?limit=${limit}`)
  expect(res.ok()).toBeTruthy()
  const data = await res.json()
  const logs = (data as { changeLogs?: ChangeLog[] }).changeLogs ?? []
  return logs
}

function logsForEntity(changeLogs: ChangeLog[], entityId: string): ChangeLog[] {
  return changeLogs.filter((log) => log.entityId === entityId)
}

test.describe.serial('Change Logs', () => {
  test('should record create/update/delete operations', async ({ page }) => {
    acceptAllDialogs(page)
    await login(page)

    const runId = Date.now()
    const nameA = `E2E-CHANGELOG-A-${runId}`
    const nameA2 = `E2E-CHANGELOG-A-${runId}-UPDATED`
    const nameB = `E2E-CHANGELOG-B-${runId}`

    // Create item A
    const createARes = await page.request.post('/api/items', {
      data: { itemType: 'PRODUCT', name: nameA, costPrice: '1000' },
    })
    expect(createARes.ok()).toBeTruthy()
    const createAJson = await createARes.json()
    const itemA = (createAJson as { item?: { id?: string; sku?: string } }).item
    expect(itemA?.id).toBeTruthy()
    const itemAId = itemA!.id as string

    // Assert create log exists for A
    let changeLogs = await fetchChangeLogs(page)
    let logsA = logsForEntity(changeLogs, itemAId)
    expect(logsA.filter((log) => log.action === 'create')).toHaveLength(1)

    // Update tracked field (name) -> should create update log with changes
    const updateNameRes = await page.request.put(`/api/items/${itemAId}`, {
      data: { name: nameA2 },
    })
    expect(updateNameRes.ok()).toBeTruthy()

    changeLogs = await fetchChangeLogs(page)
    logsA = logsForEntity(changeLogs, itemAId)
    expect(logsA.filter((log) => log.action === 'update')).toHaveLength(1)
    const updateWithNameChange = logsA.find(
      (log) =>
        log.action === 'update'
        && !!log.changes?.fields?.some((field) => field.field === 'name')
    )
    expect(updateWithNameChange).toBeTruthy()
    const nameField = updateWithNameChange!.changes!.fields.find((field) => field.field === 'name')
    expect(nameField).toBeTruthy()
    expect(nameField!.label).toBe('商品名')
    expect(nameField!.from).toBe(nameA)
    expect(nameField!.to).toBe(nameA2)

    // Update untracked field (designer) -> should NOT create change log
    const logsALenBeforeUntracked = logsA.length
    const updateDesignerRes = await page.request.put(`/api/items/${itemAId}`, {
      data: { designer: `E2E-DESIGNER-${runId}` },
    })
    expect(updateDesignerRes.ok()).toBeTruthy()

    changeLogs = await fetchChangeLogs(page)
    logsA = logsForEntity(changeLogs, itemAId)
    expect(logsA.length).toBe(logsALenBeforeUntracked)

    // Update materials endpoint -> should NOT create change log
    const logsALenBeforeMaterials = logsA.length
    const updateMaterialsRes = await page.request.put(`/api/items/${itemAId}/materials`, {
      data: { materials: [] },
    })
    expect(updateMaterialsRes.ok()).toBeTruthy()

    changeLogs = await fetchChangeLogs(page)
    logsA = logsForEntity(changeLogs, itemAId)
    expect(logsA.length).toBe(logsALenBeforeMaterials)

    // Bulk edit -> should create update log (without changes detail)
    const bulkEditRes = await page.request.post('/api/items/bulk/edit', {
      data: { ids: [itemAId], updates: {} },
    })
    expect(bulkEditRes.ok()).toBeTruthy()

    changeLogs = await fetchChangeLogs(page)
    logsA = logsForEntity(changeLogs, itemAId)
    expect(logsA.filter((log) => log.action === 'update')).toHaveLength(2)
    expect(logsA.some((log) => log.action === 'update' && log.changes === null)).toBeTruthy()

    // Create item B (for bulk delete)
    const createBRes = await page.request.post('/api/items', {
      data: { itemType: 'PRODUCT', name: nameB, costPrice: '1000' },
    })
    expect(createBRes.ok()).toBeTruthy()
    const createBJson = await createBRes.json()
    const itemB = (createBJson as { item?: { id?: string } }).item
    expect(itemB?.id).toBeTruthy()
    const itemBId = itemB!.id as string

    // Bulk delete B -> should create delete log
    const bulkDeleteRes = await page.request.post('/api/items/bulk/delete', {
      data: { ids: [itemBId] },
    })
    expect(bulkDeleteRes.ok()).toBeTruthy()

    changeLogs = await fetchChangeLogs(page)
    const logsB = logsForEntity(changeLogs, itemBId)
    expect(logsB.filter((log) => log.action === 'create')).toHaveLength(1)
    expect(logsB.filter((log) => log.action === 'delete')).toHaveLength(1)

    // Delete A (single) -> should create delete log
    const deleteARes = await page.request.delete(`/api/items/${itemAId}`)
    expect(deleteARes.ok()).toBeTruthy()

    changeLogs = await fetchChangeLogs(page)
    logsA = logsForEntity(changeLogs, itemAId)
    expect(logsA.filter((log) => log.action === 'delete')).toHaveLength(1)

    // Smoke check UI: recent changes should include our latest name
    await page.goto('/dashboard')
    await expect(page.getByText('変更履歴')).toBeVisible()
    await expect(page.getByText(nameA2).first()).toBeVisible()
  })
})
