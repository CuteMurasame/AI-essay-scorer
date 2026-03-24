'use client';
import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { marked } from 'marked';

export default function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [streamingFeedback, setStreamingFeedback] = useState('');
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Debug raw states
  const [debugRaw, setDebugRaw] = useState<string>('');
  const [debugOffset, setDebugOffset] = useState<number>(0);
  const [debugTotal, setDebugTotal] = useState<number>(0);
  const [debugFinished, setDebugFinished] = useState<boolean>(false);
  const [expandAmount, setExpandAmount] = useState<string>('1024');

  const router = useRouter();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetch('/api/user/profile', { credentials: 'include' }).then(res => res.json()).then(setUser);
  }, []);

  const fetchTask = async () => {
    const res = await fetch(`/api/essay/${resolvedParams.id}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
    return json;
  };

  const fetchDebugRaw = async (offsetToFetch: number, limit: number) => {
    try {
      const res = await fetch(`/api/essay/${resolvedParams.id}/raw?offset=${offsetToFetch}&limit=${limit}`);
      const d = await res.json();
      if (res.ok) {
        setDebugRaw(prev => prev + d.chunk);
        setDebugOffset(d.nextOffset);
        setDebugTotal(d.totalLength);
        setDebugFinished(d.isFinished);
      }
    } catch(e) {}
  };

  useEffect(() => {
    if (data && (data.status === 'ERROR' || data.status === 'FAILED') && user?.role === 'ADMIN') {
        if (debugOffset === 0) fetchDebugRaw(0, 1024);
    }
  }, [data?.status, user?.role]);

  useEffect(() => {
    let interval: any;
    fetchTask().then(task => {
      if (task.status === 'PROCESSING') {
        // Setup streaming connection
        const es = new EventSource(`/api/essay/${resolvedParams.id}/stream`);
        es.onmessage = (event) => {
          if (event.data && event.data.startsWith('"')) {
             try {
               const chunk = JSON.parse(event.data);
               setStreamingFeedback(prev => prev + chunk);
             } catch(e) {
               setStreamingFeedback(prev => prev + event.data);
             }
          } else {
             setStreamingFeedback(prev => prev + event.data);
          }
        };
        es.onerror = () => {
          es.close();
        };
        eventSourceRef.current = es;
        
        interval = setInterval(async () => {
          const updated = await fetchTask();
          if (updated.status !== 'PROCESSING') {
            clearInterval(interval);
            if (eventSourceRef.current) {
              eventSourceRef.current.close();
            }
          }
        }, 3000);
      }
    });
    return () => {
      clearInterval(interval);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [resolvedParams.id]);

  // Timer for processing
  useEffect(() => {
    let timer: any;
    if (data?.status === 'PROCESSING' && data?.createdAt) {
      const start = new Date(data.createdAt).getTime();
      timer = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [data?.status, data?.createdAt]);

  if (loading) return <div style={{ textAlign: 'center', marginTop: '3rem' }}>正在加载任务...</div>;

  const renderStatus = () => {
    if (data.status === 'PROCESSING') {
      const topicImages = JSON.parse(data.topicImageUrls || '[]');
      const essayImages = JSON.parse(data.imageUrls || '[]');
      const minutes = Math.floor(elapsedTime / 60);
      const seconds = elapsedTime % 60;
      
      return (
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="spinner"></span>
              AI 正在批改中...
            </h3>
            <div className="badge badge-amber" style={{ marginBottom: '1rem' }}>
              已等待: {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.75rem 1.5rem', fontSize: '0.9rem' }}>
              <div style={{ fontWeight: '600' }}>题目:</div>
              <div style={{ color: 'var(--text-2)' }}>{data.title || (topicImages.length > 0 ? '图片题目' : '未填写')}</div>
              <div style={{ fontWeight: '600' }}>作文:</div>
              <div style={{ color: 'var(--text-2)' }}>{data.content ? '文本已上传' : '图片已上传'}</div>
              <div style={{ fontWeight: '600' }}>评分标准:</div>
              <div style={{ color: 'var(--text-2)' }}>{data.standard}</div>
              <div style={{ fontWeight: '600' }}>状态:</div>
              <div className="badge badge-blue">已发送给 AI</div>
            </div>
            {(topicImages.length > 0 || essayImages.length > 0) && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem' }}>上传的图片:</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {topicImages.map((src:string, i:number) => (
                    <img key={`t${i}`} src={src} style={{ height: '80px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} alt="" />
                  ))}
                  {essayImages.map((src:string, i:number) => (
                    <img key={`e${i}`} src={src} style={{ height: '80px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} alt="" />
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {streamingFeedback && (
            <div className="card">
              <h4 style={{ marginBottom: '1rem', color: 'var(--blue)' }}>实时反馈 (流式响应)</h4>
              <div 
                className="markdown-body" 
                dangerouslySetInnerHTML={{ __html: marked.parse(streamingFeedback) }} 
                style={{ maxHeight: '400px', overflowY: 'auto' }}
              />
            </div>
          )}
        </div>
      );
    }
    if (data.status === 'ERROR' || data.status === 'FAILED') {
      const errMsg = data.error || '批改过程中发生未知错误';
      return (
        <div className="card" style={{ background: '#fef2f2', color: '#b91c1c', textAlign: 'center', padding: '2rem', marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>❌ 批改失败</h3>
          <p style={{ marginBottom: '1.5rem' }}>{errMsg}</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={() => router.push(`/dashboard?retry=${resolvedParams.id}`)} className="btn btn-primary">
              🔄 重新提交 (保留原内容)
            </button>
            <button onClick={() => router.push('/dashboard')} className="btn btn-outline">
              新建任务
            </button>
          </div>
          {user?.role === 'ADMIN' && (
            <div style={{ textAlign: 'left', marginTop: '1.5rem', background: 'rgba(0,0,0,0.05)', padding: '1rem', borderRadius: '4px', overflow: 'auto' }}>
               <div style={{fontWeight:'bold', marginBottom:'0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                 <span>Admin Debug Info:</span>
                 {debugTotal > 0 && <span style={{fontSize: '0.8rem', fontWeight: 'normal'}}>总大小: {debugTotal} 字符</span>}
               </div>
               
               <div style={{ marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #ccc' }}>
                 <div style={{fontWeight:'600', fontSize:'0.85rem', color:'#666'}}>Parsed Error:</div>
                 <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', marginTop: '0.25rem' }}>{data.error}</pre>
               </div>

               {debugTotal > 0 ? (
                 <>
                   <div style={{fontWeight:'600', fontSize:'0.85rem', color:'#666'}}>AI Raw Response:</div>
                   <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', background: '#fff', padding: '0.5rem', border: '1px solid #ccc', marginTop: '0.25rem' }}>
                     {debugRaw}
                   </pre>
                   {!debugFinished && (
                     <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                       <span style={{ fontSize: '0.8rem' }}>展开更多字符数:</span>
                       <input 
                         type="number" 
                         value={expandAmount} 
                         onChange={e => setExpandAmount(e.target.value)}
                         style={{ width: '80px', padding: '0.3rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #ccc' }}
                       />
                       <button 
                         onClick={() => fetchDebugRaw(debugOffset, parseInt(expandAmount) || 1024)} 
                         className="btn btn-sm btn-outline"
                         style={{ background: '#fff' }}
                       >
                         展开
                       </button>
                       <span style={{ fontSize: '0.8rem', color: '#666' }}>({debugOffset} / {debugTotal})</span>
                     </div>
                   )}
                   {debugFinished && <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>已显示全部 ({debugTotal} 字符)</div>}
                 </>
               ) : (
                 <div style={{ fontSize: '0.8rem', color: '#666' }}>未找到额外原始响应数据。</div>
               )}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const isDone = data.status === 'DONE';
  const parsed = isDone ? JSON.parse(data.feedback) : null;
  const topicImages = JSON.parse(data.topicImageUrls || '[]');
  const essayImages = JSON.parse(data.imageUrls || '[]');

  return (
    <div style={{ padding: '2rem 0', maxWidth: '1000px', margin: '0 auto' }}>
      <button onClick={() => router.push('/history')} className="btn btn-outline" style={{ marginBottom: '1.5rem' }}>&larr; 返回历史记录</button>
      
      {renderStatus()}

      <div style={{ marginTop: isDone ? 0 : '2rem' }}>
        {isDone && parsed && (
          <>
            <div className="card" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <h1 style={{ color: 'var(--primary)', marginBottom: '0.25rem', fontSize: '1.8rem' }}>{data.summary || parsed.summary || '批改报告'}</h1>
                <p style={{ color: 'var(--text-3)', fontSize: '0.95rem' }}>标准: {data.standard} | 满分: {data.fullScore}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="score-badge">{data.score || parsed.score} <span style={{fontSize:'1.2rem', color:'var(--text-3)'}}>/ {data.fullScore}</span></div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--text)', borderLeft: '4px solid var(--accent)', paddingLeft: '0.75rem' }}>总体评价</h3>
              <div className="markdown-body" style={{ fontSize: '1.05rem', color: 'var(--text-2)' }}>{parsed.overall}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              <div className="card">
                <h3 style={{ marginBottom: '1.25rem', borderLeft: '4px solid var(--blue)', paddingLeft: '0.75rem' }}>详细分析</h3>
                <div className="markdown-body" dangerouslySetInnerHTML={{ __html: marked.parse(parsed.details?.[0]?.comment || '') }} />
              </div>
              
              <div className="card" style={{ background: 'var(--green-bg)', borderColor: 'var(--green-border)' }}>
                <h3 style={{ marginBottom: '1.25rem', borderLeft: '4px solid var(--green)', paddingLeft: '0.75rem' }}>修改建议</h3>
                <ul style={{ paddingLeft: '1.2rem' }}>
                  {parsed.suggestions?.map((s: string, i: number) => (
                    <li key={i} style={{ marginBottom: '0.75rem', color: 'var(--text-2)' }}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}

        {/* Contents below are always shown */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1.25rem', borderLeft: '4px solid var(--amber)', paddingLeft: '0.75rem' }}>📌 题目内容</h3>
          {data.title && (
            <div style={{ padding: '1.25rem', background: 'var(--bg-subtle)', borderRadius: '8px', marginBottom: '1rem', color: 'var(--text-2)', fontSize: '1rem' }}>
              {data.title}
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {topicImages.map((src:string, i:number) => (
              <img key={i} src={src} style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '4px', border: '1px solid var(--border)' }} alt={`Topic ${i+1}`} />
            ))}
          </div>
          {!data.title && topicImages.length === 0 && <p style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>未提供题目内容</p>}
        </div>

        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1.25rem', borderLeft: '4px solid var(--blue)', paddingLeft: '0.75rem' }}>✍️ 原始内容</h3>
          <div style={{ padding: '1.5rem', background: '#fffcf5', border: '1px solid #f3e8d2', borderRadius: '8px', whiteSpace: 'pre-wrap', lineHeight: '1.8', color: '#443a25' }}>
            {data.content || "（无文本内容）"}
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '1rem' }}>
            {essayImages.map((src:string, i:number) => <img key={i} src={src} style={{ maxWidth: '100%', maxHeight: '500px', borderRadius: '4px', border: '1px solid var(--border)' }} />)}
          </div>
        </div>

        {isDone && parsed && (
          <>
            {parsed.revised && (
              <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.25rem', borderLeft: '4px solid var(--amber)', paddingLeft: '0.75rem' }}>🔧 修订版范文 (对照修正)</h3>
                <div 
                  className="essay-paper" 
                  style={{ fontSize: '1.05rem' }}
                  dangerouslySetInnerHTML={{ 
                    __html: parsed.revised
                      .replace(/\n/g, '<br/>')
                      .replace(/<delete>(.*?)<\/delete>/g, '<del style="background: var(--red-bg); color: var(--red); text-decoration: line-through; padding: 0 2px; border-radius: 2px;">$1</del>')
                      .replace(/<add>(.*?)<\/add>/g, '<ins style="background: var(--green-bg); color: var(--green); text-decoration: none; font-weight: 600; padding: 0 2px; border-radius: 2px;">$1</ins>')
                  }} 
                />
              </div>
            )}

            {parsed.improved && (
              <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.25rem', borderLeft: '4px solid var(--green)', paddingLeft: '0.75rem' }}>🚀 拔高版范文 (满分参考)</h3>
                <div 
                  className="markdown-body" 
                  style={{ padding: '1.5rem', background: 'var(--green-bg)', borderRadius: '8px', border: '1px solid var(--green-border)', fontStyle: 'normal' }}
                  dangerouslySetInnerHTML={{ __html: marked.parse(parsed.improved) }}
                />
              </div>
            )}
          </>
        )}
      </div>
      <style jsx global>{`
        .markdown-body em { font-style: italic !important; }
        .markdown-body strong { font-weight: 700 !important; }
      `}</style>
    </div>
  );
}
