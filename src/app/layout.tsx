import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { getUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'AI Essay Scorer',
  description: 'AI-powered English essay scoring',
};

async function Header() {
  const user = await getUser();

  return (
    <header>
      <div className="container">
        <div className="nav-content">
          <Link href={user ? "/dashboard" : "/"} className="logo">
            <span className="logo-dot"></span>
            AI Essay Scorer
          </Link>
          <nav className="nav-right">
            {user ? (
              <>
                <Link href="/dashboard" className="nav-link">
                  批改
                </Link>
                <Link href="/history" className="nav-link">
                  历史
                </Link>
                {user.role === 'ADMIN' && (
                  <Link href="/admin" className="nav-link">
                    管理
                  </Link>
                )}
                <form action="/api/auth/logout" method="POST" style={{ display: 'inline' }}>
                  <button type="submit" className="btn btn-sm btn-ghost">
                    登出
                  </button>
                </form>
              </>
            ) : (
              <Link href="/login" className="btn btn-primary btn-sm">
                登录 / 注册
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>
        <Header />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
