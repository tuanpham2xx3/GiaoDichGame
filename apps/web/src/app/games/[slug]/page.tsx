import { notFound } from 'next/navigation';
import Link from 'next/link';
import { gamesApi, listingsApi, Listing } from '@/lib/api';

interface Props {
  params: Promise<{ slug: string }>;
}

async function getGame(slug: string) {
  try {
    return await gamesApi.getBySlug(slug);
  } catch {
    return null;
  }
}

async function getListingsByGame(gameId: number) {
  try {
    const data = await listingsApi.getAll({ gameId, status: 'PUBLISHED', limit: 20 });
    return data.items;
  } catch {
    return [];
  }
}

export default async function GameDetailPage({ params }: Props) {
  const { slug } = await params;
  const game = await getGame(slug);

  if (!game) {
    notFound();
  }

  const listings = await getListingsByGame(game.id);

  return (
    <div className="min-h-screen bg-[#0f1118]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Game Header */}
        <div className="flex items-center gap-6 mb-8">
          <div className="w-24 h-24 bg-[#1e2330] rounded-xl overflow-hidden flex items-center justify-center border border-white/[0.08]">
            {game.iconUrl ? (
              <img src={game.iconUrl} alt={game.name} className="w-16 h-16 object-contain" />
            ) : (
              <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{game.name}</h1>
            <p className="text-white/50 mb-4">
              {game.schema && game.schema.length > 0
                ? `Thuộc tính: ${game.schema.map(s => s.label).join(', ')}`
                : 'Chưa có thông tin thuộc tính'}
            </p>
            <Link
              href={`/sell?gameId=${game.id}`}
              className="inline-flex px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors"
            >
              Đăng bán tài khoản
            </Link>
          </div>
        </div>

        {/* Listings */}
        <h2 className="text-xl font-bold text-white mb-6">Tài khoản {game.name}</h2>

        {listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="group block bg-[#1e2330] border border-white/[0.08] rounded-xl overflow-hidden hover:border-indigo-500/30 transition-all hover:-translate-y-1"
              >
                <div className="aspect-video bg-[#151821] relative overflow-hidden">
                  {listing.listingImages && listing.listingImages.length > 0 ? (
                    <img src={listing.listingImages[0]!.url} alt={listing.title} className="w-full h-full object-cover" />
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
                </div>
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
                    <span className="text-white/40 text-xs">{listing.viewCount} lượt</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-[#1e2330] rounded-xl border border-white/[0.08]">
            <p className="text-white/50 text-lg mb-4">Chưa có tài khoản nào của game này.</p>
            <Link href={`/sell?gameId=${game.id}`} className="inline-flex px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg">
              Đăng bài đầu tiên
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
