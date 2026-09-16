import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search, ClipboardCheck, Activity } from 'lucide-react';
import { api } from '../../lib/api';
import { useAppStore } from '../../lib/store';
import { MATCH_STATUS, compatTone } from '../../lib/constants';
import { pct, titleCase, formatDate } from '../../lib/format';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LabReportButton from '../../components/screening/LabReportButton';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Empty from '../../components/ui/Empty';

export default function RecipientOverview() {
  const { user } = useAppStore();
  const [screening, setScreening] = useState(undefined);
  const [matches, setMatches] = useState(null);

  useEffect(() => {
    api.get('/screening/me').then((r) => setScreening(r.data?.screening || null)).catch(() => setScreening(null));
    api.get('/matching/matches/mine').then((r) => setMatches(r.data)).catch(() => setMatches([]));
  }, []);

  const firstName = (user?.full_name || user?.username || '').split(' ')[0].replace(/\(.*\)/, '');
  const screened = !!screening?.blood_group;
  const urgency = screening?.urgency_score;
  const best = matches?.length
    ? matches.reduce((a, b) => ((b.ensemble_score ?? 0) > (a.ensemble_score ?? 0) ? b : a))
    : null;

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Recipient portal"
        title={`Hello, ${firstName}.`}
        description="Track your listing, your urgency score, and every match the pipeline has scored for you."
        actions={
          <div className="flex items-center gap-2.5">
            {screened && <LabReportButton label="My lab report" />}
            <Link to="/recipient/find">
              <Button variant="accent" icon={Search}>Find donors</Button>
            </Link>
          </div>
        }
      />

      <div className="mt-8 grid sm:grid-cols-3 gap-px bg-stone-200 border border-stone-200 rounded-lg overflow-hidden">
        {/* Urgency */}
        <div className="bg-white p-5">
          <p className="micro">Urgency score</p>
          {screening === undefined ? (
            <Spinner size={16} className="mt-4" />
          ) : urgency != null ? (
            <>
              <p className="mt-2 font-display text-[30px] font-semibold tnum leading-none">
                {Number(urgency).toFixed(1)}<span className="text-[16px] text-stone-400"> / 10</span>
              </p>
              <div className="mt-3 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blood-600 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, (urgency / 10) * 100)}%` }}
                />
              </div>
            </>
          ) : (
            <p className="mt-3 text-[14px] text-stone-500">Computed after screening</p>
          )}
        </div>

        {/* Listing status */}
        <div className="bg-white p-5">
          <p className="micro">Listing status</p>
          <div className="mt-3">
            {screening === undefined ? (
              <Spinner size={16} />
            ) : screened ? (
              <Badge tone={screening.is_eligible ? 'green' : 'red'} dot>
                {screening.is_eligible ? 'Active — eligible' : 'On hold — review needed'}
              </Badge>
            ) : (
              <Badge tone="amber" dot>Screening incomplete</Badge>
            )}
            {screening?.organs_offered?.[0] && (
              <p className="mt-2.5 text-[12.5px] text-stone-500">
                Waiting for: <b className="text-ink">{titleCase(screening.organs_offered[0])}</b>
              </p>
            )}
          </div>
        </div>

        {/* Best match */}
        <div className="bg-white p-5">
          <p className="micro">Best match so far</p>
          {best ? (
            <>
              <p className="mt-2 font-display text-[30px] font-semibold tnum leading-none">{pct(best.ensemble_score)}</p>
              <div className="mt-2">
                <Badge tone={compatTone(best.compatibility_class)}>{titleCase(best.compatibility_class)}</Badge>
              </div>
            </>
          ) : (
            <p className="mt-3 text-[14px] text-stone-500">No matches scored yet</p>
          )}
        </div>
      </div>

      {/* CTA row */}
      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <Card className="flex items-start gap-4">
          <span className="w-10 h-10 rounded-md bg-blood-50 border border-blood-100 text-blood-600 flex items-center justify-center shrink-0">
            <Search size={18} />
          </span>
          <div className="flex-1">
            <h3 className="text-[15px] font-semibold">Browse eligible donors</h3>
            <p className="mt-1 text-[13px] text-stone-500 leading-relaxed">
              Every donor listed has cleared the eligibility engine. Pick one and run the full matching pipeline — live.
            </p>
            <Link to="/recipient/find">
              <Button variant="primary" size="sm" className="mt-4">
                Find donors <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </Card>
        <Card className="flex items-start gap-4">
          <span className="w-10 h-10 rounded-md bg-stone-100 border border-stone-200 text-stone-500 flex items-center justify-center shrink-0">
            <ClipboardCheck size={18} />
          </span>
          <div className="flex-1">
            <h3 className="text-[15px] font-semibold">{screened ? 'Keep your workup current' : 'Finish your screening first'}</h3>
            <p className="mt-1 text-[13px] text-stone-500 leading-relaxed">
              {screened
                ? 'New lab results? Update your workup so match scores stay accurate.'
                : 'The pipeline needs your clinical values before it can score any match.'}
            </p>
            <Link to="/recipient/screening">
              <Button variant="outline" size="sm" className="mt-4">
                {screened ? 'Update screening' : 'Start screening'}
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Recent matches */}
      <Card className="mt-6" pad={false}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <CardHeader title="Recent matches" />
          <Link to="/recipient/matches">
            <Button variant="ghost" size="sm">View all <ArrowRight size={14} /></Button>
          </Link>
        </div>
        {matches === null ? (
          <div className="py-10 flex justify-center"><Spinner /></div>
        ) : matches.length === 0 ? (
          <Empty
            icon={Activity}
            title="Nothing scored yet"
            hint="Run your first match from Find donors — the pipeline takes about a minute."
          />
        ) : (
          <ul>
            {matches.slice(0, 4).map((m) => (
              <li key={m.id} className="flex items-center gap-4 px-5 py-3.5 border-t border-stone-100">
                <span className="font-mono text-[13px] font-semibold text-ink tnum w-14">{pct(m.ensemble_score, 0)}</span>
                <span className="text-[13.5px] font-medium text-ink">{titleCase(m.organ)}</span>
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
