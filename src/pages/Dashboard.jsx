import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';

export default function Dashboard() {
  const navigate = useNavigate();

  // =========================================================================
  // 1. QUẢN LÝ TRẠNG THÁI (STATES) CHO TOÀN BỘ HỆ THỐNG CONTROL PANEL
  // =========================================================================
  const [activeTab, setActiveTab] = useState('pos-bill-tab');
  const [globalProjects, setGlobalProjects] = useState({});
    const [globalPackages, setGlobalPackages] = useState({});

  // Cấu hình phân quyền hệ thống ảo (Quyền Admin tối cao hoặc Nhân viên/Thu ngân)
  const [currentRole, setCurrentRole] = useState('Chủ doanh nghiệp (Admin)');

  // Cấu hình phôi hóa đơn gốc của doanh nghiệp
  const [receiptType, setReceiptType] = useState('BÁO CÁO DOANH THU TỔNG HỢP');
  const [billHeader, setBillHeader] = useState('MAC CONCEPT');
  const [billSubHeader, setBillSubHeader] = useState('More Artistic Concept');
  const [billAddress, setBillAddress] = useState('44 Nguyễn Văn Dung, P6, Gò Vấp');
  const [currentBillId, setCurrentBillId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Đối soát nội bộ');
  
  // Thông tin nguồn dữ liệu đầu vào (iPOS Export, Excel, Word)
  const [dataSource, setDataSource] = useState('Dữ liệu kết xuất từ iPOS hệ thống');
  const [responsiblePerson, setResponsiblePerson] = useState('Quản lý ca / Admin');
  const [projectName, setProjectName] = useState('Báo cáo doanh thu tài chính định kỳ');
  const [billNote, setBillNote] = useState('Chứng từ lưu hành nội bộ doanh nghiệp MAC Concept.');
  
  // Trạng thái Quản lý Milestone / Tiến độ dự án kết nối hóa đơn
  const [projectMilestone, setProjectMilestone] = useState('Giai đoạn hạch toán định kỳ');
  const [attachedFileName, setAttachedFileName] = useState(''); // Lưu tên file đính kèm ảo (.xlsx, .docx)

  // Điều phối dòng tiền và Thuế suất
  const [isAutoCalculate, setIsAutoCalculate] = useState(true);
  const [manualTotal, setManualTotal] = useState(0);
  const [vatRate, setVatRate] = useState(0); // 0%, 5%, 8%, 10%
  const [showQrCode, setShowQrCode] = useState(true);
  
  // Cấu hình ngân hàng tài khoản nhận VietQR động
  const [bankBin, setBankBin] = useState('970422'); // MB Bank
  const [bankAccount, setBankAccount] = useState('0375075975');

  // Danh sách các dòng dữ liệu tổng hợp
  const [billItems, setBillItems] = useState([
    { id: 1, name: 'Tổng doanh thu thực tế Ca 1 (Dữ liệu đối soát iPOS)', qty: '1', unit: 'Ca', price: 12450000 },
    { id: 2, name: 'Doanh thu dịch vụ ngoài menu (Dữ liệu nhập từ Excel)', qty: '1', unit: 'Gói', price: 3500000 }
  ]);
  const [invoiceHistory, setInvoiceHistory] = useState([]);

  // States tạm thời để chèn dòng hạng mục mới
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('Lô/Ca');
  const [newItemPrice, setNewItemPrice] = useState(0);

  // States quản lý Dự Án & Bảng Giá Web mới
  const [pId, setPId] = useState('');
  const [formTitle, setFormTitle] = useState('⚙ Chọn một dự án ở trên hoặc bấm nút Thêm mới');
  const [pName, setPName] = useState(''); 
  const [pBreadcrumb, setPBreadcrumb] = useState(''); 
  const [pType, setPType] = useState(''); 
  const [pLocation, setPLocation] = useState(''); 
  const [pArea, setPArea] = useState(''); 
  const [pYear, setPYear] = useState(''); 
  const [pHeading, setPHeading] = useState('');       // Trường Heading cho chi tiết
  const [pShortDesc, setPShortDesc] = useState('');   // Trường Short Description cho chi tiết
  const [pImg1, setPImg1] = useState(''); 
  const [pProjectDesc, setPProjectDesc] = useState(''); 

  const fetchProjectsFromDB = async () => {
    try {
      // 1. Thử gọi API thực tế từ Backend
      const resProj = await fetch('http://localhost:5000/api/projects');
      
      if (resProj.ok) {
        const projData = await resProj.json();
        
        // Kiểm tra nếu Backend trả về dữ liệu hợp lệ và không rỗng
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
          return; // Thành công thì dừng lại luôn
        }
      }
      
      // Khởi chạy phương án dự phòng nếu API trả về mảng rỗng hoặc lỗi 404
      throw new Error("Dữ liệu DB trống hoặc sai đường dẫn API");

    } catch (error) {
      console.warn("⚠️ API Database chưa thông suốt. Đang tự động chuyển sang đọc file tĩnh local...");
      
      try {
        // 2. Phương án dự phòng 1: Đọc từ bộ nhớ đệm LocalStorage
        const cachedProj = localStorage.getItem('mac_portfolio_cache');
        if (cachedProj && Object.keys(JSON.parse(cachedProj)).length > 0) {
          setGlobalProjects(JSON.parse(cachedProj));
          return;
        }

        // 3. Phương án dự phòng 2: Đọc trực tiếp từ file JSON gốc của bạn
        const resLocal = await fetch('/assets/data/projects.json');
        if (resLocal.ok) {
          const localData = await resLocal.json();
          setGlobalProjects(localData);
          localStorage.setItem('mac_portfolio_cache', JSON.stringify(localData));
        }
      } catch (localErr) {
        console.error("Không thể nạp được bất kỳ nguồn dữ liệu nào:", localErr);
      }
    }
  };

  useEffect(() => {
    async function loadInitialConfig() {
      try {
        // Kích hoạt nạp dữ liệu chuẩn từ Database Atlas
        await fetchProjectsFromDB();

        const cachedPack = localStorage.getItem('mac_packages_cache');
        let packData = {};
        if (cachedPack) { packData = JSON.parse(cachedPack); } 
        else {
          const resPack = await fetch('http://localhost:5000/api/packages');
          packData = await resPack.json();
          localStorage.setItem('mac_packages_cache', JSON.stringify(packData));
        }
        setGlobalPackages(packData);

        const cachedBills = localStorage.getItem('mac_pos_bills_cache');
        if (cachedBills) { setInvoiceHistory(JSON.parse(cachedBills)); }
        
        setCurrentBillId('MAC-' + Date.now().toString().slice(-6));
      } catch (error) {
        console.error("Lỗi nạp cấu trúc dữ liệu nền tảng:", error);
      }
    }
    loadInitialConfig();
    gsap.fromTo(".admin-panel-reveal", { opacity: 0, y: 15 }, { duration: 0.6, opacity: 1, y: 0, ease: "power2.out" });
  }, []);

  // =========================================================================
  // 3. LOGIC XỬ LÝ BIÊN SOẠN CHỨNG TỪ TỔNG HỢP (MỤC BILL ĐA NĂNG)
  // =========================================================================
  const handleAddItemCustom = (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const newItem = { id: Date.now(), name: newItemName, qty: newItemQty, unit: newItemUnit, price: parseFloat(newItemPrice) || 0 };
    setBillItems([...billItems, newItem]);
    setNewItemName(''); setNewItemQty('1'); setNewItemUnit('Lô/Ca'); setNewItemPrice(0);
  };

  const handleRemoveItem = (id) => {
    setBillItems(billItems.filter(item => item.id !== id));
  };

  const calculateSubTotal = () => {
    if (!isAutoCalculate) return parseFloat(manualTotal) || 0;
    return billItems.reduce((sum, item) => sum + (item.price * (parseFloat(item.qty) || 1)), 0);
  };

  const calculateVatMoney = () => Math.round((calculateSubTotal() * vatRate) / 100);
  const calculateFinalTotal = () => calculateSubTotal() + calculateVatMoney();

  const handleFileAttachmentSimulate = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachedFileName(file.name);
      alert(`Đã liên kết file chứng từ gốc [${file.name}] vào bộ nhớ đệm của hóa đơn hiện tại!`);
    }
  };

  const triggerHardwarePrintAndSaveLog = () => {
    if (isAutoCalculate && billItems.length === 0) {
      alert("Vui lòng nhập ít nhất 1 nội dung diễn giải chứng từ trước khi phát lệnh in!");
      return;
    }

    const newLog = {
      billId: currentBillId,
      timestamp: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString('vi-VN'),
      type: receiptType,
      milestone: projectMilestone,
      attachedFile: attachedFileName || 'Không có file đính kèm',
      total: calculateFinalTotal()
    };
    
    const updatedHistory = [newLog, ...invoiceHistory];
    setInvoiceHistory(updatedHistory);
    localStorage.setItem('mac_pos_bills_cache', JSON.stringify(updatedHistory));

    setTimeout(() => {
      window.print();
      setBillItems([]);
      setAttachedFileName('');
      setCurrentBillId('MAC-' + Date.now().toString().slice(-6));
    }, 200);
  };

  // =========================================================================
  // 4. THUẬT TOÁN ĐIỀU KHIỂN DỰ ÁN VÀ ĐỒNG BỘ REAL-TIME QUA BACKEND API
  // =========================================================================
  const fillProjectToForm = (proj) => {
    const targetId = proj._id || proj.id || proj.breadcrumb || '';
    setPId(targetId);
    setPName(proj.name || '');
    setPBreadcrumb(proj.breadcrumb || '');
    setPType(proj.type || 'Architecture • Interior');
    setPLocation(proj.location || 'TP. Hồ Chí Minh');
    PArea(proj.area || '100 m²');
    setPYear(proj.year || '2026');
    setPHeading(proj.heading || '');
    setPShortDesc(proj.shortDesc || '');
    setPImg1(proj.img1 || '');
    setPProjectDesc(proj.projectDesc || proj.desc1 || '');
    
    // Cuộn mượt xuống khu vực form nhập liệu để admin dễ nhìn
    const formEl = document.getElementById('project-form-anchor');
    if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
  };

  const clearProjectForm = () => { 
    setPId(''); setFormTitle('➕ Thêm dự án mới hoàn toàn'); setPName(''); setPBreadcrumb(''); setPType(''); setPLocation(''); setPArea(''); setPYear(''); setPHeading(''); setPShortDesc(''); setPImg1(''); setPProjectDesc('');
  };

  const saveProjectData = async (e) => {
    e.preventDefault();
    if (!pName || !pBreadcrumb) {
      alert("⚠️ Vui lòng điền tối thiểu Tên dự án và Breadcrumb (định danh)!");
      return;
    }

    // Kiểm tra xem là sửa dự án cũ hay tạo mới
    // Nếu pId tồn tại thì được coi là cập nhật
    const isEdit = pId && pId.trim().length > 0;
    const url = isEdit ? `http://localhost:5000/api/projects/${pId}` : 'http://localhost:5000/api/projects';
    const method = isEdit ? 'PUT' : 'POST';

    const payload = {
      name: pName,
      breadcrumb: pBreadcrumb.toLowerCase().replace(/\s+/g, '-'), // chuẩn hóa slug viết liền không dấu
      type: pType,
      location: pLocation,
      area: pArea,
      year: pYear,
      heading: pHeading,
      shortDesc: pShortDesc,
      img1: pImg1 || 'assets/pic/underhood.jpg',
      projectDesc: pProjectDesc
    };

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(isEdit ? "✅ Cập nhật thông tin dự án thành công!" : "✅ Đã tạo mới dự án thành công xuống Database!");
        clearProjectForm();
        // Xóa sạch cache trình duyệt để ép tải dữ liệu thật hoàn toàn từ DB
        localStorage.removeItem('mac_portfolio_cache');
        await fetchProjectsFromDB(); // Hàm cập nhật realtime danh sách trên màn hình
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`❌ Lỗi lưu dữ liệu: ${errData.message || 'Server từ chối yêu cầu.'}`);
      }
    } catch (err) {
      console.error("Lỗi kết nối API:", err);
      alert("❌ Không thể kết nối tới Backend Server! Vui lòng kiểm tra terminal backend.");
    }
  };

  // 🔴 HÀM XỬ LÝ XÓA DỰ ÁN TRÊN CẢ FRONT-END LẪN BACKEND DATABASE
  const handleDeleteProject = async (id, name) => {
    if (!id) {
      alert("❌ Không tìm thấy mã định danh dự án hợp lệ để xóa!");
      return;
    }
    
    if (window.confirm(`⚠️ Bạn có chắc chắn muốn XÓA VĨNH VIỄN dự án "${name}" khỏi hệ thống không?`)) {
      try {
        const res = await fetch(`http://localhost:5000/api/projects/${id}`, {
          method: 'DELETE'
        });
        
        if (res.ok) {
          alert(`🗑️ Đã xóa hoàn toàn dự án "${name}"!`);
          
          // Cập nhật realtime xóa bỏ ngay trên giao diện Front-end
          setGlobalProjects(prev => {
            const copy = { ...prev };
            // Tìm và xóa key tương ứng trong object state
            const targetKey = Object.keys(copy).find(k => copy[k]._id === id || k === id);
            if (targetKey) delete copy[targetKey];
            return copy;
          });
          
          // Cập nhật lại bộ nhớ đệm
          localStorage.removeItem('mac_portfolio_cache');
          
          if (pId === id) clearProjectForm();
        } else {
          alert("❌ Không thể xóa dự án này dưới Database (Có thể do sai ID)!");
        }
      } catch (err) {
        console.error("Lỗi tiến trình xóa:", err);
        alert("❌ Lỗi kết nối mạng, không gửi được lệnh xóa!");
      }
    }
  };

  const savePackagesData = (e) => { e.preventDefault(); localStorage.setItem('mac_packages_cache', JSON.stringify(globalPackages)); alert("Bảng định biên đơn giá đã được đồng bộ!"); };

  return (
    <div className="w-full min-h-screen bg-[#050505] text-gray-300 antialiased font-sans flex flex-col md:flex-row admin-panel-reveal">
      
      <style>{`
        @media print {
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * { visibility: hidden; }
          #mac-hardware-bill-receipt, #mac-hardware-bill-receipt * { 
            visibility: visible; 
            background: white !important; 
            color: black !important; 
          }
          #mac-hardware-bill-receipt { 
            position: relative; 
            margin: 0 auto !important;
            top: 0;
            width: 80mm; 
            height: auto !important; 
            padding: 0mm 2mm 4mm 2mm; 
            font-family: 'Courier New', monospace; 
            box-shadow: none !important; 
            border: none !important;
            font-size: 10px; 
            line-height: 1.2;
            page-break-inside: avoid !important; 
            break-inside: avoid !important;
          }
          #mac-hardware-bill-receipt h2 { font-size: 13px !important; margin-top: 0 !important; margin-bottom: 2px !important; }
          #mac-hardware-bill-receipt h3 { font-size: 11px !important; margin-top: 2px !important; }
          .border-b { margin-top: 3px !important; margin-bottom: 3px !important; }
          .pt-4, .pt-5 { padding-top: 6px !important; }
          .space-y-3.5 > :not([hidden]) ~ :not([hidden]) { margin-top: 6px !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* SIDEBAR ĐIỀU HƯỚNG CỐ ĐỊNH */}
      <aside className="no-print w-full md:w-64 bg-black border-b md:border-b-0 md:border-r border-white/5 flex flex-col justify-between p-6 select-none shrink-0 text-left">
        <div className="space-y-8">
          <div className="flex flex-col border-b border-white/5 pb-5">
            <span className="text-2xl font-bold tracking-widest text-white leading-none">MAC</span>
            <span className="text-[9px] tracking-[0.2em] text-white/40 uppercase mt-1">Control Dashboard</span>
          </div>

          <div className="bg-zinc-900/50 border border-white/5 p-3 rounded-xl space-y-1">
            <span className="text-[8px] uppercase tracking-wider text-gray-500 font-bold block">Phân quyền hệ thống</span>
            <select 
              value={currentRole} 
              onChange={(e) => {
                setCurrentRole(e.target.value);
                alert(`Đã chuyển đổi sang quyền hạn truy cập: [${e.target.value}]`);
              }}
              className="w-full bg-black text-[10px] text-white p-1 rounded border border-white/10 focus:outline-none"
            >
              <option value="Chủ doanh nghiệp (Admin)">Chủ doanh nghiệp (Admin)</option>
              <option value="Nhân viên quầy / Thu ngân">Nhân viên quầy / Thu ngân</option>
            </select>
          </div>

          <nav className="space-y-1.5">
            <button onClick={() => setActiveTab('pos-bill-tab')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-widest uppercase transition-all cursor-pointer outline-none ${activeTab === 'pos-bill-tab' ? 'text-white bg-white/5 border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
              🧾 POS XUẤT BILL NỘI BỘ
            </button>
            
            {currentRole === 'Chủ doanh nghiệp (Admin)' && (
              <>
                <div className="text-[9px] tracking-widest uppercase text-white/20 font-bold px-4 pt-4 pb-1">Hệ thống Core Web</div>
                
                {/* 🟢 MỤC MENU ĐÃ ĐỔI TÊN THÀNH CHỈNH SỬA DỰ ÁN */}
                <button onClick={() => setActiveTab('projects-tab')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-widest uppercase transition-all cursor-pointer outline-none ${activeTab === 'projects-tab' ? 'text-white bg-white/5 border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
                  📁 Chỉnh Sửa Dự Án
                </button>
                
                <button onClick={() => setActiveTab('packages-tab')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-widest uppercase transition-all cursor-pointer outline-none ${activeTab === 'packages-tab' ? 'text-white bg-white/5 border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
                  💰 Sửa Bảng Giá Web
                </button>
              </>
            )}
          </nav>
        </div>

        <div className="border-t border-white/5 pt-4">
          <button onClick={() => navigate('/home')} className="w-full flex items-center justify-center gap-2 text-xs tracking-widest uppercase text-white/40 hover:text-white transition-colors py-2 bg-transparent border-none cursor-pointer outline-none font-semibold">
            ◀ Thoát ra xem Web
          </button>
        </div>
      </aside>

      {/* KHUNG NỘI DUNG CHÍNH */}
      <main className="flex-1 bg-[#0b0b0b] p-8 md:p-12 overflow-y-auto h-screen text-left">
        
        {activeTab === 'pos-bill-tab' && (
          <div className="tab-content-anim space-y-8 w-full">
            <div className="border-b border-white/5 pb-5 no-print">
              <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase font-semibold">Data Aggregation Terminal</span>
              <h1 className="text-2xl font-light text-white uppercase mt-1">Trình đóng gói chứng từ & Doanh thu tổng</h1>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 w-full items-start">
              <div className="xl:col-span-7 space-y-6 no-print">
                <div className="bg-zinc-900/20 border border-white/5 p-5 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 font-mono border-b border-white/5 pb-2">🏢 1. Cấu hình tiêu đề hóa đơn</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-gray-500 font-bold">Tên chứng từ</label>
                      <input type="text" value={receiptType} onChange={(e) => setReceiptType(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-gray-500 font-bold">Hình thức hạch toán</label>
                      <input type="text" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-amber-500/70 font-bold">Mã BIN Ngân hàng nhận tiền</label>
                      <input type="text" value={bankBin} onChange={(e) => setBankBin(e.target.value)} className="w-full bg-black/40 border border-amber-500/10 text-amber-300 font-mono rounded-xl px-4 py-2.5 text-xs focus:outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-amber-500/70 font-bold">Số tài khoản ngân hàng đích</label>
                      <input type="text" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} className="w-full bg-black/40 border border-amber-500/10 text-amber-300 font-mono rounded-xl px-4 py-2.5 text-xs focus:outline-none" />
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/20 border border-white/5 p-5 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 font-mono border-b border-white/5 pb-2">📂 2. Nguồn kết xuất & Quản lý File đối soát</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-gray-500 font-bold">Nguồn dữ liệu trích xuất</label>
                      <input type="text" value={dataSource} onChange={(e) => setDataSource(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-gray-500 font-bold">Người lập phiếu đối soát</label>
                      <input type="text" value={responsiblePerson} onChange={(e) => setResponsiblePerson(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-gray-500 font-bold">Tiến độ thi công / Kỳ Milestone</label>
                      <input type="text" value={projectMilestone} onChange={(e) => setProjectMilestone(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-emerald-400 font-bold">Liên kết tệp Excel/Word gốc</label>
                      <div className="relative">
                        <input type="file" accept=".xlsx,.xls,.doc,.docx" onChange={handleFileAttachmentSimulate} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-20" />
                        <div className="w-full bg-zinc-900 border border-dashed border-white/10 rounded-xl px-4 py-2 text-xs text-center text-gray-400 hover:border-white/30 transition-colors">
                          {attachedFileName ? `📁 ${attachedFileName}` : '📎 Chọn tệp đính kèm đối chiếu'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 border-t border-white/5 pt-3">
                    <label className="text-[10px] uppercase text-gray-500 font-bold">Nội dung liên kết nghiệp vụ / Tên dự án</label>
                    <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none" />
                  </div>
                </div>

                <div className="bg-zinc-900/20 border border-white/5 p-5 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 font-mono border-b border-white/5 pb-2">💰 3. Hạch toán số liệu dòng tiền & Thuế</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-gray-500 font-bold">Chế độ xử lý tổng tiền</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setIsAutoCalculate(true)} className={`flex-1 text-[10px] font-bold uppercase py-2.5 rounded-xl border-none outline-none cursor-pointer transition-all ${isAutoCalculate ? 'bg-white text-black' : 'bg-zinc-800 text-gray-500'}`}>Cộng dồn dòng</button>
                        <button type="button" onClick={() => setIsAutoCalculate(false)} className={`flex-1 text-[10px] font-bold uppercase py-2.5 rounded-xl border-none outline-none cursor-pointer transition-all ${!isAutoCalculate ? 'bg-white text-black' : 'bg-zinc-800 text-gray-500'}`}>Nhập tay tổng tiền</button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-gray-500 font-bold">Cấu hình Thuế suất VAT (%)</label>
                      <select value={vatRate} onChange={(e) => setVatRate(parseInt(e.target.value))} className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none cursor-pointer">
                        <option value="0">Không tính thuế (0%)</option>
                        <option value="5">Mức thuế 5%</option>
                        <option value="8">Mức thuế 8%</option>
                        <option value="10">Mức thuế tiêu chuẩn 10%</option>
                      </select>
                    </div>
                  </div>

                  {!isAutoCalculate ? (
                    <div className="space-y-1 pt-2 tab-content-anim">
                      <label className="text-[10px] uppercase text-emerald-400 font-bold">Nhập trực tiếp tổng số tiền của báo cáo (đ)</label>
                      <input type="number" value={manualTotal} onChange={(e) => setManualTotal(e.target.value)} className="w-full bg-black/40 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm font-mono text-emerald-400 focus:outline-none" />
                    </div>
                  ) : (
                    <form onSubmit={handleAddItemCustom} className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t border-white/5 items-end tab-content-anim">
                      <div className="sm:col-span-5 space-y-1">
                        <label className="text-[9px] uppercase text-gray-500 font-bold">Nội dung diễn giải từ File Export</label>
                        <input type="text" required placeholder="Ví dụ: Doanh thu quầy nước..." value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none" />
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[9px] uppercase text-gray-500 font-bold">Số lượng</label>
                        <input type="text" required value={newItemQty} onChange={(e) => setNewItemQty(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none" />
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[9px] uppercase text-gray-500 font-bold">ĐVT</label>
                        <input type="text" required value={newItemUnit} onChange={(e) => setNewItemUnit(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none" />
                      </div>
                      <div className="sm:col-span-3 space-y-1">
                        <label className="text-[9px] uppercase text-gray-500 font-bold">Thành tiền (đ)</label>
                        <input type="number" required value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none" />
                      </div>
                      <div className="sm:col-span-12 pt-1">
                        <button type="submit" className="w-full bg-zinc-800 hover:bg-zinc-700 text-white text-[9px] font-bold uppercase tracking-widest py-2.5 rounded-xl border-none cursor-pointer outline-none">+ Chèn nội dung này vào phôi in</button>
                      </div>
                    </form>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 font-mono">📊 Nhật ký hạch toán nội bộ ({invoiceHistory.length})</h3>
                    <button 
                      onClick={() => {
                        if(window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử hóa đơn lưu trữ cục bộ?")) {
                          localStorage.removeItem('mac_pos_bills_cache');
                          setInvoiceHistory([]);
                        }
                      }}
                      className="text-[9px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                    >
                      Xóa toàn bộ Log
                    </button>
                  </div>
                  <div className="bg-[#0b0b0b] border border-white/5 rounded-2xl overflow-x-auto">
                    <table className="w-full text-xs font-light text-neutral-400 min-w-[650px]">
                      <thead>
                        <tr className="border-b border-white/5 font-mono text-[9px] text-white/30 bg-zinc-900/10 uppercase">
                          <th className="p-4 text-left">Mã Số</th>
                          <th className="p-4 text-left">Thời Gian</th>
                          <th className="p-4 text-left">Loại Báo Cáo / Tiến Độ</th>
                          <th className="p-4 text-left">Tệp Chứng Từ Gốc</th>
                          <th className="p-4 text-right">Tổng Kết</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {invoiceHistory.map((h, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.01]">
                            <td className="p-4 font-mono font-bold text-white/40">{h.billId}</td>
                            <td className="p-4 font-mono text-neutral-500">{h.timestamp}</td>
                            <td className="p-4 uppercase text-neutral-300 font-medium">
                              {h.type} <span className="text-[10px] text-neutral-500 normal-case block">({h.milestone || 'N/A'})</span>
                            </td>
                            <td className="p-4 font-mono text-[11px] text-emerald-500/80 truncate max-w-[150px]" title={h.attachedFile}>
                              {h.attachedFile && h.attachedFile !== 'Không có file đính kèm' ? `📁 ${h.attachedFile}` : '❌ Không đính kèm'}
                            </td>
                            <td className="p-4 text-right font-mono text-emerald-400 font-semibold">{h.total.toLocaleString('vi-VN')}đ</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="xl:col-span-5 space-y-6 w-full">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 font-mono no-print">🖨️ Bản xem trước hóa đơn giấy trắng</h3>
                
                <div id="mac-hardware-bill-receipt" className="bg-white text-black border border-neutral-300 rounded-2xl p-6 shadow-2xl font-mono space-y-4 text-left selection:bg-neutral-200">
                  <div className="text-center space-y-1">
                    <h2 className="text-base font-bold text-black tracking-widest uppercase">{billHeader}</h2>
                    <p className="text-[9px] text-neutral-500 uppercase">{billSubHeader}</p>
                    <p className="text-[8px] text-neutral-600 max-w-[200px] mx-auto leading-tight">{billAddress}</p>
                    <div className="border-b border-dashed border-neutral-400 my-2"></div>
                    <h3 className="text-xs font-bold tracking-wider text-black uppercase py-0.5">{receiptType}</h3>
                    <div className="border-b border-dashed border-neutral-400 my-2"></div>
                  </div>

                  <div className="text-[10px] text-neutral-600 space-y-0.5">
                    <p>Số chứng từ: <span className="text-black font-bold">{currentBillId}</span></p>
                    <p>Ngày trích xuất: <span>{new Date().toLocaleDateString('vi-VN')}</span></p>
                    <p>Hình thức: <span className="text-black uppercase font-bold">{paymentMethod}</span></p>
                    {dataSource && <p>Nguồn trích: <span className="text-black font-bold">{dataSource}</span></p>}
                    {responsiblePerson && <p>Người phụ trách: <span className="text-black font-bold">{responsiblePerson}</span></p>}
                    {projectName && <p>Hạng mục/Nội dung: <span className="text-neutral-700 italic">{projectName}</span></p>}
                    {projectMilestone && <p>Tiến độ/Milestone: <span className="text-neutral-900 font-bold">{projectMilestone}</span></p>}
                    {attachedFileName && <p>Tệp kết nối: <span className="text-neutral-600 font-mono">📎 {attachedFileName}</span></p>}
                  </div>

                  <div className="border-b border-dashed border-neutral-400 my-2"></div>

                  {isAutoCalculate ? (
                    <div className="space-y-3 text-[11px] text-neutral-800">
                      {billItems.length === 0 ? (
                        <p className="text-center py-4 text-neutral-400 italic">Hóa đơn trống...</p>
                      ) : (
                        <div className="space-y-3.5">
                          {billItems.map(item => (
                            <div key={item.id} className="flex justify-between items-start">
                              <div className="max-w-[180px] space-y-0.5">
                                <p className="font-medium text-black leading-tight">{item.name}</p>
                                <p className="text-[9px] text-neutral-500 font-mono">{item.qty} {item.unit} x {item.price.toLocaleString('vi-VN')}đ</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-black font-bold font-mono">{(item.price * (parseFloat(item.qty) || 1)).toLocaleString('vi-VN')}đ</span>
                                <button onClick={() => handleRemoveItem(item.id)} className="no-print text-red-500 font-bold text-xs bg-transparent border-none cursor-pointer px-1">×</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[10px] py-2 text-neutral-600 italic leading-relaxed">
                      * Dữ liệu tổng doanh thu tổng hợp (Chi tiết các mặt hàng F&B và phân mục chiết tính đã được phê duyệt trong file văn bản đính kèm riêng).
                    </div>
                  )}

                  <div className="border-b border-dashed border-neutral-400 my-2"></div>

                  <div className="text-[10px] space-y-1 text-neutral-600">
                    <div className="flex justify-between">
                      <span>Tiền thô chưa thuế:</span>
                      <span className="font-mono text-black">{calculateSubTotal().toLocaleString('vi-VN')}đ</span>
                    </div>
                    {vatRate > 0 && (
                      <div className="flex justify-between">
                        <span>Thuế giá trị gia tăng ({vatRate}%):</span>
                        <span className="font-mono text-black">{calculateVatMoney().toLocaleString('vi-VN')}đ</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xs font-bold text-black uppercase border-t border-neutral-200 pt-1.5 mt-1">
                      <span>Tổng tiền kết toán:</span>
                      <span className="font-mono text-black text-xs font-bold">{calculateFinalTotal().toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 text-center text-[9px] text-neutral-600 pt-4 gap-2">
                    <div className="space-y-8">
                      <p className="font-bold text-black uppercase">Người kiểm duyệt</p>
                      <p className="italic text-neutral-400">(Ký, ghi rõ họ tên)</p>
                    </div>
                    <div className="space-y-8">
                      <p className="font-bold text-black uppercase">Đại diện Agency</p>
                      <p className="italic text-neutral-400">(Ký, đóng dấu nội bộ)</p>
                    </div>
                  </div>

                  {billNote && <div className="text-center pt-4 text-[8px] italic text-neutral-500 border-t border-dashed border-neutral-300 mt-4 leading-normal">{billNote}</div>}

                  {showQrCode && calculateFinalTotal() > 0 && (
                    <div className="text-center pt-3 space-y-2 no-print flex flex-col items-center border-t border-neutral-200 mt-3">
                      <div className="flex gap-4 justify-center items-center w-full">
                        <div className="flex flex-col items-center space-y-1">
                          <p className="text-[8px] uppercase tracking-wider text-neutral-500 font-bold">1. Mã VietQR Thanh toán</p>
                          <div className="w-24 h-24 bg-white p-1 rounded-xl border border-neutral-200">
                            <img 
                              src={`https://img.vietqr.io/image/${bankBin}-${bankAccount}-compact.png?amount=${calculateFinalTotal()}&addInfo=${encodeURIComponent(receiptType + ' ' + currentBillId)}`} 
                              alt="VietQR Động" 
                              className="w-full h-full object-contain block"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col items-center space-y-1">
                          <p className="text-[8px] uppercase tracking-wider text-amber-600 font-bold">2. QR Quét thông tin Bill</p>
                          <div className="w-24 h-24 bg-white p-1 rounded-xl border border-neutral-200">
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                                `${window.location.origin}/receipt-view?id=${currentBillId}&total=${calculateFinalTotal()}&type=${encodeURIComponent(receiptType)}`
                              )}`} 
                              alt="QR Code Đọc Thông Tin Tối Giản" 
                              className="w-full h-full object-contain block"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={triggerHardwarePrintAndSaveLog} className="no-print w-full bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-widest py-4 rounded-xl transition-all shadow-lg cursor-pointer border-none outline-none">
                  🖨️ Kích hoạt máy in xuất hóa đơn trắng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB CORE MỚI: CHỈNH SỬA DỰ ÁN (MỞ RỘNG BIÊN ĐỘ ĐẤU NỐI PROJECT-DETAIL) */}
        {/* ========================================================================= */}
        {activeTab === 'projects-tab' && (
          <div className="tab-content-anim space-y-8 w-full">
            <div className="flex items-center justify-between border-b border-white/5 pb-5">
              <div>
                <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase font-semibold">Portfolio Management</span>
                <h1 className="text-2xl font-light text-white uppercase mt-1">Danh mục & Cập nhật dự án</h1>
              </div>
              <button onClick={clearProjectForm} className="bg-white text-black text-[10px] font-bold uppercase tracking-widest px-5 py-3 rounded-xl hover:bg-neutral-200 transition-all cursor-pointer border-none outline-none">+ Thêm dự án mới</button>
            </div>
            
           {/* 🟢 DANH SÁCH DỰ ÁN TỰ ĐỘNG KHỚP NỐI TOÀN DIỆN */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {globalProjects && (Array.isArray(globalProjects) ? globalProjects.length > 0 : Object.keys(globalProjects).length > 0) ? (
                // Nếu là Mảng thì .map trực tiếp, nếu là Object thì lặp qua Object.keys
                (Array.isArray(globalProjects) ? globalProjects : Object.keys(globalProjects).map(k => globalProjects[k])).map((proj, idx) => {
                  if (!proj) return null;
                  
                  // Chuẩn hóa ID phục vụ React render
                  const projectId = proj._id || proj.breadcrumb || `proj-${idx}`;
                  const fixImg = proj.img1?.startsWith('http') ? proj.img1 : '/' + (proj.img1?.replace('../', '') || '');
                  
                  return (
                    <div key={projectId} className="bg-zinc-900/20 border border-white/5 p-6 rounded-2xl flex items-center justify-between gap-4 hover:border-white/10 transition-colors backdrop-blur-sm">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-16 h-16 rounded-xl bg-neutral-800 overflow-hidden shrink-0 border border-white/5">
                          <img src={fixImg || "https://placehold.co/150"} alt={proj.name} className="w-full h-full object-cover block" />
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="text-sm font-bold text-white uppercase truncate">{proj.name || proj.breadcrumb}</h3>
                          <p className="text-[10px] text-gray-500 mt-0.5 font-mono">{proj.area || '100 m²'} • Năm {proj.year || '2026'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button type="button" onClick={() => fillProjectToForm({ ...proj, _id: projectId })} className="border border-white/10 bg-black/20 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-lg hover:border-white hover:bg-white hover:text-black transition-all cursor-pointer outline-none">
                          Sửa đổi
                        </button>
                        <button type="button" onClick={() => handleDeleteProject(projectId, proj.name || proj.breadcrumb)} className="border border-red-900/40 bg-red-950/20 text-[10px] font-bold uppercase tracking-widest text-red-400 px-4 py-2 rounded-lg hover:bg-red-900 hover:text-white transition-all cursor-pointer outline-none">
                          Xóa
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-neutral-500 italic p-4 col-span-2">Đang tải danh mục dự án hoặc dữ liệu trống...</p>
              )}
            </div>

            {/* FORM BIÊN TẬP CHI TIẾT GIỮ NGUYÊN PHÍA DƯỚI... */}
            {/* FORM BIÊN TẬP CHI TIẾT */}
            <form className="bg-zinc-900/20 border border-white/5 rounded-2xl p-6 md:p-8 space-y-6 w-full backdrop-blur-sm" onSubmit={saveProjectData}>
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/60 border-b border-white/5 pb-3 font-mono">{formTitle}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Tên hiển thị (Name)</label>
                  <input type="text" value={pName} onChange={(e) => setPName(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Đường dẫn rút gọn (Breadcrumb)</label>
                  <input type="text" value={pBreadcrumb} onChange={(e) => setPBreadcrumb(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Phân loại (Type)</label>
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
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Năm hoàn thành</label>
                  <input type="text" value={pYear} onChange={(e) => setPYear(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none" />
                </div>
              </div>

              {/* 🟢 KHU VỰC THÊM MỚI: ĐẤU NỐI VĂN BẢN SANG TRANG PROJECT-DETAIL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-white/5">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Tiêu đề nghệ thuật trang chi tiết (Heading)</label>
                  <input type="text" value={pHeading} onChange={(e) => setPHeading(e.target.value)} placeholder="Ví dụ: SETUP KHÔNG GIAN NGHỆ THUẬT ĐƯƠNG ĐẠI..." className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Mô tả ngắn trang chi tiết (Short Description)</label>
                  <input type="text" value={pShortDesc} onChange={(e) => setPShortDesc(e.target.value)} placeholder="Ví dụ: Underhood Kafe là sự kết hợp táo bạo..." className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none" />
                </div>
              </div>

              {/* Link ảnh chính */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Đường dẫn ảnh đại diện (Image URL 1)</label>
                <input type="text" value={pImg1} onChange={(e) => setPImg1(e.target.value)} placeholder="assets/pic/underhood.jpg..." className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none" />
              </div>

              {/* Ô nhập Description lớn bối cảnh */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Mô tả bối cảnh chuyên sâu (Description)</label>
                <textarea 
                  rows="4" 
                  value={pProjectDesc} 
                  onChange={(e) => setPProjectDesc(e.target.value)} 
                  placeholder="Nhập thông tin giới thiệu, bối cảnh, giải pháp kiến trúc của công trình..." 
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-xs text-white focus:outline-none focus:border-white/30 leading-relaxed font-light"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-white/5 gap-3">
                <button type="button" onClick={clearProjectForm} className="border border-white/10 bg-black/20 text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded-xl hover:border-white transition-all cursor-pointer">Làm trống form</button>
                <button type="submit" className="bg-white text-black text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-neutral-200 transition-all shadow-md cursor-pointer">Lưu cấu trúc dữ liệu</button>
              </div>
            </form>
          </div>
        )}

        {/* TAB CORE CŨ: SỬA BẢNG GIÁ WEB */}
        {activeTab === 'packages-tab' && (
          <div className="tab-content-anim space-y-8 w-full">
            <div><span className="text-[10px] tracking-[0.3em] text-white/30 uppercase font-semibold">Pricing Strategy</span><h1 className="text-2xl font-light text-white uppercase mt-1">Thay đổi giá các gói thiết kế dự án</h1></div>
            <form className="bg-zinc-900/20 border border-white/5 rounded-2xl p-6 md:p-8 space-y-6 w-full backdrop-blur-sm" onSubmit={savePackagesData}>
              <div id="packages-inputs-container" className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                {Object.keys(globalPackages).map(key => {
                  const pack = globalPackages[key];
                  return (
                    <div key={key} className="space-y-2">
                      <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{pack.num}. Đơn giá {pack.name} ({pack.unit})</label>
                      <input type="number" value={pack.price} onChange={(e) => { const val = parseFloat(e.target.value) || 0; setGlobalPackages({ ...globalPackages, [key]: { ...pack, price: val } }); }} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white font-medium font-mono text-sm focus:outline-none" />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end pt-4 border-t border-white/5"><button type="submit" className="bg-white text-black text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-neutral-200 transition-all shadow-md cursor-pointer border-none outline-none">Lưu định biên bảng giá</button></div>
            </form>
          </div>
        )}

      </main>

    </div>
  );
}