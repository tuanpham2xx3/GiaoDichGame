import Link from 'next/link';
import { listingsApi, gamesApi, Listing, Game } from '@/lib/api';

async function getListings() {
  try {
    const data = await listingsApi.getAll({ page: 1, limit: 12, status: 'PUBLISHED' });
    return data;
  } catch {
    return { items: [], total: 0, page: 1, limit: 12, totalPages: 0 };
  }
}

async function getGames() {
  try {
    const data = await gamesApi.getAll({ limit: 100 });
    return data.items;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const { items: listings } = await getListings();
  const games = await getGames();

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

      {/* Listings Section */}
      {listings.length > 0 && (
        <section className="py-12 px-6">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-8">Tài khoản game mới nhất</h2>

            {/* Games Filter */}
            <div className="flex gap-2 flex-wrap mb-8">
              <Link
                href="/"
                className="px-4 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium"
              >
                Tất cả
              </Link>
              {games.map((game) => (
                <Link
                  key={game.id}
                  href={`/?gameId=${game.id}`}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-full text-sm font-medium transition-colors"
                >
                  {game.name}
                </Link>
              ))}
            </div>

            {/* Listings Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  className="group block bg-[#1e2330] border border-white/[0.08] rounded-xl overflow-hidden hover:border-indigo-500/30 transition-all hover:-translate-y-1"
                >
                  {/* Image */}
                  <div className="aspect-video bg-[#151821] relative overflow-hidden">
                    {listing.listingImages && listing.listingImages.length > 0 ? (
                      <img
                        src={listing.listingImages[0]!.url}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20">
                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    {listing.isPinned && (
                      <span className="absolute top-2 left-2 px-2 py-1 bg-amber-500/90 text-white text-xs font-bold rounded">
                        PIN
                      </span>
                    )}
                    {listing.game && (
                      <span className="absolute top-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
                        {listing.game.name}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-white group-hover:text-indigo-400 transition-colors line-clamp-2 mb-2">
                      {listing.title}
                    </h3>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {listing.gameAttributes && Object.entries(listing.gameAttributes).slice(0, 3).map(([key, value]) => (
                        <span key={key} className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs rounded">
                          {String(value)}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-indigo-400">
                        {Number(listing.price).toLocaleString('vi-VN')} Coin
                      </span>
                      <span className="text-white/40 text-xs">
                        {listing.viewCount} lượt xem
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {listings.length === 0 && (
              <div className="text-center py-16">
                <p className="text-white/50 text-lg">Chưa có tài khoản nào được đăng bán.</p>
                <Link href="/sell" className="inline-block mt-4 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg">
                  Đăng bài ngay
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

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
