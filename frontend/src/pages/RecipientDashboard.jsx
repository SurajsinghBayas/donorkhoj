import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { api } from '../api';
import MedicalScreeningWizard from '../components/MedicalScreeningWizard';
import AgentPipelineModal from '../components/AgentPipelineModal';
import { User, Activity, Search, Sparkles, ShieldCheck, AlertCircle, Heart, Stethoscope } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RecipientDashboard() {
  const { user } = useAppStore();
  const [screening, setScreening] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [donors, setDonors] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedOrgan, setSelectedOrgan] = useState('kidney');
  const [activeJobId, setActiveJobId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [selectedOrgan]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const sRes = await api.get('/screening/me');
      setScreening(sRes.data);
    } catch (err) {
      setScreening(null);
    }

    try {
      const dRes = await api.get(`/matching/donors?organ=${selectedOrgan}`);
      setDonors(dRes.data);
    } catch (err) {}

    try {
      const mRes = await api.get('/matching/matches/mine');
      setMatches(mRes.data);
    } catch (err) {}

    setLoading(false);
  };

  const handleRunMatch = async (donorId) => {
    if (!screening) {
      toast.error('Please complete your medical screening first');
      return;
    }
    try {
      const res = await api.post(`/agents/matching/run?donor_id=${donorId}&recipient_id=${user.id}&organ=${selectedOrgan}`);
      setActiveJobId(res.data.job_id);
      toast.success('Agentic matching pipeline triggered!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to trigger matching');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Welcome Banner */}
      <div className="glass-panel p-6 border border-rose-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
            <User className="w-8 h-8 text-rose-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
              Recipient Portal • {user?.full_name || user?.username}
            </h1>
            <p className="text-xs text-gray-400">
              Urgency Rank Score: <span className="text-amber-400 font-bold">{screening?.urgency_score || 0} / 10</span> | City: {user?.city || 'India'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowWizard(!showWizard)}
          className="btn-primary text-xs bg-rose-600 hover:bg-rose-500"
        >
          <Stethoscope className="w-4 h-4" />
          {screening ? 'Update Screening Data' : 'Complete Screening'}
        </button>
      </div>

      {activeJobId && (
        <AgentPipelineModal
          jobId={activeJobId}
          onClose={() => setActiveJobId(null)}
          onComplete={() => fetchData()}
        />
      )}

      {showWizard ? (
        <MedicalScreeningWizard
          onComplete={(data) => {
            setScreening(data);
            setShowWizard(false);
            fetchData();
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Status & Urgency Card */}
          <div className="glass-panel p-6 space-y-4 border border-white/10 md:col-span-1">
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Screening & Urgency
            </h3>

            {screening ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Blood Group:</span>
                  <span className="text-sm font-bold text-cyan-400 font-mono">{screening.blood_group}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Transplant Urgency:</span>
                  <span className="badge badge-amber">{screening.urgency_score}/10 Priority</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-white/10 space-y-1">
                  <span className="text-xs text-gray-400 block">Organ Needed:</span>
                  <span className="badge badge-rose uppercase">{screening.organ_needed || selectedOrgan}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-xs text-gray-400">Complete screening to enable donor matching.</p>
                <button onClick={() => setShowWizard(true)} className="btn-primary text-xs">
                  Start Screening
                </button>
              </div>
            )}
          </div>

          {/* Compatible Donors Search Card */}
          <div className="glass-panel p-6 space-y-4 border border-white/10 md:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                <Search className="w-4 h-4" /> Available Eligible Donors
              </h3>
              <div className="flex gap-1.5">
                {['kidney', 'liver', 'heart', 'lung'].map((o) => (
                  <button
                    key={o}
                    onClick={() => setSelectedOrgan(o)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize border transition ${
                      selectedOrgan === o
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                        : 'bg-white/5 text-gray-400 border-white/10'
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            {donors.length > 0 ? (
              <div className="space-y-3">
                {donors.map((d) => (
                  <div
                    key={d.user_id}
                    className="p-4 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-200">{d.username}</span>
                        <span className="badge badge-cyan font-mono">{d.blood_group}</span>
                        <span className="text-[11px] text-gray-400">{d.city}</span>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Kidney eGFR: <span className="text-emerald-400 font-mono">{d.egfr || 'N/A'}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => handleRunMatch(d.user_id)}
                      className="btn-primary text-xs py-1.5 px-3 bg-gradient-to-r from-cyan-500 to-blue-600"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Run AI Matching
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 space-y-2 border border-dashed border-white/10 rounded-xl">
                <Search className="w-8 h-8 text-gray-500 mx-auto" />
                <p className="text-xs text-gray-400">No eligible {selectedOrgan} donors currently listed.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
