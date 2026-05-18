import RouteGuard from '@/components/shared/RouteGuard'
import Sidebar from '@/components/layout/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RouteGuard>
      <div className="flex min-h-screen"
        style={{ background: 'var(--bg-primary, #F5F5F5)' }}>
        <Sidebar />
        <main
          className="flex-1 min-h-screen lg:ml-60 pt-16 lg:pt-0 overflow-x-hidden"
          style={{ maxWidth: '100vw', background: 'var(--bg-primary, #F5F5F5)' }}
        >
          {children}
        </main>
      </div>
    </RouteGuard>
  )
}
