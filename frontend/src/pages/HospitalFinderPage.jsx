import { useState, useEffect, useRef } from 'react'
import Layout from '../components/common/Layout'
import { toast } from 'react-toastify'

// Haversine distance calculation
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Fetch hospitals from OpenStreetMap Overpass API
async function fetchNearbyHospitalsOSM(lat, lng, radiusMeters = 8000) {
  const query = `
    [out:json][timeout:15];
    (
      node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      relation["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      node["amenity"="clinic"](around:${radiusMeters},${lat},${lng});
      way["amenity"="clinic"](around:${radiusMeters},${lat},${lng});
      node["amenity"="doctors"](around:${radiusMeters},${lat},${lng});
      way["amenity"="doctors"](around:${radiusMeters},${lat},${lng});
      node["healthcare"="hospital"](around:${radiusMeters},${lat},${lng});
      way["healthcare"="hospital"](around:${radiusMeters},${lat},${lng});
    );
    out center body;
  `

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })

  if (!response.ok) throw new Error('Overpass API request failed')

  const data = await response.json()

  return data.elements
    .filter(el => el.tags?.name)
    .map(el => {
      const elLat = el.lat || el.center?.lat
      const elLng = el.lon || el.center?.lon
      if (!elLat || !elLng) return null

      return {
        name: el.tags.name,
        address: [el.tags['addr:street'], el.tags['addr:city'], el.tags['addr:state']].filter(Boolean).join(', ') || el.tags['addr:full'] || '',
        phone: el.tags.phone || el.tags['contact:phone'] || '',
        website: el.tags.website || el.tags['contact:website'] || '',
        type: el.tags.amenity || el.tags.healthcare || 'hospital',
        emergency: el.tags.emergency === 'yes',
        lat: elLat,
        lng: elLng,
        distance: getDistanceKm(lat, lng, elLat, elLng),
        osmId: el.id
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance)
}

export default function HospitalFinderPage() {
  const mapRef = useRef(null)
  const leafletMapRef = useRef(null)
  const userMarkerRef = useRef(null)
  const leafletMarkersRef = useRef([])
  const routingControlRef = useRef(null)
  const watchIdRef = useRef(null)
  const hasSearchedRef = useRef(false)

  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [hospitals, setHospitals] = useState([])
  const [userLocation, setUserLocation] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [locationQuery, setLocationQuery] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState([])
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [selectedHospital, setSelectedHospital] = useState(null)

  useEffect(() => {
    loadLeafletMap()
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [])

  const loadLeafletMap = () => {
    if (window.L) { initLeafletMap(); return }

    // Load Leaflet CSS/JS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    // Load Leaflet Routing Machine CSS
    const linkRouting = document.createElement('link')
    linkRouting.rel = 'stylesheet'
    linkRouting.href = 'https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.css'
    document.head.appendChild(linkRouting)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.async = true
    script.onload = () => {
      // Load Routing Machine JS after Leaflet
      const scriptRouting = document.createElement('script')
      scriptRouting.src = 'https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.js'
      scriptRouting.async = true
      scriptRouting.onload = () => initLeafletMap()
      document.head.appendChild(scriptRouting)
    }
    document.head.appendChild(script)
  }

  const initLeafletMap = () => {
    if (!mapRef.current || !window.L || leafletMapRef.current) return

    const defaultLoc = [19.076, 72.8777]
    const map = window.L.map(mapRef.current).setView(defaultLoc, 13)

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map)

    leafletMapRef.current = map
    setMapReady(true)
    startWatchingLocation()
  }

  const startWatchingLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported')
      return
    }

    setLoading(true)
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        updateLeafletUserMarker(loc)
        setLoading(false)

        if (!hasSearchedRef.current) {
          hasSearchedRef.current = true
          searchHospitals(loc)
        }
      },
      () => {
        toast.error('Location access denied — using default location')
        setLoading(false)
        const defaultLoc = { lat: 19.076, lng: 72.8777 }
        setUserLocation(defaultLoc)
        updateLeafletUserMarker(defaultLoc)
        if (!hasSearchedRef.current) {
          hasSearchedRef.current = true
          searchHospitals(defaultLoc)
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    )
  }

  const updateLeafletUserMarker = (loc) => {
    const map = leafletMapRef.current
    if (!map) return

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([loc.lat, loc.lng])
    } else {
      const blueIcon = window.L.divIcon({
        html: `<div style="width:18px;height:18px;background:#4285F4;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
        iconSize: [18, 18], className: ''
      })
      userMarkerRef.current = window.L.marker([loc.lat, loc.lng], { icon: blueIcon, zIndexOffset: 1000 })
        .addTo(map).bindPopup('📍 You are here')
      map.setView([loc.lat, loc.lng], 14)
    }
  }

  const searchHospitals = async (location) => {
    setSearching(true)
    setHospitals([])
    
    // Clear existing routes
    if (routingControlRef.current && leafletMapRef.current) {
      leafletMapRef.current.removeControl(routingControlRef.current)
      routingControlRef.current = null
    }

    try {
      const results = await fetchNearbyHospitalsOSM(location.lat, location.lng, 10000)

      let filtered = results
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        filtered = results.filter(h =>
          h.name.toLowerCase().includes(q) ||
          h.address?.toLowerCase().includes(q) ||
          h.type?.toLowerCase().includes(q)
        )
      }

      // Increased limit from 25 to 50
      const hospitalList = filtered.slice(0, 50)
      setHospitals(hospitalList)

      if (leafletMapRef.current) {
        addLeafletHospitalMarkers(hospitalList)
      }

      if (hospitalList.length === 0) {
        toast.info('No hospitals found nearby. Try expanding your search.')
      }
    } catch (err) {
      console.error('[HospitalFinder] Search error:', err)
      toast.error('Failed to search for hospitals. Please try again.')
    }
    setSearching(false)
  }

  const searchManualLocation = async () => {
    if (!locationQuery.trim()) return
    setIsSearchingLocation(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery)}&format=json&limit=5`)
      const data = await res.json()
      if (data && data.length > 0) {
        setLocationSuggestions(data)
      } else {
        toast.error('No places found for this address.')
        setLocationSuggestions([])
      }
    } catch (err) {
      toast.error('Failed to search location.')
    }
    setIsSearchingLocation(false)
  }

  const selectLocation = (place) => {
    const loc = { lat: parseFloat(place.lat), lng: parseFloat(place.lon) }
    setUserLocation(loc)
    updateLeafletUserMarker(loc)
    setLocationSuggestions([])
    setLocationQuery(place.display_name.split(',')[0]) // Short name
    
    // Auto search hospitals around new location
    hasSearchedRef.current = true
    searchHospitals(loc)
  }

  const addLeafletHospitalMarkers = (hospitalList) => {
    const map = leafletMapRef.current
    if (!map) return

    leafletMarkersRef.current.forEach(m => map.removeLayer(m))
    leafletMarkersRef.current = []

    hospitalList.forEach((h, idx) => {
      const hospitalIcon = window.L.divIcon({
        html: `<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;background:white;border:2px solid ${h.emergency ? '#ef4444' : '#1a56db'};border-radius:50%;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.2)">${h.type === 'clinic' || h.type === 'doctors' ? '🩺' : '🏥'}</div>`,
        iconSize: [30, 30], className: ''
      })

      const marker = window.L.marker([h.lat, h.lng], { icon: hospitalIcon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width:200px;font-family:sans-serif">
            <h4 style="margin:0 0 4px;font-size:14px;font-weight:700">${h.name}</h4>
            ${h.address ? `<p style="margin:0 0 4px;color:#666;font-size:12px">📍 ${h.address}</p>` : ''}
            ${h.phone ? `<p style="margin:0 0 4px;font-size:12px"><a href="tel:${h.phone}">📞 ${h.phone}</a></p>` : ''}
            ${h.emergency ? '<span style="color:#ef4444;font-size:11px;font-weight:600">🚨 Emergency Services</span><br/>' : ''}
            <p style="margin:4px 0 0;font-size:12px;color:#666">📏 ${h.distance < 1 ? `${Math.round(h.distance * 1000)}m` : `${h.distance.toFixed(1)}km`} away</p>
          </div>
        `)

      marker.on('click', () => setSelectedHospital(idx))
      leafletMarkersRef.current.push(marker)
    })
  }

  const handleSearch = () => {
    if (userLocation) {
      hasSearchedRef.current = true
      searchHospitals(userLocation)
    } else {
      toast.error('Location not available yet')
    }
  }

  const handleHospitalClick = (idx) => {
    const h = hospitals[idx]
    if (!h) return
    setSelectedHospital(idx)

    if (leafletMapRef.current && h.lat && h.lng) {
      leafletMapRef.current.setView([h.lat, h.lng], 16)
      if (leafletMarkersRef.current[idx]) {
        leafletMarkersRef.current[idx].openPopup()
      }
    }
  }

  const drawRouteToHospital = (e, h) => {
    e.stopPropagation()
    if (!leafletMapRef.current || !userLocation || !window.L.Routing) return
    
    // Remove existing route if any
    if (routingControlRef.current) {
      leafletMapRef.current.removeControl(routingControlRef.current)
    }

    toast.info(`Routing to ${h.name}...`)

    routingControlRef.current = window.L.Routing.control({
      waypoints: [
        window.L.latLng(userLocation.lat, userLocation.lng),
        window.L.latLng(h.lat, h.lng)
      ],
      routeWhileDragging: false,
      addWaypoints: false,
      showAlternatives: false,
      fitSelectedRoutes: true,
      createMarker: () => null // Hide default green/red markers as we already have ours
    }).addTo(leafletMapRef.current)
  }

  return (
    <Layout title="Hospital Finder">
      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <h4 style={{ fontSize: '0.9rem', marginBottom: 12, color: 'var(--grey-700)' }}>Search Area</h4>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', position: 'relative' }}>
          
          {/* Location Input */}
          <div style={{ position: 'relative', flex: '1 1 250px' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" onClick={startWatchingLocation} title="Use Current GPS Location">
                📍 GPS
              </button>
              <input className="form-control" style={{ flex: 1 }}
                placeholder="City, area, or address..."
                value={locationQuery} onChange={e => { setLocationQuery(e.target.value); setLocationSuggestions([]); }}
                onKeyDown={e => e.key === 'Enter' && searchManualLocation()} />
              <button className="btn btn-secondary" onClick={searchManualLocation} disabled={isSearchingLocation}>
                {isSearchingLocation ? '⏳' : 'Search'}
              </button>
            </div>
            
            {/* Location Suggestions Dropdown */}
            {locationSuggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                background: 'white', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                border: '1px solid var(--grey-200)', zIndex: 1000, maxHeight: 200, overflowY: 'auto'
              }}>
                {locationSuggestions.map((place, i) => (
                  <div key={i} onClick={() => selectLocation(place)}
                    style={{ padding: '10px 14px', borderBottom: '1px solid var(--grey-100)', cursor: 'pointer', fontSize: '0.85rem' }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--grey-50)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    <p style={{ fontWeight: 600 }}>{place.name || place.display_name.split(',')[0]}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--grey-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {place.display_name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hospital Filter */}
          <div style={{ display: 'flex', gap: 8, flex: '1 1 250px' }}>
            <input className="form-control" style={{ flex: 1 }}
              placeholder="Filter by name, type..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()} />
            <button className="btn btn-primary" onClick={handleSearch} disabled={searching || !userLocation}>
              {searching ? '⏳ Searching...' : '🔍 Find Hospitals'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 20 }}>
        {/* Map */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ position: 'relative' }}>
            <div ref={mapRef} style={{ height: 500, width: '100%' }} />
            {loading && (
              <div style={{
                position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                background: 'white', padding: '8px 16px', borderRadius: 20,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', gap: 8, zIndex: 10
              }}>
                <div className="pulse-dot" /> Getting your location...
              </div>
            )}
            {mapReady && (
              <div style={{
                position: 'absolute', bottom: 8, left: 8,
                background: 'rgba(255,255,255,0.9)', padding: '4px 10px',
                borderRadius: 6, fontSize: '0.7rem', color: '#666', zIndex: 10
              }}>
                🗺️ OpenStreetMap • Routing Enabled
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🏥 Nearby Hospitals ({hospitals.length})</h3>
          </div>
          <div className="card-body" style={{ padding: 0, maxHeight: 500, overflowY: 'auto' }}>
            {searching ? (
              <div style={{ padding: 16 }}>
                <div style={{ textAlign: 'center', padding: '16px 0 8px', color: 'var(--grey-500)', fontSize: '0.85rem' }}>
                  🔍 Searching nearby hospitals...
                </div>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{ padding: '14px 0', borderBottom: '1px solid var(--grey-100)' }}>
                    <div style={{ height: 16, background: 'var(--grey-100)', borderRadius: 4, width: '70%', marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
                    <div style={{ height: 12, background: 'var(--grey-50)', borderRadius: 4, width: '90%', marginBottom: 6, animation: 'pulse 1.5s ease-in-out infinite 0.2s' }} />
                  </div>
                ))}
                <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
              </div>
            ) : hospitals.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🏥</div>
                <p className="text-muted">{loading ? 'Getting your location...' : 'Searching for nearby hospitals...'}</p>
                <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>
                  Allow location access to find hospitals near you.
                </p>
              </div>
            ) : hospitals.map((h, i) => (
              <div key={h.osmId || i} style={{
                padding: '14px 20px', borderBottom: '1px solid var(--grey-100)',
                transition: '0.15s', cursor: 'pointer',
                background: selectedHospital === i ? 'var(--grey-50)' : 'transparent'
              }}
                onMouseOver={e => { if (selectedHospital !== i) e.currentTarget.style.background = 'var(--grey-50)' }}
                onMouseOut={e => { if (selectedHospital !== i) e.currentTarget.style.background = 'transparent' }}
                onClick={() => handleHospitalClick(i)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {h.type === 'clinic' || h.type === 'doctors' ? '🩺' : '🏥'} {h.name}
                      {h.emergency && <span style={{ fontSize: '0.65rem', background: '#fee2e2', color: '#991b1b', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>EMERGENCY</span>}
                    </p>
                    {h.address && <p style={{ fontSize: '0.78rem', color: 'var(--grey-500)', marginBottom: 3 }}>📍 {h.address}</p>}
                    {h.phone && <p style={{ fontSize: '0.78rem', color: 'var(--grey-500)', marginBottom: 3 }}>
                      📞 <a href={`tel:${h.phone}`} onClick={e => e.stopPropagation()} style={{ color: 'var(--primary)' }}>{h.phone}</a>
                    </p>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      {h.distance !== undefined && (
                        <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                          📏 {h.distance < 1 ? `${Math.round(h.distance * 1000)}m` : `${h.distance.toFixed(1)}km`}
                        </span>
                      )}
                      <span className="badge" style={{
                        fontSize: '0.7rem',
                        background: h.type === 'hospital' ? '#dbeafe' : '#f3e8ff',
                        color: h.type === 'hospital' ? '#1e40af' : '#7c3aed'
                      }}>
                        {h.type === 'hospital' ? '🏥 Hospital' : h.type === 'clinic' ? '🩺 Clinic' : '👨‍⚕️ Doctor'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 8, flexShrink: 0 }}>
                    <button onClick={(e) => drawRouteToHospital(e, h)} className="btn btn-sm btn-outline" style={{ fontSize: '0.75rem' }}>
                      🧭 Directions
                    </button>
                    {h.phone && (
                      <a href={`tel:${h.phone}`} className="btn btn-sm btn-primary"
                        onClick={e => e.stopPropagation()} style={{ fontSize: '0.75rem', textAlign: 'center' }}>
                        📞 Call
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
