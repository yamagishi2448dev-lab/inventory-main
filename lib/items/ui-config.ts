import type { ItemType } from '@/lib/types'
import {
  CONSIGNMENT_PRINT_SELECTION_STORAGE_KEY,
  CONSIGNMENT_SELECTION_STORAGE_KEY,
  ITEM_SELECTION_STORAGE_KEY,
  PRINT_SELECTION_STORAGE_KEY,
  PRODUCT_SELECTION_STORAGE_KEY,
} from '@/lib/constants'

export type ItemUiMode = 'items' | 'products' | 'consignments'

export interface ItemUiConfig {
  mode: ItemUiMode
  pageLabel: string
  itemLabel: string
  itemNameLabel: string
  fixedItemType?: ItemType
  allowTypeTabs: boolean
  listPath: string
  detailPathPrefix: string
  newPath: string
  printPath: string
  importEndpoint: string
  exportEndpoint: string
  importTemplateEndpoint: string
  listEndpoint: string
  idsEndpoint: string
  bulkEditEndpoint: string
  bulkDeleteEndpoint: string
  bulkDeleteMethod: 'POST' | 'DELETE'
  listResponseKey: 'items' | 'products' | 'consignments'
  idsResponseKey: 'ids' | 'productIds' | 'consignmentIds'
  selectionStorageKey: string
  printSelectionStorageKey: string
  bulkRequestIdsKey: 'ids' | 'productIds' | 'consignmentIds'
  printRequestIdsKey: 'itemIds' | 'productIds' | 'consignmentIds'
}

const BASE_CONFIG: Record<ItemUiMode, ItemUiConfig> = {
  items: {
    mode: 'items',
    pageLabel: 'アイテム',
    itemLabel: 'アイテム',
    itemNameLabel: 'アイテム名',
    allowTypeTabs: true,
    listPath: '/items',
    detailPathPrefix: '/items',
    newPath: '/items/new',
    printPath: '/items/print',
    importEndpoint: '/api/items/import',
    exportEndpoint: '/api/items/export',
    importTemplateEndpoint: '/api/items/import/template',
    listEndpoint: '/api/items',
    idsEndpoint: '/api/items/ids',
    bulkEditEndpoint: '/api/items/bulk/edit',
    bulkDeleteEndpoint: '/api/items/bulk/delete',
    bulkDeleteMethod: 'POST',
    listResponseKey: 'items',
    idsResponseKey: 'ids',
    selectionStorageKey: ITEM_SELECTION_STORAGE_KEY,
    printSelectionStorageKey: PRINT_SELECTION_STORAGE_KEY,
    bulkRequestIdsKey: 'ids',
    printRequestIdsKey: 'itemIds',
  },
  products: {
    mode: 'products',
    pageLabel: '商品',
    itemLabel: '商品',
    itemNameLabel: '商品名',
    fixedItemType: 'PRODUCT',
    allowTypeTabs: false,
    listPath: '/products',
    detailPathPrefix: '/products',
    newPath: '/products/new',
    printPath: '/products/print',
    importEndpoint: '/api/products/import',
    exportEndpoint: '/api/products/export',
    importTemplateEndpoint: '/api/products/import/template',
    listEndpoint: '/api/products',
    idsEndpoint: '/api/products/ids',
    bulkEditEndpoint: '/api/products/bulk/edit',
    bulkDeleteEndpoint: '/api/products/bulk/delete',
    bulkDeleteMethod: 'POST',
    listResponseKey: 'products',
    idsResponseKey: 'productIds',
    selectionStorageKey: PRODUCT_SELECTION_STORAGE_KEY,
    printSelectionStorageKey: PRINT_SELECTION_STORAGE_KEY,
    bulkRequestIdsKey: 'productIds',
    printRequestIdsKey: 'productIds',
  },
  consignments: {
    mode: 'consignments',
    pageLabel: '委託品',
    itemLabel: '委託品',
    itemNameLabel: '商品名',
    fixedItemType: 'CONSIGNMENT',
    allowTypeTabs: false,
    listPath: '/consignments',
    detailPathPrefix: '/consignments',
    newPath: '/consignments/new',
    printPath: '/consignments/print',
    importEndpoint: '/api/consignments/import',
    exportEndpoint: '/api/consignments/export',
    importTemplateEndpoint: '/api/consignments/import/template',
    listEndpoint: '/api/consignments',
    idsEndpoint: '/api/consignments/ids',
    bulkEditEndpoint: '/api/consignments/bulk/edit',
    bulkDeleteEndpoint: '/api/consignments/bulk',
    bulkDeleteMethod: 'DELETE',
    listResponseKey: 'consignments',
    idsResponseKey: 'consignmentIds',
    selectionStorageKey: CONSIGNMENT_SELECTION_STORAGE_KEY,
    printSelectionStorageKey: CONSIGNMENT_PRINT_SELECTION_STORAGE_KEY,
    bulkRequestIdsKey: 'consignmentIds',
    printRequestIdsKey: 'consignmentIds',
  },
}

export function getItemUiConfig(mode: ItemUiMode): ItemUiConfig {
  return BASE_CONFIG[mode]
}
