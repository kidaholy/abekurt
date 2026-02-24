"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { Logo } from "@/components/logo"
import { useState, useEffect } from "react"

export function SidebarNav() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const menuItems = {
    admin: [
      { label: "Dashboard", href: "/admin", icon: "📊" },
      { label: "Menu Items", href: "/admin/menu", icon: "🍽️" },
      { label: "Orders", href: "/admin/orders", icon: "📋" },
      { label: "Users", href: "/admin/users", icon: "👥" },
      { label: "Store", href: "/admin/store", icon: "🏪" },
      { label: "Stock", href: "/admin/stock", icon: "📦" },
      { label: "Reports", href: "/admin/reports", icon: "📈" },
      { label: "Settings", href: "/admin/settings", icon: "⚙️" },
    ],
    cashier: [
      { label: "POS System", href: "/cashier", icon: "💳" },
      { label: "Menu", href: "/menu", icon: "🍴" },
      { label: "Orders", href: "/cashier/orders", icon: "📋" },
      { label: "Transactions", href: "/cashier/transactions", icon: "💰" },
    ],
    chef: [
      { label: "Kitchen Display", href: "/chef", icon: "👨‍🍳" },
      { label: "Order Queue", href: "/chef/orders", icon: "📋" },
    ],
  }

  const items = user ? menuItems[user.role as keyof typeof menuItems] : []

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('mobile-sidebar')
      const hamburger = document.getElementById('hamburger-button')

      if (isMobileMenuOpen && sidebar && hamburger &&
        !sidebar.contains(event.target as Node) &&
        !hamburger.contains(event.target as Node)) {
        setIsMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMobileMenuOpen])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  const handleMobileMenuItemClick = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <>
      {/* Mobile Header - Optimized for 412px width */}
      <div className="md:hidden bg-sidebar border-b border-sidebar-border sticky top-0 z-[55]">
        <div className="flex items-center justify-between px-3 py-2.5">
          <Link
            href={user?.role === "admin" ? "/admin" : user?.role === "cashier" ? "/cashier" : "/chef"}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Logo size="sm" showText={true} />
          </Link>

          <div className="flex items-center gap-1.5">
            <button
              id="hamburger-button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80 transition-colors"
              aria-label="Toggle menu"
            >
              <div className="w-5 h-5 flex flex-col justify-center items-center">
                <span className={`block w-4 h-0.5 bg-current transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-0.5' : '-translate-y-1'
                  }`}></span>
                <span className={`block w-4 h-0.5 bg-current transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : 'opacity-100'
                  }`}></span>
                <span className={`block w-4 h-0.5 bg-current transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-0.5' : 'translate-y-1'
                  }`}></span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay - Optimized for 412px */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] md:hidden">
          <div
            id="mobile-sidebar"
            className="fixed left-0 top-0 h-full w-72 max-w-[80vw] bg-sidebar border-r border-sidebar-border shadow-2xl transform transition-transform duration-300 ease-in-out overflow-y-auto"
          >
            <div className="p-4 border-b border-sidebar-border/50">
              <Link
                href={user?.role === "admin" ? "/admin" : user?.role === "cashier" ? "/cashier" : "/chef"}
                className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
                onClick={handleMobileMenuItemClick}
              >
                <Logo size="md" showText={true} />
              </Link>
            </div>

            <div className="p-3">
              <ul className="space-y-1.5">
                {items.map((item) => {
                  const matchingItems = items.filter(menuItem =>
                    pathname === menuItem.href || pathname.startsWith(menuItem.href + "/")
                  )

                  const mostSpecificItem = matchingItems.sort((a, b) => b.href.length - a.href.length)[0]
                  const isActive = mostSpecificItem?.href === item.href

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={handleMobileMenuItemClick}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative ${isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg font-semibold"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          }`}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent rounded-r-full"></div>
                        )}
                        <span className={`text-base ${isActive ? 'animate-bounce-gentle' : ''}`}>{item.icon}</span>
                        <span className="text-sm">{item.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>

              <div className="mt-6 space-y-2.5">
                {/* Theme section removed - always light theme */}

                <button
                  onClick={() => {
                    logout()
                    setIsMobileMenuOpen(false)
                  }}
                  className="w-full px-3 py-2.5 bg-danger/20 text-danger rounded-lg hover:bg-danger/30 transition-all font-medium flex items-center justify-center gap-2 text-sm"
                >
                  <span>🚪</span>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <nav className="hidden md:block w-64 bg-sidebar text-sidebar-foreground min-h-screen fixed left-0 top-0 border-r border-sidebar-border shadow-xl">
        <div className="p-6 border-b border-sidebar-border/50">
          <Link
            href={user?.role === "admin" ? "/admin" : user?.role === "cashier" ? "/cashier" : "/chef"}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Logo size="lg" showText={true} />
          </Link>
        </div>

        <div className="p-4">
          <ul className="space-y-2">
            {items.map((item) => {
              const matchingItems = items.filter(menuItem =>
                pathname === menuItem.href || pathname.startsWith(menuItem.href + "/")
              )

              const mostSpecificItem = matchingItems.sort((a, b) => b.href.length - a.href.length)[0]
              const isActive = mostSpecificItem?.href === item.href

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative ${isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg font-semibold"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent rounded-r-full"></div>
                    )}
                    <span className={`text-lg ${isActive ? 'animate-bounce-gentle' : ''}`}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="mt-8 space-y-3">
            {/* Theme section removed - always light theme */}

            <button
              onClick={() => logout()}
              className="w-full px-4 py-3 bg-danger/20 text-danger rounded-lg hover:bg-danger/30 transition-all font-semibold flex items-center justify-center gap-2"
            >
              <span>🚪</span>
              Logout
            </button>
          </div>
        </div>
      </nav>
    </>
  )
}
