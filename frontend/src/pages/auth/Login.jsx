import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, apiError } from '../../lib/api';
import { useAppStore, homeFor } from '../../lib/store';
import Logo from '../../components/ui/Logo';
import Button from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Field';

const DEMO_ACCOUNTS = [
  { id: 'donor1', label: 'Donor' },
  { id: 'recipient1', label: 'Recipient' },
  { id: 'doctor1', label: 'Doctor' },
  { id: 'admin1', label: 'Admin' },
];

export default function Login() {
  const { user, setUser } = useAppStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  async function submit(e) {
    e?.preventDefault();
    if (!form.username.trim() || !form.password) {
      setError('Enter your username or email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', {
        username: form.username.trim(),
        password: form.password,
      });
      setUser(res.data.user, res.data.access_token);
      toast.success(`Welcome back, ${(res.data.user.full_name || res.data.user.username).split(' ')[0]}`);
      navigate(homeFor(res.data.user.role), { replace: true });
    } catch (err) {
      setError(apiError(err, 'Sign-in failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-paper">
      {/* ── Brand panel ── */}
      <aside className="hidden lg:flex w-[44%] bg-ink grid-paper-dark flex-col justify-between p-12 text-white">
        <Link to="/" className="w-fit"><Logo size={28} dark /></Link>
        <div className="max-w-md">
          <p className="micro" style={{ color: '#A8A29E' }}>DonorKhoj platform</p>
          <p className="mt-5 font-display text-[34px] leading-[1.15] font-medium">
            “Every eight minutes, someone is added to a transplant waiting list.
            The match exists — it just has to be found.”
          </p>
          <div className="mt-10 space-y-3">
            {[
              'Structured clinical screening',
              'Explainable AI match scores',
              'Physician approval on every match',
            ].map((t) => (
              <div key={t} className="flex items-center gap-3 text-[13.5px] text-stone-300">
                <span className="w-1 h-1 bg-blood-500 shrink-0" />
                {t}
              </div>
            ))}
          </div>
        </div>
        <p className="micro" style={{ color: '#78716C', fontSize: 10 }}>
          NOTTO aligned · THO Act 2011
        </p>
      </aside>

      {/* ── Form ── */}
      <main className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm rise">
          <div className="lg:hidden mb-8"><Logo size={28} /></div>

          <p className="micro">Sign in</p>
          <h1 className="mt-2 font-display text-[30px] font-semibold tracking-tight">
            Welcome back.
          </h1>
          <p className="mt-2 text-[13.5px] text-stone-500">
            New here?{' '}
            <Link to="/register" className="text-blood-600 font-medium hover:text-blood-700">
              Create an account
            </Link>
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <Field label="Username or email">
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="e.g. donor1"
                autoComplete="username"
                autoFocus
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Field>

            {error && (
              <p className="text-[13px] text-blood-700 bg-blood-50 border border-blood-200 rounded-md px-3 py-2.5">
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
              Sign in
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="mt-10 pt-6 border-t border-stone-200">
            <p className="micro" style={{ fontSize: 10 }}>Demo accounts — one click to fill</p>
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => { setForm({ username: a.id, password: 'password123' }); setError(''); }}
                  className={`h-9 rounded-md border text-[12px] font-medium transition-colors cursor-pointer
                    ${form.username === a.id
                      ? 'border-ink bg-ink text-white'
                      : 'border-stone-300 bg-white text-stone-600 hover:border-stone-400 hover:text-ink'
                    }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <p className="mt-2.5 font-mono text-[10.5px] text-stone-400">
              password: password123
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
