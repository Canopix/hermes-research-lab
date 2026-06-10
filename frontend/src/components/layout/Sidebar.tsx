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
  ChevronLeft,
  ChevronRight,
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

export default function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const isActive = (href: string) => {
    if (href === '/agents') return pathname === '/agents' || pathname === '/'
    return pathname?.startsWith(href)
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 top-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Toggle */}
      {isMobile && (
        <div className="fixed top-3 left-3 z-50 lg:hidden">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setIsOpen(!isOpen)}
            className="h-11 w-11 min-w-[44px] min-h-[44px] bg-background/95 backdrop-blur border-border"
            aria-label="Toggle navigation"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-full transition-all duration-300 z-50",
        "sidebar-panel",
        isOpen ? "w-64" : "w-0",
        "lg:w-64 lg:z-40 lg:static lg:translate-x-0",
        !isOpen && !isMobile && "w-64"
      )}>
        <div className={cn(
          "flex flex-col h-full w-64",
        )}>
          {/* Logo area */}
          <div className="px-5 pt-5 pb-4">
            <Link href="/agents" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-primary to-primary/70 shadow-md shadow-primary/20 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300 group-hover:scale-[1.02]">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight text-foreground">AgentHub</span>
                <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">AI Agent Platform</p>
              </div>
            </Link>
          </div>

          {/* Divider */}
          <div className="px-4 mb-1">
            <div className="h-px bg-border" />
          </div>

          {/* Nav items */}
          <nav className="mt-3 px-3 space-y-1 flex-1 overflow-y-auto">
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
                    "flex items-center gap-3 rounded-lg transition-all duration-150 relative h-10 min-h-[44px] px-3 group",
                    active
                      ? "text-primary bg-accent font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                  onClick={() => isMobile && setIsOpen(false)}
                >
                  {/* Active indicator bar */}
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                  )}
                  <item.icon className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors",
                    active && "text-primary"
                  )} />
                  <span className="text-sm">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Bottom section */}
          <div className="p-3 border-t border-border">
            <div className="px-3 py-2 rounded-lg bg-muted/30">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Sistema</p>
              <p className="text-xs text-muted-foreground">v0.1.0 — Hackathon</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
