import RouteGuard from '@/components/shared/RouteGuard'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RouteGuard>{children}</RouteGuard>
}