'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Swal from 'sweetalert2';

function DashboardContent() {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [essayImages, setEssayImages] = useState<string[]>([]);
  const [topicImages, setTopicImages] = useState<string[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('中文');
  const [customLanguage, setCustomLanguage] = useState('');
  const [customFullScore, setCustomFullScore] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  
  const essayFileRef = useRef<HTMLInputElement>(null);
  const topicFileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    fetch('/api/user/profile', { cache: 'no-store' }).then(res => res.json()).then(setUser);
    
    Promise.all([
      fetch('/api/admin/config', { cache: 'no-store' }).then(res => res.json()),
      fetch('/api/admin/categories', { cache: 'no-store' }).then(res => res.json())
    ]).then(([configData, catData]) => {
      const filtered = Array.isArray(configData) ? configData.filter((c:any) => c.name !== 'BASE') : [];
      setConfigs(filtered);
      if (filtered.length > 0) setSelectedConfig(filtered[0].id);

      const safeData = Array.isArray(catData) ? catData : [];
      setCategories(safeData);
      if (safeData.length > 0) setSelectedCategory(safeData[0].name);
      
      setInitialLoad(false);
    });
  }, []);

  useEffect(() => {
    if (initialLoad) return;
    const retryId = searchParams.get('retry');
    if (retryId) {
      fetch(`/api/essay/${retryId}`)
        .then(res => res.json())
        .then(data => {
          if (data && (data.id || !data.error)) {
            if (data.title) setTitle(data.title);
            if (data.content) setText(data.content);
            if (data.topicImageUrls) setTopicImages(JSON.parse(data.topicImageUrls));
            if (data.imageUrls) setEssayImages(JSON.parse(data.imageUrls));
            if (data.level) setSelectedConfig(data.level);
            if (data.standard) setSelectedCategory(data.standard);
            if (data.fullScore) setCustomFullScore(data.fullScore.toString());
            
            if (data.language) {
               if (['中文', 'English'].includes(data.language)) {
                  setSelectedLanguage(data.language);
               } else {
                  setSelectedLanguage('Other');
                  setCustomLanguage(data.language);
               }
            }
          }
        })
        .catch(err => console.error("Failed to load retry data:", err));
    }
  }, [searchParams, initialLoad]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, setImages: React.Dispatch<React.SetStateAction<string[]>>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    const uploadPromises = fileArray.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    try {
      const newImages = await Promise.all(uploadPromises);
      setImages(prev => [...prev, ...newImages]);
    } catch (err) {
      console.error('Upload failed:', err);
      Swal.fire('错误', '部分图片上传失败', 'error');
    }
    
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const removeImage = (index: number, setImages: React.Dispatch<React.SetStateAction<string[]>>) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/essay/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title, 
          text, 
          configId: selectedConfig, 
          standard: selectedCategory, 
          essayImages, 
          topicImages, 
          fullScore: customFullScore,
          language: selectedLanguage === 'Other' ? customLanguage : selectedLanguage
        }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) router.push(`/history/${data.id}`);
      else { Swal.fire('错误', data.error, 'error'); setLoading(false); }
    } catch (err) { Swal.fire('错误', '提交失败', 'error'); setLoading(false); }
  };

  const canProceedStep1 = (title || topicImages.length > 0) && (text || essayImages.length > 0);

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">创建批改任务</h1>
          <p className="page-subtitle">逐步上传内容，选择评分标准与模型</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="nav-credits" style={{ fontSize: '0.95rem' }}>{user?.credits || 0} 积分</div>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="steps">
        <div className={`step-item ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
          <div className="step-num">{step > 1 ? '✓' : '1'}</div>
          <span className="step-label">上传内容</span>
        </div>
        <div className="step-connector"></div>
        <div className={`step-item ${step >= 2 ? 'active' : ''}`}>
          <div className="step-num">2</div>
          <span className="step-label">选择配置</span>
        </div>
      </div>

      {step === 1 && (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div className="card card-lg">
            <div style={{ marginBottom: '2rem' }}>
              <label className="form-label" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>📝 题目内容</label>
              <textarea 
                className="form-textarea" 
                rows={3} 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                placeholder="输入作文题目（或上传题目照片）" 
                style={{ marginBottom: '1rem' }}
              />
              <div className="upload-zone" onClick={() => topicFileRef.current?.click()}>
                {topicImages.length === 0 ? (
                  <div><div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</div><div>点击上传题目照片（可选）</div></div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {topicImages.map((src, i) => (
                      <div key={i} style={{ position: 'relative' }}>
                        <img src={src} style={{ height: '100px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} alt="" />
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeImage(i, setTopicImages); }}
                          style={{ position: 'absolute', top: -8, right: -8, background: 'var(--red)', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12 }}
                        >✕</button>
                      </div>
                    ))}
                    <div style={{ height: '100px', width: '100px', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>+</div>
                  </div>
                )}
              </div>
              <input type="file" multiple accept="image/*" ref={topicFileRef} hidden onChange={e => handleUpload(e, setTopicImages)} />
            </div>

            <div className="divider"></div>

            <div>
              <label className="form-label" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>✍️ 作文内容</label>
              <textarea 
                className="form-textarea" 
                rows={10} 
                value={text} 
                onChange={e => setText(e.target.value)} 
                placeholder="输入作文正文（或上传手写照片）" 
                style={{ marginBottom: '1rem' }}
              />
              <div className="upload-zone" onClick={() => essayFileRef.current?.click()} style={{ borderColor: essayImages.length > 0 ? 'var(--blue)' : undefined }}>
                {essayImages.length === 0 ? (
                  <div><div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📸</div><div>点击上传作文照片（推荐）</div></div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {essayImages.map((src, i) => (
                      <div key={i} style={{ position: 'relative' }}>
                        <img src={src} style={{ height: '120px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} alt="" />
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeImage(i, setEssayImages); }}
                          style={{ position: 'absolute', top: -8, right: -8, background: 'var(--red)', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 12 }}
                        >✕</button>
                      </div>
                    ))}
                    <div style={{ height: '120px', width: '120px', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>+</div>
                  </div>
                )}
              </div>
              <input type="file" multiple accept="image/*" ref={essayFileRef} hidden onChange={e => handleUpload(e, setEssayImages)} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
            <button className="btn btn-outline" onClick={() => router.push('/history')}>取消</button>
            <button className="btn btn-primary btn-lg" onClick={() => setStep(2)} disabled={!canProceedStep1}>
              下一步 →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div className="card card-lg" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>选择评分标准</h3>
            <div className="grid-3">
              {categories.map(cat => (
                <div 
                  key={cat.id} 
                  className={`select-card ${selectedCategory === cat.name ? 'selected' : ''}`}
                  onClick={() => setSelectedCategory(cat.name)}
                >
                  <div className="select-card-check">✓</div>
                  <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.3rem' }}>{cat.displayName || cat.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>满分: {cat.defaultFull}</div>
                  {cat.extraPrompt && <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.4rem' }}>{cat.extraPrompt}</div>}
                </div>
              ))}
            </div>
            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label className="form-label">自定义满分（可选）</label>
              <input 
                type="number" 
                className="form-input" 
                value={customFullScore} 
                onChange={e => setCustomFullScore(e.target.value)} 
                placeholder="留空则使用该标准默认满分" 
              />
            </div>
          </div>

          <div className="card card-lg" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>🌍 反馈语言</h3>
            <div className="grid-3">
              {['中文', 'English', 'Other'].map(lang => (
                <div 
                  key={lang} 
                  className={`select-card ${selectedLanguage === lang ? 'selected' : ''}`}
                  onClick={() => setSelectedLanguage(lang)}
                >
                  <div className="select-card-check">✓</div>
                  <div style={{ fontWeight: '700', fontSize: '1rem' }}>{lang === 'Other' ? '自定义' : lang}</div>
                </div>
              ))}
            </div>
            {selectedLanguage === 'Other' && (
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  value={customLanguage} 
                  onChange={e => setCustomLanguage(e.target.value)} 
                  placeholder="例如: 日本語, Français..." 
                />
              </div>
            )}
          </div>

          <div className="card card-lg">
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>选择AI模型</h3>
            <div className="grid-2">
              {configs.map(cfg => (
                <div 
                  key={cfg.id} 
                  className={`select-card ${selectedConfig === cfg.id ? 'selected' : ''}`}
                  onClick={() => setSelectedConfig(cfg.id)}
                >
                  <div className="select-card-check">✓</div>
                  <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.3rem' }}>{cfg.displayName || cfg.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: '0.5rem' }}>{cfg.model}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div className="badge badge-blue">{cfg.creditCost} 积分</div>
                    <div className="badge badge-gray" style={{ fontSize: '0.7rem' }}>
                      平均响应: {cfg.avgResponseTime ? `${cfg.avgResponseTime.toFixed(1)}s` : '暂无数据'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '1.5rem' }}>
            <button className="btn btn-outline btn-lg" onClick={() => setStep(1)}>← 上一步</button>
            <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={loading}>
              {loading ? '提交中...' : '创建任务'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', marginTop: '3rem' }}>正在加载...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
