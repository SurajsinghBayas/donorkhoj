import { Link } from 'react-router-dom';
import { Brain, ScanLine, MessagesSquare, GitBranch, FlaskConical, ShieldCheck } from 'lucide-react';
import Logo from '../components/ui/Logo';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import PageHeader from '../components/ui/PageHeader';

const STAGES = [
  { n: '01', title: 'Eligibility check', desc: 'Deterministic NOTTO-inspired rules screen both parties — infections, cancer history, and per-organ gates (eGFR, liver enzymes, ejection fraction, FEV1).' },
  { n: '02', title: 'Organ quality', desc: 'Donor organ function is graded against clinical thresholds so only viable organs proceed to scoring.' },
  { n: '03', title: 'ML ensemble scoring', desc: 'XGBoost (60%) + Random Forest (40%) score compatibility across 23 clinical and immunological features.' },
  { n: '04', title: 'Explainability', desc: 'SHAP attributions and LIME local explanations reveal exactly which factors drove the score.' },
  { n: '05', title: 'Clinical report', desc: 'An AI agent synthesizes everything into a structured report queued for physician approval.' },
];

const FEATURES = [
  { group: 'ABO / Rh', items: 'Donor→recipient blood-group compatibility, Rh compatibility' },
  { group: 'HLA immunology', items: 'Mismatch score across A / B / DR loci, encoded alleles, PRA %, crossmatch result' },
  { group: 'Organ function', items: 'Donor eGFR, creatinine, ALT, AST, ejection fraction, FEV1' },
  { group: 'Recipient state', items: 'eGFR, urgency score, PRA %, age difference' },
];

const DEMO = [
  { user: 'donor2 / recipient2', story: 'A+ kidney pair, ESRD recipient — High match awaiting review' },
  { user: 'donor3 / recipient3', story: 'B+ liver pair, high-bilirubin recipient — approved by doctor1' },
  { user: 'donor4 / recipient4', story: 'O+ heart pair, NYHA-IV recipient — High match awaiting review' },
  { user: 'donor1 / recipient1', story: 'Original O+ kidney pair from seeding' },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link to="/"><Logo size={26} /></Link>
          <div className="flex gap-2.5">
            <Link to="/login"><Button size="sm" variant="outline">Sign in</Button></Link>
            <Link to="/register"><Button size="sm" variant="accent">Register</Button></Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-10 rise">
        <PageHeader
          eyebrow="Under the hood"
          title="How DonorKhoj thinks."
          description="A tour of the matching intelligence: the data it learns from, the ensemble that scores, the explanations clinicians read, and the agents that orchestrate it all."
        />

        {/* ── ML model ── */}
        <section className="mt-10">
          <div className="flex items-center gap-2.5 mb-4">
            <Brain size={17} className="text-blood-600" />
            <h2 className="font-display text-[20px] font-semibold text-ink">The compatibility model</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <p className="micro">Ensemble</p>
              <p className="mt-2 font-display text-[26px] font-semibold text-ink tnum">60 / 40</p>
              <p className="mt-1.5 text-[13px] text-stone-500 leading-relaxed">
                XGBoost carries 60% of the vote, Random Forest 40%. The blend beat either model alone in validation.
              </p>
            </Card>
            <Card>
              <p className="micro">Validation AUC</p>
              <p className="mt-2 font-display text-[26px] font-semibold text-ink tnum">0.978</p>
              <p className="mt-1.5 text-[13px] text-stone-500 leading-relaxed">
                Area under the ROC curve on a held-out 20% split of 10,000 India-representative pairs.
              </p>
            </Card>
            <Card>
              <p className="micro">Compatibility classes</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <Badge tone="green">High ≥ 75%</Badge>
                <Badge tone="amber">Medium ≥ 50%</Badge>
                <Badge tone="stone">Low ≥ 25%</Badge>
                <Badge tone="red">Incompatible</Badge>
              </div>
              <p className="mt-2 text-[13px] text-stone-500 leading-relaxed">
                Thresholds on the ensemble score. Doctors make the final call, always.
              </p>
            </Card>
          </div>

          <Card className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical size={15} className="text-stone-400" />
              <h3 className="text-[15px] font-semibold text-ink">23 features, 4 families</h3>
            </div>
            <ul className="divide-y divide-stone-100">
              {FEATURES.map((f) => (
                <li key={f.group} className="py-3 grid sm:grid-cols-[160px_1fr] gap-1 sm:gap-4">
                  <span className="text-[13px] font-semibold text-ink">{f.group}</span>
                  <span className="text-[13px] text-stone-500 leading-relaxed">{f.items}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12.5px] text-stone-400 leading-relaxed">
              Trained on 10,000 synthetic pairs sampled from Indian blood-group distribution (O 37%, B 32%, A 23%, AB 8%),
              published Indian HLA allele frequencies, and Indian clinical reference ranges. Retrain anytime with
              <span className="font-mono text-[12px] text-stone-500"> backend/ml/train.py</span>.
            </p>
          </Card>
        </section>

        {/* ── Explainability ── */}
        <section className="mt-10">
          <div className="flex items-center gap-2.5 mb-4">
            <ScanLine size={17} className="text-blood-600" />
            <h2 className="font-display text-[20px] font-semibold text-ink">Explainability, not black boxes</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <h3 className="text-[15px] font-semibold text-ink">SHAP attributions</h3>
              <p className="mt-1.5 text-[13px] text-stone-500 leading-relaxed">
                Every match stores per-feature SHAP values from the XGBoost model. The review queue surfaces the top
                drivers — e.g. <span className="font-mono text-[12px]">hla_mismatch_score +2.58</span>,{' '}
                <span className="font-mono text-[12px]">crossmatch_negative +2.05</span> — so a doctor sees
                <em> why </em> a score is high before approving.
              </p>
            </Card>
            <Card>
              <h3 className="text-[15px] font-semibold text-ink">LIME local explanations</h3>
              <p className="mt-1.5 text-[13px] text-stone-500 leading-relaxed">
                A locally faithful surrogate model explains the prediction around each specific pair,
                persisted with the match record for audit. NaN-safe serialization keeps the pipeline robust.
              </p>
            </Card>
          </div>
        </section>

        {/* ── Agents ── */}
        <section className="mt-10">
          <div className="flex items-center gap-2.5 mb-4">
            <GitBranch size={17} className="text-blood-600" />
            <h2 className="font-display text-[20px] font-semibold text-ink">Three agents, one pipeline</h2>
          </div>
          <ol className="relative">
            {STAGES.map((s, i) => (
              <li key={s.n} className="relative flex gap-3.5 pb-6 last:pb-0">
                {i < STAGES.length - 1 && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-stone-200" />}
                <span className="relative z-10 w-8 h-8 rounded-md bg-ink text-white flex items-center justify-center font-mono text-[11px] font-semibold shrink-0">
                  {s.n}
                </span>
                <div>
                  <p className="text-[14px] font-semibold text-ink">{s.title}</p>
                  <p className="mt-0.5 text-[13px] text-stone-500 leading-relaxed max-w-2xl">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <Card>
              <h3 className="text-[15px] font-semibold text-ink">Medical agent</h3>
              <p className="mt-1.5 text-[13px] text-stone-500 leading-relaxed">
                Reads uploaded lab PDFs, extracts values and writes a patient-friendly summary in a single LLM call,
                then flags abnormalities against Indian reference ranges.
              </p>
            </Card>
            <Card>
              <h3 className="text-[15px] font-semibold text-ink">Matching agent</h3>
              <p className="mt-1.5 text-[13px] text-stone-500 leading-relaxed">
                A LangGraph state machine runs the five stages above with live WebSocket progress and an HTTP-polling
                fallback, then files the match for review.
              </p>
            </Card>
            <Card>
              <div className="flex items-center gap-2">
                <MessagesSquare size={15} className="text-stone-400" />
                <h3 className="text-[15px] font-semibold text-ink">DonorBot</h3>
              </div>
              <p className="mt-1.5 text-[13px] text-stone-500 leading-relaxed">
                Streams answers grounded in your real screening, eligibility, and latest match — with cross-provider
                model failover so throttled free tiers never break the conversation.
              </p>
            </Card>
          </div>
        </section>

        {/* ── Live demo ── */}
        <section className="mt-10">
          <div className="flex items-center gap-2.5 mb-4">
            <ShieldCheck size={17} className="text-blood-600" />
            <h2 className="font-display text-[20px] font-semibold text-ink">Try the live demo</h2>
          </div>
          <Card pad={false} className="overflow-hidden">
            <ul className="divide-y divide-stone-100">
              {DEMO.map((d) => (
                <li key={d.user} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                  <span className="font-mono text-[12.5px] font-semibold text-ink whitespace-nowrap">{d.user}</span>
                  <span className="text-[13px] text-stone-500">{d.story}</span>
                </li>
              ))}
            </ul>
            <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center gap-x-6 gap-y-1.5">
              <span className="text-[12.5px] text-stone-500">All demo passwords: <span className="font-mono font-semibold text-ink">password123</span></span>
              <span className="text-[12.5px] text-stone-500">Doctor review: <span className="font-mono font-semibold text-ink">doctor1</span></span>
            </div>
          </Card>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link to="/register"><Button variant="accent">Create an account</Button></Link>
            <Link to="/login"><Button variant="outline">Sign in to explore</Button></Link>
          </div>
        </section>

        <p className="mt-10 text-[12px] text-stone-400 leading-relaxed max-w-2xl">
          DonorKhoj is a decision-support and education tool aligned with NOTTO guidelines and the THO Act 2011.
          Scores, reports, and chat responses are AI-generated — final clearance always rests with the transplant team.
        </p>
      </main>

      <footer className="border-t border-stone-200 mt-6">
        <p className="max-w-6xl mx-auto px-5 sm:px-8 py-4 micro" style={{ fontSize: 10 }}>
          © {new Date().getFullYear()} DonorKhoj · Not a substitute for clinical judgement
        </p>
      </footer>
    </div>
  );
}
