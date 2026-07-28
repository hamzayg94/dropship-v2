import Sidebar from './sidebar'

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-auto" style={{ marginLeft: 'var(--sidebar-width)' }}>
        <div className="p-6 max-w-screen-xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
