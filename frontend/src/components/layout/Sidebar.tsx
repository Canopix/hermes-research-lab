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
  X
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
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Toggle - positioned relative to header area */}
      {isMobile && (
        <div className="fixed top-3 left-3 z-50 lg:hidden">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setIsOpen(!isOpen)}
            className="h-11 w-11 min-w-[44px] min-h-[44px]"
            aria-label="Toggle navigation"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-full bg-background border-r transition-all duration-300 z-50",
        isOpen ? "w-64" : "w-0",
        "lg:w-64 lg:z-40 lg:static lg:translate-x-0",
        !isOpen && !isMobile && "w-20"
      )}>
        <div className={cn(
          "flex flex-col h-full",
          isMobile ? "w-64" : (!isOpen ? "w-20" : "w-64")
        )}>
          {/* Logo area */}
          <div className={cn(
            "p-6 flex items-center gap-3",
            !isOpen && !isMobile && "justify-center px-0"
          )}>
            {/* Logo icon with gradient + hover animation */}
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-primary to-purple-500 hover:scale-105 hover:shadow-lg transition-all duration-200 cursor-default">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            {(isOpen || isMobile) && (
              <div className="flex flex-col">
                <span className="font-bold text-xl tracking-tight">AgentHub</span>
                <p className="text-[10px] text-muted-foreground">AI Agent Platform</p>
              </div>
            )}
          </div>

          {/* Divider */}
          {(isOpen || isMobile) && (
            <div className="px-3 mb-2">
              <div className="h-px bg-border" />
            </div>
          )}

          {/* Nav items */}
          <nav className="mt-2 px-3 space-y-1 flex-1 overflow-y-auto">
            {navItems.map((item) => {
              const active = isActive(item.href)
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md transition-colors relative h-11 min-h-[44px] px-3",
                    !isOpen && !isMobile && "justify-center px-0",
                    active
                      ? "text-primary bg-accent"
                      : "text-muted-foreground hover:text-primary hover:bg-accent"
                  )}
                  onClick={() => isMobile && setIsOpen(false)}
                >
                  {/* Active indicator bar */}
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                  )}
                  <item.icon className={cn(
                    "h-5 w-5 flex-shrink-0",
                    active && "text-primary"
                  )} />
                  {(isOpen || isMobile) && <span className="truncate">{item.name}</span>}
                </Link>
              )
            })}
          </nav>

          {/* Collapse toggle (desktop only) */}
          {!isMobile && (
            <div className="p-3 border-t">
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "w-full justify-center min-h-[44px]",
                  !isOpen && "!px-0"
                )}
                onClick={() => setIsOpen(!isOpen)}
              >
                {isOpen ? "Colapsar" : <span className="sr-only">Colapsar</span>}
              </Button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
