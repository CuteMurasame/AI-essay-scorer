import { getUser } from '@/lib/auth';
import Link from 'next/link';

export default async function Home() {
  const user = await getUser();

  return (
    <div style={{ textAlign: 'center', marginTop: '10vh' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--primary)' }}>
        AI 英语作文评分器
      </h1>
      <p style={{ fontSize: '1.2rem', color: 'var(--secondary)', maxWidth: '600px', margin: '0 auto 2rem' }}>
        上传你的英语作文，通过先进的 AI 技术获得即时评分和详细建议。
        支持中考、高考、四六级、雅思和托福标准。
      </p>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
        {user ? (
          <Link href="/dashboard" className="btn btn-primary" style={{ padding: '1rem 2rem' }}>
            进入我的仪表盘
          </Link>
        ) : (
          <>
            <Link href="/login" className="btn btn-primary" style={{ padding: '1rem 2rem' }}>
              立即开始
            </Link>
            <Link href="/login" className="btn btn-outline" style={{ padding: '1rem 2rem' }}>
              注册账号
            </Link>
          </>
        )}
      </div>

      <div style={{ marginTop: '5rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
        <div className="card">
          <h3>多标准评分</h3>
          <p>涵盖中高考及大学各类主流英语考试标准。</p>
        </div>
        <div className="card">
          <h3>多级 AI 引擎</h3>
          <p>从快速检查到专家级详细分析，由你掌控。</p>
        </div>
        <div className="card">
          <h3>安全检查</h3>
          <p>内置 Base Model 实时检查，防止提示词注入攻击。</p>
        </div>
      </div>
    </div>
  );
}
