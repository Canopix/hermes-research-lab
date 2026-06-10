import { Search, Bell } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function Header({ title }: { title: string }) {
  return (
    <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        <Badge variant="outline" className="text-[10px]">v1.0</Badge>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="relative w-48 sm:w-64 hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar agentes..."
            className="pl-8 h-9 w-full bg-muted/50"
          />
        </div>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
        </Button>
        <Button variant="ghost" size="icon">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-medium">
            JD
          </div>
        </Button>
      </div>
    </header>
  )
}
