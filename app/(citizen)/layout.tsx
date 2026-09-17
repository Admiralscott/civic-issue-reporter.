import Navigation from '@/components/shared/Navigation'

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F3F4F6] antialiased">
      <Navigation theme="terracotta" />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24 sm:pb-10">
        {children}
      </main>
    </div>
  )
}

