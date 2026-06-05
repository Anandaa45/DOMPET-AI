import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/receipt-scan', label: 'Receipt Scan' },
  { to: '/whatsapp', label: 'WhatsApp' },
  { to: '/reports', label: 'Reports' },
  { to: '/settings', label: 'Settings' },
]

export default function ClientLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white p-6 md:block">
        <h1 className="text-xl font-semibold">Dompet AI</h1>
        <nav className="mt-8 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="md:pl-64">
        <header className="border-b border-slate-200 bg-white px-6 py-4">
          <p className="text-sm text-slate-500">Client Area</p>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
