import { ItemEditPageCore } from '@/app/(dashboard)/items/[id]/edit/page'

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ItemEditPageCore
      params={params}
      listPath='/products'
      forcedItemType='PRODUCT'
    />
  )
}
