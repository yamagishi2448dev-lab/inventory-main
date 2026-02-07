import { ItemCreatePageCore } from '@/app/(dashboard)/items/new/page'

export default function NewProductPage() {
  return (
    <ItemCreatePageCore
      forcedItemType='PRODUCT'
      listPath='/products'
      hideTypeTabs
    />
  )
}
