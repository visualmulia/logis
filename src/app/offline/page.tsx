export default function OfflinePage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 text-center"
      style={{ background: '#0a0a0a' }}
    >
      <div
        className="text-3xl font-black tracking-[6px] mb-8"
        style={{ fontFamily: 'monospace', color: '#f5f0eb' }}
      >
        LOG<span style={{ color: '#F97316' }}>I</span>S
      </div>
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)' }}
      >
        <span className="text-3xl">📡</span>
      </div>
      <h1 className="text-xl font-bold mb-3" style={{ color: '#f5f0eb' }}>
        Tidak ada koneksi
      </h1>
      <p className="text-sm max-w-xs leading-relaxed" style={{ color: 'rgba(245,240,235,0.4)' }}>
        Periksa koneksi internet kamu dan coba lagi. Data yang sudah dimuat sebelumnya masih bisa diakses.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-8 px-6 py-3 text-sm font-bold uppercase tracking-widest"
        style={{ background: '#F97316', color: '#0a0a0a' }}
      >
        Coba Lagi
      </button>
    </div>
  )
}