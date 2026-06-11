"use client"

import { Search, Bell, Sun, Moon, Wifi, WifiOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { checkExploreApiOnline } from '@/lib/api'

// ─── Breadcrumb helpers ────────────────────────────────────────────────

const routeNames: Record<string, string> = {
  agents: 'Dashboard',
  create: 'Builder',
  history: 'Historial',
  explore: 'Explorar',
  templates: 'Plantillas',
}

function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0) {
    return [{ label: 'Home', href: '/' }]
  }

  const crumbs: { label: string; href: string }[] = [{ label: 'Home', href: '/' }]
  let accumulated = ''
  for (let i = 0; i < parts.length; i++) {
    accumulated += '/' + parts[i]
    const key = parts[i]
    const label = routeNames[key] || key.charAt(0).toUpperCase() + key.slice(1)
    crumbs.push({ label, href: accumulated })
  }

  return crumbs
}

// ─── API Status Indicator ─────────────────────────────────────────────

function ApiStatusIndicator() {
  const [online, setOnline] = useState<boolean | null>(null)

  const checkApi = useCallback(async () => {
    setOnline(await checkExploreApiOnline())
  }, [])

  useEffect(() => {
    checkApi()
    const interval = setInterval(checkApi, 30000)
    return () => clearInterval(interval)
  }, [checkApi])

  return (
    <div className="flex items-center gap-2 text-xs font-medium">
      {online === true ? (
        <>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
          </span>
          <span className="text-muted-foreground hidden sm:inline">Online</span>
        </>
      ) : (
        <>
          <span className="relative flex h-2.5 w-2.5">
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-error"></span>
          </span>
          <span className="text-muted-foreground hidden sm:inline">Offline</span>
        </>
      )}
    </div>
  )
}

// ─── Dark Mode Toggle ─────────────────────────────────────────────────

function DarkModeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setDark(isDark)
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="h-9 w-9 min-w-[44px] min-h-[44px] rounded-lg"
      title={dark ? 'Modo claro' : 'Modo oscuro'}
    >
      {dark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  )
}

// ─── Main Header ──────────────────────────────────────────────────────

export default function Header() {
  const pathname = usePathname()
  const breadcrumbs = getBreadcrumbs(pathname || '/')

  return (
    <header className="h-14 sm:h-15 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between gap-4 max-md:pl-14 px-4 sm:px-6">
      {/* Left: breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <nav className="flex items-center gap-1.5 text-sm overflow-hidden">
          {breadcrumbs.map((crumb, idx) => (
            <span key={crumb.href} className="flex items-center gap-1.5 flex-shrink-0">
              {idx > 0 && (
                <span className="text-muted-foreground/40 mx-1 flex-shrink-0">/</span>
              )}
              {idx === 0 ? (
                <a
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors truncate"
                >
                  Home
                </a>
              ) : idx === breadcrumbs.length - 1 ? (
                <span className="font-semibold text-foreground truncate max-w-[80px] sm:max-w-[160px] md:max-w-none">
                  {crumb.label}
                </span>
              ) : (
                <a
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors truncate"
                >
                  {crumb.label}
                </a>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* Right: API status, dark mode, notifications, avatar */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* API Status */}
        <ApiStatusIndicator />

        {/* Search */}
        <div className="relative w-48 sm:w-60 hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar agentes..."
            className="pl-9 h-9 bg-muted/50 border-border text-sm"
          />
        </div>

        {/* Separator */}
        <div className="w-px h-6 bg-border hidden sm:block" />

        {/* Dark mode toggle */}
        <DarkModeToggle />

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-9 w-9 min-w-[44px] min-h-[44px] rounded-lg">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
        </Button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-xs font-bold text-primary-foreground shadow-sm">
          N
        </div>
      </div>
    </header>
  )
}
