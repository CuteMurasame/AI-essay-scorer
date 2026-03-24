'use client';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [tab, setTab] = useState('config');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    fetch('/api/admin/config', { credentials: 'include' }).then(res => res.json()).then(setConfigs);
    fetch('/api/admin/categories', { credentials: 'include' }).then(res => res.json()).then(setCategories);
    fetch('/api/admin/users', { credentials: 'include' }).then(res => res.json()).then(setUsers);
    fetch('/api/admin/submissions', { credentials: 'include' }).then(res => res.json()).then(setSubmissions);
  };

  const saveConfig = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const res = await fetch('/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      alert('配置已成功持久化');
      fetchData();
    }
  };

  const recharge = async (userId: string) => {
    const amount = prompt('请输入充值积分数量:');
    if (!amount) return;
    const res = await fetch('/api/admin/users/recharge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, amount }),
    });
    if (res.ok) { alert('充值成功'); fetchData(); }
  };

  const standards = ['Zhongkao', 'Gaokao', 'CET4', 'CET6', 'TOEFL', 'IELTS'];

  return (
    <div className="grid-admin" style={{ marginTop: '2rem' }}>
      <aside className="admin-sidebar card" style={{ padding: '1rem' }}>
        <nav>
          <ul style={{ listStyle: 'none' }}>
            <li style={{ marginBottom: '0.5rem' }}><button onClick={() => setTab('config')} className={tab === 'config' ? 'active' : ''} style={{ width: '100%', padding: '0.75rem', border: 'none', background: tab === 'config' ? 'var(--accent)' : 'none', color: tab === 'config' ? 'var(--primary)' : 'inherit', cursor: 'pointer', borderRadius: '8px', textAlign: 'left', fontWeight: 'bold' }}>AI 档位配置</button></li>
            <li style={{ marginBottom: '0.5rem' }}><button onClick={() => setTab('standard')} className={tab === 'standard' ? 'active' : ''} style={{ width: '100%', padding: '0.75rem', border: 'none', background: tab === 'standard' ? 'var(--accent)' : 'none', color: tab === 'standard' ? 'var(--primary)' : 'inherit', cursor: 'pointer', borderRadius: '8px', textAlign: 'left', fontWeight: 'bold' }}>满分标准设置</button></li>
            <li style={{ marginBottom: '0.5rem' }}><button onClick={() => setTab('users')} className={tab === 'users' ? 'active' : ''} style={{ width: '100%', padding: '0.75rem', border: 'none', background: tab === 'users' ? 'var(--accent)' : 'none', color: tab === 'users' ? 'var(--primary)' : 'inherit', cursor: 'pointer', borderRadius: '8px', textAlign: 'left', fontWeight: 'bold' }}>用户与充值</button></li>
            <li style={{ marginBottom: '0.5rem' }}><button onClick={() => setTab('submissions')} className={tab === 'submissions' ? 'active' : ''} style={{ width: '100%', padding: '0.75rem', border: 'none', background: tab === 'submissions' ? 'var(--accent)' : 'none', color: tab === 'submissions' ? 'var(--primary)' : 'inherit', cursor: 'pointer', borderRadius: '8px', textAlign: 'left', fontWeight: 'bold' }}>批改记录</button></li>
          </ul>
        </nav>
      </aside>

      <section>
        {tab === 'config' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
            {['BASE', 'LOW', 'MED', 'HIGH'].map(level => {
              const c = configs.find(x => x.level === level) || { level, displayName: '', apiKey: '', endpoint: '', model: '', creditCost: 0 };
              return (
                <div key={level} className="card">
                  <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>{level} {level === 'BASE' && '(安全审查)'}</h3>
                  <form onSubmit={saveConfig}>
                    <input type="hidden" name="level" value={level} />
                    <div className="form-group"><label>显示名称 (用于用户选择)</label><input name="displayName" defaultValue={c.displayName} autoComplete="off" /></div>
                    <div className="form-group"><label>API Key</label><input name="apiKey" defaultValue={c.apiKey} autoComplete="off" /></div>
                    <div className="form-group"><label>Endpoint</label><input name="endpoint" defaultValue={c.endpoint} autoComplete="off" /></div>
                    <div className="form-group"><label>模型名称</label><input name="model" defaultValue={c.model} autoComplete="off" /></div>
                    <div className="form-group"><label>积分消耗</label><input name="creditCost" type="number" defaultValue={c.creditCost} /></div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>保存该档位</button>
                  </form>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'standard' && (
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem' }}>各考试标准默认满分</h3>
            {standards.map(std => {
              const c = categories.find(x => x.standard === std) || { standard: std, defaultFull: 100 };
              return (
                <div key={std} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderBottom: '1px solid #eee' }}>
                  <div style={{ width: '150px', fontWeight: 'bold' }}>{std}</div>
                  <input type="number" defaultValue={c.defaultFull} onBlur={(e) => {
                    fetch('/api/admin/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ standard: std, defaultFull: e.target.value }) });
                  }} style={{ width: '100px' }} />
                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}>(失去焦点自动保存)</span>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'users' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr><th style={{ padding: '1rem', textAlign: 'left' }}>用户名</th><th style={{ padding: '1rem', textAlign: 'left' }}>积分余额</th><th style={{ padding: '1rem', textAlign: 'left' }}>操作</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1rem' }}>{u.username} {u.role === 'ADMIN' && <span className="badge badge-low" style={{ background: '#eff6ff', color: '#2563eb' }}>管理员</span>}</td>
                    <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--primary)' }}>{u.credits} PTS</td>
                    <td style={{ padding: '1rem' }}><button onClick={() => recharge(u.id)} className="btn btn-outline" style={{ fontSize: '0.8rem' }}>充值积分</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'submissions' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>用户</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>标题</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>分数</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>时间</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>状态</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1rem' }}>{s.user?.username}</td>
                    <td style={{ padding: '1rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.summary || s.title || '无标题'}</td>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{s.score ? s.score.toFixed(1) : '-'}</td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#64748b' }}>{new Date(s.createdAt).toLocaleString()}</td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge badge-${s.status === 'COMPLETED' ? 'high' : s.status === 'FAILED' ? 'low' : 'med'}`}>
                        {s.status === 'COMPLETED' ? '完成' : s.status === 'FAILED' ? '失败' : '处理中'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <a href={`/history/${s.id}`} target="_blank" className="btn btn-outline" style={{ fontSize: '0.8rem', textDecoration: 'none' }}>查看详情</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
