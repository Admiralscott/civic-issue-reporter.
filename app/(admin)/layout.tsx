import Navigation from '@/components/shared/Navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      {/* Crimson / Maroon Government Top Banner */}
      <header className="bg-[#c0392b] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight font-serif">CivicTrack.gov.in</span>
            <span className="hidden sm:inline-block text-xs bg-black/25 px-2.5 py-1 rounded text-white/90 font-mono">
              GOVERNMENT EXECUTIVE PORTAL
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-white/90">
            <span className="bg-white/20 px-2.5 py-1 rounded-full">🇮🇳 Official Portal</span>
          </div>
        </div>
      </header>

      <Navigation theme="purple" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  )
}
