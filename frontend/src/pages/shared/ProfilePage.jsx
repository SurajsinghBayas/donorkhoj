import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { User as UserIcon } from 'lucide-react';
import { api, apiError } from '../../lib/api';
import { useAppStore } from '../../lib/store';
import { ROLE_LABELS } from '../../lib/constants';
import { bloodDisplay, titleCase } from '../../lib/format';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { Input } from '../../components/ui/Field';

const FIELDS = [
  { key: 'full_name', label: 'Full name', placeholder: 'e.g. Aarav Mehta' },
  { key: 'phone', label: 'Phone', placeholder: 'e.g. +91 98200 12345' },
  { key: 'country', label: 'Country', placeholder: 'e.g. India' },
  { key: 'state', label: 'State', placeholder: 'e.g. Maharashtra' },
  { key: 'city', label: 'City', placeholder: 'e.g. Mumbai' },
  { key: 'hospital_name', label: 'Treating hospital', placeholder: 'e.g. Kokilaben Hospital, Mumbai' },
];

export default function ProfilePage() {
  const { user, token, setUser } = useAppStore();
  const [form, setForm] = useState(null);
  const [screening, setScreening] = useState(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/auth/me')
      .then((r) => {
        setUser(r.data, token);
        const u = r.data;
        setForm({
          full_name: u.full_name || '', phone: u.phone || '', country: u.country || 'India',
          state: u.state || '', city: u.city || '', hospital_name: u.hospital_name || '',
        });
      })
      .catch(() => setForm({ full_name: '', phone: '', country: 'India', state: '', city: '', hospital_name: '' }));
    if (user?.role === 'donor' || user?.role === 'recipient') {
      api.get('/screening/me').then((r) => setScreening(r.data?.screening || null)).catch(() => setScreening(null));
    } else {
      setScreening(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', form);
      setUser(res.data, token);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(apiError(err, 'Could not save profile'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rise">
      <PageHeader
        eyebrow={`${ROLE_LABELS[user?.role] || ''} profile`}
        title="Your profile."
        description="Who you are, where you are treated, and your medical snapshot — the human side of every match."
      />

      <div className="mt-8 grid lg:grid-cols-[1fr_380px] gap-4 items-start">
        <Card>
          <CardHeader title="Personal & location details" description="Used across match reports, doctor reviews, and hospital search." />
          {form === null ? (
            <div className="py-10 flex justify-center"><Spinner size={22} /></div>
          ) : (
            <div className="mt-5 grid sm:grid-cols-2 gap-4">
              {FIELDS.map((f) => (
                <div key={f.key} className={f.key === 'hospital_name' || f.key === 'full_name' ? 'sm:col-span-2' : ''}>
                  <p className="micro mb-1.5">{f.label}</p>
                  <Input value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
                </div>
              ))}
              <div>
                <p className="micro mb-1.5">Email (cannot change)</p>
                <Input value={user?.email || ''} disabled />
              </div>
              <div>
                <p className="micro mb-1.5">Username (cannot change)</p>
                <Input value={user?.username || ''} disabled />
              </div>
            </div>
          )}
          <div className="mt-5 flex justify-end">
            <Button variant="accent" onClick={save} loading={saving} disabled={form === null}>
              Save profile
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Account" />
            <div className="mt-3 space-y-2.5 text-[13px]">
              <div className="flex justify-between gap-3">
                <span className="text-stone-400">Role</span>
                <Badge tone="ink">{ROLE_LABELS[user?.role]}</Badge>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-stone-400">Hospital</span>
                <span className="text-ink font-medium text-right">{user?.hospital_name || '—'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-stone-400">Location</span>
                <span className="text-ink font-medium text-right">
                  {[user?.city, user?.state, user?.country].filter(Boolean).join(', ') || '—'}
                </span>
              </div>
            </div>
          </Card>

          {(user?.role === 'donor' || user?.role === 'recipient') && (
            <Card>
              <CardHeader title="Medical snapshot" description="From your latest screening." />
              {screening === undefined ? (
                <div className="py-6 flex justify-center"><Spinner size={18} /></div>
              ) : screening ? (
                <div className="mt-3 space-y-2.5 text-[13px]">
                  <div className="flex justify-between gap-3">
                    <span className="text-stone-400">Blood group</span>
                    <span className="font-mono font-semibold text-blood-700">{bloodDisplay(screening.blood_group)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-stone-400">Eligibility</span>
                    <Badge tone={screening.is_eligible ? 'green' : 'red'} dot>
                      {screening.is_eligible ? 'Eligible' : 'Not eligible'}
                    </Badge>
                  </div>
                  {screening.urgency_score != null && (
                    <div className="flex justify-between gap-3">
                      <span className="text-stone-400">Urgency</span>
                      <span className="tnum font-semibold text-ink">{Number(screening.urgency_score).toFixed(1)} / 10</span>
                    </div>
                  )}
                  {!!screening.organs_offered?.length && (
                    <div className="flex justify-between gap-3">
                      <span className="text-stone-400">Organs</span>
                      <span className="text-ink font-medium">{screening.organs_offered.map(titleCase).join(', ')}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-[13px] text-stone-500 flex items-center gap-2">
                  <UserIcon size={14} className="text-stone-400" /> No screening yet — complete it to activate matching.
                </p>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
