import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/logs', label: 'Logs' },
]

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-zinc-300 bg-zinc-950 p-6 text-white md:block">
        <h1 className="text-xl font-semibold">Dompet AI Admin</h1>
        <nav className="mt-8 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-white text-zinc-950'
                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="md:pl-64">
        <header className="border-b border-zinc-300 bg-white px-6 py-4">
          <p className="text-sm text-zinc-500">Admin Area</p>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
