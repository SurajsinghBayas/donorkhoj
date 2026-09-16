import React, { useState } from 'react';
import { api } from '../api';
import { 
  FileText, Upload, CheckCircle2, AlertTriangle, Stethoscope, 
  Activity, ShieldCheck, Heart, Sparkles, ArrowRight, ArrowLeft, Loader2 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function MedicalScreeningWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiReport, setAiReport] = useState(null);

  const [formData, setFormData] = useState({
    // Basic Screening
    blood_group: 'O+',
    hiv_status: 'negative',
    hbv_status: 'negative',
    hcv_status: 'negative',
    cancer_screening: 'negative',
    smoking_history: 'never',
    alcohol_history: 'none',
    medical_history_notes: '',

    // Kidney
    creatinine: 1.0,
    egfr: 90.0,
    urine_test: 'normal',
    blood_pressure_sys: 120,
    blood_pressure_dia: 80,
    kidney_imaging_notes: 'Normal bilateral kidneys, no hydronephrosis',

    // Liver
    alt: 25.0,
    ast: 22.0,
    alp: 75.0,
    bilirubin_total: 0.8,
    albumin: 4.2,

    // Heart
    ecg_result: 'Normal sinus rhythm',
    ejection_fraction: 65.0,

    // Lung
    fev1_percent: 95.0,
    fvc_percent: 92.0,

    // Compatibility (HLA & Crossmatch)
    hla_a: 'A*02, A*11',
    hla_b: 'B*07, B*35',
    hla_dr: 'DRB1*04, DRB1*15',
    crossmatch_status: 'negative',

    // Offered organs (for donors)
    organs_offered: ['kidney'],
    organ_needed: 'kidney',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleOrgansToggle = (organ) => {
    setFormData((prev) => {
      const current = prev.organs_offered || [];
      const updated = current.includes(organ)
        ? current.filter((o) => o !== organ)
        : [...current, organ];
      return { ...prev, organs_offered: updated };
    });
  };

  // MedBot PDF AI Report Extraction
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const data = new FormData();
    data.append('file', file);

    try {
      const res = await api.post('/agents/screening/analyze', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setAiReport(res.data);
      const ext = res.data.extracted_values || {};

      setFormData((prev) => ({
        ...prev,
        blood_group: ext.blood_group || prev.blood_group,
        creatinine: ext.creatinine ?? prev.creatinine,
        egfr: ext.egfr ?? prev.egfr,
        alt: ext.alt ?? prev.alt,
        ast: ext.ast ?? prev.ast,
        alp: ext.alp ?? prev.alp,
        bilirubin_total: ext.bilirubin_total ?? prev.bilirubin_total,
        albumin: ext.albumin ?? prev.albumin,
        ejection_fraction: ext.ejection_fraction ?? prev.ejection_fraction,
        fev1_percent: ext.fev1_percent ?? prev.fev1_percent,
        blood_pressure_sys: ext.blood_pressure_systolic ?? prev.blood_pressure_sys,
        blood_pressure_dia: ext.blood_pressure_diastolic ?? prev.blood_pressure_dia,
        hiv_status: ext.hiv_status || prev.hiv_status,
        hbv_status: ext.hbv_status || prev.hbv_status,
        hcv_status: ext.hcv_status || prev.hcv_status,
      }));

      toast.success(`MedBot AI extracted ${res.data.fields_found} fields from lab report!`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to analyze report');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await api.post('/screening/submit', {
        ...formData,
        creatinine: parseFloat(formData.creatinine),
        egfr: parseFloat(formData.egfr),
        blood_pressure_sys: parseInt(formData.blood_pressure_sys),
        blood_pressure_dia: parseInt(formData.blood_pressure_dia),
        alt: parseFloat(formData.alt),
        ast: parseFloat(formData.ast),
        alp: parseFloat(formData.alp),
        bilirubin_total: parseFloat(formData.bilirubin_total),
        albumin: parseFloat(formData.albumin),
        ejection_fraction: parseFloat(formData.ejection_fraction),
        fev1_percent: parseFloat(formData.fev1_percent),
        fvc_percent: parseFloat(formData.fvc_percent),
      });

      toast.success('Medical screening submitted successfully!');
      if (onComplete) onComplete(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error submitting screening data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6 max-w-4xl mx-auto space-y-6 border border-cyan-500/20">
      {/* AI Scanner Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-purple-950/60 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
              MedBot AI Lab Report Auto-Fill
            </h4>
            <p className="text-xs text-gray-400">
              Upload your PDF lab report to auto-fill tests & check against Indian clinical ranges.
            </p>
          </div>
        </div>
        <label className="btn-secondary text-xs cursor-pointer py-2 px-3 shrink-0 bg-cyan-500/10 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20">
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Scanning PDF...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Upload Lab Report PDF</span>
            </>
          )}
          <input type="file" accept=".pdf,.txt" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      {aiReport && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-xs space-y-2">
          <div className="flex items-center justify-between font-semibold text-cyan-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> MedBot AI Analysis Summary:
            </span>
            <span className="badge badge-cyan">{aiReport.fields_found} Fields Extracted</span>
          </div>
          <p className="text-gray-300 leading-relaxed">{aiReport.summary}</p>
          {aiReport.flags?.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {aiReport.flags.map((f, i) => (
                <span key={i} className="badge badge-amber">
                  ⚠️ {f.field}: {f.value} {f.unit} ({f.status})
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Progress Wizard Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        {[
          { id: 1, label: '1. Basic Screening', icon: Stethoscope },
          { id: 2, label: '2. Organ Specific Tests', icon: Activity },
          { id: 3, label: '3. Compatibility & HLA', icon: ShieldCheck },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setStep(s.id)}
            className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg transition ${
              step === s.id
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <s.icon className="w-4 h-4" />
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* STEP 1: Basic Medical Screening */}
      {step === 1 && (
        <div className="space-y-4 animate-in fade-in">
          <h3 className="text-base font-semibold text-cyan-400 flex items-center gap-2">
            <Stethoscope className="w-5 h-5" /> Step 1: Basic Medical Screening
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Blood Group (ABO/Rh)</label>
              <select
                name="blood_group"
                value={formData.blood_group}
                onChange={handleChange}
                className="glass-input"
              >
                {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                  <option key={bg} value={bg} className="bg-slate-900">
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">HIV Screening</label>
              <select
                name="hiv_status"
                value={formData.hiv_status}
                onChange={handleChange}
                className="glass-input"
              >
                <option value="negative" className="bg-slate-900">Negative (Clear)</option>
                <option value="positive" className="bg-slate-900">Positive</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">HBV Screening (HBsAg)</label>
              <select
                name="hbv_status"
                value={formData.hbv_status}
                onChange={handleChange}
                className="glass-input"
              >
                <option value="negative" className="bg-slate-900">Negative (Clear)</option>
                <option value="positive" className="bg-slate-900">Positive</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">HCV Screening (Anti-HCV)</label>
              <select
                name="hcv_status"
                value={formData.hcv_status}
                onChange={handleChange}
                className="glass-input"
              >
                <option value="negative" className="bg-slate-900">Negative (Clear)</option>
                <option value="positive" className="bg-slate-900">Positive</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Cancer Screening</label>
              <select
                name="cancer_screening"
                value={formData.cancer_screening}
                onChange={handleChange}
                className="glass-input"
              >
                <option value="negative" className="bg-slate-900">Negative (No malignancy)</option>
                <option value="history" className="bg-slate-900">Past History (&gt;5 yrs remitted)</option>
                <option value="active" className="bg-slate-900">Active Malignancy</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Smoking History</label>
              <select
                name="smoking_history"
                value={formData.smoking_history}
                onChange={handleChange}
                className="glass-input"
              >
                <option value="never" className="bg-slate-900">Never Smoked</option>
                <option value="former" className="bg-slate-900">Former Smoker (Quit &gt;6 mo)</option>
                <option value="current" className="bg-slate-900">Active Smoker</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Alcohol History</label>
              <select
                name="alcohol_history"
                value={formData.alcohol_history}
                onChange={handleChange}
                className="glass-input"
              >
                <option value="none" className="bg-slate-900">None / Occasional</option>
                <option value="moderate" className="bg-slate-900">Moderate Social</option>
                <option value="heavy" className="bg-slate-900">Heavy Consumption</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Organs Offered / Needed</label>
              <div className="flex gap-2 pt-1">
                {['kidney', 'liver', 'heart', 'lung'].map((o) => (
                  <button
                    type="button"
                    key={o}
                    onClick={() => handleOrgansToggle(o)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border transition ${
                      formData.organs_offered.includes(o)
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                        : 'bg-white/5 text-gray-400 border-white/10'
                    }`}
                  >
                    {o === 'kidney' && '🫘 '}
                    {o === 'liver' && '🫀 '}
                    {o === 'heart' && '❤️ '}
                    {o === 'lung' && '🫁 '}
                    {o}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Organ-Specific Tests */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in">
          <h3 className="text-base font-semibold text-cyan-400 flex items-center gap-2">
            <Activity className="w-5 h-5" /> Step 2: Organ-Specific Medical Tests
          </h3>

          {/* Kidney Section */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-3">
            <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
              🫘 Kidney Function & Imaging
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Creatinine (mg/dL)</label>
                <input
                  type="number"
                  step="0.1"
                  name="creatinine"
                  value={formData.creatinine}
                  onChange={handleChange}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">eGFR (mL/min/1.73m²)</label>
                <input
                  type="number"
                  step="1"
                  name="egfr"
                  value={formData.egfr}
                  onChange={handleChange}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Urine Test (Protein/Blood)</label>
                <select name="urine_test" value={formData.urine_test} onChange={handleChange} className="glass-input">
                  <option value="normal" className="bg-slate-900">Normal (Nil Protein)</option>
                  <option value="microalbuminuria" className="bg-slate-900">Microalbuminuria</option>
                  <option value="proteinuria" className="bg-slate-900">Proteinuria</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Systolic BP (mmHg)</label>
                <input
                  type="number"
                  name="blood_pressure_sys"
                  value={formData.blood_pressure_sys}
                  onChange={handleChange}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Diastolic BP (mmHg)</label>
                <input
                  type="number"
                  name="blood_pressure_dia"
                  value={formData.blood_pressure_dia}
                  onChange={handleChange}
                  className="glass-input"
                />
              </div>
            </div>
          </div>

          {/* Liver Section */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-3">
            <h4 className="text-sm font-semibold text-rose-400 flex items-center gap-2">
              🫀 Liver Function Test (LFT)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">ALT / SGPT (U/L)</label>
                <input
                  type="number"
                  name="alt"
                  value={formData.alt}
                  onChange={handleChange}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">AST / SGOT (U/L)</label>
                <input
                  type="number"
                  name="ast"
                  value={formData.ast}
                  onChange={handleChange}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Total Bilirubin (mg/dL)</label>
                <input
                  type="number"
                  step="0.1"
                  name="bilirubin_total"
                  value={formData.bilirubin_total}
                  onChange={handleChange}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Albumin (g/dL)</label>
                <input
                  type="number"
                  step="0.1"
                  name="albumin"
                  value={formData.albumin}
                  onChange={handleChange}
                  className="glass-input"
                />
              </div>
            </div>
          </div>

          {/* Heart & Lung Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-3">
              <h4 className="text-sm font-semibold text-rose-500 flex items-center gap-2">
                ❤️ Cardiac Assessment
              </h4>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Ejection Fraction (%)</label>
                <input
                  type="number"
                  name="ejection_fraction"
                  value={formData.ejection_fraction}
                  onChange={handleChange}
                  className="glass-input"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-3">
              <h4 className="text-sm font-semibold text-teal-400 flex items-center gap-2">
                🫁 Pulmonary Function
              </h4>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">FEV1 (% predicted)</label>
                <input
                  type="number"
                  name="fev1_percent"
                  value={formData.fev1_percent}
                  onChange={handleChange}
                  className="glass-input"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Compatibility & HLA */}
      {step === 3 && (
        <div className="space-y-4 animate-in fade-in">
          <h3 className="text-base font-semibold text-cyan-400 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" /> Step 3: Compatibility & HLA Typing
          </h3>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">HLA-A Alleles</label>
                <input
                  type="text"
                  name="hla_a"
                  value={formData.hla_a}
                  onChange={handleChange}
                  placeholder="e.g. A*02, A*11"
                  className="glass-input font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">HLA-B Alleles</label>
                <input
                  type="text"
                  name="hla_b"
                  value={formData.hla_b}
                  onChange={handleChange}
                  placeholder="e.g. B*07, B*35"
                  className="glass-input font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">HLA-DR Alleles</label>
                <input
                  type="text"
                  name="hla_dr"
                  value={formData.hla_dr}
                  onChange={handleChange}
                  placeholder="e.g. DRB1*04, DRB1*15"
                  className="glass-input font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Donor-Recipient Crossmatch</label>
              <select
                name="crossmatch_status"
                value={formData.crossmatch_status}
                onChange={handleChange}
                className="glass-input"
              >
                <option value="negative" className="bg-slate-900">Negative Crossmatch (Compatible ✓)</option>
                <option value="positive" className="bg-slate-900">Positive Crossmatch (Incompatible ✕)</option>
                <option value="pending" className="bg-slate-900">Pending Lab Test</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between border-t border-white/10 pt-4">
        {step > 1 ? (
          <button onClick={() => setStep(step - 1)} className="btn-secondary text-xs">
            <ArrowLeft className="w-4 h-4" /> Previous
          </button>
        ) : (
          <div></div>
        )}

        {step < 3 ? (
          <button onClick={() => setStep(step + 1)} className="btn-primary text-xs">
            Next Step <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={loading} className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-500">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Submit Medical Screening
          </button>
        )}
      </div>
    </div>
  );
}
