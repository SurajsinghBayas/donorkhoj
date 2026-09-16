import { useState } from 'react';
import { Link, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HeartHandshake, UserRound, Stethoscope, ShieldCheck } from 'lucide-react';
import { api, apiError } from '../../lib/api';
import { useAppStore, homeFor } from '../../lib/store';
import Logo from '../../components/ui/Logo';
import Button from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Field';

const ROLES = [
  {
    id: 'donor',
    icon: HeartHandshake,
    title: 'Donor',
    desc: 'I want to donate a kidney, part of my liver, or pledge organs.',
  },
  {
    id: 'recipient',
    icon: UserRound,
    title: 'Recipient',
    desc: 'I am waiting for a transplant and want to find a match.',
  },
  {
    id: 'doctor',
    icon: Stethoscope,
    title: 'Doctor',
    desc: 'I review and approve AI-scored matches for my hospital.',
  },
  {
    id: 'admin',
    icon: ShieldCheck,
    title: 'Admin',
    desc: 'Platform operations and oversight.',
  },
];

export default function Register() {
  const { user, setUser } = useAppStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [role, setRole] = useState(
    ['donor', 'recipient', 'doctor', 'admin'].includes(params.get('role')) ? params.get('role') : 'donor'
  );
  const [form, setForm] = useState({
    full_name: '', email: '', username: '', password: '', phone: '', city: '', state: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.username.trim() || form.password.length < 6) {
      setError('Fill in name, email and username. Password needs at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/register', {
        ...form,
        role,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        username: form.username.trim(),
        phone: form.phone || null,
        city: form.city || null,
        state: form.state || null,
      });
      setUser(res.data.user, res.data.access_token);
      toast.success('Account created — welcome to DonorKhoj');
      navigate(homeFor(res.data.user.role), { replace: true });
    } catch (err) {
      setError(apiError(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/"><Logo size={26} /></Link>
          <p className="text-[13px] text-stone-500">
            Already registered?{' '}
            <Link to="/login" className="text-blood-600 font-medium hover:text-blood-700">Sign in</Link>
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-12">
        <p className="micro">Create an account</p>
        <h1 className="mt-2 font-display text-[30px] sm:text-[34px] font-semibold tracking-tight">
          Join the registry.
        </h1>
        <p className="mt-2 text-[14px] text-stone-500 max-w-lg">
          One account, one screening, and you are part of India’s matching network.
          Registration takes about four minutes.
        </p>

        <form onSubmit={submit} className="mt-10">
          {/* Role picker */}
          <p className="micro mb-3">I am registering as</p>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {ROLES.map((r) => {
              const active = role === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={`text-left p-4 rounded-lg border transition-colors cursor-pointer ${
                    active
                      ? 'border-ink bg-white ring-1 ring-ink'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <r.icon size={18} strokeWidth={1.9} className={active ? 'text-blood-600' : 'text-stone-400'} />
                    <span className={`w-3.5 h-3.5 rounded-full border-2 ${active ? 'border-blood-600 bg-blood-600' : 'border-stone-300'}`} />
                  </div>
                  <p className="mt-3 text-[14px] font-semibold text-ink">{r.title}</p>
                  <p className="mt-1 text-[12.5px] text-stone-500 leading-relaxed">{r.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Details */}
          <div className="mt-8 grid sm:grid-cols-2 gap-5">
            <Field label="Full name" className="sm:col-span-2">
              <Input value={form.full_name} onChange={set('full_name')} placeholder="As per government ID" />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={set('email')} placeholder="you@example.in" autoComplete="email" />
            </Field>
            <Field label="Username">
              <Input value={form.username} onChange={set('username')} placeholder="Letters and numbers" autoComplete="username" />
            </Field>
            <Field label="Password" hint="Minimum 6 characters">
              <Input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" autoComplete="new-password" />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={set('phone')} placeholder="+91 …" autoComplete="tel" />
            </Field>
            <Field label="City">
              <Input value={form.city} onChange={set('city')} placeholder="e.g. Pune" />
            </Field>
            <Field label="State">
              <Input value={form.state} onChange={set('state')} placeholder="e.g. Maharashtra" />
            </Field>
          </div>

          {error && (
            <p className="mt-6 text-[13px] text-blood-700 bg-blood-50 border border-blood-200 rounded-md px-3 py-2.5">
              {error}
            </p>
          )}

          <div className="mt-8 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-[12px] text-stone-400 max-w-sm leading-relaxed">
              By registering you agree to clinical data processing under NOTTO protocols.
              Donation is never sold or bought — it is a gift.
            </p>
            <Button type="submit" variant="accent" size="lg" loading={loading}>
              Create account
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
