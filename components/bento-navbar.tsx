"use client"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { Logo } from "@/components/logo"
import { Menu, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { useLanguage } from "@/context/language-context"
import { LanguageSwitcher } from "@/components/language-switcher"

export function BentoNavbar() {
    const pathname = usePathname()
    const { user, logout } = useAuth()
    const { t } = useLanguage()
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    const getLinkClass = (path: string) => {
        const base = "hover:text-black hover:scale-105 transition-all"
        return pathname === path ? `${base} text-black font-bold` : `${base} text-[#4a4a4a]`
    }

    // Role-specific links
    const adminLinks = [
        { label: t("nav.overview"), href: "/admin" },
        { label: t("nav.menu"), href: "/admin/menu" },
        { label: t("nav.orders"), href: "/admin/orders" },
        { label: t("nav.users"), href: "/admin/users" },
        { label: t("nav.store"), href: "/admin/store" },
        { label: t("nav.stock"), href: "/admin/stock" },
        { label: t("nav.reports"), href: "/admin/reports" },
        { label: t("nav.settings"), href: "/admin/settings" }
    ]

    const storeKeeperLinks = [
        { label: t("nav.store"), href: "/admin/store" }
    ]

    const cashierLinks = [
        { label: t("nav.pos"), href: "/cashier" },
        { label: t("nav.recentOrders"), href: "/cashier/orders" }
    ]

    const guestLinks = [
        { label: t("nav.home"), href: "/" },
        { label: t("nav.browseMenu"), href: "/menu" }
    ]

    const links = user?.role === "admin" ? adminLinks :
        user?.role === "store_keeper" ? storeKeeperLinks :
            user?.role === "cashier" ? cashierLinks :
                user?.role === "chef" ? [{ label: t("nav.kitchen"), href: "/chef" }] : guestLinks

    return (
        <>
            <nav className="flex justify-between items-center mb-4 md:mb-10 px-4 md:px-6 py-2 md:py-3 bg-white/70 backdrop-blur-xl rounded-full custom-shadow border border-white/50 relative z-[100]">
                <div className="flex items-center gap-4">
                    {/* Hamburger Button */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="lg:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>

                    <Link href="/" className="flex items-center gap-3 group">
                        <Logo size="md" showText={true} />
                    </Link>
                </div>

                <div className="hidden lg:flex gap-8 font-bold text-sm uppercase tracking-wider">
                    {links.map(link => (
                        <Link key={link.href} href={link.href} className={getLinkClass(link.href)}>{link.label}</Link>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <LanguageSwitcher />
                    {user ? (
                        <div className="flex items-center gap-4">
                            <span className="hidden md:block text-sm font-bold text-[#2d5a41]">{t("nav.hi")}, {user.name}! ✨</span>
                            <button onClick={logout} className="bg-red-50 text-red-500 px-5 py-2.5 rounded-full text-xs font-bold hover:bg-red-500 hover:text-white transition-all transform active:scale-95">
                                {t("nav.logout")}
                            </button>
                        </div>
                    ) : (
                        <Link href="/login" className="bg-[#2d5a41] text-[#e2e7d8] px-7 py-3 rounded-full flex items-center gap-3 font-bold cursor-pointer hover:bg-black transition-colors bubbly-button">
                            {t("common.login")}
                        </Link>
                    )}
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="lg:hidden fixed inset-x-6 top-24 bg-white/95 backdrop-blur-2xl rounded-[30px] p-6 custom-shadow border border-white/50 z-[90] flex flex-col gap-4 overflow-hidden"
                    >
                        {links.map((link, idx) => (
                            <motion.div
                                key={link.href}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <Link
                                    href={link.href}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={`block py-3 px-6 rounded-2xl font-bold text-lg transition-all ${pathname === link.href ? 'bg-[#2d5a41] text-white shadow-lg' : 'hover:bg-gray-100 text-gray-700'
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}

export default BentoNavbar;
