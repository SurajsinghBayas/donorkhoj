import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Inbox, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api, apiError } from '../../lib/api';
import { compatTone } from '../../lib/constants';
import { pct, titleCase, formatDateTime } from '../../lib/format';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Empty from '../../components/ui/Empty';
import Drawer from '../../components/ui/Drawer';
import ScoreRing from '../../components/ui/ScoreRing';
import { Textarea } from '../../components/ui/Field';

export default function ReviewQueue() {
  const [matches, setMatches] = useState(null);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState('');
  const [acting, setActing] = useState(null); // 'approve' | 'reject'

  const load = () =>
    api.get('/matching/matches/pending').then((r) => setMatches(r.data)).catch(() => setMatches([]));

  useEffect(() => { load(); }, []);

  async function decide(action) {
    setActing(action);
    try {
      await api.post(`/matching/matches/${selected.id}/${action}`, null, { params: { notes } });
      toast.success(`Match ${action === 'approve' ? 'approved' : 'rejected'} and recorded`);
      setMatches((m) => m.filter((x) => x.id !== selected.id));
      setSelected(null);
      setNotes('');
    } catch (err) {
      toast.error(apiError(err, 'Action failed'));
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Physician portal"
        title="Review queue."
        description="AI-scored matches awaiting your decision. Read the report, check the drivers, then approve or reject — your call is final."
      />

      <div className="mt-8">
        {matches === null ? (
          <div className="py-20 flex justify-center"><Spinner size={22} /></div>
        ) : matches.length === 0 ? (
          <Card>
            <Empty
              icon={Inbox}
              title="Queue is clear"
              hint="When the pipeline completes a match, it lands here for your review."
            />
          </Card>
        ) : (
          <Card pad={false} className="overflow-hidden">
            <div className="hidden md:grid grid-cols-[1.2fr_1.2fr_0.7fr_0.8fr_1fr_1fr] gap-4 px-5 py-3 border-b border-stone-200 bg-stone-50">
              {['Donor', 'Recipient', 'Organ', 'Score', 'Class', 'Created'].map((h) => (
                <span key={h} className="micro" style={{ fontSize: 10 }}>{h}</span>
              ))}
            </div>
            <ul>
              {matches.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => { setSelected(m); setNotes(''); }}
                    className="w-full grid md:grid-cols-[1.2fr_1.2fr_0.7fr_0.8fr_1fr_1fr] gap-2 md:gap-4 items-center px-5 py-4
                      border-t border-stone-100 first:border-t-0 text-left hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    <span className="text-[13.5px] font-medium text-ink truncate">{m.donor_name}</span>
                    <span className="text-[13.5px] text-stone-600 truncate">{m.recipient_name}</span>
                    <span className="text-[13px] text-stone-600">{titleCase(m.organ)}</span>
                    <span className="font-mono text-[13px] font-semibold tnum text-ink">{pct(m.ensemble_score)}</span>
                    <span><Badge tone={compatTone(m.compatibility_class)}>{titleCase(m.compatibility_class)}</Badge></span>
                    <span className="text-[12px] text-stone-400">{formatDateTime(m.created_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {/* ── Detail drawer ── */}
      <Drawer open={!!selected} onClose={() => setSelected(null)} width={520}>
        {selected && (
          <>
            <div className="flex items-center justify-between px-6 h-16 border-b border-stone-200 shrink-0">
              <div>
                <p className="text-[15px] font-semibold text-ink">{titleCase(selected.organ)} match</p>
                <p className="micro mt-0.5" style={{ fontSize: 9.5 }}>
                  {selected.donor_name} → {selected.recipient_name}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-2 rounded-md text-stone-400 hover:text-ink hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scroll-thin px-6 py-6">
              <div className="flex items-center gap-5 pb-6 border-b border-stone-100">
                <ScoreRing score={selected.ensemble_score ?? 0} tone={compatTone(selected.compatibility_class)} size={84} />
                <div>
                  <Badge tone={compatTone(selected.compatibility_class)}>{titleCase(selected.compatibility_class)}</Badge>
                  <p className="mt-2 font-mono text-[11px] text-stone-400">
                    ID {selected.id.slice(0, 8)} · {formatDateTime(selected.created_at)}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <p className="micro mb-3">Clinical report</p>
                {selected.agent_report ? (
                  <div className="md"><ReactMarkdown>{selected.agent_report}</ReactMarkdown></div>
                ) : (
                  <p className="text-[13px] text-stone-400">No report attached.</p>
                )}
              </div>

              <div className="mt-8">
                <p className="micro mb-2">Physician notes</p>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Rationale for your decision — recorded with the match…"
                  rows={3}
                />
              </div>
            </div>

            <div className="border-t border-stone-200 p-4 flex gap-2.5 shrink-0 bg-white">
              <Button
                variant="primary"
                className="flex-1 bg-leaf-600 hover:bg-leaf-700"
                loading={acting === 'approve'}
                disabled={!!acting}
                onClick={() => decide('approve')}
              >
                Approve match
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                loading={acting === 'reject'}
                disabled={!!acting}
                onClick={() => decide('reject')}
              >
                Reject
              </Button>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
