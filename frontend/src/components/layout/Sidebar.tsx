"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  PlusCircle,
  History,
  Compass,
  Sparkles,
  Menu,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

const navItems = [
  { name: 'Dashboard', href: '/agents', icon: LayoutDashboard },
  { name: 'Builder', href: '/create', icon: PlusCircle },
  { name: 'Historial', href: '/history', icon: History },
  { name: 'Explorar', href: '/explore', icon: Compass },
]

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/agents') return pathname === '/agents' || pathname === '/'
    return pathname?.startsWith(href)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-4 pt-4 pb-3 md:px-5 md:pt-5 md:pb-4 shrink-0">
        <Link href="/agents" className="flex items-center gap-3 group" onClick={onNavigate}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-primary to-primary/70 shadow-md shadow-primary/20 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300 group-hover:scale-[1.02]">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-base md:text-lg tracking-tight text-foreground">AgentHub</span>
            <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase truncate">
              AI Agent Platform
            </p>
          </div>
        </Link>
      </div>

      <div className="px-4 mb-1 shrink-0">
        <div className="h-px bg-border" />
      </div>

      <nav className="mt-2 md:mt-3 px-2 md:px-3 space-y-0.5 flex-1 overflow-y-auto overscroll-contain min-h-0">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Navegación
        </p>
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg transition-all duration-150 relative h-10 min-h-[44px] px-3 group',
                active
                  ? 'text-primary bg-accent font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
              onClick={onNavigate}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
              )}
              <item.icon
                className={cn(
                  'h-[18px] w-[18px] shrink-0 transition-colors',
                  active && 'text-primary',
                )}
              />
              <span className="text-sm">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto shrink-0 p-3 border-t border-border">
        <div className="px-3 py-2 rounded-lg bg-muted/30">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Sistema
          </p>
          <p className="text-xs text-muted-foreground">v0.1.0 — Hackathon</p>
        </div>
      </div>
    </div>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <div className="fixed top-3 left-3 z-50 md:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileOpen((open) => !open)}
          className="h-11 w-11 bg-background/95 backdrop-blur border-border shadow-sm"
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Single sidebar: drawer on phone, persistent from md (768px+) */}
      <aside
        className={cn(
          'sidebar-panel flex flex-col border-r border-border z-30',
          mobileOpen ? 'flex' : 'hidden md:flex',
          'md:w-56 lg:w-64 md:shrink-0 md:h-screen md:sticky md:top-0 md:self-start',
          'max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:w-[min(100vw-3rem,18rem)] max-md:shadow-2xl',
          'max-md:transition-transform max-md:duration-300 max-md:ease-in-out',
          mobileOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full max-md:pointer-events-none',
        )}
        aria-hidden={!mobileOpen ? undefined : false}
      >
        <SidebarNav onNavigate={() => setMobileOpen(false)} />
      </aside>
    </>
  )
}
