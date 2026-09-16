import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Building2, Phone, Globe, Navigation, MapPin, Star } from 'lucide-react';
import { api, apiError } from '../../lib/api';
import { useAppStore } from '../../lib/store';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Empty from '../../components/ui/Empty';
import { Input } from '../../components/ui/Field';

function HospitalCard({ h, onSetHome, isHome, settingHome }) {
  return (
    <Card className="!p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-9 h-9 rounded-md bg-blood-50 border border-blood-100 text-blood-600 flex items-center justify-center shrink-0">
            <Building2 size={17} />
          </span>
          <div className="min-w-0">
            <p className="text-[14.5px] font-semibold text-ink leading-snug">{h.name}</p>
            <p className="mt-1 text-[12.5px] text-stone-500 leading-relaxed">
              {[h.address, h.city, h.state, h.postcode].filter(Boolean).join(', ') || 'Address not listed'}
            </p>
          </div>
        </div>
        {h.transplant_relevant && (
          <Badge tone="green" dot>Transplant centre</Badge>
        )}
      </div>
      <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px] text-stone-500">
        {h.phone && (
          <a href={`tel:${h.phone}`} className="inline-flex items-center gap-1.5 hover:text-ink">
            <Phone size={13} /> {h.phone}
          </a>
        )}
        {h.website && (
          <a href={h.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-ink">
            <Globe size={13} /> Website
          </a>
        )}
        {h.directions_url && (
          <a href={h.directions_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-ink">
            <Navigation size={13} /> Directions
          </a>
        )}
        {h.emergency && <Badge tone="red">Emergency</Badge>}
      </div>
      <div className="mt-3.5 pt-3.5 border-t border-stone-100 flex justify-end">
        {isHome ? (
          <Badge tone="ink"><Star size={11} /> Your hospital</Badge>
        ) : (
          <Button size="sm" variant="outline" onClick={() => onSetHome(h.name)} loading={settingHome === h.name}>
            Set as my hospital
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function HospitalsPage() {
  const { user, token, setUser } = useAppStore();
  const [city, setCity] = useState(user?.city || '');
  const [state, setState] = useState(user?.state || '');
  const [country, setCountry] = useState(user?.country || 'India');
  const [radius, setRadius] = useState(25);
  const [txOnly, setTxOnly] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [settingHome, setSettingHome] = useState(null);

  async function runSearch(params) {
    setLoading(true);
    setResults(null);
    try {
      const res = await api.get('/hospitals/search', { params });
      setResults(res.data);
    } catch (err) {
      toast.error(apiError(err, 'Hospital search failed — try again'));
      setResults({ count: 0, hospitals: [] });
    } finally {
      setLoading(false);
    }
  }

  function searchCity() {
    if (!city.trim()) {
      toast.error('Enter a city first');
      return;
    }
    runSearch({
      city: city.trim(), ...(state.trim() ? { state: state.trim() } : {}),
      ...(country.trim() ? { country: country.trim() } : {}),
      radius_km: radius, transplant_only: txOnly,
    });
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not available in this browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocating(false);
        setLoading(true);
        setResults(null);
        try {
          const res = await api.get('/hospitals/nearby', {
            params: { lat: pos.coords.latitude, lon: pos.coords.longitude, radius_km: radius, transplant_only: txOnly },
          });
          setResults(res.data);
        } catch (err) {
          toast.error(apiError(err, 'Nearby search failed — try again'));
          setResults({ count: 0, hospitals: [] });
        } finally {
          setLoading(false);
        }
      },
      () => { setLocating(false); toast.error('Could not read your location'); },
      { timeout: 15000 }
    );
  }

  async function setHome(name) {
    setSettingHome(name);
    try {
      const res = await api.put('/auth/profile', { hospital_name: name });
      setUser(res.data, token);
      toast.success('Saved as your treating hospital');
    } catch (err) {
      toast.error(apiError(err, 'Could not save hospital'));
    } finally {
      setSettingHome(null);
    }
  }

  // Auto-search the user's city on first open
  useEffect(() => {
    if (user?.city) runSearch({ city: user.city, country: user.country || 'India', radius_km: 25, transplant_only: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Live directory · OpenStreetMap"
        title="Find hospitals."
        description="Real transplant centres and hospitals near you — searched live, never a fixed list. Save one as your treating hospital."
      />

      <Card className="mt-8">
        <div className="grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-3">
          <div>
            <p className="micro mb-1.5">City</p>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Mumbai" onKeyDown={(e) => e.key === 'Enter' && searchCity()} />
          </div>
          <div>
            <p className="micro mb-1.5">State (optional)</p>
            <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. Maharashtra" onKeyDown={(e) => e.key === 'Enter' && searchCity()} />
          </div>
          <div>
            <p className="micro mb-1.5">Country</p>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. India" onKeyDown={(e) => e.key === 'Enter' && searchCity()} />
          </div>
          <div className="flex items-end gap-2">
            <Button variant="accent" onClick={searchCity} loading={loading} icon={MapPin}>Search</Button>
            <Button variant="outline" onClick={useMyLocation} loading={locating} icon={Navigation}>Near me</Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-stone-500">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            Radius
            <select value={radius} onChange={(e) => setRadius(Number(e.target.value))}
              className="h-8 px-2 rounded-md border border-stone-300 bg-white text-ink text-[13px] cursor-pointer">
              {[10, 25, 50, 100].map((r) => <option key={r} value={r}>{r} km</option>)}
            </select>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={txOnly} onChange={(e) => setTxOnly(e.target.checked)} className="accent-[#B42318]" />
            Transplant centres only
          </label>
        </div>
      </Card>

      <div className="mt-6">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <Spinner size={22} />
            <p className="text-[13px] text-stone-400">Searching the live directory…</p>
          </div>
        ) : results === null ? (
          <Card>
            <Empty icon={Building2} title="Search for hospitals" hint="Enter a city above, or use your live location." />
          </Card>
        ) : results.hospitals?.length === 0 ? (
          <Card>
            <Empty icon={Building2} title="No hospitals found" hint="Widen the radius or check the spelling." />
          </Card>
        ) : (
          <>
            <p className="micro mb-3">
              {results.count} result{results.count === 1 ? '' : 's'}
              {results.location?.display_name ? ` · ${results.location.display_name.split(',').slice(0, 2).join(',')}` : ' · near you'}
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {results.hospitals.map((h, i) => (
                <HospitalCard key={`${h.name}-${i}`} h={h} onSetHome={setHome}
                  isHome={user?.hospital_name === h.name} settingHome={settingHome} />
              ))}
            </div>
            <p className="mt-4 text-[11.5px] text-stone-400">Source: OpenStreetMap contributors · data freshness varies by region</p>
          </>
        )}
      </div>
    </div>
  );
}
