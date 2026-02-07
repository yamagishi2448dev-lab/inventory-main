import { ItemDetailPageCore } from '@/app/(dashboard)/items/[id]/page'

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ItemDetailPageCore
      params={params}
      listPath='/products'
      detailPathPrefix='/products'
      forcedItemType='PRODUCT'
      notFoundLabel='商品詳細'
    />
  )
}
