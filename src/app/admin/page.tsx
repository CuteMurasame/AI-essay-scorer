'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Swal from 'sweetalert2';
import { GripVertical } from 'lucide-react';
import { getExponentialPages } from '@/lib/pagination';

function AdminContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'config';
  const page = parseInt(searchParams.get('page') || '1');

  const [configs, setConfigs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [submissionsData, setSubmissionsData] = useState<{submissions: any[], pagination: any}>({ submissions: [], pagination: {} });
  
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (tab === 'config') fetch('/api/admin/config').then(res => res.json()).then(setConfigs);
    if (tab === 'categories') fetch('/api/admin/categories').then(res => res.json()).then(setCategories);
    if (tab === 'users') fetch('/api/admin/users').then(res => res.json()).then(setUsers);
    if (tab === 'submissions') {
      fetch(`/api/admin/submissions?page=${page}&limit=20`).then(res => res.json()).then(setSubmissionsData);
    }
  }, [tab, page]);

  const refreshData = () => {
    if (tab === 'config') fetch('/api/admin/config').then(res => res.json()).then(setConfigs);
    if (tab === 'categories') fetch('/api/admin/categories').then(res => res.json()).then(setCategories);
    if (tab === 'users') fetch('/api/admin/users').then(res => res.json()).then(setUsers);
    if (tab === 'submissions') fetch(`/api/admin/submissions?page=${page}&limit=20`).then(res => res.json()).then(setSubmissionsData);
  };

  const setTabVal = (newTab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', newTab);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const setPageVal = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const saveConfig = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = Object.fromEntries(formData.entries());
    
    const method = data.id ? 'PUT' : 'POST';
    const res = await fetch('/api/admin/config', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      Swal.fire('成功', '配置已保存', 'success');
      setEditingConfig(null);
      refreshData();
    } else {
      Swal.fire('错误', '保存失败: ' + (await res.text()), 'error');
    }
  };

  const deleteConfig = async (id: string) => {
    const result = await Swal.fire({
      title: '确定要删除此配置吗？',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });
    if (!result.isConfirmed) return;
    const res = await fetch(`/api/admin/config/${id}`, { method: 'DELETE' });
    if (res.ok) { Swal.fire('成功', '已删除', 'success'); refreshData(); }
  };

  const saveCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = Object.fromEntries(formData.entries());
    
    const method = data.id ? 'PUT' : 'POST';
    const res = await fetch('/api/admin/categories', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      Swal.fire('成功', '评分标准已保存', 'success');
      setEditingCategory(null);
      refreshData();
    }
  };

  const deleteCategory = async (id: string) => {
    const result = await Swal.fire({
      title: '确定要删除此评分标准吗？',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });
    if (!result.isConfirmed) return;
    const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
    if (res.ok) { Swal.fire('成功', '已删除', 'success'); refreshData(); }
  };

  const recharge = async (userId: string) => {
    const { value: amount } = await Swal.fire({
      title: '请输入充值积分数量（可为负数）',
      input: 'text',
      showCancelButton: true,
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    });
    if (!amount) return;
    const res = await fetch('/api/admin/users/recharge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, amount }),
    });
    if (res.ok) { Swal.fire('成功', '充值成功', 'success'); refreshData(); }
  };

  const batchRecharge = async () => {
    if (selectedUsers.length === 0) { Swal.fire('提示', '请选择至少一个用户', 'info'); return; }
    const { value: amount } = await Swal.fire({
      title: `为选中的 ${selectedUsers.length} 个用户批量充值积分（可为负数）`,
      input: 'text',
      showCancelButton: true,
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    });
    if (!amount) return;
    const res = await fetch('/api/admin/users/recharge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: selectedUsers, amount }),
    });
    if (res.ok) { 
      Swal.fire('成功', '批量充值成功', 'success'); 
      setSelectedUsers([]);
      refreshData(); 
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index.toString());
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = async (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;

    const newConfigs = [...configs];
    const [draggedItem] = newConfigs.splice(draggedIndex, 1);
    newConfigs.splice(index, 0, draggedItem);

    setConfigs(newConfigs);
    setDraggedIndex(null);

    const items = newConfigs.map((c, i) => ({ id: c.id, sortOrder: i }));
    await fetch('/api/admin/config/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
  };

  const applyApiKeyToMultiple = async (sourceId: string) => {
    const source = configs.find(c => c.id === sourceId);
    if (!source) return;
    
    const targets = configs.filter(c => c.id !== sourceId);
    if (targets.length === 0) { Swal.fire('提示', '没有其他配置可应用', 'info'); return; }
    
    const { value: selectedIds } = await Swal.fire({
      title: '选择目标配置',
      html: `
        <div style="text-align: left; max-height: 300px; overflow-y: auto;">
          <p style="margin-bottom: 10px; font-size: 0.9em; color: #666;">
            将 <b>${source.displayName || source.name}</b> 的 API Key 和 Endpoint 应用到:
          </p>
          ${targets.map(t => `
            <div style="margin-bottom: 8px;">
              <input type="checkbox" id="chk_${t.id}" value="${t.id}" class="swal2-checkbox" style="margin-right: 8px; display: inline-block;">
              <label for="chk_${t.id}" style="cursor: pointer;">${t.displayName || t.name}</label>
            </div>
          `).join('')}
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '应用',
      cancelButtonText: '取消',
      preConfirm: () => {
        const checkboxes = document.querySelectorAll<HTMLInputElement>('input[id^="chk_"]:checked');
        const ids: string[] = [];
        checkboxes.forEach((cb) => ids.push(cb.value));
        if (ids.length === 0) Swal.showValidationMessage('请至少选择一个配置');
        return ids;
      }
    });
    
    if (!selectedIds || selectedIds.length === 0) return;
    
    for (const targetId of selectedIds) {
      const fullTarget = configs.find(c => c.id === targetId);
      if (!fullTarget) continue;

      await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...fullTarget,
          apiKey: source.apiKey,
          endpoint: source.endpoint,
        }),
      });
    }
    Swal.fire('成功', '已应用到选中的配置', 'success');
    refreshData();
  };

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">管理面板</h1>
          <p className="page-subtitle">配置 AI 模型、评分标准和用户积分</p>
        </div>
      </div>

      <div className="admin-layout">
        <aside>
          <div className="card" style={{ padding: '0.5rem' }}>
            <nav>
              {[
                { key: 'config', label: '🤖 AI 配置' },
                { key: 'categories', label: '📊 评分标准' },
                { key: 'users', label: '👥 用户管理' },
                { key: 'submissions', label: '📝 批改记录' },
              ].map(item => (
                <button
                  key={item.key}
                  onClick={() => setTabVal(item.key)}
                  className={`btn btn-ghost ${tab === item.key ? 'active' : ''}`}
                  style={{ 
                    width: '100%', 
                    justifyContent: 'flex-start',
                    background: tab === item.key ? 'var(--bg-subtle)' : 'transparent',
                    fontWeight: tab === item.key ? '600' : '500'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <section>
          {tab === 'config' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: '700' }}>AI 模型配置</h2>
                <button className="btn btn-primary" onClick={() => setEditingConfig({})}>+ 添加配置</button>
              </div>

              {editingConfig && (
                <div className="card" style={{ marginBottom: '2rem', background: 'var(--blue-bg)' }}>
                  <h3 style={{ marginBottom: '1rem' }}>{editingConfig.id ? '编辑配置' : '新增配置'}</h3>
                  <form onSubmit={saveConfig}>
                    <input type="hidden" name="id" value={editingConfig.id || ''} />
                    <div className="grid-2" style={{ gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">配置名称*</label>
                        <input name="name" className="form-input" defaultValue={editingConfig.name} required placeholder="例: gpt4-turbo" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">显示名称</label>
                        <input name="displayName" className="form-input" defaultValue={editingConfig.displayName} placeholder="用户看到的名称" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">API Key*</label>
                        <input name="apiKey" className="form-input" defaultValue={editingConfig.apiKey} required type="text" placeholder="sk-..." />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Endpoint*</label>
                        <input name="endpoint" className="form-input" defaultValue={editingConfig.endpoint} required placeholder="https://..." />
                      </div>
                      <div className="form-group">
                        <label className="form-label">模型名称*</label>
                        <input name="model" className="form-input" defaultValue={editingConfig.model} required placeholder="gpt-4o" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">积分消耗</label>
                        <input name="creditCost" type="number" className="form-input" defaultValue={editingConfig.creditCost || 0} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                      <button type="submit" className="btn btn-primary">保存</button>
                      <button type="button" className="btn btn-outline" onClick={() => setEditingConfig(null)}>取消</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>排序</th>
                      <th>配置名称</th>
                      <th>模型</th>
                      <th>API Key</th>
                      <th>积分消耗</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configs.map((c, index) => (
                      <tr 
                        key={c.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={() => handleDrop(index)}
                        style={{ opacity: draggedIndex === index ? 0.5 : 1, cursor: 'move' }}
                      >
                        <td style={{ width: '40px', textAlign: 'center' }}>
                          <GripVertical size={18} style={{ color: '#aaa' }} />
                        </td>
                        <td>
                          <div style={{ fontWeight: '600' }}>{c.displayName || c.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{c.name}</div>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{c.model}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-2)' }}>
                          {c.apiKey ? (c.apiKey.substring(0, 10) + '...') : '-'}
                        </td>
                        <td><div className="badge badge-blue">{c.creditCost} 积分</div></td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-sm btn-outline" onClick={() => setEditingConfig(c)}>编辑</button>
                            <button className="btn btn-sm btn-outline" onClick={() => applyApiKeyToMultiple(c.id)}>应用到其他</button>
                            {c.name !== 'BASE' && <button className="btn btn-sm btn-danger" onClick={() => deleteConfig(c.id)}>删除</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'categories' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: '700' }}>评分标准</h2>
                <button className="btn btn-primary" onClick={() => setEditingCategory({})}>+ 添加标准</button>
              </div>

              {editingCategory && (
                <div className="card" style={{ marginBottom: '2rem', background: 'var(--green-bg)' }}>
                  <h3 style={{ marginBottom: '1rem' }}>{editingCategory.id ? '编辑评分标准' : '新增评分标准'}</h3>
                  <form onSubmit={saveCategory}>
                    <input type="hidden" name="id" value={editingCategory.id || ''} />
                    <div className="grid-2" style={{ gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">标准名称*</label>
                        <input name="name" className="form-input" defaultValue={editingCategory.name} required placeholder="例: CET4" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">显示名称</label>
                        <input name="displayName" className="form-input" defaultValue={editingCategory.displayName} placeholder="例: 大学英语四级" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">默认满分</label>
                      <input name="defaultFull" type="number" className="form-input" defaultValue={editingCategory.defaultFull || 100} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">额外提示信息（给AI的）</label>
                      <textarea name="extraPrompt" className="form-textarea" defaultValue={editingCategory.extraPrompt} rows={3} placeholder="可选，在批改时会额外传递给AI的提示信息" />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                      <button type="submit" className="btn btn-primary">保存</button>
                      <button type="button" className="btn btn-outline" onClick={() => setEditingCategory(null)}>取消</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table>
                  <thead>
                    <tr>
                      <th>标准名称</th>
                      <th>默认满分</th>
                      <th>额外提示</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(cat => (
                      <tr key={cat.id}>
                        <td>
                          <div style={{ fontWeight: '600' }}>{cat.displayName || cat.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{cat.name}</div>
                        </td>
                        <td><div className="badge badge-gray">{cat.defaultFull}</div></td>
                        <td style={{ maxWidth: '300px', fontSize: '0.85rem', color: 'var(--text-2)' }}>
                          {cat.extraPrompt ? cat.extraPrompt.substring(0, 50) + (cat.extraPrompt.length > 50 ? '...' : '') : '-'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-sm btn-outline" onClick={() => setEditingCategory(cat)}>编辑</button>
                            <button className="btn btn-sm btn-danger" onClick={() => deleteCategory(cat.id)}>删除</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: '700' }}>用户管理</h2>
                {selectedUsers.length > 0 && (
                  <button className="btn btn-primary" onClick={batchRecharge}>
                    批量充值 ({selectedUsers.length} 人)
                  </button>
                )}
              </div>

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedUsers.length === users.length && users.length > 0}
                          onChange={(e) => setSelectedUsers(e.target.checked ? users.map(u => u.id) : [])}
                        />
                      </th>
                      <th>用户名</th>
                      <th>积分余额</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td>
                          <input 
                            type="checkbox" 
                            checked={selectedUsers.includes(u.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers([...selectedUsers, u.id]);
                              } else {
                                setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                              }
                            }}
                          />
                        </td>
                        <td>
                          <div style={{ fontWeight: '600' }}>{u.username}</div>
                          {u.role === 'ADMIN' && <div className="badge badge-blue">管理员</div>}
                        </td>
                        <td style={{ fontWeight: '700', color: 'var(--text)' }}>{u.credits} 积分</td>
                        <td>
                          <button className="btn btn-sm btn-outline" onClick={() => recharge(u.id)}>充值</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'submissions' && (
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '1.5rem' }}>批改记录</h2>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table>
                  <thead>
                    <tr>
                      <th>用户</th>
                      <th>标题</th>
                      <th>分数</th>
                      <th>时间</th>
                      <th>状态</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(submissionsData.submissions || []).map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: '600' }}>{s.user?.username}</td>
                        <td style={{ maxWidth: '200px' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.summary || s.title || '无标题'}
                          </div>
                        </td>
                        <td style={{ fontWeight: '700' }}>{s.score ? s.score.toFixed(1) : '-'}</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>
                          {new Date(s.createdAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td>
                          {s.status === 'COMPLETED' && <div className="badge badge-green">完成</div>}
                          {s.status === 'FAILED' && <div className="badge badge-red">失败</div>}
                          {s.status === 'PROCESSING' && <div className="badge badge-amber">处理中</div>}
                        </td>
                        <td>
                          <a href={`/history/${s.id}`} target="_blank" className="btn btn-sm btn-outline" style={{ textDecoration: 'none' }}>
                            查看
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                {submissionsData.pagination && getExponentialPages(submissionsData.pagination.page, submissionsData.pagination.totalPages).map(p => (
                  <button
                    key={p}
                    onClick={() => setPageVal(p)}
                    className={`btn ${p === submissionsData.pagination.page ? 'btn-primary' : 'btn-outline'}`}
                    style={{ 
                      padding: '0.4rem 0.8rem', 
                      minWidth: '40px',
                      fontSize: '0.9rem',
                      fontWeight: p === submissionsData.pagination.page ? '700' : '500',
                      boxShadow: 'none'
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminContent />
    </Suspense>
  );
}
