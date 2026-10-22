import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import FloorPlanForm from '../components/FloorPlanForm';
import ConceptForm from '../components/ConceptForm';
import LeadCaptureForm from '../components/LeadCaptureForm';
import { getCurrentUser, api } from '../utils/apiClient';

const STEPS = [
  { id: 1, label: 'Mặt bằng' },
  { id: 2, label: 'Concept' },
  { id: 3, label: 'Liên hệ' }
];

export default function AIStudio() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [floorPlan, setFloorPlan] = useState(null);
  const [concept, setConcept] = useState(null);
  const [lead, setLead] = useState(null);
  const user = getCurrentUser();
  const [zaloLink, setZaloLink] = useState('https://zalo.me/0375075975');

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);
  useEffect(() => {
    api.get('/api/settings').then(res => {
      if (res.data?.zaloLink) setZaloLink(res.data.zaloLink);
    }).catch(console.error);
  }, []);
  const handleFloorPlanSuccess = (data) => {
    setFloorPlan(data);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConceptSuccess = (data) => {
    setConcept(data);
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLeadSuccess = (data) => {
    setLead(data);
    setStep(4);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBackToStep = (targetStep) => {
    setStep(targetStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full min-h-screen bg-[#0b0b0b] text-gray-300 antialiased font-sans">
      <Header showBackBtn={true} />

      <main className="pt-32 pb-24 px-6 md:px-16 max-w-5xl mx-auto w-full">
        <div className="mb-12 text-center">
          <span className="text-[10px] tracking-[0.4em] text-white/30 uppercase block mb-3 font-semibold">
            AI Studio
          </span>
          <h1 className="text-3xl md:text-5xl font-light text-white uppercase leading-tight">
            Diễn hoạ không gian ý tưởng
          </h1>
          <p className="text-sm text-neutral-500 mt-4 max-w-xl mx-auto">
            Nhập thông tin mặt bằng và concept. AI sẽ phân tích và render phối cảnh 3D cho bạn.
          </p>
        </div>

        {step < 4 && (
          <div className="mb-10">
            <div className="flex items-center justify-between max-w-md mx-auto">
              {STEPS.map((s, idx) => (
                <React.Fragment key={s.id}>
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step >= s.id
                        ? 'bg-amber-400 text-black'
                        : 'bg-white/5 text-white/30 border border-white/10'
                    }`}>
                      {s.id}
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider font-semibold ${
                      step >= s.id ? 'text-white' : 'text-white/30'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`flex-1 h-[1px] mx-3 transition-all ${
                      step > s.id ? 'bg-amber-400' : 'bg-white/10'
                    }`}></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        <div className="bg-zinc-900/20 border border-white/5 rounded-2xl p-6 md:p-10">
          {step === 1 && (
            <FloorPlanForm onSuccess={handleFloorPlanSuccess} />
          )}

          {step === 2 && floorPlan && (
            <ConceptForm
              floorPlanId={floorPlan._id}
              onSuccess={handleConceptSuccess}
              onBack={() => goBackToStep(1)}
            />
          )}

          {step === 3 && floorPlan && (
            <LeadCaptureForm
              floorPlanId={floorPlan._id}
              onSuccess={handleLeadSuccess}
              onBack={() => goBackToStep(2)}
            />
          )}

          {step === 4 && floorPlan && concept && lead && (
            <div className="text-center space-y-6 py-8">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-10 h-10 text-emerald-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>

              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-white uppercase">
                  Đã ghi nhận thông tin
                </h2>
                <p className="text-sm text-neutral-400 max-w-md mx-auto">
                  Cảm ơn bạn đã gửi thông tin. Đội ngũ MAC sẽ liên hệ tư vấn chi tiết trong vòng 24 giờ.
                </p>
              </div>

              <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-6 max-w-md mx-auto text-left space-y-3 text-xs">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-neutral-500">Dự án:</span>
                  <span className="text-white font-semibold">{floorPlan.projectName}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-neutral-500">Diện tích:</span>
                  <span className="text-white font-mono">{floorPlan.totalArea} m²</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-neutral-500">Style:</span>
                  <span className="text-emerald-400 font-semibold">{concept.style}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Liên hệ:</span>
                  <span className="text-white">{lead.phone}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <button
                  onClick={() => navigate('/home')}
                  className="bg-white text-black px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-neutral-200 transition-all"
                >
                  Về trang chủ
                </button>
                <a
  href={zaloLink}
  target="_blank"
  rel="noreferrer"
  className="bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all text-center"
>
  Liên hệ Zalo ngay
</a>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}