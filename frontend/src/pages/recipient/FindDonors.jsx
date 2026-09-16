import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Users, Zap, MapPin } from 'lucide-react';
import { api, apiError } from '../../lib/api';
import { useAppStore } from '../../lib/store';
import { ORGANS } from '../../lib/constants';
import { bloodDisplay, titleCase } from '../../lib/format';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Empty from '../../components/ui/Empty';
import PipelineModal from '../../components/pipeline/PipelineModal';

export default function FindDonors() {
  const { user } = useAppStore();
  const navigate = useNavigate();
  const [organ, setOrgan] = useState('kidney');
  const [donors, setDonors] = useState(null);
  const [screened, setScreened] = useState(true);
  const [job, setJob] = useState(null); // { jobId, donorName }
  const [starting, setStarting] = useState(null); // donor_id being started

  // Recipients need a screening before matching works
  useEffect(() => {
    api.get('/screening/me')
      .then((r) => setScreened(!!r.data?.screening?.blood_group))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.get('/matching/donors', { params: { organ } })
      .then((r) => { if (!cancelled) setDonors({ organ, list: r.data }); })
      .catch((err) => {
        if (cancelled) return;
        toast.error(apiError(err, 'Could not load donors'));
        setDonors({ organ, list: [] });
      });
    return () => { cancelled = true; };
  }, [organ]);

  // null while the request for the currently selected organ is in flight
  const donorList = donors?.organ === organ ? donors.list : null;

  async function runMatch(donor) {
    setStarting(donor.user_id);
    try {
      const res = await api.post('/agents/matching/run', null, {
        params: { donor_id: donor.user_id, recipient_id: user.id, organ },
      });
      setJob({ jobId: res.data.job_id, donorName: donor.username });
    } catch (err) {
      toast.error(apiError(err, 'Could not start the pipeline'));
    } finally {
      setStarting(null);
    }
  }

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Recipient portal"
        title="Find a donor."
        description="Every person listed here has cleared the eligibility engine. Run the pipeline to score compatibility against your own workup."
      />

      {!screened && (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3.5 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-[13px] text-amber-900">
            <b className="font-semibold">Finish your screening first.</b> The pipeline scores donors against your clinical values.
          </p>
          <Link to="/recipient/screening">
            <Button size="sm" variant="outline" className="border-amber-300">Complete screening</Button>
          </Link>
        </div>
      )}

      {/* Organ selector */}
      <div className="mt-8 flex flex-wrap gap-1.5">
        {ORGANS.map((o) => (
          <button
            key={o.id}
            onClick={() => setOrgan(o.id)}
            className={`h-9 px-4 rounded-md border text-[13px] font-medium transition-colors cursor-pointer ${
              organ === o.id
                ? 'border-ink bg-ink text-white'
                : 'border-stone-300 bg-white text-stone-600 hover:border-stone-400 hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Donor list */}
      <Card pad={false} className="mt-4 overflow-hidden">
        {donorList === null ? (
          <div className="py-20 flex justify-center"><Spinner size={22} /></div>
        ) : donorList.length === 0 ? (
          <Empty
            icon={Users}
            title={`No eligible ${organ} donors right now`}
            hint="The registry updates as donors complete screening. Try another organ, or check back soon."
          />
        ) : (
          <>
            {/* Table head */}
            <div className="hidden md:grid grid-cols-[1.4fr_0.8fr_1fr_0.8fr_0.8fr_auto] gap-4 px-5 py-3 border-b border-stone-200 bg-stone-50">
              {['Donor', 'Blood', 'City', organ === 'heart' ? 'EF' : 'eGFR', 'Organs', ''].map((h) => (
                <span key={h} className="micro" style={{ fontSize: 10 }}>{h}</span>
              ))}
            </div>
            <ul>
              {donorList.map((d) => (
                <li
                  key={d.user_id}
                  className="grid md:grid-cols-[1.4fr_0.8fr_1fr_0.8fr_0.8fr_auto] gap-2 md:gap-4 items-center px-5 py-4 border-t border-stone-100 first:border-t-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-md bg-stone-100 border border-stone-200 flex items-center justify-center font-mono text-[11px] font-semibold text-stone-600">
                      {d.username.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="text-[14px] font-medium text-ink">{d.username}</span>
                  </div>
                  <span className="font-mono text-[13px] font-semibold text-blood-700">{bloodDisplay(d.blood_group)}</span>
                  <span className="flex items-center gap-1.5 text-[13px] text-stone-500">
                    <MapPin size={13} className="text-stone-400" /> {d.city || '—'}
                  </span>
                  <span className="font-mono text-[12.5px] text-stone-600 tnum">
                    {organ === 'heart'
                      ? (d.ejection_fraction != null ? `${d.ejection_fraction}%` : '—')
                      : (d.egfr != null ? d.egfr : '—')}
                  </span>
                  <span className="flex flex-wrap gap-1">
                    {(d.organs_offered || []).map((o) => (
                      <Badge key={o} tone={o === organ ? 'red' : 'stone'}>{titleCase(o)}</Badge>
                    ))}
                  </span>
                  <Button
                    size="sm"
                    variant="accent"
                    icon={Zap}
                    loading={starting === d.user_id}
                    disabled={!screened}
                    onClick={() => runMatch(d)}
                  >
                    Run match
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <p className="mt-4 text-[12px] text-stone-400 leading-relaxed max-w-xl">
        Running a match executes the full pipeline — eligibility, organ quality, ML ensemble scoring,
        SHAP explainability, and an AI clinical report — then queues it for physician review.
      </p>

      <PipelineModal
        jobId={job?.jobId}
        organ={organ}
        onClose={() => setJob(null)}
        onDone={() => {
          setJob(null);
          navigate('/recipient/matches');
        }}
      />
    </div>
  );
}
