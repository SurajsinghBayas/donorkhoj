import { Link } from 'react-router-dom';
import { BookOpen, HeartHandshake, ClipboardCheck, FileText, Pill, CircleHelp } from 'lucide-react';
import Logo from '../components/ui/Logo';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import PageHeader from '../components/ui/PageHeader';

function Section({ icon: Icon, title, children }) {
  return (
    <section className="mt-10">
      <div className="flex items-center gap-2.5 mb-4">
        <Icon size={17} className="text-blood-600" />
        <h2 className="font-display text-[20px] font-semibold text-ink">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function QA({ q, a }) {
  return (
    <div className="py-3.5 border-b border-stone-100 last:border-b-0">
      <p className="text-[14px] font-semibold text-ink">{q}</p>
      <p className="mt-1 text-[13px] text-stone-500 leading-relaxed">{a}</p>
    </div>
  );
}

const TESTS = [
  ['Blood group (ABO/Rh)', 'Your blood type. Like lock and key — only matching types fit. O donors fit almost everyone.'],
  ['HLA typing', 'Your immune system’s fingerprint (A, B, DR). The closer the donor’s fingerprint, the calmer your body stays.'],
  ['Crossmatch', 'A trial mix of donor and recipient blood in a lab dish. Negative means no immediate attack — this is required.'],
  ['PRA %', 'How “sensitized” you are — high PRA means your body has learned to attack many donors, so matching is harder.'],
  ['Creatinine & eGFR', 'Kidney numbers. High creatinine or eGFR below 15 means kidneys have nearly stopped — transplant time.'],
  ['Liver tests (ALT/AST/bilirubin)', 'Liver health numbers. Very high bilirubin (yellow skin/eyes) means the liver is failing.'],
  ['Ejection fraction (EF)', 'How strongly the heart pumps. Below 55% is weak; heart recipients often sit near 25–30%.'],
  ['FEV1 (lungs)', 'How much air you push out in one second. Below 80% of expected is weak lungs.'],
];

const STEPS_DONOR = [
  'Create your account and choose donor.',
  'Finish the 3-step medical screening — or upload a lab report and let the assistant fill it.',
  'Pick the organs you wish to donate. The eligibility engine confirms you are fit.',
  'Wait for recipient requests. Every match is scored by AI and must be approved by a doctor.',
  'If approved, your transplant team takes over: final tests, legal paperwork, and surgery planning.',
];

const STEPS_RECIPIENT = [
  'Create your account and choose recipient.',
  'Complete your workup. The system computes an urgency score (0–10) from your numbers.',
  'Browse eligible donors for your organ and run the matching pipeline on any pair.',
  'Read the AI report and the SHAP drivers, then wait for physician approval.',
  'If approved, your hospital team schedules the transplant under NOTTO rules.',
];

export default function GuidePage() {
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
          eyebrow="Plain-language guide"
          title="Organ transplant, explained simply."
          description="Everything a donor family or patient needs to know — the process, the tests, the law in India, and life after surgery. No medical degree required."
        />

        <Section icon={BookOpen} title="Which organs can be transplanted?">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ['Kidney', 'Most common. One healthy kidney is enough to live on — living donation is possible.'],
              ['Liver', 'A piece of liver regrows in both donor and recipient. Living donation is possible.'],
              ['Heart', 'Only from brain-dead donors. For end-stage heart failure when nothing else works.'],
              ['Lung', 'Only from brain-dead donors. For severe lung disease unresponsive to treatment.'],
            ].map(([t, d]) => (
              <Card key={t}>
                <h3 className="text-[15px] font-semibold text-ink">{t}</h3>
                <p className="mt-1.5 text-[13px] text-stone-500 leading-relaxed">{d}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section icon={HeartHandshake} title="Your journey, step by step">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <h3 className="text-[15px] font-semibold text-ink">If you are donating</h3>
              <ol className="mt-3 space-y-2.5">
                {STEPS_DONOR.map((s, i) => (
                  <li key={i} className="flex gap-3 text-[13px] text-stone-600 leading-relaxed">
                    <span className="w-5 h-5 rounded-full bg-leaf-100 text-leaf-700 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </Card>
            <Card>
              <h3 className="text-[15px] font-semibold text-ink">If you are receiving</h3>
              <ol className="mt-3 space-y-2.5">
                {STEPS_RECIPIENT.map((s, i) => (
                  <li key={i} className="flex gap-3 text-[13px] text-stone-600 leading-relaxed">
                    <span className="w-5 h-5 rounded-full bg-blood-50 text-blood-600 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </Section>

        <Section icon={ClipboardCheck} title="Tests, in simple words">
          <Card pad={false} className="overflow-hidden">
            <ul className="divide-y divide-stone-100">
              {TESTS.map(([t, d]) => (
                <li key={t} className="px-5 py-3.5 grid sm:grid-cols-[220px_1fr] gap-1 sm:gap-4">
                  <span className="text-[13.5px] font-semibold text-ink">{t}</span>
                  <span className="text-[13px] text-stone-500 leading-relaxed">{d}</span>
                </li>
              ))}
            </ul>
          </Card>
        </Section>

        <Section icon={FileText} title="The law in India — short version">
          <Card>
            <ul className="space-y-2.5 text-[13px] text-stone-600 leading-relaxed">
              <li><b className="text-ink">THO Act 2011</b> — the law that controls organ donation. Selling or buying organs is a crime with jail time.</li>
              <li><b className="text-ink">NOTTO</b> — the national body that sets rules and runs the waiting-list network (with state bodies like ROTTO/SOTTO).</li>
              <li><b className="text-ink">Who can donate alive?</b> Close relatives freely; unrelated donors need hospital authorization-committee approval to rule out money exchange.</li>
              <li><b className="text-ink">Brain-dead donation</b> needs family consent plus a registered hospital’s certification panel.</li>
              <li><b className="text-ink">You cannot skip the queue</b> with money or influence — allocation follows medical urgency and waiting time.</li>
            </ul>
          </Card>
        </Section>

        <Section icon={Pill} title="Life after transplant">
          <Card>
            <ul className="space-y-2.5 text-[13px] text-stone-600 leading-relaxed">
              <li><b className="text-ink">Daily anti-rejection medicines</b> for life. Missing doses can destroy the new organ — set alarms, never stop on your own.</li>
              <li><b className="text-ink">Infection care:</b> your immunity is lowered on purpose. Avoid crowds early on, eat freshly cooked food, drink safe water.</li>
              <li><b className="text-ink">Follow-ups:</b> blood tests are frequent in the first months, then settle into a routine. Keep every appointment.</li>
              <li><b className="text-ink">Food & habits:</b> low salt, controlled sugar, no smoking, no alcohol, no raw street food for the first year.</li>
              <li><b className="text-ink">Living donors recover fast:</b> most return to normal life in 4–8 weeks with one check-up schedule.</li>
            </ul>
          </Card>
        </Section>

        <Section icon={CircleHelp} title="Common questions">
          <Card pad={false} className="px-5">
            <QA q="Does donation hurt or shorten the donor’s life?" a="Surgery has normal surgical risks, but long-term studies show living kidney donors live normal, healthy lives with one kidney. Your team will explain every risk before you agree — and you can withdraw consent anytime before surgery." />
            <QA q="How long is the wait for an organ?" a="It depends on blood group, urgency, and region — weeks to years for deceased-donor organs. A living donor match (like the ones DonorKhoj scores) can shorten this dramatically." />
            <QA q="What does the match percentage mean?" a="How likely the transplant is to succeed based on blood, immunity, and organ health. Above 75% is high compatibility — but the final word is always your doctor’s, never the number’s." />
            <QA q="Can I donate if I have diabetes or high BP?" a="Controlled mild conditions don’t always block you, but damaged kidneys or heart do. The screening checks this automatically and explains why." />
            <QA q="Is my data private?" a="Your reports are visible only to you, your doctors, and the matched counterparty during review — never public." />
          </Card>
        </Section>

        <div className="mt-10 rounded-lg border border-blood-200 bg-blood-50 px-5 py-4">
          <p className="text-[13.5px] text-blood-700 leading-relaxed">
            <b>Emergency?</b> Organ failure emergencies (no urine for a day, extreme breathlessness, yellow eyes with confusion)
            need a hospital immediately — call <b>102/108</b> in India. This guide teaches; it never replaces your doctor.
          </p>
        </div>
      </main>

      <footer className="border-t border-stone-200 mt-6">
        <p className="max-w-6xl mx-auto px-5 sm:px-8 py-4 micro" style={{ fontSize: 10 }}>
          © {new Date().getFullYear()} DonorKhoj · Educational content, not medical advice
        </p>
      </footer>
    </div>
  );
}
