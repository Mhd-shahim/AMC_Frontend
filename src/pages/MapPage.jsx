import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { SkeletonCard } from '../components/Loader'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const AMC_STATUS_URL = `${API_BASE_URL}/api/sites/amc-status/`
const MAP_CENTER = [25.2048, 55.2708]
const DEFAULT_ZOOM = 11

const TYPES = {
  amc: { label: 'AMC Active', color: '#22c55e', glow: '#22c55e66' },
  amc_expired: { label: 'AMC Expired', color: '#f59e0b', glow: '#f59e0b66' },
  no_amc: { label: 'Without AMC', color: '#ef4444', glow: '#ef444466' },
}

const STATUS_GROUPS = [
  { responseKey: 'sites_with_amc', type: 'amc' },
  { responseKey: 'sites_with_amc_expired', type: 'amc_expired' },
  { responseKey: 'sites_without_amc', type: 'no_amc' },
]

function makeIcon(color, glow) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <defs>
        <filter id="g" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="${glow}"/>
        </filter>
      </defs>
      <path d="M16 0C9.373 0 4 5.596 4 12.5c0 9.223 12 28.5 12 28.5s12-19.277 12-28.5C28 5.596 22.627 0 16 0z"
        fill="${color}" filter="url(#g)" opacity="0.95"/>
      <circle cx="16" cy="12.5" r="5.5" fill="#0f172a" opacity="0.9"/>
      <circle cx="16" cy="12.5" r="3" fill="${color}"/>
    </svg>`

  return L.divIcon({
    html: svg,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -44],
    className: '',
  })
}

const ICONS = {
  amc: makeIcon(TYPES.amc.color, TYPES.amc.glow),
  amc_expired: makeIcon(TYPES.amc_expired.color, TYPES.amc_expired.glow),
  no_amc: makeIcon(TYPES.no_amc.color, TYPES.no_amc.glow),
}

const valueOrDash = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  return value
}

const getSiteId = (site = {}) =>
  site.id_site ?? site.site_id ?? site.id ?? site.pk

const parseCoordinate = (value) => {
  const coordinate = Number.parseFloat(value)
  return Number.isFinite(coordinate) ? coordinate : null
}

const formatSoftware = (site) => {
  const name = site.currentSoftware
  const version = site.softwareVersion ? `v${site.softwareVersion}` : ''
  return valueOrDash([name, version].filter(Boolean).join(' '))
}

const formatEquipment = (site) =>
  `${site.serverCount ?? 0} servers, ${site.cameraCount ?? 0} cameras`

const formatConnection = (value) => {
  if (value === true) return 'Connected'
  if (value === false) return 'Not connected'
  return '-'
}

const getFetchErrorMessage = (error) => {
  const data = error.response?.data
  const fields = ['detail', 'error', 'message']

  if (typeof data === 'string') return data

  for (const field of fields) {
    const value = data?.[field]
    const message = Array.isArray(value) ? value[0] : value

    if (message) return message
  }

  if (error.request) return 'Unable to reach the AMC status server.'

  return 'Unable to load AMC site locations.'
}

const normalizeSite = (site, type, index) => {
  const latitude = parseCoordinate(site.latitude)
  const longitude = parseCoordinate(site.longitude)

  if (latitude === null || longitude === null) return null

  return {
    id: getSiteId(site) ?? `${type}-${index}`,
    type,
    name: site.site_name ?? site.siteName ?? 'Unnamed site',
    projectName: site.project_name ?? site.projectName,
    projectCode: site.project_code ?? site.projectCode,
    address: site.address,
    latitude,
    longitude,
    position: [latitude, longitude],
    serverCount: site.server_count ?? site.serverCount ?? 0,
    cameraCount: site.camera_count ?? site.cameraCount ?? 0,
    currentSoftware: site.current_software ?? site.currentSoftware,
    softwareVersion: site.software_version ?? site.softwareVersion,
    contactName: site.site_contact_name ?? site.contactName,
    contactNumber: site.site_contact_number ?? site.contactNumber,
    contactEmail: site.site_contact_email ?? site.contactEmail,
    engineer: site.allocated_site_engineer ?? site.siteEngineer,
    isSiraConnected: site.is_sira_connected ?? site.isSiraConnected,
    isActive: site.is_active ?? site.isActive,
  }
}

const normalizeAmcStatusResponse = (data = {}) =>
  STATUS_GROUPS.flatMap(({ responseKey, type }) =>
    (data[responseKey] ?? [])
      .map((site, index) => normalizeSite(site, type, index))
      .filter(Boolean),
  )

const getAmcStatusSites = async (signal) => {
  const response = await axios.get(AMC_STATUS_URL, { signal })
  return normalizeAmcStatusResponse(response.data)
}

function FitBounds({ sites }) {
  const map = useMap()

  useEffect(() => {
    if (sites.length === 0) {
      map.setView(MAP_CENTER, DEFAULT_ZOOM)
      return
    }

    const bounds = L.latLngBounds(sites.map(site => site.position))

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 })
    }
  }, [map, sites])

  return null
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '82px 1fr', gap: 8, marginBottom: 6, fontSize: 12 }}>
      <span style={{ color: '#94a3b8' }}>{label}</span>
      <span style={{ color: '#cbd5e1', fontWeight: 500, overflowWrap: 'anywhere' }}>{valueOrDash(value)}</span>
    </div>
  )
}

function SitePopup({ site }) {
  const { label, color } = TYPES[site.type]

  return (
    <div style={{ fontFamily: 'inherit', minWidth: 260 }}>
      <div style={{
        background: '#0f172a',
        margin: '-12px -20px 10px',
        padding: '10px 16px 8px',
        borderBottom: `2px solid ${color}`,
        borderRadius: '4px 4px 0 0',
      }}>
        <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 3 }}>
          {site.name}
        </div>
        <span style={{
          background: `${color}22`,
          color,
          border: `1px solid ${color}55`,
          borderRadius: 4,
          padding: '1px 8px',
          fontSize: 11,
          fontWeight: 600,
        }}>
          {label}
        </span>
      </div>

      <DetailRow label="Project" value={site.projectName} />
      <DetailRow label="Code" value={site.projectCode} />
      <DetailRow label="Address" value={site.address} />
      <DetailRow label="Contact" value={[site.contactName, site.contactNumber].filter(Boolean).join(' - ')} />
      <DetailRow label="Email" value={site.contactEmail} />
      <DetailRow label="Engineer" value={site.engineer} />
      <DetailRow label="Software" value={formatSoftware(site)} />
      <DetailRow label="Equipment" value={formatEquipment(site)} />
      <DetailRow label="SIRA" value={formatConnection(site.isSiraConnected)} />
      <DetailRow label="Location" value={`${site.latitude}, ${site.longitude}`} />
    </div>
  )
}

export default function MapPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [sites, setSites] = useState([])

  const handleLoadError = useCallback((err) => {
    const message = getFetchErrorMessage(err)
    setError(message)
    setSites([])
    console.error('Failed to load AMC status map data:', err)
    toast.error(message)
  }, [])

  const retryFetchSites = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const nextSites = await getAmcStatusSites()
      setSites(nextSites)
    } catch (err) {
      handleLoadError(err)
    } finally {
      setLoading(false)
    }
  }, [handleLoadError])

  useEffect(() => {
    const controller = new AbortController()

    const loadSites = async () => {
      try {
        const nextSites = await getAmcStatusSites(controller.signal)
        setSites(nextSites)
      } catch (err) {
        if (err.code !== 'ERR_CANCELED') {
          handleLoadError(err)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadSites()

    return () => controller.abort()
  }, [handleLoadError])

  const counts = useMemo(() => ({
    all: sites.length,
    amc: sites.filter(site => site.type === 'amc').length,
    amc_expired: sites.filter(site => site.type === 'amc_expired').length,
    no_amc: sites.filter(site => site.type === 'no_amc').length,
  }), [sites])

  const visibleSites = useMemo(
    () => filter === 'all' ? sites : sites.filter(site => site.type === filter),
    [filter, sites],
  )

  if (loading) return (
    <div className="fade-in">
      <div className="page-header"><div className="skeleton skeleton-title"></div></div>
      <div className="row g-3 mb-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div className="col-lg-2 col-md-4 col-6" key={i}><SkeletonCard /></div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="fade-in" style={{ position: 'relative', margin: '-24px' }}>
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '10px 14px',
        background: '#0f172a',
        borderBottom: '1px solid #1e293b',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        {[{ key: 'all', label: 'All Sites', color: '#64748b' },
          ...Object.entries(TYPES).map(([key, value]) => ({ key, label: value.label, color: value.color })),
        ].map(({ key, label, color }) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            background: filter === key ? `${color}22` : 'transparent',
            border: `1px solid ${filter === key ? color : '#334155'}`,
            color: filter === key ? color : '#94a3b8',
            borderRadius: 6,
            padding: '4px 14px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all .15s',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            {key !== 'all' && (
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: color,
                display: 'inline-block',
              }} />
            )}
            {label}
            <span style={{
              background: '#1e293b',
              borderRadius: 10,
              padding: '0 6px',
              fontSize: 11,
              color: '#64748b',
              marginLeft: 2,
            }}>
              {counts[key] ?? 0}
            </span>
          </button>
        ))}

        {error && (
          <button
            type="button"
            onClick={retryFetchSites}
            style={{
              marginLeft: 'auto',
              background: '#1e293b',
              color: '#cbd5e1',
              border: '1px solid #334155',
              borderRadius: 6,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        )}
      </div>

      <div style={{ height: '100vh', position: 'relative' }}>
        <MapContainer center={MAP_CENTER} zoom={DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <FitBounds sites={visibleSites} />
          {visibleSites.map(site => (
            <Marker key={`${site.type}-${site.id}`} position={site.position} icon={ICONS[site.type]}>
              <Popup className="dark-popup" maxWidth={340}>
                <SitePopup site={site} />
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {(error || visibleSites.length === 0) && (
          <div style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: '#0f172a',
            border: '1px solid #334155',
            color: '#cbd5e1',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13,
            boxShadow: '0 8px 32px #00000055',
            textAlign: 'center',
            maxWidth: 360,
          }}>
            {error || 'No sites with valid map coordinates found for this filter.'}
          </div>
        )}
      </div>

      <style>{`
        .dark-popup .leaflet-popup-content-wrapper {
          background: #1e293b;
          color: #cbd5e1;
          border: 1px solid #334155;
          border-radius: 8px;
          box-shadow: 0 8px 32px #00000088;
        }
        .dark-popup .leaflet-popup-tip { background: #1e293b; }
        .dark-popup .leaflet-popup-close-button { color: #64748b !important; }
        .dark-popup .leaflet-popup-close-button:hover { color: #f1f5f9 !important; }
        .leaflet-control-attribution { background: #0f172a99 !important; color: #475569 !important; }
        .leaflet-control-attribution a { color: #64748b !important; }
        .leaflet-bar a { background: #1e293b !important; color: #94a3b8 !important; border-color: #334155 !important; }
        .leaflet-bar a:hover { background: #334155 !important; color: #f1f5f9 !important; }
      `}</style>
    </div>
  )
}
