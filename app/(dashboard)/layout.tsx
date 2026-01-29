import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { SidebarProvider } from '@/lib/contexts/SidebarContext'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 認証チェック
  const cookieStore = await cookies()
  const token = cookieStore.get('inventory_session')?.value

  if (!token) {
    redirect('/login')
  }

  const session = await getSession(token)
  if (!session) {
    redirect('/login')
  }

  const user = session.user

  if (!user) {
    redirect('/login')
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <div className="print-hidden">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col">
          <div className="print-hidden">
            <Header username={user.username} role={user.role} />
          </div>
          <main className="flex-1 p-6 bg-slate-50">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}
