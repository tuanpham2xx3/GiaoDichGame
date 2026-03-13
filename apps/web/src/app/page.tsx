import Link from 'next/link';

export default function HomePage() {
  const features = [
    { title: 'Escrow an toàn', desc: 'Tiền người mua được giữ an toàn cho đến khi nhận tài khoản thành công.' },
    { title: 'Giao dịch nhanh', desc: 'Hệ thống tự động xác nhận và giải phóng tiền trong vài giây.' },
    { title: 'Phí thấp', desc: 'Chỉ 2% phí giao dịch, không phát sinh chi phí ẩn.' },
    { title: 'Bảo mật cao', desc: 'JWT, bcrypt, HTTPS end-to-end. Dữ liệu của bạn luôn được bảo vệ.' },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden py-32 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_30%,rgba(99,102,241,.2)_0%,transparent_55%),radial-gradient(ellipse_at_75%_70%,rgba(34,211,238,.12)_0%,transparent_55%)]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-600/15 border border-indigo-500/25 rounded-full text-indigo-300 text-sm font-medium mb-8">
            Sàn giao dịch game #1 Việt Nam
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6">
            Mua bán tài khoản game
            <span className="block bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              an toàn &amp; uy tín
            </span>
          </h1>
          <p className="text-lg text-white/50 max-w-2xl mx-auto mb-10">
            Hệ thống Escrow tự động bảo vệ cả người mua lẫn người bán. Giao dịch minh bạch, không rủi ro.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/register" className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-full text-lg shadow-2xl shadow-indigo-500/30 transition-all hover:-translate-y-0.5">
              Đăng ký miễn phí
            </Link>
            <Link href="/login" className="px-8 py-3.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-full text-lg border border-white/[0.08] transition-all">
              Đăng nhập
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-12">Tại sao chọn GiaoDichGame?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => (
              <div key={f.title} className="bg-[#1e2330] border border-white/[0.08] rounded-2xl p-6 hover:border-indigo-500/30 transition-colors">
                <h3 className="font-bold text-white mb-1.5">{f.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 bg-[#181c27] border-y border-white/[0.08]">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center">
          {[['10,000+', 'Giao dịch thành công'], ['500+', 'Người dùng tin tưởng'], ['99.9%', 'Tỷ lệ hài lòng']].map(([val, label]) => (
            <div key={val}>
              <p className="text-3xl font-extrabold text-white">{val}</p>
              <p className="text-white/40 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Sẵn sàng giao dịch?</h2>
        <p className="text-white/50 mb-8">Tạo tài khoản miễn phí và bắt đầu ngay hôm nay.</p>
        <Link href="/register" className="inline-flex px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full text-lg shadow-2xl shadow-indigo-500/30 transition-all hover:-translate-y-1">
          Bắt đầu ngay →
        </Link>
      </section>
    </div>
  );
}
