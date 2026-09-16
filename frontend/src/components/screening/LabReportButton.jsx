import { useState } from 'react';
import { FileText, Download, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_URL, apiError } from '../../lib/api';
import { useAppStore } from '../../lib/store';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';

/**
 * Fetches a lab-report PDF with the Bearer token (a plain link can't carry
 * auth headers) and shows it in a modal with a download option.
 * Props: userId (null → own report), label, size, variant.
 */
export default function LabReportButton({ userId = null, label = 'Lab report', size = 'sm', variant = 'outline' }) {
  const { token } = useAppStore();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  async function view() {
    if (url) {
      setOpen(true);
      return;
    }
    setLoading(true);
    try {
      const endpoint = userId ? `/screening/report/${userId}` : '/screening/report/me';
      const res = await fetch(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const detail = res.status === 404
          ? 'No lab report on file for this user yet'
          : res.status === 403
            ? 'You are not authorized to view this report'
            : 'Could not load the report';
        throw new Error(detail);
      }
      const blob = await res.blob();
      setUrl(URL.createObjectURL(blob));
      setOpen(true);
    } catch (err) {
      toast.error(apiError(err, 'Could not load the report'));
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
  }

  return (
    <>
      <Button size={size} variant={variant} icon={loading ? undefined : FileText} onClick={view} disabled={loading}>
        {loading ? <Spinner size={14} /> : null}
        {loading ? 'Loading…' : label}
      </Button>

      <Modal open={open} onClose={close} title={label} subtitle="Review the source labs before any decision — human in the loop." wide>
        <div className="px-6 py-5">
          {url ? (
            <>
              <iframe
                title={label}
                src={url}
                className="w-full rounded-md border border-stone-200 bg-white"
                style={{ height: '62vh' }}
              />
              <div className="mt-4 flex justify-end gap-2.5">
                <a href={url} download={`${label.replace(/\s+/g, '-').toLowerCase()}.pdf`}>
                  <Button size="sm" variant="outline" icon={Download}>Download PDF</Button>
                </a>
                <Button size="sm" variant="outline" icon={X} onClick={close}>Close</Button>
              </div>
            </>
          ) : (
            <div className="py-10 flex justify-center"><Spinner size={22} /></div>
          )}
        </div>
      </Modal>
    </>
  );
}
