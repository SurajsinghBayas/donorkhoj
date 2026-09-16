import PageHeader from '../../components/ui/PageHeader';
import ScreeningWizard from '../../components/screening/ScreeningWizard';

export default function ScreeningPage({ role }) {
  const isDonor = role === 'donor';
  return (
    <div className="rise">
      <PageHeader
        eyebrow="Medical screening"
        title={isDonor ? 'Your donor workup.' : 'Your recipient workup.'}
        description={isDonor
          ? 'Three steps: basics, organ function, compatibility. Upload a lab report to autofill — everything stays editable.'
          : 'The same clinical workup as donors, plus an urgency score that prioritises your listing.'}
      />
      <div className="mt-8">
        <ScreeningWizard role={role} />
      </div>
    </div>
  );
}
