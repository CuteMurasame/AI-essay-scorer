'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { getExponentialPages } from '@/lib/pagination';

function HistoryContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1');
  const itemsPerPage = 12;

  const [history, setHistory] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    setIsFetching(true);
    fetch(`/api/essay/history?page=${page}&limit=${itemsPerPage}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setHistory(data.submissions || []);
        setPagination(data.pagination || {});
        setIsInitialLoading(false);
        setIsFetching(false);
      });
  }, [page]);

  const setPageVal = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  if (isInitialLoading) return <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-3)' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>;

  return (
    <div style={{ paddingTop: '2rem', paddingBottom: '3rem', opacity: isFetching ? 0.6 : 1, transition: 'opacity 0.2s' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">历史批改</h1>
          <p className="page-subtitle">查看所有批改记录和详细反馈</p>
        </div>
        <button onClick={() => router.push('/dashboard')} className="btn btn-primary">
          + 新建批改
        </button>
      </div>

      {history.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1.5rem', opacity: 0.3 }}>📝</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.75rem' }}>暂无批改记录</h3>
          <p style={{ color: 'var(--text-3)', maxWidth: '400px', margin: '0 auto' }}>
            开始你的第一次 AI 作文批改吧
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {history.map(item => (
              <Link href={`/history/${item.id}`} key={item.id} style={{ textDecoration: 'none' }}>
                <div className="history-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <span className="history-title">{item.summary || item.title || '未命名作文'}</span>
                    {item.score && (
                      <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text)', marginLeft: '0.5rem', flexShrink: 0 }}>
                        {item.score.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>{item.standard}</span>
                    {item.status === 'COMPLETED' && <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>已完成</span>}
                    {item.status === 'PROCESSING' && <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>处理中</span>}
                    {item.status === 'FAILED' && <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>失败</span>}
                  </div>
                  <div className="history-meta">
                    {new Date(item.createdAt).toLocaleString('zh-CN', { 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '2.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {getExponentialPages(pagination.page, pagination.totalPages).map(p => (
                <button
                  key={p}
                  onClick={() => setPageVal(p)}
                  className={`btn ${p === pagination.page ? 'btn-primary' : 'btn-outline'}`}
                  style={{ 
                    padding: '0.4rem 0.8rem', 
                    minWidth: '40px',
                    fontSize: '0.9rem',
                    fontWeight: p === pagination.page ? '700' : '500',
                    boxShadow: 'none'
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HistoryContent />
    </Suspense>
  );
}
