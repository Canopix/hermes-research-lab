import Link from 'next/link'

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <h2 className="text-4xl font-bold tracking-tight text-muted-foreground/50">{title}</h2>
      <p className="text-muted-foreground">Próximamente...</p>
      <Link 
        href="/agents" 
        className="text-sm text-primary hover:underline"
      >
        Volver al Dashboard
      </Link>
    </div>
  )
}
