"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

interface SidebarProps {
  role: string
  userName: string
}

export default function Sidebar({ role, userName }: SidebarProps) {
  const router = useRouter()

  const menuItems = {
    admin: [
      { label: "Dashboard", href: "/admin" },
      { label: "Inventory", href: "/admin/inventory" },
      { label: "Menu Items", href: "/admin/menu" },
      { label: "Orders", href: "/admin/orders" },
      { label: "Users", href: "/admin/users" },
      { label: "Reports", href: "/admin/reports" },
    ],
    cashier: [
      { label: "POS", href: "/cashier" },
      { label: "Orders", href: "/cashier/orders" },
      { label: "Transactions", href: "/cashier/transactions" },
    ],
    chef: [
      { label: "Kitchen", href: "/chef" },
      { label: "Orders", href: "/chef/orders" },
    ],
  }

  const items = menuItems[role as keyof typeof menuItems] || []

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/login")
  }

  return (
    <div className="w-64 bg-secondary text-white h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-secondary-light">
        <h2 className="text-xl font-bold">Cafeteria</h2>
        <p className="text-sm text-secondary-light mt-1">{userName}</p>
        <span className="inline-block mt-2 px-3 py-1 bg-accent text-white rounded-full text-xs font-semibold capitalize">
          {role}
        </span>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="block px-4 py-2 rounded-lg hover:bg-secondary-light transition-colors">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-secondary-light">
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 bg-danger hover:bg-red-600 rounded-lg transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  )
}
