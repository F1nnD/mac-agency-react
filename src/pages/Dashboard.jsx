import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { api, getCurrentUser, logout } from '../utils/apiClient';
import FloorPlansTab from '../components/admin/FloorPlansTab';
import ConceptsTab from '../components/admin/ConceptsTab';
import LeadsTab from '../components/admin/LeadsTab';
import MaterialsTab from '../components/admin/MaterialsTab';
import MarketPricesTab from '../components/admin/MarketPricesTab';
import StatsTab from '../components/admin/StatsTab';
import SettingsTab from '../components/admin/SettingsTab';
import AdminAI from '../components/admin/AdminAI';

export default function Dashboard() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('projects-tab');
  const [globalProjects, setGlobalProjects] = useState({});
  const [globalPackages, setGlobalPackages] = useState({});

  const [globalDrafts, setGlobalDrafts] = useState([]);
  const [dId, setDId] = useState('');
  const [draftFormTitle, setDraftFormTitle] = useState('Chọn một mẫu Draft hoặc bấm nút Thêm mới');
  const [dKey, setDKey] = useState('');
  const [dName, setDName] = useState('');
  const [dPrice, setDPrice] = useState(350000);
  const [dImage, setDImage] = useState('');

  const [dMinArea, setDMinArea] = useState(50);
  const [dMaxArea, setDMaxArea] = useState(150);
  const [dSiteStatus, setDSiteStatus] = useState('all');

  const [pId, setPId] = useState('');
  const [formTitle, setFormTitle] = useState('Chọn một dự án ở trên hoặc bấm nút Thêm mới');
  const [pName, setPName] = useState('');
  const [pBreadcrumb, setPBreadcrumb] = useState('');
  const [pType, setPType] = useState('');
  const [pLocation, setPLocation] = useState('');
  const [pArea, setPArea] = useState('');
  const [pYear, setPYear] = useState('');

  const [pSubtitle, setPSubtitle] = useState('');
  const [pQuote, setPQuote] = useState('');
  const [pDesc1, setPDesc1] = useState('');
  const [pDesc2, setPDesc2] = useState('');
  const [pProjectDesc, setPProjectDesc] = useState('');

  const [pImg1, setPImg1] = useState('');
  const [pImg2, setPImg2] = useState('');
  const [pImg3, setPImg3] = useState('');
  const [pImg4, setPImg4] = useState('');

  const currentUser = getCurrentUser();

  // ===== FETCH =====
  const fetchProjectsFromDB = async () => {
    try {
      const projData = await api.get('/api/projects');
      if (projData && (Array.isArray(projData) ? projData.length > 0 : Object.keys(projData).length > 0)) {
        if (Array.isArray(projData)) {
          const formattedObj = {};
          projData.forEach(p => {
            const key = p.breadcrumb || `project_${p._id}`;
            formattedObj[key] = p;
          });
          setGlobalProjects(formattedObj);
        } else {
          setGlobalProjects(projData);
        }
        return;
      }
      throw new Error('Dữ liệu Database trống');
    } catch (error) {
      console.warn('API Database chưa thông suốt:', error.message);
    }
  };

  const fetchDraftsFromDB = async () => {
    try {
      const data = await api.get('/api/drafts');
      setGlobalDrafts(data);
    } catch (error) {
      console.error('Lỗi đọc danh mục Draft Admin:', error.message);
    }
  };

  const fetchPackagesFromDB = async () => {
    try {
      const cachedPack = localStorage.getItem('mac_packages_cache');
      if (cachedPack) {
        setGlobalPackages(JSON.parse(cachedPack));
        return;
      }
      const packData = await api.get('/api/packages');
      setGlobalPackages(packData);
      localStorage.setItem('mac_packages_cache', JSON.stringify(packData));
    } catch (error) {
      console.error('Lỗi đọc bảng giá:', error.message);
    }
  };

  // ===== EFFECT: CHECK AUTH + LOAD =====
  useEffect(() => {
    const token = localStorage.getItem('mac_token');
    const user = getCurrentUser();

    if (!token || !user) {
      navigate('/admin/login');
      return;
    }

    if (!['admin', 'staff'].includes(user.role)) {
      alert('Bạn không có quyền truy cập trang quản trị.');
      logout();
      navigate('/admin/login');
      return;
    }

    async function loadInitialConfig() {
      try {
        await fetchProjectsFromDB();
        await fetchDraftsFromDB();
        await fetchPackagesFromDB();
      } catch (error) {
        console.error('Lỗi khởi tạo Dashboard:', error);
      }
    }
    loadInitialConfig();

    gsap.fromTo('.admin-panel-reveal', { opacity: 0, y: 15 }, { duration: 0.6, opacity: 1, y: 0, ease: 'power2.out' });
  }, [navigate]);

  // ===== PROJECT HANDLERS =====
  const fillProjectToForm = (proj) => {
    const targetId = proj._id || proj.id || '';
    setPId(targetId);
    setFormTitle(`Đang sửa dự án: ${proj.name || proj.breadcrumb}`);
    setPName(proj.name || '');
    setPBreadcrumb(proj.breadcrumb || '');
    setPType(proj.type || 'Architecture • Interior');
    setPLocation(proj.location || 'TP. Hồ Chí Minh');
    setPArea(proj.area || '100 m²');
    setPYear(proj.year || '2026');
    setPSubtitle(proj.subtitle || '');
    setPQuote(proj.quote || '');
    setPDesc1(proj.desc1 || '');
    setPDesc2(proj.desc2 || '');
    setPProjectDesc(proj.projectDesc || '');
    setPImg1(proj.img1 || '');
    setPImg2(proj.img2 || '');
    setPImg3(proj.img3 || '');
    setPImg4(proj.img4 || '');

    const formEl = document.getElementById('project-form-anchor');
    if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
  };

  const clearProjectForm = () => {
    setPId('');
    setFormTitle('Thêm dự án mới hoàn toàn');
    setPName(''); setPBreadcrumb(''); setPType(''); setPLocation('');
    setPArea(''); setPYear(''); setPSubtitle(''); setPQuote('');
    setPDesc1(''); setPDesc2(''); setPProjectDesc('');
    setPImg1(''); setPImg2(''); setPImg3(''); setPImg4('');
  };

  const handleImageUploadHelper = (file, setTargetState) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setTargetState(reader.result);
    reader.readAsDataURL(file);
  };

  const saveProjectData = async (e) => {
    e.preventDefault();
    if (!pName || !pBreadcrumb) {
      alert('Vui lòng điền tối thiểu Tên dự án và Breadcrumb.');
      return;
    }
    const isEdit = pId && pId.trim().length > 0;
    const payload = {
      name: pName,
      breadcrumb: pBreadcrumb.toLowerCase().trim().replace(/\s+/g, '-'),
      type: pType,
      location: pLocation,
      area: pArea,
      year: pYear,
      subtitle: pSubtitle,
      quote: pQuote,
      desc1: pDesc1,
      desc2: pDesc2,
      projectDesc: pProjectDesc,
      img1: pImg1 || 'assets/pic/Under.jpg',
      img2: pImg2,
      img3: pImg3,
      img4: pImg4
    };

    try {
      if (isEdit) {
        await api.put(`/api/projects/${pId}`, payload);
        alert('Cập nhật thông tin dự án thành công.');
      } else {
        await api.post('/api/projects', payload);
        alert('Đã tạo mới dự án thành công.');
      }
      clearProjectForm();
      localStorage.removeItem('mac_portfolio_cache');
      await fetchProjectsFromDB();
    } catch (err) {
      alert(err.message || 'Lỗi kết nối tới Backend.');
    }
  };

  const handleDeleteProject = async (id, name) => {
    if (!id) return;
    if (!window.confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN dự án "${name}" không?`)) return;
    try {
      await api.delete(`/api/projects/${id}`);
      alert(`Đã xóa dự án "${name}".`);
      await fetchProjectsFromDB();
      if (pId === id) clearProjectForm();
    } catch (err) {
      alert(err.message || 'Lỗi kết nối mạng.');
    }
  };

  const savePackagesData = (e) => {
    e.preventDefault();
    localStorage.setItem('mac_packages_cache', JSON.stringify(globalPackages));
    alert('Bảng định biên đơn giá đã được đồng bộ.');
  };

  // ===== DRAFT HANDLERS =====
  const fillDraftToForm = (draft) => {
    setDId(draft._id);
    setDraftFormTitle(`Đang sửa Draft Layout: ${draft.name}`);
    setDKey(draft.key);
    setDName(draft.name);
    setDPrice(draft.basePricePerM2);
    setDImage(draft.demoImage);
    setDMinArea(draft.minArea || 0);
    setDMaxArea(draft.maxArea || 5000);
    setDSiteStatus(draft.siteStatus || 'all');
  };

  const clearDraftForm = () => {
    setDId('');
    setDraftFormTitle('Thêm Draft Layout mới hoàn toàn');
    setDKey('');
    setDName('');
    setDPrice(350000);
    setDImage('');
    setDMinArea(50);
    setDMaxArea(150);
    setDSiteStatus('all');
  };

  const saveDraftData = async (e) => {
    e.preventDefault();
    if (!dKey || !dName || !dPrice || !dImage) {
      alert('Vui lòng điền đầy đủ thông tin Draft và chọn file ảnh sơ đồ.');
      return;
    }
    const isEdit = dId && dId.trim().length > 0;
    const payload = {
      key: dKey.toLowerCase().trim().replace(/\s+/g, '-'),
      name: dName,
      basePricePerM2: Number(dPrice),
      demoImage: dImage,
      minArea: Number(dMinArea),
      maxArea: Number(dMaxArea),
      siteStatus: dSiteStatus
    };

    try {
      if (isEdit) {
        await api.put(`/api/drafts/${dId}`, payload);
        alert('Cập nhật Draft Layout thành công.');
      } else {
        await api.post('/api/drafts', payload);
        alert('Đã thêm Draft Layout mới thành công.');
      }
      clearDraftForm();
      await fetchDraftsFromDB();
    } catch (err) {
      console.error('Lỗi API Draft:', err);
      alert(err.message || 'Lỗi kết nối tới Backend.');
    }
  };

  const handleDeleteDraft = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn XÓA vĩnh viễn Draft Layout "${name}" không?`)) return;
    try {
      await api.delete(`/api/drafts/${id}`);
      alert('Đã xóa Draft khỏi hệ thống.');
      await fetchDraftsFromDB();
      if (dId === id) clearDraftForm();
    } catch (err) {
      alert(err.message || 'Lỗi kết nối mạng.');
    }
  };

  const handleLogout = () => {
    if (!window.confirm('Bạn có chắc muốn đăng xuất?')) return;
    logout();
    navigate('/admin/login');
  };

  // ===== RENDER =====
  return (
    <div className="w-full min-h-screen bg-[#050505] text-gray-300 antialiased font-sans flex flex-col md:flex-row admin-panel-reveal">
      <style>{`
        .tab-content-anim { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <aside className="w-full md:w-64 bg-black border-b md:border-b-0 md:border-r border-white/5 flex flex-col justify-between p-6 select-none shrink-0 text-left">
        <div className="space-y-8">
          <div className="flex flex-col border-b border-white/5 pb-5">
            <span className="text-2xl font-bold tracking-widest text-white">MAC</span>
            <span className="text-[9px] tracking-[0.2em] text-white/40 uppercase mt-1">Core Web Admin</span>
          </div>

          <nav className="space-y-1.5">
            <div className="text-[9px] tracking-widest uppercase text-white/20 font-bold px-4 pb-1">Hệ thống danh mục</div>
            
            <button onClick={() => setActiveTab('admin-ai-tab')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold tracking-widest uppercase transition-all cursor-pointer outline-none border ${activeTab === 'admin-ai-tab' ? 'text-amber-400 bg-amber-400/10 border-amber-400/30' : 'text-gray-400 hover:text-amber-400 hover:bg-amber-400/5 border-transparent'}`}>
              Trợ Lý AI Nội Bộ
            </button>
            <button onClick={() => setActiveTab('projects-tab')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold tracking-widest uppercase transition-all cursor-pointer outline-none border ${activeTab === 'projects-tab' ? 'text-white bg-white/5 border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'}`}>
              Quản lý dự án
            </button>
            <button onClick={() => setActiveTab('leads-tab')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold tracking-widest uppercase transition-all cursor-pointer outline-none border ${activeTab === 'leads-tab' ? 'text-white bg-white/5 border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'}`}>
              Quản lý Leads
            </button>
            <button onClick={() => setActiveTab('stats-tab')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold tracking-widest uppercase transition-all cursor-pointer outline-none border ${activeTab === 'stats-tab' ? 'text-white bg-white/5 border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'}`}>
              Thống kê User
            </button>
            <button onClick={() => setActiveTab('materials-tab')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold tracking-widest uppercase transition-all cursor-pointer outline-none border ${activeTab === 'materials-tab' ? 'text-white bg-white/5 border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'}`}>
              Kho Vật Tư
            </button>
            <button onClick={() => setActiveTab('market-prices-tab')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold tracking-widest uppercase transition-all cursor-pointer outline-none border ${activeTab === 'market-prices-tab' ? 'text-white bg-white/5 border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'}`}>
              Giá Thị Trường
            </button>
            <button onClick={() => setActiveTab('settings-tab')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold tracking-widest uppercase transition-all cursor-pointer outline-none border ${activeTab === 'settings-tab' ? 'text-white bg-white/5 border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'}`}>
              Cài Đặt Chung
            </button>
            <button onClick={() => setActiveTab('floorplans-tab')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold tracking-widest uppercase transition-all cursor-pointer outline-none border ${activeTab === 'floorplans-tab' ? 'text-white bg-white/5 border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'}`}>
              Mặt Bằng Khách
            </button>
            <button onClick={() => setActiveTab('concepts-tab')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold tracking-widest uppercase transition-all cursor-pointer outline-none border ${activeTab === 'concepts-tab' ? 'text-white bg-white/5 border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'}`}>
              Concept Khách
            </button>
            <button onClick={() => setActiveTab('drafts-tab')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold tracking-widest uppercase transition-all cursor-pointer outline-none border ${activeTab === 'drafts-tab' ? 'text-white bg-white/5 border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'}`}>
              Quản lý Draft Layout
            </button>
            <button onClick={() => setActiveTab('packages-tab')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold tracking-widest uppercase transition-all cursor-pointer outline-none border ${activeTab === 'packages-tab' ? 'text-white bg-white/5 border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'}`}>
              Sửa bảng giá Web
            </button>
          </nav>
        </div>

        <div className="border-t border-white/5 pt-4 space-y-2">
          <div className="px-3 py-2 mb-2 bg-white/5 rounded-lg">
            <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Đang đăng nhập</p>
            <p className="text-xs text-white font-mono truncate">{currentUser?.username || 'Unknown'}</p>
            <p className="text-[9px] text-emerald-400 uppercase tracking-wider">{currentUser?.role || ''}</p>
          </div>

          <button
            onClick={() => { sessionStorage.removeItem('isFromAdmin'); navigate('/'); }}
            className="w-full text-center text-[10px] tracking-widest uppercase text-white/30 hover:text-amber-400 transition-colors py-2 bg-transparent border border-dashed border-white/10 rounded-xl cursor-pointer font-semibold outline-none"
          >
            Quay lại cổng phân luồng
          </button>

          <button
            onClick={() => { 
              sessionStorage.setItem('isFromAdmin', 'true'); 
              window.location.href = '/home'; // Sửa thành window.location.href
            }}
            className="w-full text-center text-xs tracking-widest uppercase text-white/50 hover:text-white transition-colors py-2.5 bg-zinc-900 border border-white/5 rounded-xl cursor-pointer font-semibold outline-none"
          >
            Thoát ra xem Web
          </button>

          <button
            onClick={handleLogout}
            className="w-full text-center text-xs tracking-widest uppercase text-red-400 hover:text-white hover:bg-red-900/50 transition-colors py-2.5 bg-red-950/20 border border-red-900/30 rounded-xl cursor-pointer font-semibold outline-none"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-[#0b0b0b] p-8 md:p-12 overflow-y-auto h-screen text-left">
        {activeTab === 'admin-ai-tab' && <AdminAI />}
        {activeTab === 'leads-tab' && <LeadsTab />}
        {activeTab === 'floorplans-tab' && <FloorPlansTab />}
        {activeTab === 'concepts-tab' && <ConceptsTab />}
        {activeTab === 'materials-tab' && <MaterialsTab />}
        {activeTab === 'market-prices-tab' && <MarketPricesTab />}
        {activeTab === 'stats-tab' && <StatsTab />}
        {activeTab === 'settings-tab' && <SettingsTab />}

        {activeTab === 'projects-tab' && (
          <div className="tab-content-anim space-y-8 w-full" id="project-form-anchor">
            <div className="flex items-center justify-between border-b border-white/5 pb-5">
              <div>
                <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase font-semibold">Portfolio Management</span>
                <h1 className="text-2xl font-light text-white uppercase mt-1">Danh mục & Cập nhật dự án</h1>
              </div>
              <button onClick={clearProjectForm} className="bg-white text-black text-[10px] font-bold uppercase tracking-widest px-5 py-3 rounded-xl hover:bg-neutral-200 transition-all cursor-pointer border-none outline-none">
                Thêm dự án mới
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {globalProjects && Object.keys(globalProjects).map(k => globalProjects[k]).map((proj, idx) => {
                if (!proj) return null;
                return (
                  <div key={proj._id || idx} className="bg-zinc-900/20 border border-white/5 p-6 rounded-2xl flex items-center justify-between gap-4 hover:border-white/10 transition-all">
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="w-16 h-16 rounded-xl bg-neutral-800 overflow-hidden shrink-0 border border-white/5">
                        <img
                          src={proj.img1
                            ? (proj.img1.startsWith('http') || proj.img1.startsWith('data:') ? proj.img1 : '/' + proj.img1.replace('../', ''))
                            : 'https://placehold.co/150'}
                          alt=""
                          className="w-full h-full object-cover block"
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase truncate" dangerouslySetInnerHTML={{ __html: proj.name }}></h3>
                        <p className="text-[10px] text-gray-500 mt-0.5 font-mono">{proj.area} • {proj.year}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => fillProjectToForm(proj)} className="border border-white/10 bg-black/20 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-white hover:text-black transition-all cursor-pointer outline-none">
                        Sửa
                      </button>
                      <button type="button" onClick={() => handleDeleteProject(proj._id, proj.name)} className="border border-red-900/40 bg-red-950/20 text-[10px] font-bold uppercase tracking-widest text-red-400 px-4 py-2 rounded-lg hover:bg-red-900 hover:text-white transition-all cursor-pointer outline-none">
                        Xóa
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <form className="bg-zinc-900/20 border border-white/5 rounded-2xl p-6 md:p-8 space-y-6 w-full" onSubmit={saveProjectData}>
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/60 border-b border-white/5 pb-3 font-mono">{formTitle}</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Tên hiển thị</label>
                  <input type="text" value={pName} onChange={(e) => setPName(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Đường dẫn SLUG</label>
                  <input type="text" value={pBreadcrumb} onChange={(e) => setPBreadcrumb(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Phân loại</label>
                  <input type="text" value={pType} onChange={(e) => setPType(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Vị trí</label>
                  <input type="text" value={pLocation} onChange={(e) => setPLocation(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Diện tích</label>
                  <input type="text" value={pArea} onChange={(e) => setPArea(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Năm</label>
                  <input type="text" value={pYear} onChange={(e) => setPYear(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-amber-500 font-bold">Subtitle</label>
                  <input type="text" value={pSubtitle} onChange={(e) => setPSubtitle(e.target.value)} className="w-full bg-black/40 border border-amber-500/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-amber-500 font-bold">Quote</label>
                  <input type="text" value={pQuote} onChange={(e) => setPQuote(e.target.value)} className="w-full bg-black/40 border border-amber-500/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Desc1</label>
                  <textarea rows="3" value={pDesc1} onChange={(e) => setPDesc1(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-xs text-white focus:outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Desc2</label>
                  <textarea rows="3" value={pDesc2} onChange={(e) => setPDesc2(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-xs text-white focus:outline-none" />
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 space-y-6">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 font-mono">Cấu trúc hệ thống hình ảnh bối cảnh (Chọn file từ máy)</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 flex items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1 text-left">
                      <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">Ảnh 01 - Banner Lớn Trên Cùng (img1)</label>
                      <label className="w-full bg-black hover:bg-zinc-900 border border-dashed border-white/10 rounded-xl p-3 text-[11px] flex items-center justify-center cursor-pointer transition-colors text-gray-400 font-mono">
                        {pImg1 ? 'Đã chọn Ảnh 1' : 'Chọn ảnh 1...'}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUploadHelper(e.target.files[0], setPImg1)} />
                      </label>
                    </div>
                    {pImg1 && (
                      <div className="w-20 aspect-video bg-black rounded-lg overflow-hidden shrink-0 border border-white/10 shadow-md">
                        <img src={pImg1} alt="" className="w-full h-full object-cover block" />
                      </div>
                    )}
                  </div>

                  <div className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 flex items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1 text-left">
                      <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">Ảnh 02 - Khối Lưới Bên Trái (img2)</label>
                      <label className="w-full bg-black hover:bg-zinc-900 border border-dashed border-white/10 rounded-xl p-3 text-[11px] flex items-center justify-center cursor-pointer transition-colors text-gray-400 font-mono">
                        {pImg2 ? 'Đã chọn Ảnh 2' : 'Chọn ảnh 2...'}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUploadHelper(e.target.files[0], setPImg2)} />
                      </label>
                    </div>
                    {pImg2 && (
                      <div className="w-20 aspect-video bg-black rounded-lg overflow-hidden shrink-0 border border-white/10 shadow-md">
                        <img src={pImg2} alt="" className="w-full h-full object-cover block" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 flex items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1 text-left">
                      <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">Ảnh 03 - Khối Lưới Bên Phải (img3)</label>
                      <label className="w-full bg-black hover:bg-zinc-900 border border-dashed border-white/10 rounded-xl p-3 text-[11px] flex items-center justify-center cursor-pointer transition-colors text-gray-400 font-mono">
                        {pImg3 ? 'Đã chọn Ảnh 3' : 'Chọn ảnh 3...'}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUploadHelper(e.target.files[0], setPImg3)} />
                      </label>
                    </div>
                    {pImg3 && (
                      <div className="w-20 aspect-video bg-black rounded-lg overflow-hidden shrink-0 border border-white/10 shadow-md">
                        <img src={pImg3} alt="" className="w-full h-full object-cover block" />
                      </div>
                    )}
                  </div>

                  <div className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 flex items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1 text-left">
                      <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">Ảnh 04 - Khối Ảnh Chốt Hạ Dưới (img4)</label>
                      <label className="w-full bg-black hover:bg-zinc-900 border border-dashed border-white/10 rounded-xl p-3 text-[11px] flex items-center justify-center cursor-pointer transition-colors text-gray-400 font-mono">
                        {pImg4 ? 'Đã chọn Ảnh 4' : 'Chọn ảnh 4...'}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUploadHelper(e.target.files[0], setPImg4)} />
                      </label>
                    </div>
                    {pImg4 && (
                      <div className="w-20 aspect-video bg-black rounded-lg overflow-hidden shrink-0 border border-white/10 shadow-md">
                        <img src={pImg4} alt="" className="w-full h-full object-cover block" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Ghi chú dự án bổ sung</label>
                <textarea rows="2" value={pProjectDesc} onChange={(e) => setPProjectDesc(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-xs text-white focus:outline-none" />
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={clearProjectForm} className="border border-white/10 bg-black/20 text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded-xl hover:border-white transition-all cursor-pointer">
                  Làm trống
                </button>
                <button type="submit" className="bg-white text-black text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-neutral-200 transition-all cursor-pointer">
                  Lưu dữ liệu
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'drafts-tab' && (
          <div className="tab-content-anim space-y-8 w-full">
            <div className="flex items-center justify-between border-b border-white/5 pb-5">
              <div>
                <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase font-semibold">Layout Configurations</span>
                <h1 className="text-2xl font-light text-white uppercase mt-1">Hệ thống Draft Layout Mặt Bằng</h1>
              </div>
              <button onClick={clearDraftForm} className="bg-white text-black text-[10px] font-bold uppercase tracking-widest px-5 py-3 rounded-xl hover:bg-neutral-200 transition-all cursor-pointer border-none outline-none">
                Thêm Mới Draft
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
              {globalDrafts.map((draft, idx) => (
                <div key={draft._id || idx} className="bg-zinc-900/30 border border-white/5 p-5 rounded-2xl flex flex-col justify-between gap-4">
                  <div className="w-full aspect-[16/10] bg-neutral-800 rounded-xl overflow-hidden border border-white/5">
                    <img src={draft.demoImage} alt="" className="w-full h-full object-cover block" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider truncate">{draft.name}</h3>
                    <p className="text-[11px] text-amber-500 font-mono mt-1">Đơn giá: {draft.basePricePerM2.toLocaleString('vi-VN')}đ / m²</p>
                    <div className="mt-2 text-[10px] text-gray-400 font-mono space-y-0.5 border-t border-white/5 pt-2">
                      <p>Quy mô: <span className="text-white font-bold">{draft.minArea || 0} - {draft.maxArea || 5000} m²</span></p>
                      <p>Hiện trạng: <span className="text-amber-400 font-bold">{draft.siteStatus === 'dat-trong' ? 'Đất trống' : draft.siteStatus === 'nha-san' ? 'Cải tạo nhà sẵn' : 'Tất cả hiện trạng'}</span></p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-white/5">
                    <button type="button" onClick={() => fillDraftToForm(draft)} className="flex-1 border border-white/10 bg-black/20 text-[10px] font-bold uppercase py-2 rounded-lg hover:bg-white hover:text-black transition-all cursor-pointer outline-none">
                      Sửa cấu hình
                    </button>
                    <button type="button" onClick={() => handleDeleteDraft(draft._id, draft.name)} className="border border-red-900/40 bg-red-950/20 text-[10px] font-bold uppercase text-red-400 px-3 py-2 rounded-lg hover:bg-red-900 hover:text-white transition-all cursor-pointer outline-none">
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form className="bg-zinc-900/20 border border-white/5 rounded-2xl p-6 md:p-8 space-y-6 w-full backdrop-blur-sm" onSubmit={saveDraftData}>
              <h2 className="text-xs font-bold uppercase tracking-widest text-amber-500 border-b border-white/5 pb-3 font-mono">{draftFormTitle}</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Mã Khóa Định Danh (Key - Duy nhất, viết liền không dấu)</label>
                  <input type="text" value={dKey} onChange={(e) => setDKey(e.target.value)} required placeholder="Ví dụ: draft-industrial-cafe" disabled={dId ? true : false} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none font-mono disabled:opacity-40" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Tên Bản Vẽ Mặt Bằng Mẫu</label>
                  <input type="text" value={dName} onChange={(e) => setDName(e.target.value)} required placeholder="Ví dụ: Draft 04: Layout quán góc vát 2 mặt tiền" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Đơn giá định biên trên mỗi m² (VNĐ)</label>
                  <input type="number" value={dPrice} onChange={(e) => setDPrice(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-amber-400 focus:outline-none font-mono text-sm font-semibold" />
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">Tải bản vẽ sơ đồ mặt bằng mẫu lên</label>
                  <div className="flex gap-4 items-center">
                    <label className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-dashed border-white/10 rounded-xl p-3.5 text-xs flex items-center justify-center cursor-pointer transition-colors text-gray-400 font-mono">
                      {dImage ? (dImage.startsWith('data:') ? 'Đã đính kèm tệp sơ đồ mặt bằng' : `Link: ${dImage.slice(0, 30)}...`) : 'Chọn file sơ đồ mặt bằng từ máy...'}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUploadHelper(e.target.files[0], setDImage)} />
                    </label>
                    {dImage && (
                      <div className="w-20 aspect-video bg-neutral-900 border border-white/10 rounded-lg overflow-hidden shadow-inner shrink-0">
                        <img src={dImage} alt="Draft layout preview" className="w-full h-full object-cover block" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 space-y-4">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-amber-400 font-mono">Cấu hình điều kiện lọc gợi ý ở Trang Chủ</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Diện tích tối thiểu (Min m²)</label>
                    <input type="number" value={dMinArea} onChange={(e) => setDMinArea(e.target.value)} required placeholder="Ví dụ: 50" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Diện tích tối đa (Max m²)</label>
                    <input type="number" value={dMaxArea} onChange={(e) => setDMaxArea(e.target.value)} required placeholder="Ví dụ: 100" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Hiện trạng phù hợp</label>
                    <select value={dSiteStatus} onChange={(e) => setDSiteStatus(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none cursor-pointer font-sans">
                      <option value="all" className="bg-neutral-900 text-white">Tất cả hiện trạng</option>
                      <option value="dat-trong" className="bg-neutral-900 text-white">Chỉ Đất trống</option>
                      <option value="nha-san" className="bg-neutral-900 text-white">Chỉ Cải tạo nhà có sẵn</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={clearDraftForm} className="border border-white/10 bg-black/20 text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded-xl hover:border-white transition-all cursor-pointer">
                  Làm trống form
                </button>
                <button type="submit" className="bg-white text-black text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-neutral-200 transition-all cursor-pointer">
                  Đồng bộ lưu cấu trúc Draft
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'packages-tab' && (
          <div className="tab-content-anim space-y-8 w-full">
            <div>
              <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase font-semibold">Pricing Strategy</span>
              <h1 className="text-2xl font-light text-white uppercase mt-1">Thay đổi giá các gói thiết kế dự án</h1>
            </div>
            <form className="bg-zinc-900/20 border border-white/5 rounded-2xl p-6 md:p-8 space-y-6 w-full backdrop-blur-sm" onSubmit={savePackagesData}>
              <div id="packages-inputs-container" className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                {globalPackages && Object.keys(globalPackages).map(key => {
                  const pack = globalPackages[key];
                  return (
                    <div key={key} className="space-y-2">
                      <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{pack.num}. Đơn giá {pack.name}</label>
                      <input
                        type="number"
                        value={pack.price}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setGlobalPackages({ ...globalPackages, [key]: { ...pack, price: val } });
                        }}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white font-medium font-mono text-sm focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end pt-4 border-t border-white/5">
                <button type="submit" className="bg-white text-black text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-neutral-200 transition-all shadow-md cursor-pointer border-none outline-none">
                  Lưu định biên bảng giá
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}