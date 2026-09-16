import Navigation from '@/components/shared/Navigation'

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation role="citizen" />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        {children}
      </main>
    </div>
  )
}
