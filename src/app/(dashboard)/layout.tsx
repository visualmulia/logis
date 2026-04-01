import RouteGuard from '@/components/shared/RouteGuard'
import Sidebar from '@/components/layout/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RouteGuard>
      <div className="flex min-h-screen" style={{ background: '#0a0a0a' }}>
        <Sidebar />
        <main className="flex-1 ml-60 min-h-screen">
          {children}
        </main>
      </div>
    </RouteGuard>
  )
}