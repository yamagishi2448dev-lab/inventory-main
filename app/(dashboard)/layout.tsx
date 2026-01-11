import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
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

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      username: true,
      role: true,
    },
  })

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
          <main className="flex-1 p-6 bg-gradient-to-br from-slate-50 via-white to-slate-100">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}
