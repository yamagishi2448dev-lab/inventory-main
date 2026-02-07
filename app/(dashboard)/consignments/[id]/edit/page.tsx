import { ItemEditPageCore } from '@/app/(dashboard)/items/[id]/edit/page'

export default function EditConsignmentPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ItemEditPageCore
      params={params}
      listPath='/consignments'
      forcedItemType='CONSIGNMENT'
    />
  )
}
