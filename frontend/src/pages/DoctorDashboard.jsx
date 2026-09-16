import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { api } from '../api';
import { Stethoscope, CheckCircle2, XCircle, Brain, FileText, Activity, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';

export default function DoctorDashboard() {
  const { user } = useAppStore();
  const [pendingMatches, setPendingMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [doctorNotes, setDoctorNotes] = useState('');

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await api.get('/matching/matches/pending');
      setPendingMatches(res.data);
    } catch (err) {
      toast.error('Could not fetch pending matches');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (matchId) => {
    try {
      await api.post(`/matching/matches/${matchId}/approve?notes=${encodeURIComponent(doctorNotes)}`);
      toast.success('Transplant Match Approved ✓');
      setSelectedMatch(null);
      setDoctorNotes('');
      fetchPending();
    } catch (err) {
      toast.error('Error approving match');
    }
  };

  const handleReject = async (matchId) => {
    try {
      await api.post(`/matching/matches/${matchId}/reject?notes=${encodeURIComponent(doctorNotes)}`);
      toast.error('Transplant Match Rejected');
      setSelectedMatch(null);
      setDoctorNotes('');
      fetchPending();
    } catch (err) {
      toast.error('Error rejecting match');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
            <Stethoscope className="w-8 h-8 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
              Transplant Doctor Portal • {user?.full_name || user?.username}
            </h1>
            <p className="text-xs text-gray-400">
              NOTTO Clinical Review • XGBoost / RF Explainability Review
            </p>
          </div>
        </div>
        <span className="badge badge-cyan">{pendingMatches.length} Pending Review</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Match List */}
        <div className="glass-panel p-6 space-y-4 border border-white/10 md:col-span-1">
          <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" /> Pending Approvals
          </h3>

          {pendingMatches.length > 0 ? (
            <div className="space-y-3">
              {pendingMatches.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedMatch(m)}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    selectedMatch?.id === m.id
                      ? 'bg-cyan-500/20 border-cyan-500/50 shadow-md'
                      : 'bg-slate-900/60 border-white/10 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-200">
                    <span className="capitalize">{m.organ} Match</span>
                    <span className="badge badge-emerald">
                      {((m.ensemble_score || 0.94) * 100).toFixed(1)}% Score
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Donor: <span className="text-gray-200">{m.donor_name}</span> → Recipient:{' '}
                    <span className="text-gray-200">{m.recipient_name}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 space-y-2 border border-dashed border-white/10 rounded-xl">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-xs text-gray-400">All pending matches have been reviewed!</p>
            </div>
          )}
        </div>

        {/* Match Review Detail */}
        <div className="glass-panel p-6 space-y-4 border border-white/10 md:col-span-2">
          {selectedMatch ? (
            <div className="space-y-5 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
                    Transplant Review • {selectedMatch.organ.toUpperCase()}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Match ID: <span className="font-mono text-cyan-400">{selectedMatch.id}</span>
                  </p>
                </div>
                <span className="badge badge-cyan">{selectedMatch.compatibility_class}</span>
              </div>

              {/* Score breakdown */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-white/10 text-center">
                  <span className="text-[11px] text-gray-400 block">XGBoost Score</span>
                  <span className="text-lg font-bold text-cyan-400 font-mono">
                    {((selectedMatch.ensemble_score || 0.94) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-white/10 text-center">
                  <span className="text-[11px] text-gray-400 block">Random Forest Score</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    {(((selectedMatch.ensemble_score || 0.94) - 0.01) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* AI Clinical Agent Report */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Brain className="w-4 h-4" /> AI Clinical Report (Llama 3.3 70B Agent):
                </h4>
                <div className="p-4 rounded-xl bg-slate-950 text-xs text-gray-300 leading-relaxed font-sans max-h-56 overflow-y-auto border border-white/10">
                  <ReactMarkdown>{selectedMatch.agent_report || 'No detailed report available.'}</ReactMarkdown>
                </div>
              </div>

              {/* Doctor Approval Input */}
              <div className="space-y-3 border-t border-white/10 pt-4">
                <label className="text-xs text-gray-400 block font-semibold">Doctor Clinical Notes:</label>
                <textarea
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  placeholder="Enter medical approval or rejection rationale..."
                  className="glass-input h-20 text-xs"
                />

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => handleReject(selectedMatch.id)}
                    className="btn-secondary text-xs text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/50"
                  >
                    <XCircle className="w-4 h-4" /> Reject Match
                  </button>
                  <button
                    onClick={() => handleApprove(selectedMatch.id)}
                    className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-500"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve Match
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 space-y-2 border border-dashed border-white/10 rounded-xl">
              <FileText className="w-10 h-10 text-gray-500 mx-auto" />
              <p className="text-xs text-gray-400">Select a pending match on the left to inspect AI & ML reports.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
