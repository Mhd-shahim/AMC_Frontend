import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Card, Col, Row, Table } from 'react-bootstrap'
import axios from 'axios'
import { SkeletonTable } from '../components/Loader'
import Modal from 'react-bootstrap/Modal';
import * as Yup from 'yup'


const DEVICES_TYPES = {
  Server: { icon: 'fas fa-server', bg: '#E6F1FB', color: '#185FA5' },
  Camera: { icon: 'fas fa-camera', bg: '#E1F5EE', color: '#0F6E56' },
  USB: { icon: 'fab fa-usb', bg: '#FAEEDA', color: '#854F0B' },
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

const Field = ({ label, required, children, col = 'col-md-4' }) => (
  <div className={col}>
    <label className="form-label fw-semibold" style={{ fontSize: 12 }}>
      {label} {required && <span className="text-danger">*</span>}
    </label>
    {children}
  </div>
)

const Inp = (props) => <input className="form-control form-control-sm" {...props} />
const Sel = ({ children, ...props }) => (
  <select className="form-select form-select-sm" {...props}>{children}</select>
)

const ErrorText = ({ message }) => (
  message ? <div className="text-danger small">{message}</div> : null
)

const DEVICE_TYPES = [
  { key: 'Server', icon: 'fas fa-server', badge: { bg: '#E6F1FB', color: '#185FA5' } },
  { key: 'Camera', icon: 'fas fa-camera', badge: { bg: '#E1F5EE', color: '#0F6E56' } },
  { key: 'USB',    icon: 'fab fa-usb',    badge: { bg: '#FAEEDA', color: '#854F0B' } },
] 

const getSiteContract = (site = {}) =>
  site.contract ?? site.contract_details ?? site.contractDetail ?? null

const getSiteEquipment = (site = {}) =>
  site.equipment ?? site.equipments ?? site.equipment_details ?? site.equipmentDetails ?? []

const mergeSiteDetails = (site = {}, details = {}) => {
  const detailSite = details.site ?? details

  return {
    ...site,
    ...detailSite,
    contract: details.contract ?? detailSite.contract ?? getSiteContract(site),
    equipment: details.equipment ?? detailSite.equipment ?? getSiteEquipment(site),
  }
}

const valueOrDash = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  return value
}

const formatDate = (date) => {
  if (!date) return '-'
  return String(date).split('T')[0]
}

const InfoItem = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 11, color: '#6c757d', marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 13, fontWeight: 600 }}>{valueOrDash(value)}</div>
  </div>
)

const SectionBlock = ({ icon, title, sub, iconBg, iconColor, children, headerRight }) => (
  <div className="mb-3" style={{
    background: 'var(--bs-body-bg, #fff)',
    border: '0.5px solid rgba(0,0,0,0.1)',
    borderRadius: 12,
    padding: '1.1rem'
  }}>
    <div className="d-flex align-items-center gap-2 mb-3 pb-2"
      style={{ borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
      <div style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: iconBg,
        color: iconColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        flexShrink: 0
      }}>
        <i className={icon} aria-hidden="true" />
      </div>
      <div className="flex-grow-1">
        <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: '#6c757d', marginTop: 1 }}>{sub}</div>}
      </div>
      {headerRight}
    </div>
    {children}
  </div>
)

const StatusPill = ({ active, trueText, falseText }) => (
  active ? (
    <span className="status-badge active"><span className="dot"></span>{trueText}</span>
  ) : (
    <span className="status-badge upcoming"><span className="dot"></span>{falseText}</span>
  )
)

const AddButton = ({ name, onClick }) => (
  <button className='btn bg-primary-subtle text-primary-emphasis btn-sm' onClick={onClick}>
    <i className='fas fa-plus me-2'></i>
    {name}
  </button>
)


const EquipmentBadge = ({ type }) => {
  const device = DEVICES_TYPES[type] ?? DEVICES_TYPES.Server

  return (
    <span style={{
      background: device.bg,
      color: device.color,
      fontSize: 11,
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: 999,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5
    }}>
      <i className={device.icon} aria-hidden="true" /> {type}
    </span>
  )
}

// Equipment section
const ServerFields = ({ data, onChange, errors = {} }) => (
  <>
    <div className="row g-2 mb-2">
      <Field label="Equipment names" required col="col-md-4">
        <Inp placeholder="e.g. Main server" name="name" value={data.name || ''} onChange={e => onChange('name', e.target.value)} />
        <ErrorText message={errors.name} />
      </Field>
      <Field label="Serial no." required col="col-md-4">
        <Inp placeholder="Unique S/N" name="serial" value={data.serial || ''} onChange={e => onChange('serial', e.target.value)} />
        <ErrorText message={errors.serial} />
      </Field>
      <Field label="IP address" required col="col-md-4">
        <Inp placeholder="192.168.x.x" name="ip" value={data.ip || ''} onChange={e => onChange('ip', e.target.value)} />
        <ErrorText message={errors.ip} />
      </Field>
    </div>
    <div className="row g-2">
      <Field label="MAC address" col="col-md-4">
        <Inp placeholder="AA:BB:CC:DD:EE:FF" name="mac" value={data.mac || ''} onChange={e => onChange('mac', e.target.value)} />
        <ErrorText message={errors.mac} />
      </Field>
      <Field label="Location in site" col="col-md-4">
        <Inp placeholder="e.g. Server room A" value={data.location || ''} onChange={e => onChange('location', e.target.value)} />
      </Field>
       <Field label="Engine" col="col-md-4">
        <Inp placeholder="e.g. Intel Xeon" value={data.engine || ''} onChange={e => onChange('engine', e.target.value)} />
      </Field>
    </div>
  </>
)

const CameraFields = ({ data, onChange, errors = {} }) => {
  const showOtherMake = data.cam_make === 'Others'
  const showOtherModel = data.cam_model === 'Others'

  const handleCameraMakeChange = e => {
    const value = e.target.value
    onChange('cam_make', value)

    // Clear old "Others" text when user changes away from Others
    if (value !== 'Others') {
      onChange('cam_make_other', '')
    }
  }

  const handleCameraModelChange = e => {
    const value = e.target.value
    onChange('cam_model', value)

    // Clear old "Others" text when user changes away from Others
    if (value !== 'Others') {
      onChange('cam_model_other', '')
    }
  }

  return (
    <>
      <div className="row g-2 mb-2">
        <Field label="Equipment name" required col="col-md-4">
          <Inp
            placeholder="e.g. Main entrance cam"
            value={data.name || ''}
            onChange={e => onChange('name', e.target.value)}
          />
          <ErrorText message={errors.name} />
        </Field>

        <Field label="Serial no." required col="col-md-4">
          <Inp
            placeholder="Unique S/N"
            value={data.serial || ''}
            onChange={e => onChange('serial', e.target.value)}
          />
          <ErrorText message={errors.serial} />
        </Field>

        <Field label="IP address" required col="col-md-4">
          <Inp
            placeholder="192.168.x.x"
            value={data.ip || ''}
            onChange={e => onChange('ip', e.target.value)}
          />
          <ErrorText message={errors.ip} />
        </Field>

      </div>

      <div className="row g-2 mb-2">
        <Field label="MAC address" col="col-md-3">
          <Inp
            placeholder="AA:BB:CC:DD:EE:FF"
            value={data.mac || ''}
            onChange={e => onChange('mac', e.target.value)}
          />
          <ErrorText message={errors.mac} />
        </Field>

        <Field label="Location in site" col="col-md-3">
          <Inp
            placeholder="e.g. Gate 1"
            value={data.location || ''}
            onChange={e => onChange('location', e.target.value)}
          />
        </Field>

        <Field label="License expiry" required col="col-md-3">
          <Inp
            type="date"
            value={data.licenseExpiry || ''}
            onChange={e => onChange('licenseExpiry', e.target.value)}
          />
          <ErrorText message={errors.licenseExpiry} />
        </Field>
        <Field label="Engine" col="col-md-3">
          <Inp placeholder="e.g. Intel Xeon" value={data.engine || ''} onChange={e => onChange('engine', e.target.value)} />
        </Field>
      </div>

      <div className="row g-2 mb-2">
        <Field label="Camera make" col="col-md-4">
          <Sel value={data.cam_make || '0'} onChange={handleCameraMakeChange}>
            <option value="0">Select Camera Make</option>
            <option value="ARH">ARH</option>
            <option value="Pelco">Pelco</option>
            <option value="Axis">Axis</option>
            <option value="Others">Others</option>
          </Sel>
        </Field>

        <Field label="Camera model" col="col-md-4">
          <Sel value={data.cam_model || '0'} onChange={handleCameraModelChange}>
            <option value="0">Select Camera Model</option>
            <option value="Freeway">Freeway</option>
            <option value="Vidar Non-smart">Vidar Non-smart</option>
            <option value="Vidar Smart">Vidar Smart</option>
            <option value="Einar Non-smart">Einar Non-smart</option>
            <option value="Einar Smart">Einar Smart</option>
            <option value="Others">Others</option>
          </Sel>
        </Field>

        <Field label="Camera firmware" col="col-md-4">
          <Inp
            placeholder="e.g. 5.7.15"
            value={data.cam_firmware || ''}
            onChange={e => onChange('cam_firmware', e.target.value)}
          />
        </Field>
      </div>

      {(showOtherMake || showOtherModel) && (
        <div className="row g-2 mb-2">
          {showOtherMake ? (
            <Field label="Other camera make" required col="col-md-4">
              <Inp
                placeholder="Enter camera make"
                value={data.cam_make_other || ''}
                onChange={e => onChange('cam_make_other', e.target.value)}
              />
              <ErrorText message={errors.cam_make_other} />
            </Field>
          ) : (
            <div className="col-md-4" />
          )}

          {showOtherModel ? (
            <Field label="Other camera model" required col="col-md-4">
              <Inp
                placeholder="Enter camera model"
                value={data.cam_model_other || ''}
                onChange={e => onChange('cam_model_other', e.target.value)}
              />
              <ErrorText message={errors.cam_model_other} />
            </Field>
          ) : (
            <div className="col-md-4" />
          )}

          <div className="col-md-4" />
        </div>
      )}
    </>
  )
}

const UsbFields = ({ data, onChange, errors = {} }) => (
  <>
    <div className="row g-2 mb-2">
      <Field label="Equipment name" required col="col-md-4">
        <Inp placeholder="e.g. USB dongle" value={data.name || ''} onChange={e => onChange('name', e.target.value)} />
        <ErrorText message={errors.name} />
      </Field>
      <Field label="Serial no." required col="col-md-4">
        <Inp placeholder="Unique S/N" value={data.serial || ''} onChange={e => onChange('serial', e.target.value)} />
        <ErrorText message={errors.serial} />
      </Field>
      <Field label="Location in site" col="col-md-4">
        <Inp placeholder="e.g. Control room" value={data.location || ''} onChange={e => onChange('location', e.target.value)} />
      </Field>
    </div>
    <div className="row g-2">
      <Field label="MAC address" col="col-md-4">
        <Inp placeholder="AA:BB:CC:DD:EE:FF" value={data.mac || ''} onChange={e => onChange('mac', e.target.value)} />
        <ErrorText message={errors.mac} />
      </Field>
      <Field label="License expiry" required col="col-md-4">
        <Inp type="date" value={data.licenseExpiry || ''} onChange={e => onChange('licenseExpiry', e.target.value)} />
        <ErrorText message={errors.licenseExpiry} />
      </Field>
     
    </div>
  </>
)

const fieldComponents = { Server: ServerFields, Camera: CameraFields, USB: UsbFields }

export default function SiteDetailsPage() {
  const { siteId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [site, setSite] = useState(location.state?.site ?? null)
  const [loading, setLoading] = useState(true)

  const [equipmentModal, setEquipmentModal] = useState(false)
  const [activeType, setActiveType] = useState('Server')
  const [equipmentItems, setEquipmentItems] = useState([])
  const [errors, setErrors] = useState([])
  const createEquipment = () =>
    setEquipmentItems(prev => [...prev, { id: Date.now(), type: activeType, data: {} }])
  const removeEquipment = (id) =>
    setEquipmentItems(prev => prev.filter(e => e.id !== id))
   const updateEquipmentItem = (id, field, value) =>
    setEquipmentItems(prev => prev.map(e => e.id === id ? { ...e, data: { ...e.data, [field]: value } } : e))

  const showEquipmentModal = ()=> setEquipmentModal(true)
  const closeEquipmentModal = ()=> setEquipmentModal(false)


 const equipmentSchema = Yup.array().of(
  Yup.object().shape({
    type: Yup.string()
      .oneOf(['Server', 'Camera', 'USB'], 'Invalid equipment type')
      .required('Equipment type is required'),

    data: Yup.object().shape({
      name: Yup.string().required('Equipment name is required'),
      serial: Yup.string().required('Serial number is required'),
      
      ip: Yup.string()
        .transform(value => value === '' ? undefined : value)
        // .required('IP address is required')
        .matches(/^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/, 'Enter a valid IP address'),

      mac: Yup.string()
        .transform(value => value === '' ? undefined : value)
        .notRequired()
        .matches(/^(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/, 'Enter a valid MAC address'),

      location: Yup.string().nullable(),

      licenseExpiry: Yup.string()
        .nullable()
        // .required('Expiry is required')
        .test('valid-date', 'Enter a valid date', (value) => {
          if (!value) return true
          return !Number.isNaN(Date.parse(value))
        }),

      cameraMake: Yup.string().when('type', {
        is: 'Camera',
        then: (schema) => schema.required('Camera make is required'),
        otherwise: (schema) => schema.notRequired(),
      }),

      cameraModel: Yup.string().when('type', {
        is: 'Camera',
        then: (schema) => schema.required('Camera model is required'),
        otherwise: (schema) => schema.notRequired(),
      }),

      cameraFirmware: Yup.string().when('type', {
        is: 'Camera',
        then: (schema) => schema.required('Camera firmware is required'),
        otherwise: (schema) => schema.notRequired(),
      }),
    }),
  })
)

const buildEquipmentErrors = (yupError) => {
  const nextErrors = []
  const errorList = yupError.inner?.length ? yupError.inner : [yupError]

  errorList.forEach(({ path, message }) => {
    if (!path) return

    const normalizedPath = path
      .replace(/^equipmentItems/, '')
      .replace(/\[(\d+)\]/g, '.$1')
      .replace(/^\./, '')

    const parts = normalizedPath.split('.')
    const index = Number(parts[0])

    if (!Number.isInteger(index)) return

    const fieldPath = parts[1] === 'data'
      ? parts.slice(2).join('.')
      : parts.slice(1).join('.')

    if (!fieldPath) return

    nextErrors[index] = nextErrors[index] || { data: {} }
    nextErrors[index].data[fieldPath] = message
  })

  return nextErrors
}

const resetEquipmentForm = () => {
  setEquipmentItems([])
  setErrors([])
  setActiveType('Server')
}

const buildEquipmentPayload = (equipments) => {
  const equipmentList = [];

  const addIfExists = (obj, key, value) => {
    if (value !== undefined && value !== null && value !== "") {
      obj[key] = value;
    }
  };

  for (const equipment of equipments) {
    const data = equipment.data || {};
    const eq_item = {};

    addIfExists(eq_item, "id_site", siteId);
    addIfExists(eq_item, "equipment_name", data.name);
    addIfExists(eq_item, "equipment_sl_no", data.serial);

    eq_item.is_active = true;

    addIfExists(eq_item, "ip_address", data.ip);
    addIfExists(eq_item, "mac_address", data.mac);
    addIfExists(eq_item, "location_in_site", data.location);

    if (equipment.type === "Camera") {
      const camMake =
        data.cam_make === "Others" ? data.cam_make_other : data.cam_make;

      const camModel =
        data.cam_model === "Others" ? data.cam_model_other : data.cam_model;
      const eq_type =  "Camera";

      addIfExists(eq_item, "equipment_type", eq_type);
      addIfExists(eq_item, "camera_make", camMake);
      addIfExists(eq_item, "camera_model", camModel);
      addIfExists(eq_item, "cam_firmware", data.cam_firmware);
      addIfExists(eq_item, "licen_expiry", data.licenseExpiry);
      addIfExists(eq_item, "engine", data.engine);
    }

    if (equipment.type === "Server") {
      const eq_type = "Server";
      addIfExists(eq_item, "equipment_type", eq_type);
      addIfExists(eq_item, "engine", data.engine);
    }

    if (equipment.type === "USB") {
      const eq_type = "USB";
      addIfExists(eq_item, "equipment_type", eq_type);
    }

    equipmentList.push(eq_item);
  }

  return equipmentList;
};

const saveEquipments = async () => {
  try {
    await equipmentSchema.validate(equipmentItems, {
      abortEarly: false,
    })

    setErrors([])

    const payload = buildEquipmentPayload(equipmentItems)
    console.log('Equipment payload:', payload)

    await createEquipments(payload)

    toast.success('Equipment created successfully')

    // refresh site details so equipment table gets latest data
    await loadSiteDetails()

    resetEquipmentForm()
    setEquipmentModal(false)
  } catch (err) {
    if (err.name === 'ValidationError') {
      const validationErrors = buildEquipmentErrors(err)
      setErrors(validationErrors)
      console.log('Equipment validation errors:', validationErrors)
      return
    }

    toast.error(getEquipmentApiErrorMessage(err), {
      style: { whiteSpace: 'pre-line' },
    })

    console.error('Equipment save failed:', err)
  }
}

const getEquipmentApiErrorMessage = (error) => {
  const data = error?.response?.data;

  if (Array.isArray(data)) {
    const messages = data
      .map((item, index) => {
        if (!item || Object.keys(item).length === 0) {
          return null;
        }

        const fieldMessages = Object.entries(item)
          .map(([field, errors]) => {
            const errorText = Array.isArray(errors)
              ? errors.join(", ")
              : String(errors);

            return `${field}: ${errorText}`;
          })
          .join(", ");

        return `Equipment ${index + 1}: ${fieldMessages}`;
      })
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join("\n");
    }
  }

  return "Failed to save equipment";
};

async function createEquipments(equipmentArray) {
  const response = await axios.post(
    "http://127.0.0.1:8000/api/create-equipment/",
    equipmentArray,
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}

//----Delete Equipment
const [showDeleteEquipmentModal, setShowDeleteEquipmentModal] = useState(false)
const [equipmentToDelete, setEquipmentToDelete] = useState(null)

const openDeleteEquipmentModal = (equipment) => {
  setEquipmentToDelete(equipment)
  setShowDeleteEquipmentModal(true)
}

const closeDeleteEquipmentModal = () => {
  setEquipmentToDelete(null)
  setShowDeleteEquipmentModal(false)
}

const confirmDeleteEquipment = async () => {
  if (!equipmentToDelete) return

  const equipmentId = equipmentToDelete.id_equipment_det

  if (!equipmentId) {
    toast.error('Unable to find equipment id.')
    return
  }

  try {
    await axios.delete(
      `http://127.0.0.1:8000/api/delete-equipment/${equipmentId}/`
    )

    toast.success('Equipment deleted successfully')

    closeDeleteEquipmentModal()

    // refresh site details after delete
    loadSiteDetails()
  } catch (error) {
    const message =
      error.response?.data?.error ||
      'Failed to delete equipment'

    console.error('Error deleting equipment:', error)
    toast.error(message)
  }
}

// ──────────────────────────────────────Attachments start───────────────────────────────────────
const [attachmentModal, setAttachmentModal] = useState(false)
const [attachmentForm, setAttachmentForm] = useState({
  name: '',
  file: null,
})
const [attachmentErrors, setAttachmentErrors] = useState({})

const showAttachmentModal = () => setAttachmentModal(true)

const resetAttachmentForm = () => {
  setAttachmentForm({
    name: '',
    file: null,
  })
  setAttachmentErrors({})
}

const closeAttachmentModal = () => {
  resetAttachmentForm()
  setAttachmentModal(false)
}

const saveAttachment = () => {
  const errors = {}

  if (!attachmentForm.name.trim()) {
    errors.name = 'Attachment name is required'
  }

  if (!attachmentForm.file) {
    errors.file = 'Attachment file is required'
  }

  if (Object.keys(errors).length > 0) {
    setAttachmentErrors(errors)
    return
  }

  console.log('Attachment data:', attachmentForm)

  // call API here if needed

  resetAttachmentForm()
  setAttachmentModal(false)
}

// ──────────────────────────────────────Attachments End───────────────────────────────────────

  const loadSiteDetails = useCallback(async () => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/site-details/${siteId}/`)
      setSite(current => mergeSiteDetails(current ?? {}, response.data))
    } catch (error) {
      console.error('Error loading site details:', error)

      if (!location.state?.site) {
        toast.error('Failed to load site details.')
      }
    } finally {
      setLoading(false)
    }
  }, [location.state?.site, siteId])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSiteDetails()
    }, 0)

    return () => clearTimeout(timer)
  }, [loadSiteDetails])

  if (loading && !site) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div className="skeleton skeleton-title"></div>
        </div>
        <SkeletonTable rows={6} />
      </div>
    )
  }

  if (!site) {
    return (
      <div className="fade-in">
        <div className="page-header d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h4>Site not found</h4>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb">
                <li className="breadcrumb-item"><a href="#">Home</a></li>
                <li className="breadcrumb-item"><a href="/sites">Sites</a></li>
                <li className="breadcrumb-item active">Details</li>
              </ol>
            </nav>
          </div>
          <button className="btn-outline-custom" onClick={() => navigate('/sites')}>
            <i className="fa-solid fa-arrow-left me-2"></i>Back to Sites
          </button>
        </div>
      </div>
    )
  }

  const contract = getSiteContract(site)
  const equipment = getSiteEquipment(site)
  const locationText = site.latitude && site.longitude ? `${site.latitude}, ${site.longitude}` : '-'

  return (
    <div className="fade-in">
      <div className="page-header d-flex justify-content-between align-items-start flex-wrap gap-2">
        <div>
          <h4>{site.site_name || site.siteName || 'Site Details'}</h4>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item"><a href="#">Home</a></li>
              <li className="breadcrumb-item"><a href="/sites">Sites</a></li>
              <li className="breadcrumb-item active">Details</li>
            </ol>
          </nav>
        </div>
        <button className="btn-outline-custom" onClick={() => navigate('/sites')}>
          <i className="fa-solid fa-arrow-left me-2"></i>Back to Sites
        </button>
      </div>

      <Row>
        <Col lg={12}>
          <SectionBlock
            icon="fas fa-building"
            title="Site details"
            sub="Basic site and project information"
            iconBg="#E6F1FB"
            iconColor="#185FA5"
            headerRight={<StatusPill active={site.is_sira_connected} trueText="SIRA Connected" falseText="SIRA Not Connected" />}
          >
           <div className='d-flex'>
             <div className="row g-3">
              <InfoItem label="Site name" value={site.site_name || site.siteName} />
              <InfoItem label="Project name" value={site.project_name || site.projectName} />
              <InfoItem label="Project code" value={site.project_code || site.projectCode} />
              <InfoItem label="Region" value={site.region} />
              <InfoItem label="Location" value={locationText} />
              <InfoItem label="Address" value={site.address} />
              <InfoItem label="Created At" value={formatDate(site.created_at)} />            
            </div>
            <div className="row  g-3">
              <InfoItem label="Current software" value={site.current_software || site.currentSoftware} />
              <InfoItem label="Software version" value={site.software_version || site.softwareVersion} />
              <InfoItem label="Site engineer" value={site.allocated_site_engineer || site.siteEngineer} />
              <InfoItem label="Camera Count" value={site.server_count} />
              <InfoItem label="Server Count" value={site.camera_count} />
              <InfoItem label="" value="" />
            </div>
            <div className="row g-3">
              <InfoItem label="Contact person" value={site.site_contact_name || site.contactPerson} />
              <InfoItem label="Contact number" value={site.site_contact_number || site.contactNumber} />
              <InfoItem label="Contact email" value={site.site_contact_email || site.contactEmail} />
              <InfoItem label="" value="" />
              <InfoItem label="" value="" />
              <InfoItem label="" value="" />
            </div>
           </div>
          </SectionBlock>

          
        </Col>
      </Row>

      <SectionBlock
        icon="fas fa-file-contract"
        title="Contract details"
        sub="Maintenance contract linked to this site"
        iconBg="#FAEEDA"
        iconColor="#854F0B"
      >
        {contract ? (
          <>
          <div className="d-flex gap-5 g-3 mb-4">
            <InfoItem label="Contract ref no." value={contract.contract_ref_no} />
            <InfoItem label="Start date" value={formatDate(contract.contract_start_date)} />
            <InfoItem label="End date" value={formatDate(contract.contract_end_date)} />
            <InfoItem label="Amount" value={contract.contract_amt ? `${contract.contract_amt} ${contract.currency || ''}` : '-'} />
            <InfoItem label="No. of PPMs" value={contract.no_of_ppms} />
            <InfoItem label="PPM frequency" value={contract.ppm_frequency} />
            <InfoItem label="Next PPM schedule" value={formatDate(contract.next_ppm_schedule)} />
            <InfoItem label="Renewal reminder" value={contract.renewal_reminder_days ? `${contract.renewal_reminder_days} days` : '-'} />
            
          </div>
          <div className="col-12">
              <InfoItem label="Scope of work" value={contract.scope_of_work} />
          </div>
           <hr></hr>
           <p className="fw-bold" style={{ fontSize: 12 }}><i className="fa-solid fa-user me-2 text-primary"></i>Contractor Details</p>
           <div className="d-flex gap-5 g-3 mb-4">
            <InfoItem label="Contract ref no." value={contract.contract_ref_no} />
            <InfoItem label="Start date" value={formatDate(contract.contract_start_date)} />
            <InfoItem label="End date" value={formatDate(contract.contract_end_date)} />
            <InfoItem label="Amount" value={contract.contract_amt ? `${contract.contract_amt} ${contract.currency || ''}` : '-'} />
            <InfoItem label="No. of PPMs" value={contract.no_of_ppms} />
            <InfoItem label="PPM frequency" value={contract.ppm_frequency} />
            <InfoItem label="Next PPM schedule" value={formatDate(contract.next_ppm_schedule)} />
            <InfoItem label="Renewal reminder" value={contract.renewal_reminder_days ? `${contract.renewal_reminder_days} days` : '-'} />
            
          </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: '#6c757d' }}>No contract details available.</div>
        )}
      </SectionBlock>

      <Row>
        <Col lg={8}>
          <SectionBlock
            icon="fas fa-cogs"
            title="Equipment details"
            sub="Servers, cameras, and USB devices"
            iconBg="#E1F5EE"
            iconColor="#0F6E56"
            headerRight={<AddButton name="Equipment" onClick={showEquipmentModal} />}
          >
            {/* Modal to create/Edit an equipment */}
            <Modal show={equipmentModal} onHide={closeEquipmentModal} size="lg" aria-labelledby="contained-modal-title-vcenter" centered>
              <Modal.Header closeButton>
                <Modal.Title><i className="fa-solid fa-plus me-2 text-primary"></i>Add Equipment</Modal.Title>
              </Modal.Header>
              <Modal.Body>

                <SectionBlock
                  icon="fas fa-cogs"
                  title="Equipment details"
                  sub="Servers, cameras, and USB devices"
                  iconBg="#E1F5EE"
                  iconColor="#0F6E56">

                    {/* Type selector */}
                    <div className="d-flex gap-2 mb-3">
                      {DEVICE_TYPES.map(({ key, icon }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setActiveType(key)}
                          style={{
                            flex: 1, height: 30, fontSize: 12, cursor: 'pointer',
                            border: `0.5px solid ${activeType === key ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.12)'}`,
                            borderRadius: 8,
                            background: activeType === key ? 'rgba(0,0,0,0.05)' : 'transparent',
                            color: activeType === key ? 'inherit' : '#6c757d',
                            fontWeight: activeType === key ? 500 : 400,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                          }}
                        >
                          <i className={`${icon}`} aria-hidden="true" /> {key}
                        </button>
                      ))}
                    </div>

                    {/* Equipment cards */}
                    {equipmentItems.map((item, idx) => {
                      const dev = DEVICE_TYPES.find(d => d.key === item.type) || DEVICE_TYPES[0]
                      const FieldsComponent = fieldComponents[item.type] || ServerFields
                      const itemErrors = errors?.[idx]?.data || {}

                      return (
                        <div key={item.id} style={{
                          background: 'rgba(0,0,0,0.02)', border: '0.5px solid rgba(0,0,0,0.08)',
                          borderRadius: 10, padding: '10px 12px', marginBottom: 8
                        }}>
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <div className="d-flex align-items-center gap-2">
                              <span style={{
                                background: dev.badge.bg, color: dev.badge.color,
                                fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 999,
                                display: 'inline-flex', alignItems: 'center', gap: 4
                              }}>
                                <i className={`ti ${dev.icon}`} aria-hidden="true" /> {item.type}
                              </span>
                              <span style={{ fontSize: 11, color: '#6c757d' }}>#{idx + 1}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeEquipment(item.id)}
                              aria-label="Remove"
                              style={{
                                width: 24, height: 24, border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 6,
                                background: 'transparent', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', cursor: 'pointer', fontSize: 12, color: '#6c757d'
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#FCEBEB'; e.currentTarget.style.color = '#A32D2D' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6c757d' }}
                            >
                              <i className="fas fa-times" aria-hidden="true" />
                            </button>
                          </div>
                          {/* errors={itemErrors} add this as prop tooo */}
                          <FieldsComponent errors={itemErrors} data={item.data} onChange={(field, value) => updateEquipmentItem(item.id, field, value)} />
                        </div>
                      )
                    })}

                    {/* Add button */}
                    <button
                      type="button"
                      onClick={createEquipment}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 12px',
                        border: '0.5px dashed rgba(0,0,0,0.2)', borderRadius: 8, background: 'transparent',
                        color: '#6c757d', fontSize: 12, cursor: 'pointer'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderStyle = 'solid'; e.currentTarget.style.background = 'rgba(0,0,0,0.03)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderStyle = 'dashed'; e.currentTarget.style.background = 'transparent' }}
                    >
                      <i className="ti ti-plus" aria-hidden="true" /><i className='fas fa-plus me-1'></i>Add {activeType}
                    </button>
                </SectionBlock>

              </Modal.Body>
              <Modal.Footer>
                <button className="btn-outline-custom" onClick={() => setEquipmentModal(false)}>Cancel</button>
                <button className="btn-primary-custom" onClick={() => saveEquipments()}>
                  <i className="fa-solid fa-check me-2"></i>Save Equipment
                </button>
              </Modal.Footer>
            </Modal>

            {equipment.length > 0 ? (
              <Table className="mb-0" responsive style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Name</th>
                    <th>Serial no.</th>
                    <th>IP address</th>
                    <th>MAC address</th>
                    <th>Location</th>
                    <th>Camera</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment.map((item, index) => {
                    const type = item.equipment_type || item.type || 'Server'
                    const cameraText = type === 'Camera'
                      ? [item.camera_make, item.camera_model, item.cam_firmware].filter(Boolean).join(' / ')
                      : '-'

                    return (
                      <tr key={item.id_equipment || item.equipment_id || item.id || index}>
                        <td><EquipmentBadge type={type} /></td>
                        <td>{valueOrDash(item.equipment_name || item.name)}</td>
                        <td>{valueOrDash(item.equipment_sl_no || item.serial)}</td>
                        <td>{valueOrDash(item.ip_address || item.ip)}</td>
                        <td>{valueOrDash(item.mac_address || item.mac)}</td>
                        <td>{valueOrDash(item.location_in_site || item.location)}</td>
                        <td>{cameraText}</td>
                        <td>
                           <button
                              onClick={() => openDeleteEquipmentModal(item)}
                              type="button"
                              aria-label="Delete"
                              title="Delete"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 28,
                                height: 28,
                                border: "none",
                                borderRadius: 6,
                                cursor: "pointer",
                                background: "#FCEBEB",
                                color: "#A32D2D",
                                transition: "background 0.15s ease, color 0.15s ease",
                              }}
                            >
                              <i className="fa-solid fa-trash" style={{ fontSize: 14 }} />
                            </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            ) : (
              <div style={{ fontSize: 13, color: '#6c757d' }}>No equipment details available.</div>
            )}
            {showDeleteEquipmentModal && equipmentToDelete && (
  <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">
            <i className="fa-solid fa-triangle-exclamation me-2 text-danger"></i>
            Delete Equipment
          </h5>
          <button className="btn-close" onClick={closeDeleteEquipmentModal}></button>
        </div>

        <div className="modal-body text-center py-4">
          <div
            className="mb-3"
            style={{
              width: 64,
              height: 64,
              background: 'rgba(239,68,68,0.1)',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              fontSize: 28,
              color: '#ef4444',
            }}
          >
            <i className="fa-regular fa-trash-can"></i>
          </div>

          <h5 className="fw-bold">Are you sure?</h5>

          <p className="text-muted" style={{ fontSize: 14 }}>
            You are about to delete{' '}
            <strong>
              {equipmentToDelete.data?.name ||
                equipmentToDelete.equipment_name ||
                'this equipment'}
            </strong>
            . This action cannot be undone.
          </p>
        </div>

        <div className="modal-footer justify-content-center">
          <button className="btn-outline-custom" onClick={closeDeleteEquipmentModal}>
            Cancel
          </button>

          <button
            className="btn-primary-custom"
            style={{ background: '#ef4444' }}
            onClick={confirmDeleteEquipment}
          >
            <i className="fa-solid fa-trash me-2"></i>
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
)}
          </SectionBlock>
        </Col>

        <Col lg={4}>
            <SectionBlock
            icon="fas fa-file"
            title="Attachments"
            sub="Contracts, Media, etc."
            iconBg="#f4f5e1"
            iconColor="#6e6c0f"
            headerRight={<AddButton name="Attachment" onClick={showAttachmentModal}/>}
          >

            {/* Modal to create an attachment */}
            <Modal
              show={attachmentModal}
              onHide={closeAttachmentModal}
              size="md"
              aria-labelledby="attachment-modal-title"
              centered
            >
              <Modal.Header closeButton>
                <Modal.Title id="attachment-modal-title">
                  <i className="fa-solid fa-plus me-2 text-primary"></i>
                  Add Attachment
                </Modal.Title>
              </Modal.Header>

              <Modal.Body>
                <SectionBlock
                  icon="fas fa-file"
                  title="Attachment details"
                  sub="Upload a file and give it a name"
                  iconBg="#f4f5e1"
                  iconColor="#6e6c0f"
                >
                  <div className="row g-2">
                    <Field label="Attachment name" required col="col-12">
                      <Inp
                        placeholder="e.g. Contract document"
                        value={attachmentForm.name}
                        onChange={e => {
                          setAttachmentForm(prev => ({
                            ...prev,
                            name: e.target.value,
                          }))

                          setAttachmentErrors(prev => ({
                            ...prev,
                            name: '',
                          }))
                        }}
                      />
                      {attachmentErrors.name && (
                        <div className="text-danger small">{attachmentErrors.name}</div>
                      )}
                    </Field>

                    <Field label="Attachment" required col="col-12">
                      <Inp
                        type="file"
                        style={{ paddingTop: 4, paddingBottom: 4 }}
                        onChange={e => {
                          setAttachmentForm(prev => ({
                            ...prev,
                            file: e.target.files?.[0] || null,
                          }))

                          setAttachmentErrors(prev => ({
                            ...prev,
                            file: '',
                          }))
                        }}
                      />
                      {attachmentErrors.file && (
                        <div className="text-danger small">{attachmentErrors.file}</div>
                      )}
                    </Field>
                  </div>
                </SectionBlock>
              </Modal.Body>

              <Modal.Footer>
                <button className="btn-outline-custom" onClick={closeAttachmentModal}>
                  Cancel
                </button>

                <button className="btn-primary-custom" onClick={saveAttachment}>
                  <i className="fa-solid fa-check me-2"></i>
                  Save Attachment
                </button>
              </Modal.Footer>
            </Modal>

            <div style={{ fontSize: 13, color: '#6c757d' }}>No attachments available.</div>
          </SectionBlock>
        </Col>
      </Row>
    </div>
  )
}
