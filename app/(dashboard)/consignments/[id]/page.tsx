import { ItemDetailPageCore } from '@/app/(dashboard)/items/[id]/page'

export default function ConsignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ItemDetailPageCore
      params={params}
      listPath='/consignments'
      detailPathPrefix='/consignments'
      forcedItemType='CONSIGNMENT'
      notFoundLabel='委託品詳細'
    />
  )
}
