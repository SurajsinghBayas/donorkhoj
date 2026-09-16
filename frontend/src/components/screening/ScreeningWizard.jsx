import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  UploadCloud, FileText, CheckCircle2, AlertTriangle, ArrowLeft, ArrowRight,
} from 'lucide-react';
import { api, apiError } from '../../lib/api';
import {
  BLOOD_GROUPS_API, INFECTION_OPTIONS, SMOKING_OPTIONS, ALCOHOL_OPTIONS,
  CROSSMATCH_OPTIONS, CONDITIONS, ORGANS, UNITS,
} from '../../lib/constants';
import Card, { SectionHeading } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Spinner from '../ui/Spinner';
import { Field, Input, Select, ChoiceGroup } from '../ui/Field';

/* ── Field catalogue for step 2, grouped by organ ─────────────────── */
const ORGAN_PANELS = {
  kidney: {
    title: 'Kidney function',
    fields: [
      { name: 'creatinine', label: 'Creatinine', type: 'number', step: '0.1' },
      { name: 'egfr', label: 'eGFR', type: 'number' },
      { name: 'urinalysis', label: 'Urinalysis', type: 'select', options: ['normal', 'proteinuria', 'hematuria'] },
      { name: 'blood_pressure_systolic', label: 'BP systolic', type: 'number' },
      { name: 'blood_pressure_diastolic', label: 'BP diastolic', type: 'number' },
      { name: 'kidney_imaging', label: 'Kidney imaging', type: 'select', options: ['normal', 'abnormal', 'pending'] },
    ],
  },
  liver: {
    title: 'Liver panel',
    fields: [
      { name: 'alt', label: 'ALT (SGPT)', type: 'number' },
      { name: 'ast', label: 'AST (SGOT)', type: 'number' },
      { name: 'alp', label: 'ALP', type: 'number' },
      { name: 'bilirubin_total', label: 'Bilirubin, total', type: 'number', step: '0.1' },
      { name: 'albumin', label: 'Albumin', type: 'number', step: '0.1' },
      { name: 'total_protein', label: 'Total protein', type: 'number', step: '0.1' },
    ],
  },
  heart: {
    title: 'Cardiac evaluation',
    fields: [
      { name: 'ecg_result', label: 'ECG result', type: 'select', options: ['normal', 'abnormal', 'pending'] },
      { name: 'ejection_fraction', label: 'Ejection fraction', type: 'number' },
      { name: 'nyha_class', label: 'NYHA class', type: 'select', options: [
        { value: '1', label: 'I — no limitation' },
        { value: '2', label: 'II — slight limitation' },
        { value: '3', label: 'III — marked limitation' },
        { value: '4', label: 'IV — symptoms at rest' },
      ] },
    ],
  },
  lung: {
    title: 'Pulmonary function',
    fields: [
      { name: 'fev1_percent', label: 'FEV1', type: 'number' },
      { name: 'fvc_percent', label: 'FVC', type: 'number' },
      { name: 'fev1_fvc_ratio', label: 'FEV1/FVC ratio', type: 'number', step: '0.01' },
      { name: 'chest_xray', label: 'Chest X-ray', type: 'select', options: ['clear', 'abnormal', 'pending'] },
    ],
  },
};

const STEPS = [
  { id: 'basics', title: 'Basics', desc: 'Blood group, infections, history' },
  { id: 'organs', title: 'Organ function', desc: 'Lab values per organ system' },
  { id: 'compat', title: 'Compatibility', desc: 'HLA typing and crossmatch' },
];

const EMPTY_FORM = {
  blood_group: '', hiv_status: 'unknown', hbv_status: 'unknown', hcv_status: 'unknown',
  cancer_history: false, cancer_type: '', medical_history: [],
  smoking_status: 'never', smoking_pack_years: '', alcohol_status: 'never', alcohol_units_per_week: '',
  organs_offered: [],
  creatinine: '', egfr: '', urinalysis: '', blood_pressure_systolic: '', blood_pressure_diastolic: '',
  kidney_imaging: '', alt: '', ast: '', alp: '', bilirubin_total: '', albumin: '', total_protein: '',
  ecg_result: '', ejection_fraction: '', nyha_class: '',
  fev1_percent: '', fvc_percent: '', fev1_fvc_ratio: '', chest_xray: '',
  hla_a: '', hla_b: '', hla_dr: '', crossmatch_result: 'pending', pra_percent: '',
};

const NUMERIC_FIELDS = new Set([
  'smoking_pack_years', 'alcohol_units_per_week', 'creatinine', 'egfr',
  'blood_pressure_systolic', 'blood_pressure_diastolic', 'alt', 'ast', 'alp',
  'bilirubin_total', 'albumin', 'total_protein', 'ejection_fraction', 'nyha_class',
  'fev1_percent', 'fvc_percent', 'fev1_fvc_ratio', 'pra_percent',
]);

/** Empty strings → null, numeric strings → numbers */
function cleanPayload(form) {
  const out = {};
  for (const [k, v] of Object.entries(form)) {
    if (v === '' || v === undefined) { out[k] = null; continue; }
    if (NUMERIC_FIELDS.has(k)) { out[k] = v === null ? null : Number(v); continue; }
    out[k] = v;
  }
  out.completed_steps = 3;
  return out;
}

export default function ScreeningWizard({ role }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [analysis, setAnalysis] = useState(null); // { summary, flags, fields_found }
  const [analyzing, setAnalyzing] = useState(false);
  const fileRef = useRef(null);

  const isDonor = role === 'donor';

  // Prefill from an existing screening record
  useEffect(() => {
    api.get('/screening/me')
      .then((res) => {
        const s = res.data?.screening;
        if (!s) return;
        const next = { ...EMPTY_FORM };
        for (const k of Object.keys(EMPTY_FORM)) {
          if (s[k] !== null && s[k] !== undefined) next[k] = s[k];
        }
        setForm(next);
        if (s.is_eligible !== null && s.is_eligible !== undefined) {
          setEligibility({ eligible: s.is_eligible, reasons: s.eligibility_reasons || [], urgency_score: s.urgency_score });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const panels = (form.organs_offered.length ? form.organs_offered : ['kidney'])
    .filter((o) => ORGAN_PANELS[o]);

  /* ── Lab report upload ── */
  async function analyzeFile(file) {
    if (!file) return;
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/agents/screening/analyze', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { extracted_values, flags, summary, fields_found } = res.data;
      setAnalysis({ flags, summary, fields_found, filename: file.name });
      if (fields_found > 0) {
        setForm((f) => {
          const next = { ...f };
          for (const [k, v] of Object.entries(extracted_values)) {
            if (k in next && v !== null && v !== undefined) next[k] = v;
          }
          return next;
        });
        toast.success(`Extracted ${fields_found} value${fields_found === 1 ? '' : 's'} from ${file.name}`);
      } else {
        toast.error('No values could be extracted — fill the form manually');
      }
    } catch (err) {
      toast.error(apiError(err, 'Could not analyse that file'));
    } finally {
      setAnalyzing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  /* ── Submit ── */
  async function submit() {
    if (!form.blood_group) {
      toast.error('Blood group is required — see step 01');
      setStep(0);
      return;
    }
    if (isDonor && form.organs_offered.length === 0) {
      toast.error('Select at least one organ you wish to donate');
      setStep(0);
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/screening/submit', cleanPayload(form));
      setEligibility(res.data.eligibility);
      toast.success('Screening saved');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast.error(apiError(err, 'Could not save screening'));
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return <div className="py-24 flex justify-center"><Spinner size={22} /></div>;
  }

  return (
    <div className="grid lg:grid-cols-[220px_1fr] gap-8 items-start">
      {/* ── Step rail ── */}
      <div className="lg:sticky lg:top-24">
        <ol className="flex lg:flex-col gap-2">
          {STEPS.map((s, i) => {
            const active = i === step;
            const done = i < step;
            return (
              <li key={s.id} className="flex-1 lg:flex-none">
                <button
                  onClick={() => setStep(i)}
                  className={`w-full text-left rounded-md border px-3.5 py-3 transition-colors cursor-pointer ${
                    active ? 'border-ink bg-white' : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`font-mono text-[11px] ${active ? 'text-blood-600' : 'text-stone-400'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className={`text-[13px] font-medium ${active ? 'text-ink' : 'text-stone-500'}`}>
                      {s.title}
                    </span>
                    {done && <CheckCircle2 size={13} className="ml-auto text-leaf-600 hidden lg:block" />}
                  </div>
                  <p className="hidden lg:block mt-1 text-[11.5px] text-stone-400 pl-7">{s.desc}</p>
                </button>
              </li>
            );
          })}
        </ol>

        {/* Eligibility verdict */}
        {eligibility && (
          <div className={`mt-4 rounded-md border p-4 ${
            eligibility.eligible ? 'border-leaf-100 bg-leaf-50' : 'border-blood-200 bg-blood-50'
          }`}>
            <p className="micro" style={{ fontSize: 10 }}>Verdict</p>
            <p className={`mt-1.5 text-[14px] font-semibold ${eligibility.eligible ? 'text-leaf-700' : 'text-blood-700'}`}>
              {eligibility.eligible ? 'Eligible' : 'Not eligible'}
            </p>
            {!isDonor && eligibility.urgency_score != null && eligibility.eligible && (
              <p className="mt-1 text-[12px] text-stone-600 tnum">
                Urgency score {Number(eligibility.urgency_score).toFixed(1)} / 10
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Form column ── */}
      <div className="min-w-0">
        {/* Eligibility reasons */}
        {eligibility && (
          <Card className={`mb-6 ${eligibility.eligible ? 'border-leaf-100' : 'border-blood-200'}`}>
            <div className="flex items-start gap-3">
              {eligibility.eligible
                ? <CheckCircle2 size={18} className="text-leaf-600 mt-0.5 shrink-0" />
                : <AlertTriangle size={18} className="text-blood-600 mt-0.5 shrink-0" />}
              <div>
                <p className="text-[14px] font-semibold text-ink">
                  {eligibility.eligible
                    ? (isDonor ? 'You are eligible to donate.' : 'You are eligible for listing.')
                    : 'Current contraindications found.'}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {(eligibility.reasons || []).map((r, i) => (
                    <li key={i} className="text-[13px] text-stone-600 leading-relaxed flex gap-2">
                      <span className={`mt-[7px] w-1 h-1 shrink-0 ${eligibility.eligible ? 'bg-leaf-600' : 'bg-blood-600'}`} />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        )}

        {/* ════ STEP 1 — BASICS ════ */}
        {step === 0 && (
          <div className="space-y-6 rise">
            {/* Lab upload */}
            <Card>
              <SectionHeading title="Autofill from a lab report" description="PDF or plain-text report — the extraction agent reads values into the form." />
              <div className="mt-4">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.txt,.text"
                  className="hidden"
                  onChange={(e) => analyzeFile(e.target.files?.[0])}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={analyzing}
                  className="w-full rounded-md border border-dashed border-stone-300 hover:border-blood-400 bg-paper
                    px-4 py-7 text-center transition-colors cursor-pointer disabled:opacity-60"
                >
                  {analyzing ? (
                    <span className="inline-flex items-center gap-2.5 text-[13px] text-stone-500">
                      <Spinner size={15} /> Reading report…
                    </span>
                  ) : (
                    <>
                      <UploadCloud size={20} className="mx-auto text-stone-400" />
                      <p className="mt-2 text-[13px] font-medium text-ink">Drop in a lab report</p>
                      <p className="mt-0.5 font-mono text-[10.5px] text-stone-400">PDF or TXT · values are editable after</p>
                    </>
                  )}
                </button>

                {analysis && (
                  <div className="mt-4 rounded-md border border-stone-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-[12.5px] text-stone-500">
                      <FileText size={14} className="text-stone-400" />
                      <span className="font-medium text-ink">{analysis.filename}</span>
                      <Badge tone={analysis.fields_found ? 'green' : 'stone'}>
                        {analysis.fields_found} field{analysis.fields_found === 1 ? '' : 's'}
                      </Badge>
                    </div>
                    {analysis.summary && (
                      <p className="mt-2.5 text-[13px] text-stone-600 leading-relaxed">{analysis.summary}</p>
                    )}
                    {analysis.flags?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {analysis.flags.map((f) => (
                          <Badge key={f.field} tone={f.status === 'HIGH' ? 'red' : 'amber'}>
                            {f.field} {f.value} {f.unit} · {f.status.toLowerCase()}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <SectionHeading index={1} title="Identity & serology" />
              <div className="mt-5 grid sm:grid-cols-2 gap-5">
                <Field label="Blood group">
                  <Select
                    value={form.blood_group}
                    onChange={(e) => set('blood_group', e.target.value)}
                    options={BLOOD_GROUPS_API}
                    placeholder="Select group"
                  />
                </Field>
                <Field label="HIV status">
                  <ChoiceGroup options={INFECTION_OPTIONS} value={form.hiv_status} onChange={(v) => set('hiv_status', v)} />
                </Field>
                <Field label="Hepatitis B (HBV)">
                  <ChoiceGroup options={INFECTION_OPTIONS} value={form.hbv_status} onChange={(v) => set('hbv_status', v)} />
                </Field>
                <Field label="Hepatitis C (HCV)">
                  <ChoiceGroup options={INFECTION_OPTIONS} value={form.hcv_status} onChange={(v) => set('hcv_status', v)} />
                </Field>
              </div>
            </Card>

            <Card>
              <SectionHeading index={2} title="Medical history" />
              <div className="mt-5 space-y-5">
                <Field label="Cancer history">
                  <ChoiceGroup
                    options={[{ value: false, label: 'No history' }, { value: true, label: 'Yes — specify' }]}
                    value={form.cancer_history}
                    onChange={(v) => set('cancer_history', v)}
                    columns={2}
                  />
                </Field>
                {form.cancer_history && (
                  <Field label="Cancer type">
                    <Input value={form.cancer_type} onChange={(e) => set('cancer_type', e.target.value)} placeholder="e.g. Basal cell carcinoma, 2019" />
                  </Field>
                )}
                <Field label="Existing conditions" hint="Select all that apply">
                  <div className="flex flex-wrap gap-1.5">
                    {CONDITIONS.map((c) => {
                      const active = form.medical_history.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() =>
                            set('medical_history', active
                              ? form.medical_history.filter((x) => x !== c)
                              : [...form.medical_history, c])
                          }
                          className={`h-8 px-3 rounded-full border text-[12.5px] font-medium transition-colors cursor-pointer ${
                            active
                              ? 'border-ink bg-ink text-white'
                              : 'border-stone-300 bg-white text-stone-600 hover:border-stone-400'
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label="Smoking">
                    <ChoiceGroup options={SMOKING_OPTIONS} value={form.smoking_status} onChange={(v) => set('smoking_status', v)} />
                  </Field>
                  {form.smoking_status !== 'never' && (
                    <Field label="Pack years">
                      <Input type="number" min="0" unit={UNITS.smoking_pack_years} value={form.smoking_pack_years} onChange={(e) => set('smoking_pack_years', e.target.value)} />
                    </Field>
                  )}
                  <Field label="Alcohol">
                    <ChoiceGroup options={ALCOHOL_OPTIONS} value={form.alcohol_status} onChange={(v) => set('alcohol_status', v)} />
                  </Field>
                  {form.alcohol_status !== 'never' && (
                    <Field label="Consumption">
                      <Input type="number" min="0" unit={UNITS.alcohol_units_per_week} value={form.alcohol_units_per_week} onChange={(e) => set('alcohol_units_per_week', e.target.value)} />
                    </Field>
                  )}
                </div>
              </div>
            </Card>

            <Card>
              <SectionHeading
                index={3}
                title={isDonor ? 'Organs offered' : 'Organ needed'}
                description={isDonor ? 'Select every organ you are willing to donate.' : 'Select the organ you are waiting for.'}
              />
              <div className="mt-5 grid sm:grid-cols-2 gap-2.5">
                {ORGANS.map((o) => {
                  const active = form.organs_offered.includes(o.id);
                  const toggle = () => {
                    if (isDonor) {
                      set('organs_offered', active
                        ? form.organs_offered.filter((x) => x !== o.id)
                        : [...form.organs_offered, o.id]);
                    } else {
                      set('organs_offered', [o.id]);
                    }
                  };
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={toggle}
                      className={`text-left p-4 rounded-md border transition-colors cursor-pointer ${
                        active ? 'border-ink bg-white ring-1 ring-ink' : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] font-semibold text-ink">{o.label}</span>
                        <span className={`w-3.5 h-3.5 rounded-full border-2 ${active ? 'border-blood-600 bg-blood-600' : 'border-stone-300'}`} />
                      </div>
                      <p className="mt-1 text-[12px] text-stone-500 leading-relaxed">{o.note}</p>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* ════ STEP 2 — ORGAN FUNCTION ════ */}
        {step === 1 && (
          <div className="space-y-6 rise">
            {panels.map((organId, pi) => {
              const panel = ORGAN_PANELS[organId];
              return (
                <Card key={organId}>
                  <SectionHeading index={pi + 1} title={panel.title} description="Leave blank if a test has not been done yet." />
                  <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {panel.fields.map((f) => (
                      <Field key={f.name} label={f.label}>
                        {f.type === 'select' ? (
                          <Select
                            value={String(form[f.name] ?? '')}
                            onChange={(e) => set(f.name, e.target.value)}
                            options={f.options}
                            placeholder="—"
                          />
                        ) : (
                          <Input
                            type="number"
                            min="0"
                            step={f.step || '1'}
                            unit={UNITS[f.name]}
                            value={form[f.name]}
                            onChange={(e) => set(f.name, e.target.value)}
                          />
                        )}
                      </Field>
                    ))}
                  </div>
                </Card>
              );
            })}
            <p className="text-[12.5px] text-stone-400 leading-relaxed">
              Reference ranges follow Indian clinical guidelines. Values outside range are flagged,
              not hidden — your transplant team sees exactly what the lab reported.
            </p>
          </div>
        )}

        {/* ════ STEP 3 — COMPATIBILITY ════ */}
        {step === 2 && (
          <div className="space-y-6 rise">
            <Card>
              <SectionHeading index={1} title="HLA typing" description="Comma-separated alleles from your tissue-typing report." />
              <div className="mt-5 grid sm:grid-cols-3 gap-5">
                <Field label="HLA-A">
                  <Input value={form.hla_a} onChange={(e) => set('hla_a', e.target.value)} placeholder="A*02, A*11" className="font-mono" />
                </Field>
                <Field label="HLA-B">
                  <Input value={form.hla_b} onChange={(e) => set('hla_b', e.target.value)} placeholder="B*07, B*35" className="font-mono" />
                </Field>
                <Field label="HLA-DR">
                  <Input value={form.hla_dr} onChange={(e) => set('hla_dr', e.target.value)} placeholder="DRB1*04, DRB1*15" className="font-mono" />
                </Field>
              </div>
            </Card>
            <Card>
              <SectionHeading index={2} title="Crossmatch & sensitisation" />
              <div className="mt-5 grid sm:grid-cols-2 gap-5">
                <Field label="Crossmatch result">
                  <ChoiceGroup options={CROSSMATCH_OPTIONS} value={form.crossmatch_result} onChange={(v) => set('crossmatch_result', v)} />
                </Field>
                <Field label="PRA — panel reactive antibody">
                  <Input type="number" min="0" max="100" unit={UNITS.pra_percent} value={form.pra_percent} onChange={(e) => set('pra_percent', e.target.value)} />
                </Field>
              </div>
            </Card>
          </div>
        )}

        {/* ── Nav buttons ── */}
        <div className="mt-8 flex items-center justify-between border-t border-stone-200 pt-6">
          <Button
            variant="ghost"
            icon={ArrowLeft}
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
          >
            Back
          </Button>
          {step < 2 ? (
            <Button variant="primary" onClick={() => setStep((s) => s + 1)}>
              Continue <ArrowRight size={15} />
            </Button>
          ) : (
            <Button variant="accent" loading={saving} onClick={submit}>
              Submit screening
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
