"""
Live transplant-hospital discovery. All data comes from OpenStreetMap
(Overpass API) + Nominatim geocoding at request time — no bundled lists.
"""
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from routers.auth import get_current_user
from models.models import User

router = APIRouter(prefix="/hospitals", tags=["hospitals"])

OVERPASS_MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter",
]
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
UA = {"User-Agent": "DonorKhoj/1.0 (https://donorkhoj.in; contact: support@donorkhoj.in)"}

TRANSPLANT_KEYWORDS = ("transplant", "kidney", "nephro", "liver", "hepato",
                       "cardiac", "heart", "multi speciality", "multispeciality",
                       "super speciality", "superspeciality", "aiims", "apollo",
                       "fortis", "max ", "medanta", "kokilaben", "manipal", "narayana")


def _is_transplant_relevant(name: str) -> bool:
    n = (name or "").lower()
    return any(k in n for k in TRANSPLANT_KEYWORDS)


async def _overpass(lat: float, lon: float, radius_m: int) -> list:
    # Hospitals (+ clinics with emergency) around a point, with contact tags
    query = f"""
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](around:{radius_m},{lat},{lon});
      way["amenity"="hospital"](around:{radius_m},{lat},{lon});
      relation["amenity"="hospital"](around:{radius_m},{lat},{lon});
    );
    out center tags 60;
    """
    last_err: Exception | None = None
    for mirror in OVERPASS_MIRRORS:
        try:
            async with httpx.AsyncClient(timeout=30, headers=UA) as c:
                r = await c.post(mirror, data={"data": query})
                r.raise_for_status()
                return r.json().get("elements", [])
        except Exception as e:  # noqa: BLE001 — try next mirror
            last_err = e
            continue
    raise HTTPException(status_code=502, detail=f"Hospital directory unreachable: {last_err}")


def _shape(el: dict, lat: float, lon: float) -> dict:
    tags = el.get("tags", {})
    name = tags.get("name", "Unnamed hospital")
    elat = el.get("lat") or (el.get("center") or {}).get("lat")
    elon = el.get("lon") or (el.get("center") or {}).get("lon")
    addr = ", ".join(p for p in (
        tags.get("addr:housenumber"), tags.get("addr:street"),
        tags.get("addr:suburb") or tags.get("addr:district"),
        tags.get("addr:city") or tags.get("addr:town"),
        tags.get("addr:state"), tags.get("addr:postcode"),
    ) if p)
    return {
        "name": name,
        "transplant_relevant": _is_transplant_relevant(name),
        "address": addr or None,
        "city": tags.get("addr:city") or tags.get("addr:town"),
        "state": tags.get("addr:state"),
        "postcode": tags.get("addr:postcode"),
        "phone": tags.get("phone") or tags.get("contact:phone"),
        "website": tags.get("website") or tags.get("contact:website"),
        "emergency": tags.get("emergency") == "yes",
        "lat": elat, "lon": elon,
        "directions_url": (f"https://www.openstreetmap.org/directions?from={lat}%2C{lon}"
                           f"&to={elat}%2C{elon}") if elat and elon else None,
        "source": "OpenStreetMap",
    }


async def _geocode(place: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=15, headers=UA) as c:
            r = await c.get(NOMINATIM_URL, params={
                "q": place, "format": "json", "limit": 1, "addressdetails": 1})
            r.raise_for_status()
            hits = r.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Geocoder unreachable: {e}")
    if not hits:
        raise HTTPException(status_code=404, detail=f"Could not locate '{place}'")
    h = hits[0]
    addr = h.get("address", {})
    return {"lat": float(h["lat"]), "lon": float(h["lon"]),
            "display_name": h.get("display_name"),
            "city": addr.get("city") or addr.get("town") or addr.get("village"),
            "state": addr.get("state"), "country": addr.get("country")}


@router.get("/nearby")
async def nearby(lat: float = Query(...), lon: float = Query(...),
                 radius_km: float = Query(25, ge=1, le=100),
                 transplant_only: bool = False,
                 current_user: User = Depends(get_current_user)):
    """Live hospitals around coordinates (use browser geolocation)."""
    els = await _overpass(lat, lon, int(radius_km * 1000))
    out = [_shape(e, lat, lon) for e in els if (e.get("tags") or {}).get("name")]
    if transplant_only:
        out = [h for h in out if h["transplant_relevant"]]
    # Transplant-relevant first, then the rest
    out.sort(key=lambda h: (not h["transplant_relevant"], h["name"]))
    return {"count": len(out), "lat": lat, "lon": lon,
            "radius_km": radius_km, "hospitals": out}


@router.get("/search")
async def search(city: str = Query(..., min_length=2),
                 state: str = Query(None), country: str = Query("India"),
                 radius_km: float = Query(25, ge=1, le=100),
                 transplant_only: bool = False,
                 current_user: User = Depends(get_current_user)):
    """Live hospitals in a city/state/country — geocoded, then searched."""
    place = ", ".join(p for p in (city, state, country) if p)
    geo = await _geocode(place)
    els = await _overpass(geo["lat"], geo["lon"], int(radius_km * 1000))
    out = [_shape(e, geo["lat"], geo["lon"]) for e in els if (e.get("tags") or {}).get("name")]
    if transplant_only:
        out = [h for h in out if h["transplant_relevant"]]
    out.sort(key=lambda h: (not h["transplant_relevant"], h["name"]))
    return {"count": len(out), "location": geo, "radius_km": radius_km, "hospitals": out}
