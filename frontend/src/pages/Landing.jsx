import { Link, Navigate } from 'react-router-dom';
import {
  ArrowRight, ClipboardCheck, ScanSearch, Stethoscope, FileCheck2,
  HeartHandshake, UserRound, Hospital,
} from 'lucide-react';
import { useAppStore, homeFor } from '../lib/store';
import Logo from '../components/ui/Logo';
import Button from '../components/ui/Button';

const STEPS = [
  {
    icon: ClipboardCheck,
    title: 'Medical screening',
    body: 'A structured three-step clinical profile — blood work, organ function, HLA typing. Upload a lab report and the extraction agent fills it in for you.',
  },
  {
    icon: ScanSearch,
    title: 'Eligibility engine',
    body: 'Rule-based checks against Indian transplant guidelines flag contraindications before any match is attempted. No exceptions, no shortcuts.',
  },
  {
    icon: FileCheck2,
    title: 'Explainable matching',
    body: 'An XGBoost + Random Forest ensemble scores every pair. SHAP attributions show exactly which factors drove the score — never a black box.',
  },
  {
    icon: Stethoscope,
    title: 'Doctor sign-off',
    body: 'Every completed match lands in a physician’s review queue. Nothing proceeds without a clinician reading the report and approving it.',
  },
];

const ROLES = [
  {
    icon: HeartHandshake,
    title: 'For donors',
    body: 'Register, finish a three-step screening, and know within minutes whether you can safely give.',
    points: ['Living-donation guidance', 'Withdraw at any time', 'Your data stays yours'],
  },
  {
    icon: UserRound,
    title: 'For recipients',
    body: 'See your urgency score, browse eligible donors, and request an AI-scored compatibility match.',
    points: ['Transparent match scores', 'SHAP explanations', 'Live matching pipeline'],
  },
  {
    icon: Hospital,
    title: 'For clinicians',
    body: 'A queue of AI-scored matches with full clinical reports. Approve or reject — with notes, on record.',
    points: ['Complete match reports', 'Full audit trail', 'Final authority, always'],
  },
];

export default function Landing() {
  const { user } = useAppStore();
  if (user) return <Navigate to={homeFor(user.role)} replace />;

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Logo size={26} />
          <nav className="hidden md:flex items-center gap-8 text-[13.5px] font-medium text-stone-500">
            <a href="#how" className="hover:text-ink transition-colors">How it works</a>
            <a href="#roles" className="hover:text-ink transition-colors">Who it’s for</a>
            <a href="#compliance" className="hover:text-ink transition-colors">Compliance</a>
          </nav>
          <div className="flex items-center gap-2.5">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/register">
              <Button variant="primary" size="sm">Register</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="grid-paper border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-20 pb-16 sm:pt-28 sm:pb-20">
          <p className="micro rise">AI-assisted · Clinician-approved · NOTTO aligned</p>
          <h1 className="rise rise-1 mt-5 font-display font-semibold tracking-tight text-ink text-[42px] leading-[1.05] sm:text-[64px] max-w-3xl">
            The right match,<br />
            found <em className="not-italic font-display italic text-blood-600">in time.</em>
          </h1>
          <p className="rise rise-2 mt-6 max-w-xl text-[16px] sm:text-[17px] leading-relaxed text-stone-500">
            DonorKhoj pairs eligible organ donors with waiting recipients using structured
            clinical screening, explainable machine learning, and mandatory physician
            review — built for India’s transplant network.
          </p>
          <div className="rise rise-3 mt-9 flex flex-wrap items-center gap-3">
            <Link to="/register?role=donor">
              <Button variant="accent" size="lg">
                Become a donor <ArrowRight size={16} />
              </Button>
            </Link>
            <Link to="/register?role=recipient">
              <Button variant="outline" size="lg">I need a transplant</Button>
            </Link>
          </div>
        </div>

        {/* Stat band */}
        <div className="border-t border-stone-200 bg-white/60">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 grid grid-cols-2 lg:grid-cols-4">
            {[
              ['≈5 lakh', 'Indians need an organ transplant every year'],
              ['<1 per mn', 'India’s deceased-donor rate — among the world’s lowest'],
              ['4 organs', 'Kidney, liver, heart and lung supported'],
              ['100%', 'Of matches reviewed by a transplant physician'],
            ].map(([v, l], i) => (
              <div
                key={l}
                className={`py-7 pr-6 ${i > 0 ? 'lg:border-l lg:border-stone-200 lg:pl-6' : ''} ${
                  i % 2 === 1 ? 'border-l border-stone-200 pl-6 lg:pl-6' : ''
                }`}
              >
                <p className="font-display text-[26px] sm:text-[30px] font-semibold tnum leading-none">{v}</p>
                <p className="mt-2 text-[12.5px] text-stone-500 leading-snug">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20">
          <p className="micro">How it works</p>
          <h2 className="mt-3 font-display text-[30px] sm:text-[36px] font-semibold tracking-tight leading-tight max-w-xl">
            From lab report to approved match, in four steps.
          </h2>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 border-t border-l border-stone-200">
            {STEPS.map((s, i) => (
              <div key={s.title} className="border-b border-r border-stone-200 bg-white p-6 group">
                <div className="flex items-center justify-between">
                  <s.icon size={20} strokeWidth={1.8} className="text-blood-600" />
                  <span className="font-mono text-[11px] text-stone-400">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <h3 className="mt-5 text-[15px] font-semibold">{s.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-stone-500">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles ── */}
      <section id="roles" className="border-b border-stone-200 bg-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20">
          <p className="micro">Who it’s for</p>
          <h2 className="mt-3 font-display text-[30px] sm:text-[36px] font-semibold tracking-tight leading-tight">
            Three sides of one decision.
          </h2>
          <div className="mt-12 grid md:grid-cols-3 gap-px bg-stone-200 border border-stone-200">
            {ROLES.map((r) => (
              <div key={r.title} className="bg-white p-7">
                <r.icon size={20} strokeWidth={1.8} className="text-blood-600" />
                <h3 className="mt-4 font-display text-[19px] font-semibold">{r.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-stone-500">{r.body}</p>
                <ul className="mt-5 space-y-2">
                  {r.points.map((p) => (
                    <li key={p} className="flex items-center gap-2.5 text-[13px] text-stone-600">
                      <span className="w-1 h-1 bg-blood-600 shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Compliance ── */}
      <section id="compliance" className="border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 grid md:grid-cols-[1fr_1.4fr] gap-8 items-start">
          <div>
            <p className="micro">Compliance</p>
            <h2 className="mt-3 font-display text-[26px] sm:text-[30px] font-semibold tracking-tight leading-tight">
              Built around the law, not around it.
            </h2>
          </div>
          <div className="text-[14px] leading-relaxed text-stone-500 space-y-4">
            <p>
              DonorKhoj operates within the <b className="text-ink font-medium">Transplantation of Human
              Organs Act, 2011</b> and follows <b className="text-ink font-medium">NOTTO</b> allocation
              protocols. Commercial trading of organs is a criminal offence — the platform has no
              payments, no prioritisation for sale, and no exceptions.
            </p>
            <p>
              The AI assists clinicians; it never replaces them. Every match is explainable,
              every decision is a physician’s, and every action is on the record.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA band ── */}
      <section className="bg-ink grid-paper-dark">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 text-center">
          <p className="micro" style={{ color: '#A8A29E' }}>Register in four minutes</p>
          <h2 className="mt-4 font-display text-[32px] sm:text-[44px] font-semibold tracking-tight text-white leading-tight">
            One donor can save<br className="hidden sm:block" /> up to eight lives.
          </h2>
          <div className="mt-9 flex justify-center gap-3 flex-wrap">
            <Link to="/register?role=donor">
              <Button variant="accent" size="lg">Register as a donor</Button>
            </Link>
            <Link to="/login">
              <Button size="lg" className="bg-transparent text-white border border-white/25 hover:bg-white/10">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-stone-200">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <Logo size={24} />
            <p className="mt-3 text-[12.5px] text-stone-400 max-w-xs leading-relaxed">
              Clinical-grade organ matching for India’s transplant network.
            </p>
          </div>
          <div className="flex gap-8 text-[13px] font-medium text-stone-500">
            <Link to="/how-it-works" className="hover:text-ink transition-colors">How it works</Link>
            <Link to="/login" className="hover:text-ink transition-colors">Sign in</Link>
            <Link to="/register" className="hover:text-ink transition-colors">Register</Link>
            <a href="#compliance" className="hover:text-ink transition-colors">Compliance</a>
          </div>
        </div>
        <div className="border-t border-stone-200">
          <p className="max-w-6xl mx-auto px-5 sm:px-8 py-4 micro" style={{ fontSize: 10 }}>
            © {new Date().getFullYear()} DonorKhoj · Not a substitute for clinical judgement
          </p>
        </div>
      </footer>
    </div>
  );
}
