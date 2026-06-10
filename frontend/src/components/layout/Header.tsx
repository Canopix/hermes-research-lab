"use client"

import { Search, Bell, Sun, Moon, Wifi, WifiOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'

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

  // If no path segments, just Home
  if (parts.length === 0) {
    return [{ label: 'Home', href: '/' }]
  }

  const crumbs: { label: string; href: string }[] = [{ label: 'Home', href: '/' }]

  // Walk segments, building the path progressively
  let accumulated = ''
  for (let i = 0; i < parts.length; i++) {
    accumulated += '/' + parts[i]
    const key = parts[i]
    const label = routeNames[key] || key.charAt(0).toUpperCase() + key.slice(1)

    // If this segment is the last one, use it as-is
    if (i === parts.length - 1) {
      crumbs.push({ label, href: accumulated })
      break
    }

    // Check if accumulated path matches a known route
    if (routeNames[parts[i]]) {
      crumbs.push({ label, href: accumulated })
    } else {
      // Sub-route under a known parent — just show the accumulated path
      crumbs.push({ label, href: accumulated })
    }
  }

  return crumbs
}

// ─── API Status Indicator ─────────────────────────────────────────────

function ApiStatusIndicator() {
  const [online, setOnline] = useState<boolean | null>(null)

  const checkApi = useCallback(async () => {
    try {
      const res = await fetch('/api/explore/api/system/overview', {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      })
      setOnline(res.ok)
    } catch {
      setOnline(false)
    }
  }, [])

  useEffect(() => {
    checkApi()
    const interval = setInterval(checkApi, 30000)
    return () => clearInterval(interval)
  }, [checkApi])

  return (
    <div className="flex items-center gap-1.5 text-xs">
      {online === true ? (
        <>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
          </span>
          <span className="text-muted-foreground hidden sm:inline">API Online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3.5 w-3.5 text-error" />
          <span className="text-muted-foreground hidden sm:inline">API Offline</span>
        </>
      )}
    </div>
  )
}

// ─── Dark Mode Toggle ─────────────────────────────────────────────────

function DarkModeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    // Check initial state
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
      className="h-11 w-11 min-w-[44px] min-h-[44px]"
      title={dark ? 'Modo claro' : 'Modo oscuro'}
    >
      {dark ? (
        <Sun className="h-4.5 w-4.5" />
      ) : (
        <Moon className="h-4.5 w-4.5" />
      )}
    </Button>
  )
}

// ─── Main Header ──────────────────────────────────────────────────────

export default function Header() {
  const pathname = usePathname()
  const breadcrumbs = getBreadcrumbs(pathname || '/')

  return (
    <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 px-3 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <nav className="flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((crumb, idx) => (
            <span key={crumb.href} className="flex items-center gap-1.5">
              {idx > 0 && (
                <span className="text-muted-foreground/50 mx-0.5">/</span>
              )}
              {idx === 0 ? (
                <a
                  href={crumb.href}
                  className="text-muted-foreground hover:text-primary transition-colors truncate"
                >
                  Home
                </a>
              ) : idx === breadcrumbs.length - 1 ? (
                <span className="font-semibold text-foreground truncate max-w-[120px] sm:max-w-none">
                  {crumb.label}
                </span>
              ) : (
                <a
                  href={crumb.href}
                  className="text-muted-foreground hover:text-primary transition-colors truncate"
                >
                  {crumb.label}
                </a>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* Right: search, API status, dark mode, notifications, avatar */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {/* API Status */}
        <ApiStatusIndicator />

        {/* Search */}
        <div className="relative w-40 sm:w-56 hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar agentes..."
            className="pl-8 h-11 w-full bg-muted/50 min-h-[44px]"
          />
        </div>

        {/* Dark mode toggle */}
        <DarkModeToggle />

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-11 w-11 min-w-[44px] min-h-[44px]">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
        </Button>

        {/* Avatar */}
        <Button variant="ghost" size="icon" className="h-11 w-11 min-w-[44px] min-h-[44px]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-xs font-medium text-primary-foreground">
            JD
          </div>
        </Button>
      </div>
    </header>
  )
}
