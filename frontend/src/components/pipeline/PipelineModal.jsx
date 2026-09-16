import { useEffect, useRef, useState } from 'react';
import { Check, Minus, AlertTriangle } from 'lucide-react';
import { WS_URL, api } from '../../lib/api';
import { compatTone } from '../../lib/constants';
import { titleCase } from '../../lib/format';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import ScoreRing from '../ui/ScoreRing';

const STAGES = [
  { id: 'eligibility',    label: 'Eligibility check',  desc: 'Rule-based screening against NOTTO criteria' },
  { id: 'organ_quality',  label: 'Organ quality',      desc: 'Donor organ function thresholds' },
  { id: 'ml_matching',    label: 'Match scoring',      desc: 'XGBoost + Random Forest ensemble' },
  { id: 'explainability', label: 'Explainability',     desc: 'SHAP feature attribution' },
  { id: 'report',         label: 'Clinical report',    desc: 'AI-written match summary' },
];

function StageIcon({ status }) {
  if (status === 'running') return <Spinner size={15} />;
  if (status === 'completed') return (
    <span className="w-[22px] h-[22px] rounded-full bg-leaf-600 text-white flex items-center justify-center">
      <Check size={12} strokeWidth={3} />
    </span>
  );
  if (status === 'skipped') return (
    <span className="w-[22px] h-[22px] rounded-full bg-stone-200 text-stone-500 flex items-center justify-center">
      <Minus size={12} strokeWidth={3} />
    </span>
  );
  if (status === 'failed') return (
    <span className="w-[22px] h-[22px] rounded-full bg-blood-600 text-white flex items-center justify-center">
      <AlertTriangle size={11} strokeWidth={2.5} />
    </span>
  );
  return <span className="w-[22px] h-[22px] rounded-full border-2 border-stone-200 bg-white" />;
}

export default function PipelineModal({ jobId, organ, onClose, onDone }) {
  const [stages, setStages] = useState({}); // id → { status, data }
  const [result, setResult] = useState(null);
  const [failed, setFailed] = useState(null);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!jobId) return;
    let ws;
    let pollTimer;
    let closed = false;

    const apply = (msg) => {
      if (msg.step === 'completed' && msg.status === 'completed') {
        setResult(msg.data);
        doneRef.current = true;
        return;
      }
      if (!msg.step) return;
      setStages((s) => ({ ...s, [msg.step]: { status: msg.status, data: msg.data } }));
      if (msg.status === 'failed') setFailed(msg.step);
    };

    const startPolling = () => {
      // Fallback when the socket drops before completion
      pollTimer = setInterval(async () => {
        if (doneRef.current || closed) return clearInterval(pollTimer);
        try {
          const res = await api.get(`/agents/matching/${jobId}`);
          const { status, steps, result: r, error } = res.data;
          (steps || []).forEach((st) =>
            setStages((s) => ({ ...s, [st.step]: { status: st.status, data: st.data } }))
          );
          if (status === 'completed') {
            setResult(r || {});
            doneRef.current = true;
            clearInterval(pollTimer);
          } else if (status === 'failed') {
            setFailed(error || 'pipeline');
            clearInterval(pollTimer);
          }
        } catch { /* keep polling */ }
      }, 2000);
    };

    try {
      ws = new WebSocket(`${WS_URL}/agents/ws/${jobId}`);
      ws.onmessage = (e) => {
        try { apply(JSON.parse(e.data)); } catch { /* ignore malformed frame */ }
      };
      ws.onerror = () => startPolling();
      ws.onclose = () => { if (!doneRef.current) startPolling(); };
      // Keep-alive ping so the server loop stays open
      const ping = setInterval(() => ws.readyState === 1 && ws.send('ping'), 15000);
      return () => { closed = true; clearInterval(ping); clearInterval(pollTimer); ws.close(); };
    } catch {
      startPolling();
    }
    return () => { closed = true; clearInterval(pollTimer); };
  }, [jobId]);

  const running = !result && !failed;

  return (
    <Modal
      open={!!jobId}
      onClose={running ? undefined : onClose}
      title="Matching pipeline"
      subtitle={running
        ? `Analysing donor–recipient compatibility for ${titleCase(organ)}.`
        : result ? 'Analysis complete.' : 'Pipeline stopped.'}
    >
      <div className="px-6 py-5">
        {/* Stage list */}
        <ol className="relative">
          {STAGES.map((stage, i) => {
            const st = stages[stage.id]?.status || 'pending';
            const isLast = i === STAGES.length - 1;
            return (
              <li key={stage.id} className="relative flex gap-3.5 pb-6 last:pb-0">
                {!isLast && (
                  <span className="absolute left-[10px] top-6 bottom-0 w-px bg-stone-200" />
                )}
                <span className="relative z-10 mt-0.5 bg-white"><StageIcon status={st} /></span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className={`text-[13.5px] font-medium ${st === 'pending' ? 'text-stone-400' : 'text-ink'}`}>
                      {stage.label}
                    </p>
                    {st === 'running' && <Badge tone="amber" dot pulse>Running</Badge>}
                    {st === 'skipped' && <Badge tone="stone">Skipped</Badge>}
                    {st === 'failed' && <Badge tone="red">Failed</Badge>}
                  </div>
                  <p className="text-[12px] text-stone-400 mt-0.5">{stage.desc}</p>

                  {/* Inline detail for completed ML stage */}
                  {stage.id === 'ml_matching' && st === 'completed' && stages[stage.id]?.data && (
                    <div className="mt-2 flex gap-4 font-mono text-[11px] text-stone-500">
                      <span>XGB <b className="text-ink tnum">{fmtScore(stages[stage.id].data.xgb_score)}</b></span>
                      <span>RF <b className="text-ink tnum">{fmtScore(stages[stage.id].data.rf_score)}</b></span>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {/* Failure */}
        {failed && (
          <div className="mt-5 rounded-md border border-blood-200 bg-blood-50 px-4 py-3">
            <p className="text-[13px] text-blood-700">
              The pipeline hit an error{typeof failed === 'string' ? ` at “${titleCase(failed)}”` : ''}.
              Please check both screening profiles and try again.
            </p>
            <Button variant="danger" size="sm" className="mt-3" onClick={onClose}>Close</Button>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-6 rounded-lg border border-stone-200 bg-paper p-5 flex items-center gap-5 rise">
            <ScoreRing
              score={result.ensemble_score ?? 0}
              tone={compatTone(result.compatibility_class)}
              size={84}
            />
            <div className="flex-1 min-w-0">
              <p className="micro">Ensemble score</p>
              <p className="mt-1.5">
                <Badge tone={compatTone(result.compatibility_class)}>
                  {titleCase(result.compatibility_class) || 'Scored'}
                </Badge>
              </p>
              <p className="mt-2 text-[12.5px] text-stone-500 leading-relaxed">
                The full clinical report is ready for review.
              </p>
            </div>
            <Button variant="accent" onClick={() => onDone?.(result)}>
              View match
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function fmtScore(s) {
  return s == null ? '—' : (s * 100).toFixed(1) + '%';
}
