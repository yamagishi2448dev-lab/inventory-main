import { ItemCreatePageCore } from '@/app/(dashboard)/items/new/page'

export default function NewConsignmentPage() {
  return (
    <ItemCreatePageCore
      forcedItemType='CONSIGNMENT'
      listPath='/consignments'
      hideTypeTabs
    />
  )
}
