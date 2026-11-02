import Navigation from '@/components/shared/Navigation'

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative bg-[#F3F4F6] antialiased">
      {/* Lightly Blurred Citizen Crowd Background - Clearly & Elegantly Visible */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <img
          src="/citizen-bg.png"
          alt="Citizen portal background"
          className="w-full h-full object-cover scale-105 filter blur-[1.5px] opacity-60 saturate-110 contrast-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#F3F4F6]/55 via-[#F3F4F6]/45 to-[#F3F4F6]/60" />
      </div>

      {/* Foreground Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navigation theme="terracotta" />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-24 sm:pb-10">
          {children}
        </main>
      </div>
    </div>
  )
}
