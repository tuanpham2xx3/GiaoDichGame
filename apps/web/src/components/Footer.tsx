import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-[#181c27] border-t border-white/[0.08] mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 font-bold text-lg mb-3">
              <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                GiaoDichGame
              </span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed">
              Sàn giao dịch tài khoản game uy tín hàng đầu Việt Nam. Mua bán an toàn với hệ thống Escrow bảo vệ.
            </p>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Hỗ trợ</h4>
            <ul className="space-y-2">
              {['Điều khoản sử dụng', 'Chính sách bảo mật', 'Hướng dẫn giao dịch'].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-sm text-white/40 hover:text-indigo-400 transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Liên hệ</h4>
            <a href="mailto:support@giaodichgame.vn" className="text-sm text-white/40 hover:text-indigo-400 transition-colors">
              support@giaodichgame.vn
            </a>
          </div>
        </div>

        <div className="border-t border-white/[0.08] pt-6 text-center text-xs text-white/25">
          © {new Date().getFullYear()} GiaoDichGame. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
