export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Background Pattern (Optional subtle decoration) */}
      <div className="absolute inset-0 bg-slate-50 [background:radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-50" />

      <div className="w-full max-w-md relative z-10 px-4">
        {children}
      </div>
    </div>
  )
}
