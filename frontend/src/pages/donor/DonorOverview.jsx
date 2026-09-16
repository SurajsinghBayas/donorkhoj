import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardCheck, HeartHandshake, Hourglass } from 'lucide-react';
import { api } from '../../lib/api';
import { useAppStore } from '../../lib/store';
import { MATCH_STATUS, compatTone } from '../../lib/constants';
import { pct, titleCase, formatDate, bloodDisplay } from '../../lib/format';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LabReportButton from '../../components/screening/LabReportButton';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Empty from '../../components/ui/Empty';

export default function DonorOverview() {
  const { user } = useAppStore();
  const [screening, setScreening] = useState(null);
  const [matches, setMatches] = useState(null);

  useEffect(() => {
    api.get('/screening/me').then((r) => setScreening(r.data?.screening || null)).catch(() => setScreening(null));
    api.get('/matching/matches/mine').then((r) => setMatches(r.data)).catch(() => setMatches([]));
  }, []);

  const firstName = (user?.full_name || user?.username || '').split(' ')[0].replace(/\(.*\)/, '');
  const screened = !!screening?.blood_group;
  const eligible = screening?.is_eligible;

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Donor portal"
        title={`Hello, ${firstName}.`}
        description="Your screening, eligibility, and every match you are part of — in one place."
        actions={
          <div className="flex items-center gap-2.5">
            {screened && <LabReportButton label="My lab report" />}
            <Link to="/donor/screening">
              <Button variant={screened ? 'outline' : 'accent'} icon={ClipboardCheck}>
                {screened ? 'Update screening' : 'Start screening'}
              </Button>
            </Link>
          </div>
        }
      />

      {/* Status cards */}
      <div className="mt-8 grid sm:grid-cols-3 gap-px bg-stone-200 border border-stone-200 rounded-lg overflow-hidden">
        <div className="bg-white p-5">
          <p className="micro">Eligibility</p>
          {screening === null ? (
            <p className="mt-3 text-[14px] text-stone-500">Not screened yet</p>
          ) : (
            <div className="mt-3">
              <Badge tone={eligible ? 'green' : 'red'} dot>
                {eligible ? 'Eligible to donate' : 'Not eligible'}
              </Badge>
              {screening.blood_group && (
                <p className="mt-2.5 text-[12.5px] text-stone-500">
                  Blood group <b className="text-ink font-mono">{bloodDisplay(screening.blood_group)}</b>
                </p>
              )}
            </div>
          )}
        </div>
        <div className="bg-white p-5">
          <p className="micro">Organs offered</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {screening?.organs_offered?.length
              ? screening.organs_offered.map((o) => <Badge key={o} tone="ink">{titleCase(o)}</Badge>)
              : <p className="text-[14px] text-stone-500">None selected</p>}
          </div>
        </div>
        <div className="bg-white p-5">
          <p className="micro">Matches</p>
          <p className="mt-2 font-display text-[30px] font-semibold tnum leading-none">
            {matches === null ? '–' : matches.length}
          </p>
          <p className="mt-1.5 text-[12px] text-stone-500">
            {matches?.some((m) => m.status === 'approved')
              ? 'One or more approved by a physician'
              : 'Awaiting physician-reviewed matches'}
          </p>
        </div>
      </div>

      {/* Next steps */}
      <Card className="mt-6">
        <CardHeader title="What happens next" description="The path from registration to donation." />
        <ol className="mt-5 space-y-0">
          {[
            {
              done: screened,
              text: 'Complete your three-step medical screening',
              sub: 'Lab values, organ function, HLA typing',
            },
            {
              done: eligible === true,
              text: 'Clear the eligibility engine',
              sub: 'Rule-based checks against NOTTO criteria',
            },
            {
              done: (matches || []).length > 0,
              text: 'Get matched with a recipient',
              sub: 'The ML ensemble scores every compatible pair',
            },
            {
              done: (matches || []).some((m) => m.status === 'approved'),
              text: 'Physician review and transplant coordination',
              sub: 'A doctor reads the full report before anything proceeds',
            },
          ].map((s, i) => (
            <li key={i} className="flex gap-4 py-3.5 border-t border-stone-100 first:border-t-0">
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                s.done ? 'border-leaf-600 bg-leaf-600 text-white' : 'border-stone-300 text-stone-400'
              }`}>
                {s.done
                  ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M20 6 9 17l-5-5" /></svg>
                  : <span className="font-mono text-[10px]">{i + 1}</span>}
              </span>
              <div>
                <p className={`text-[14px] font-medium ${s.done ? 'text-stone-400 line-through decoration-stone-300' : 'text-ink'}`}>
                  {s.text}
                </p>
                <p className="text-[12.5px] text-stone-400 mt-0.5">{s.sub}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {/* Recent matches */}
      <Card className="mt-6" pad={false}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <CardHeader title="Recent matches" />
          <Link to="/donor/matches">
            <Button variant="ghost" size="sm">View all <ArrowRight size={14} /></Button>
          </Link>
        </div>
        {matches === null ? (
          <div className="py-10 flex justify-center"><Spinner /></div>
        ) : matches.length === 0 ? (
          <Empty
            icon={Hourglass}
            title="No matches yet"
            hint="Once a recipient requests a match with you, it appears here with its AI score and report."
          />
        ) : (
          <ul>
            {matches.slice(0, 4).map((m) => (
              <li key={m.id} className="flex items-center gap-4 px-5 py-3.5 border-t border-stone-100">
                <HeartHandshake size={16} className="text-blood-600 shrink-0" />
                <span className="text-[13.5px] font-medium text-ink">{titleCase(m.organ)}</span>
                <span className="font-mono text-[12px] text-stone-500 tnum">{pct(m.ensemble_score)}</span>
                <span className="hidden sm:block text-[12px] text-stone-400">{formatDate(m.created_at)}</span>
                <span className="ml-auto flex items-center gap-2">
                  <Badge tone={compatTone(m.compatibility_class)}>{titleCase(m.compatibility_class)}</Badge>
                  <Badge tone={MATCH_STATUS[m.status]?.tone || 'stone'}>
                    {MATCH_STATUS[m.status]?.label || m.status}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
