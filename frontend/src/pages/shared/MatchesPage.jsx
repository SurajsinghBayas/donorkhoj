import { useEffect, useState } from 'react';
import { ChevronDown, HeartHandshake } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '../../lib/api';
import { MATCH_STATUS, compatTone } from '../../lib/constants';
import { pct, titleCase, formatDateTime } from '../../lib/format';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Empty from '../../components/ui/Empty';
import ScoreRing from '../../components/ui/ScoreRing';
import LabReportButton from '../../components/screening/LabReportButton';

/** SHAP bars — which factors pushed the score up or down */
function ShapList({ shap }) {
  const features = shap?.top_features;
  if (!features?.length) return null;
  const max = Math.max(...features.map(([, v]) => Math.abs(v)), 0.0001);
  return (
    <div className="mt-5">
      <p className="micro mb-3">What drove this score · SHAP</p>
      <div className="space-y-2">
        {features.slice(0, 6).map(([name, val]) => {
          const positive = val >= 0;
          return (
            <div key={name} className="grid grid-cols-[150px_1fr_56px] items-center gap-3">
              <span className="font-mono text-[11px] text-stone-500 truncate" title={name}>
                {name.replace(/_/g, ' ')}
              </span>
              <div className="h-4 relative bg-stone-100 rounded-sm overflow-hidden">
                <span className="absolute left-1/2 top-0 bottom-0 w-px bg-stone-300" />
                <span
                  className={`absolute top-0 bottom-0 ${positive ? 'bg-leaf-600' : 'bg-blood-600'}`}
                  style={{
                    left: positive ? '50%' : `${50 - (Math.abs(val) / max) * 48}%`,
                    width: `${(Math.abs(val) / max) * 48}%`,
                  }}
                />
              </div>
              <span className={`font-mono text-[11px] tnum text-right ${positive ? 'text-leaf-700' : 'text-blood-700'}`}>
                {positive ? '+' : ''}{val.toFixed(3)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchCard({ match, role }) {
  const [open, setOpen] = useState(false);
  const status = MATCH_STATUS[match.status] || { tone: 'stone', label: match.status };
  const counterpartId = role === 'donor' ? match.recipient_id : match.donor_id;
  const counterpartLabel = role === 'donor' ? (match.recipient_name || 'Recipient') : (match.donor_name || 'Donor');
  const cleanName = (n) => (n || '').replace(/\s*\(.*?\)\s*/g, '');

  return (
    <Card pad={false} className="overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-5 px-5 py-4 text-left hover:bg-stone-50 transition-colors cursor-pointer"
      >
        <ScoreRing score={match.ensemble_score ?? 0} tone={compatTone(match.compatibility_class)} size={64} stroke={5} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <p className="text-[15px] font-semibold text-ink">{titleCase(match.organ)} match</p>
            <Badge tone={compatTone(match.compatibility_class)}>{titleCase(match.compatibility_class)}</Badge>
            <Badge tone={status.tone} dot={match.status === 'running'} pulse={match.status === 'running'}>
              {status.label}
            </Badge>
          </div>
          <p className="mt-1 text-[13px] text-stone-600">
            {role === 'donor' ? 'Recipient' : 'Donor'}: <b className="font-medium text-ink">{cleanName(role === 'donor' ? match.recipient_name : match.donor_name) || '—'}</b>
          </p>
          <p className="mt-1 font-mono text-[11px] text-stone-400">
            ID {match.id.slice(0, 8)} · {formatDateTime(match.created_at)} · ensemble {pct(match.ensemble_score)}
          </p>
        </div>
        <ChevronDown
          size={17}
          className={`text-stone-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-stone-100 px-5 py-5 bg-paper">
          {match.agent_report ? (
            <div className="md">
              <ReactMarkdown>{match.agent_report}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-[13px] text-stone-400">No report attached to this match.</p>
          )}
          <ShapList shap={match.shap_values} />
          {counterpartId && (
            <div className="mt-5 pt-4 border-t border-stone-200">
              <p className="micro mb-2.5">Human review · source labs</p>
              <LabReportButton userId={counterpartId} label={`${counterpartLabel}’s lab report`} />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function MatchesPage({ role }) {
  const [matches, setMatches] = useState(null);

  useEffect(() => {
    api.get('/matching/matches/mine').then((r) => setMatches(r.data)).catch(() => setMatches([]));
  }, []);

  return (
    <div className="rise">
      <PageHeader
        eyebrow={role === 'donor' ? 'Donor portal' : 'Recipient portal'}
        title="Your matches."
        description="Every AI-scored pairing, its compatibility class, the clinical report, and the physician’s decision."
      />

      <div className="mt-8">
        {matches === null ? (
          <div className="py-20 flex justify-center"><Spinner size={22} /></div>
        ) : matches.length === 0 ? (
          <Card>
            <Empty
              icon={HeartHandshake}
              title="No matches yet"
              hint={role === 'recipient'
                ? 'Head to Find donors, pick an eligible donor, and run the matching pipeline.'
                : 'When a recipient requests a match with you, it will show up here.'}
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => <MatchCard key={m.id} match={m} role={role} />)}
          </div>
        )}
      </div>
    </div>
  );
}
