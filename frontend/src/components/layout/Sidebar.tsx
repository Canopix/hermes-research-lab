"use client"

import Link from 'next/link'
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  Compass, 
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
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Toggle */}
      {isMobile && (
        <div className="fixed top-3 left-3 z-50">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setIsOpen(!isOpen)}
            className="h-9 w-9"
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
            <div className="w-8 h-8 bg-primary rounded-lg flex-shrink-0" />
            {(isOpen || isMobile) && <span className="font-bold text-xl">AgentHub</span>}
          </div>

          {/* Nav items */}
          <nav className="mt-2 px-3 space-y-1 flex-1">
            {navItems.map((item) => (
              <Link 
                key={item.name} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-muted-foreground hover:text-primary hover:bg-accent rounded-md transition-colors",
                  !isOpen && !isMobile && "justify-center px-0"
                )}
                onClick={() => isMobile && setIsOpen(false)}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {(isOpen || isMobile) && <span>{item.name}</span>}
              </Link>
            ))}
          </nav>

          {/* Collapse toggle (desktop only) */}
          {!isMobile && (
            <div className="p-3 border-t">
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "w-full justify-center",
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
