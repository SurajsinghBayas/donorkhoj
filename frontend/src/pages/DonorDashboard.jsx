import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { api } from '../api';
import MedicalScreeningWizard from '../components/MedicalScreeningWizard';
import { Heart, Stethoscope, Activity, CheckCircle2, ShieldCheck, AlertCircle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DonorDashboard() {
  const { user } = useAppStore();
  const [screening, setScreening] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const sRes = await api.get('/screening/me');
      setScreening(sRes.data);
    } catch (err) {
      setScreening(null);
    }

    try {
      const mRes = await api.get('/matching/matches/mine');
      setMatches(mRes.data);
    } catch (err) {}
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Welcome Banner */}
      <div className="glass-panel p-6 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <Heart className="w-8 h-8 text-emerald-400 fill-emerald-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
              Donor Portal • {user?.full_name || user?.username}
            </h1>
            <p className="text-xs text-gray-400">
              City: {user?.city || 'India'} | Role: Organ Donor
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowWizard(!showWizard)}
          className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-500"
        >
          <Stethoscope className="w-4 h-4" />
          {screening ? 'Update Screening Data' : 'Complete Medical Screening'}
        </button>
      </div>

      {/* Main Content */}
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
          {/* Status Card */}
          <div className="glass-panel p-6 space-y-4 border border-white/10 md:col-span-1">
            <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Eligibility Status
            </h3>

            {screening ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Medical Eligibility:</span>
                  {screening.is_eligible ? (
                    <span className="badge badge-emerald">Eligible ✓</span>
                  ) : (
                    <span className="badge badge-rose">Not Eligible ✕</span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-white/10 space-y-1">
                  <span className="text-xs text-gray-400 block">Blood Group:</span>
                  <span className="text-lg font-bold text-cyan-400 font-mono">{screening.blood_group}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-white/10 space-y-1">
                  <span className="text-xs text-gray-400 block">Organs Offered:</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {screening.organs_offered?.map((o) => (
                      <span key={o} className="badge badge-cyan capitalize">
                        {o}
                      </span>
                    ))}
                  </div>
                </div>

                {screening.eligibility_reasons?.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-white/10 space-y-1 text-xs">
                    <span className="text-gray-400 block font-semibold">Clinical Notes:</span>
                    <ul className="list-disc list-inside text-gray-300 space-y-0.5">
                      {screening.eligibility_reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-xs text-gray-400">
                  You haven't completed your medical screening yet.
                </p>
                <button onClick={() => setShowWizard(true)} className="btn-primary text-xs">
                  Start Screening
                </button>
              </div>
            )}
          </div>

          {/* Active Matches Card */}
          <div className="glass-panel p-6 space-y-4 border border-white/10 md:col-span-2">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Active Recipient Matches
            </h3>

            {matches.length > 0 ? (
              <div className="space-y-3">
                {matches.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-200 capitalize">
                          {m.organ} Transplant Match
                        </span>
                        <span className="badge badge-emerald">
                          {((m.ensemble_score || 0.95) * 100).toFixed(1)}% Score
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Status: <span className="text-cyan-400 uppercase font-mono">{m.status}</span>
                      </p>
                    </div>
                    <span className="badge badge-cyan">{m.compatibility_class}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 space-y-2 border border-dashed border-white/10 rounded-xl">
                <FileText className="w-8 h-8 text-gray-500 mx-auto" />
                <p className="text-xs text-gray-400">No active recipient matches yet.</p>
                <p className="text-[11px] text-gray-500">
                  Once recipient doctors trigger the matching pipeline, compatible matches will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
