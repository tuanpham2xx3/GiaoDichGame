import Link from 'next/link';
import { gamesApi, Game } from '@/lib/api';

async function getGames() {
  try {
    const data = await gamesApi.getAll({ limit: 100 });
    return data.items;
  } catch {
    return [];
  }
}

export default async function GamesPage() {
  const games = await getGames();

  return (
    <div className="min-h-screen bg-[#0f1118]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Danh sách game</h1>
        <p className="text-white/50 mb-8">Chọn game bạn muốn mua hoặc bán tài khoản</p>

        {games.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {games.map((game) => (
              <Link
                key={game.id}
                href={`/games/${game.slug}`}
                className="group bg-[#1e2330] border border-white/[0.08] rounded-xl p-6 hover:border-indigo-500/30 transition-all hover:-translate-y-1"
              >
                <div className="aspect-square bg-[#151821] rounded-lg mb-4 overflow-hidden flex items-center justify-center">
                  {game.iconUrl ? (
                    <img
                      src={game.iconUrl}
                      alt={game.name}
                      className="w-16 h-16 object-contain"
                    />
                  ) : (
                    <svg className="w-12 h-12 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  )}
                </div>
                <h3 className="font-semibold text-white group-hover:text-indigo-400 transition-colors text-center">
                  {game.name}
                </h3>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-white/50 text-lg">Chưa có game nào.</p>
          </div>
        )}
      </div>
    </div>
  );
}
