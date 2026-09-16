import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Stat from '../../components/ui/Stat';
import Spinner from '../../components/ui/Spinner';

function Bar({ label, value, max, color = 'bg-ink' }) {
  return (
    <div className="grid grid-cols-[110px_1fr_48px] items-center gap-3">
      <span className="text-[12.5px] text-stone-500">{label}</span>
      <div className="h-5 bg-stone-100 rounded-sm overflow-hidden">
        <div
          className={`h-full ${color} rounded-sm transition-all duration-700`}
          style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%` }}
        />
      </div>
      <span className="font-mono text-[12px] tnum text-right text-ink">{value}</span>
    </div>
  );
}

export default function AdminOverview() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/matching/stats').then((r) => setStats(r.data)).catch(() => setStats({}));
  }, []);

  const approvalRate = stats?.total_matches
    ? Math.round((stats.approved_matches / stats.total_matches) * 100)
    : null;

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Administration"
        title="Platform overview."
        description="Registry size, matching activity, and physician throughput across DonorKhoj."
      />

      {stats === null ? (
        <div className="py-24 flex justify-center"><Spinner size={22} /></div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-5 gap-px bg-stone-200 border border-stone-200 rounded-lg overflow-hidden">
            <div className="bg-white p-5"><Stat label="Users" value={stats.total_users ?? '—'} /></div>
            <div className="bg-white p-5"><Stat label="Donors" value={stats.total_donors ?? '—'} /></div>
            <div className="bg-white p-5"><Stat label="Recipients" value={stats.total_recipients ?? '—'} /></div>
            <div className="bg-white p-5"><Stat label="Matches run" value={stats.total_matches ?? '—'} /></div>
            <div className="bg-white p-5">
              <Stat
                label="Approved"
                value={stats.approved_matches ?? '—'}
                sub={approvalRate != null ? `${approvalRate}% approval rate` : undefined}
              />
            </div>
          </div>

          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader title="Registry composition" description="Registered users by role." />
              <div className="mt-5 space-y-3">
                <Bar label="Donors" value={stats.total_donors ?? 0} max={stats.total_users ?? 1} color="bg-blood-600" />
                <Bar label="Recipients" value={stats.total_recipients ?? 0} max={stats.total_users ?? 1} color="bg-ink" />
                <Bar
                  label="Clinical / admin"
                  value={Math.max(0, (stats.total_users ?? 0) - (stats.total_donors ?? 0) - (stats.total_recipients ?? 0))}
                  max={stats.total_users ?? 1}
                  color="bg-stone-400"
                />
              </div>
            </Card>
            <Card>
              <CardHeader title="Match outcomes" description="What physicians decided." />
              <div className="mt-5 space-y-3">
                <Bar label="Approved" value={stats.approved_matches ?? 0} max={stats.total_matches ?? 1} color="bg-leaf-600" />
                <Bar
                  label="Pending / other"
                  value={Math.max(0, (stats.total_matches ?? 0) - (stats.approved_matches ?? 0))}
                  max={stats.total_matches ?? 1}
                  color="bg-stone-400"
                />
              </div>
              <p className="mt-5 pt-4 border-t border-stone-100 text-[12px] text-stone-400 leading-relaxed">
                Every match — approved or not — keeps its full report and physician notes on record.
              </p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
