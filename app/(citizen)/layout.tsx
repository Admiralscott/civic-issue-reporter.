import Navigation from '@/components/shared/Navigation'

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative bg-[#F3F4F6] antialiased">
      {/* Blurred Patriotic Citizen Portal Background - Enhanced Visibility */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <img
          src="/citizen-bg.jpg"
          alt=""
          className="w-full h-full object-cover scale-105 filter blur-[3px] opacity-65 saturate-125 contrast-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#F3F4F6]/35 via-transparent to-[#F3F4F6]/45" />
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
