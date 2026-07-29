import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import AuditTimeline from '../components/AuditTimeline'
import { SkeletonTable } from '../components/Loader'
import { Row, Col, Card, Table } from 'react-bootstrap'
import axios from 'axios'
import * as Yup from 'yup'

// ─── Constants ────────────────────────────────────────────────────────────────

const DEVICE_TYPES = [
  { key: 'Server', icon: 'fas fa-server', badge: { bg: '#E6F1FB', color: '#185FA5' } },
  { key: 'Camera', icon: 'fas fa-camera', badge: { bg: '#E1F5EE', color: '#0F6E56' } },
  { key: 'USB',    icon: 'fab fa-usb',    badge: { bg: '#FAEEDA', color: '#854F0B' } },
] 

const emptyProject = {
  // Site Details
  siteName: "",
  projectName: "",
  projectCode: "",
  region: "",

  location: {
    lat: "",
    lng: "",
  },

  currentSoftware: "",
  softwareVersion: "",
  siteEngineer: "",
  contactPerson: "",
  contactNumber: "",
  contactEmail: "",

  // SIRA
  isSiraConnected: true,

  // Contract Details
  contractRef: "",
  contractStart: "",
  contractEnd: "",
  contractAmt: "",
  currency: "AED",
  noOfPpms: "",
  ppmFrequency: "",
  contractor: "",
  contractStatus: "",
  nextPpm: "",
  renewalDays: "",
  contractDocument: null,
  scopeOfWork: "",

  // Audit
  isActive: true,
  createdBy: "Admin User",
  createdDate: new Date().toISOString(),
  updatedBy: "Admin User",
  updatedDate: new Date().toISOString(),
};

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

const pathToParts = (path) =>
  path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean)

const getNestedValue = (source, path) =>
  pathToParts(path).reduce((current, part) => current?.[part], source)

const setNestedValue = (target, path, value) => {
  const parts = pathToParts(path)
  let current = target

  parts.forEach((part, index) => {
    const isLast = index === parts.length - 1
    const nextPart = parts[index + 1]

    if (isLast) {
      current[part] = value
      return
    }

    if (!current[part]) {
      current[part] = /^\d+$/.test(nextPart) ? [] : {}
    }

    current = current[part]
  })
}

const buildValidationErrors = (err) => {
  const validationErrors = {}
  const errors = err.inner?.length ? err.inner : [err]

  errors.forEach(error => {
    if (!error.path || getNestedValue(validationErrors, error.path)) return
    setNestedValue(validationErrors, error.path, error.message)
  })

  return validationErrors
}

//Site Form Validation
const SiteFormSchema = Yup.object({
  siteName: Yup.string().required("Site name is required"),

  contactEmail: Yup.string()
    .email("Invalid email format"),

  contactNumber: Yup.string()
  .matches(/^\d{10}$/, "Contact number must be exactly 10 digits")
  .required("Contact number is required"),

  contactPerson: Yup.string()
    .required("Contact person is required"),

  location: Yup.object({
    lat: Yup.number()
      .transform((value, originalValue) =>
        originalValue === "" ? undefined : value
      )
      .typeError("Latitude must be a number")
      .min(-90, "Latitude must be between -90 and 90")
      .max(90, "Latitude must be between -90 and 90")
      .required("Latitude is required"),

    lng: Yup.number()
      .transform((value, originalValue) =>
        originalValue === "" ? undefined : value
      )
      .typeError("Longitude must be a number")
      .min(-180, "Longitude must be between -180 and 180")
      .max(180, "Longitude must be between -180 and 180")
      .required("Longitude is required"),
  }),
});

// Contract Form Validation
const ContractSchema = Yup.object({
  contractRef: Yup.string()
    .required("Contract reference number is required"),

  contractStart: Yup.date()
    .typeError("Contract start date must be a valid date")
    .required("Contract start date is required"),

  contractEnd: Yup.date()
    .typeError("Contract end date must be a valid date")
    .required("Contract end date is required")
    .test(
      "end-after-start",
      "Contract end date must be after start date",
      function (value) {
        const { contractStart } = this.parent;

        if (!value || !contractStart) return true;

        return new Date(value) > new Date(contractStart);
      }
    ),

  nextPpm: Yup.date()
    .typeError("Next PPM date must be a valid date")
    .required("Next PPM date is required")
    .test(
      "ppm-after-start",
      "Next PPM date must be on or after contract start date",
      function (value) {
        const { contractStart } = this.parent;

        if (!value || !contractStart) return true;

        return new Date(value) >= new Date(contractStart);
      }
    )
    .test(
      "ppm-before-end",
      "Next PPM date must be on or before contract end date",
      function (value) {
        const { contractEnd } = this.parent;

        if (!value || !contractEnd) return true;

        return new Date(value) <= new Date(contractEnd);
      }
    ),

  currency: Yup.string()
    .required("Currency is required"),

  noOfPpms: Yup.number()
    .typeError("Number of PPMs must be a number")
    .required("Number of PPMs is required")
    .min(1, "At least 1 PPM is required"),

  renewalDays: Yup.number()
    .typeError("Renewal reminder must be a number")
    .required("Renewal reminder is required")
    .min(0, "Renewal reminder cannot be negative"),
});

const ipRegex =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

const macRegex =
  /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

const EquipmentSchema = Yup.array().of(
  Yup.object({
    type: Yup.string().required("Equipment type is required"),

    data: Yup.object({
      name: Yup.string().required("Equipment name is required"),
      serial: Yup.string().required("Serial number is required"),

      ip: Yup.string()
        .notRequired()
        .matches(ipRegex, {
          message: "Enter a valid IP address",
          excludeEmptyString: true,
        }),

      mac: Yup.string()
        .notRequired()
        .matches(macRegex, {
          message: "Enter a valid MAC address",
          excludeEmptyString: true,
        }),

      cam_make_other: Yup.string().when("cam_make", {
        is: "Others",
        then: schema => schema.required("Camera make is required"),
        otherwise: schema => schema.notRequired(),
      }),

      cam_model_other: Yup.string().when("cam_model", {
        is: "Others",
        then: schema => schema.required("Camera model is required"),
        otherwise: schema => schema.notRequired(),
      }),
    }),
  })
)

const getFormSchema = (contractEnabled) => {
  let schema = SiteFormSchema.shape({
    equipmentItems: EquipmentSchema,
  })

  if (contractEnabled) {
    schema = schema.concat(ContractSchema)
  }

  return schema
}

const buildEquipmentPayload = (equipmentItems) =>
  equipmentItems.map(item => {
    const data = item.data || {}
    const payload = {
      equipment_type: item.type,
      equipment_name: data.name,
      equipment_sl_no: data.serial,
      ip_address: data.ip || null,
      mac_address: data.mac || null,
      engine: data.engine || '',
      location_in_site: data.location || '',
      is_active: true,
    }

    if (data.licenseExpiry) {
      payload.licen_expiry = data.licenseExpiry
    }

    if (item.type === 'Camera') {
      payload.camera_make = data.cam_make === 'Others' ? data.cam_make_other : data.cam_make
      payload.camera_model = data.cam_model === 'Others' ? data.cam_model_other : data.cam_model
      payload.cam_firmware = data.cam_firmware || data.firmware || ''
    }

    return payload
  })

const buildSitePayload = (formData, equipmentItems, contractEnabled) => {
  const sitePayload = {
    site: {
      site_name: formData.siteName,
      project_name: formData.projectName,
      project_code: formData.projectCode,
      region: formData.region,
      latitude: formData.location?.lat || null,
      longitude: formData.location?.lng || null,
      current_software: formData.currentSoftware,
      software_version: formData.softwareVersion,
      site_contact_name: formData.contactPerson,
      site_contact_number: formData.contactNumber,
      site_contact_email: formData.contactEmail,
      is_sira_connected: formData.isSiraConnected,
      allocated_site_engineer: formData.siteEngineer,
      server_count: equipmentItems.filter(item => item.type === 'Server').length,
      camera_count: equipmentItems.filter(item => item.type === 'Camera').length,
      is_active: true,
    },
    contract: contractEnabled ? {
      contract_ref_no: formData.contractRef,
      contract_start_date: formData.contractStart,
      contract_end_date: formData.contractEnd,
      contract_amt: formData.contractAmt,
      currency: formData.currency,
      no_of_ppms: formData.noOfPpms,
      ppm_frequency: formData.ppmFrequency,
      next_ppm_schedule: formData.nextPpm,
      renewal_reminder_days: formData.renewalDays,
      scope_of_work: formData.scopeOfWork,
      is_active: true,
    } : null,
  }

  if (equipmentItems.length > 0) {
    sitePayload.equipment = buildEquipmentPayload(equipmentItems)
  }else{
    sitePayload.equipment = []
  }

  return sitePayload
}

const cameraMakeOptions = ['ARH', 'Pelco', 'Axis']
const cameraModelOptions = ['Freeway', 'Vidar', 'Smart']

const getSiteId = (site = {}) =>
  site.id_site ?? site.site_id ?? site.id ?? site.pk

const getSiteContract = (site = {}) =>
  site.contract ?? site.contract_details ?? site.contractDetail ?? {}

const getSiteEquipment = (site = {}) =>
  site.equipment ?? site.equipments ?? site.equipment_details ?? site.equipmentDetails ?? []

const mergeSiteDetails = (site = {}, details = {}) => {
  const detailSite = details.site ?? details
  const detailContract = details.contract ?? detailSite.contract ?? getSiteContract(site)
  const detailEquipment = details.equipment ?? detailSite.equipment ?? getSiteEquipment(site)

  return {
    ...site,
    ...detailSite,
    contract: detailContract,
    equipment: detailEquipment,
  }
}

const normalizeCameraOption = (value, options) => {
  if (!value) return { value: '0', other: '' }
  if (options.includes(value)) return { value, other: '' }
  return { value: 'Others', other: value }
}

const normalizeEquipmentToItems = (equipment = []) =>
  equipment.map((item, index) => {
    const type = item.type ?? item.equipment_type ?? 'Server'
    const cameraMake = normalizeCameraOption(item.cam_make ?? item.camera_make, cameraMakeOptions)
    const cameraModel = normalizeCameraOption(item.cam_model ?? item.camera_model, cameraModelOptions)

    return {
      id: item.id ?? item.id_equipment ?? item.equipment_id ?? `${type}-${index}-${Date.now()}`,
      type,
      data: {
        name: item.name ?? item.equipment_name ?? '',
        serial: item.serial ?? item.equipment_sl_no ?? '',
        ip: item.ip ?? item.ip_address ?? '',
        mac: item.mac ?? item.mac_address ?? '',
        engine: item.engine ?? '',
        location: item.location ?? item.location_in_site ?? '',
        licenseExpiry: item.licenseExpiry ?? item.licen_expiry ?? '',
        firmware: item.firmware ?? '',
        cam_make: cameraMake.value,
        cam_make_other: cameraMake.other,
        cam_model: cameraModel.value,
        cam_model_other: cameraModel.other,
        cam_firmware: item.cam_firmware ?? '',
      },
    }
  })

const normalizeSiteToForm = (site = {}) => {
  const contract = getSiteContract(site)

  return {
    ...emptyProject,
    siteName: site.siteName ?? site.site_name ?? '',
    projectName: site.projectName ?? site.project_name ?? '',
    projectCode: site.projectCode ?? site.project_code ?? '',
    region: site.region ?? '',
    location: {
      lat: site.location?.lat ?? site.latitude ?? '',
      lng: site.location?.lng ?? site.longitude ?? '',
    },
    currentSoftware: site.currentSoftware ?? site.current_software ?? '',
    softwareVersion: site.softwareVersion ?? site.software_version ?? '',
    siteEngineer: site.siteEngineer ?? site.allocated_site_engineer ?? '',
    contactPerson: site.contactPerson ?? site.site_contact_name ?? '',
    contactNumber: site.contactNumber ?? site.site_contact_number ?? '',
    contactEmail: site.contactEmail ?? site.site_contact_email ?? '',
    isSiraConnected: site.isSiraConnected ?? site.is_sira_connected ?? true,
    contractRef: site.contractRef ?? contract.contract_ref_no ?? site.contract_ref_no ?? '',
    contractStart: site.contractStart ?? contract.contract_start_date ?? site.contract_start_date ?? '',
    contractEnd: site.contractEnd ?? contract.contract_end_date ?? site.contract_end_date ?? '',
    contractAmt: site.contractAmt ?? contract.contract_amt ?? site.contract_amt ?? '',
    currency: site.currency ?? contract.currency ?? 'AED',
    noOfPpms: site.noOfPpms ?? contract.no_of_ppms ?? site.no_of_ppms ?? '',
    ppmFrequency: site.ppmFrequency ?? contract.ppm_frequency ?? site.ppm_frequency ?? '',
    contractor: site.contractor ?? contract.contractor ?? '',
    contractStatus: site.contractStatus ?? contract.contract_status ?? '',
    nextPpm: site.nextPpm ?? contract.next_ppm_schedule ?? site.next_ppm_schedule ?? '',
    renewalDays: site.renewalDays ?? contract.renewal_reminder_days ?? site.renewal_reminder_days ?? '',
    scopeOfWork: site.scopeOfWork ?? contract.scope_of_work ?? site.scope_of_work ?? '',
  }
}


const SectionBlock = ({ icon, title, sub, iconBg, iconColor, children, headerRight }) => (
  <div className="mb-3" style={{
    background: 'var(--bs-body-bg, #fff)', border: '0.5px solid rgba(0,0,0,0.1)',
    borderRadius: 12, padding: '1.1rem'
  }}>
    <div className="d-flex align-items-center gap-2 mb-3 pb-2"
      style={{ borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, background: iconBg, color: iconColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0
      }}>
        <i className={`ti ${icon}`} aria-hidden="true" />
      </div>
      <div className="flex-grow-1">
        <div style={{ fontSize: 13, fontWeight: 500 }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: '#6c757d', marginTop: 1 }}>{sub}</div>}
      </div>
      {headerRight}
    </div>
    {children}
  </div>
)

// ─── Equipment fields per device type ────────────────────────────────────────

const ServerFields = ({ data, onChange, errors = {} }) => (
  <>
    <div className="row g-2 mb-2">
      <Field label="Equipment name" required col="col-md-4">
        <Inp placeholder="e.g. Main server" name="name" value={data.name || ''} onChange={e => onChange('name', e.target.value)} />
        <ErrorText message={errors.name} />
      </Field>
      <Field label="Serial no." required col="col-md-4">
        <Inp placeholder="Unique S/N" name="serial" value={data.serial || ''} onChange={e => onChange('serial', e.target.value)} />
        <ErrorText message={errors.serial} />
      </Field>
      <Field label="IP address" col="col-md-4">
        <Inp placeholder="192.168.x.x" name="ip" value={data.ip || ''} onChange={e => onChange('ip', e.target.value)} />
        <ErrorText message={errors.ip} />
      </Field>
    </div>
    <div className="row g-2">
      <Field label="MAC address" col="col-md-4">
        <Inp placeholder="AA:BB:CC:DD:EE:FF" name="mac" value={data.mac || ''} onChange={e => onChange('mac', e.target.value)} />
        <ErrorText message={errors.mac} />
      </Field>
      <Field label="Engine" col="col-md-4">
        <Inp placeholder="e.g. Intel Xeon" value={data.engine || ''} onChange={e => onChange('engine', e.target.value)} />
      </Field>
      <Field label="Location in site" col="col-md-4">
        <Inp placeholder="e.g. Server room A" value={data.location || ''} onChange={e => onChange('location', e.target.value)} />
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
        <Field label="Equipment name" required col="col-md-6">
          <Inp
            placeholder="e.g. Main entrance cam"
            value={data.name || ''}
            onChange={e => onChange('name', e.target.value)}
          />
          <ErrorText message={errors.name} />
        </Field>

        <Field label="Serial no." required col="col-md-6">
          <Inp
            placeholder="Unique S/N"
            value={data.serial || ''}
            onChange={e => onChange('serial', e.target.value)}
          />
          <ErrorText message={errors.serial} />
        </Field>

      </div>

      <div className="row g-2 mb-2">
        <Field label="Firmware" col="col-md-3">
          <Inp
            placeholder="e.g. 5.7.15"
            value={data.firmware || ''}
            onChange={e => onChange('firmware', e.target.value)}
          />
        </Field>

        <Field label="IP address" col="col-md-3">
          <Inp
            placeholder="192.168.x.x"
            value={data.ip || ''}
            onChange={e => onChange('ip', e.target.value)}
          />
          <ErrorText message={errors.ip} />
        </Field>

        <Field label="License expiry" col="col-md-3">
          <Inp
            type="date"
            value={data.licenseExpiry || ''}
            onChange={e => onChange('licenseExpiry', e.target.value)}
          />
        </Field>
      </div>

      <div className="row g-2 mb-2">
        <Field label="MAC address" col="col-md-6">
          <Inp
            placeholder="AA:BB:CC:DD:EE:FF"
            value={data.mac || ''}
            onChange={e => onChange('mac', e.target.value)}
          />
          <ErrorText message={errors.mac} />
        </Field>

        <Field label="Location in site" col="col-md-6">
          <Inp
            placeholder="e.g. Gate 1"
            value={data.location || ''}
            onChange={e => onChange('location', e.target.value)}
          />
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
            <option value="Vidar">Vidar</option>
            <option value="Smart">Smart</option>
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
      <Field label="MAC address" col="col-md-6">
        <Inp placeholder="AA:BB:CC:DD:EE:FF" value={data.mac || ''} onChange={e => onChange('mac', e.target.value)} />
        <ErrorText message={errors.mac} />
      </Field>
      <Field label="License expiry" col="col-md-6">
        <Inp type="date" value={data.licenseExpiry || ''} onChange={e => onChange('licenseExpiry', e.target.value)} />
      </Field>
    </div>
  </>
)

const fieldComponents = { Server: ServerFields, Camera: CameraFields, USB: UsbFields }

// ─── Equipment section ────────────────────────────────────────────────────────

const EquipmentSection = ({ items, setItems, errors = [] }) => {
  const [activeType, setActiveType] = useState('Server')

  const add = () =>
    setItems(prev => [...prev, { id: Date.now(), type: activeType, data: {} }])

  const remove = (id) =>
    setItems(prev => prev.filter(e => e.id !== id))

  const updateItem = (id, field, value) =>
    setItems(prev => prev.map(e => e.id === id ? { ...e, data: { ...e.data, [field]: value } } : e))

  return (
    <SectionBlock
      icon="fas fa-cogs"
      title="Equipment details"
      sub="Servers, cameras, and USB devices"
      iconBg="#E1F5EE"
      iconColor="#0F6E56"
      headerRight={
        <span style={{ fontSize: 11, color: '#6c757d' }}>
          {items.length === 0 ? 'No items' : `${items.length} item${items.length > 1 ? 's' : ''}`}
        </span>
      }
    >
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
      {items.map((item, idx) => {
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
                onClick={() => remove(item.id)}
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
            <FieldsComponent errors={itemErrors} data={item.data} onChange={(field, value) => updateItem(item.id, field, value)} />
          </div>
        )
      })}

      {/* Add button */}
      <button
        type="button"
        onClick={add}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 12px',
          border: '0.5px dashed rgba(0,0,0,0.2)', borderRadius: 8, background: 'transparent',
          color: '#6c757d', fontSize: 12, cursor: 'pointer'
        }}
        onMouseEnter={e => { e.currentTarget.style.borderStyle = 'solid'; e.currentTarget.style.background = 'rgba(0,0,0,0.03)' }}
        onMouseLeave={e => { e.currentTarget.style.borderStyle = 'dashed'; e.currentTarget.style.background = 'transparent' }}
      >
        <i className="ti ti-plus" aria-hidden="true" /> Add {activeType.toLowerCase()}
      </button>
    </SectionBlock>
  )
}

// ─── Main site form ───────────────────────────────────────────────────────────

const SiteForm = ({ formData, updateForm, errors = {}, equipmentItems, setEquipmentItems, contractEnabled, setContractEnabled, engineers = [] }) => (
  <div>
    {/* Site details */}
    <SectionBlock icon="fas fa-building" title="Site details" sub="Basic information about the site" iconBg="#E6F1FB" iconColor="#185FA5">
      <div className="row g-2">
        <Field label="Site name" required col="col-md-6">
          <Inp
            placeholder="Enter site name"
            value={formData.siteName || ""}
            onChange={e => updateForm("siteName", e.target.value)}
          />
          <ErrorText message={errors.siteName} />
        </Field>
        <Field label="Project name" col="col-md-6">
          <Inp placeholder="Enter project name" name="projectName" value={formData.projectName || ''} onChange={e => updateForm('projectName', e.target.value)} />
        </Field>
        <Field label="Project code" col="col-md-3">
          <Inp placeholder="e.g. PRJ-001" value={formData.projectCode || ''} onChange={e => updateForm('projectCode', e.target.value)} />
        </Field>
        <Field label="Region" col="col-md-3">
          <Inp placeholder="Enter region" value={formData.region || ''} onChange={e => updateForm('region', e.target.value)} />
        </Field>
        <Field label="Latitude" required col="col-md-3">
          <Inp type="number" step="0.0000001" placeholder="e.g. 25.2048" value={formData.location?.lat || ''} onChange={e => updateForm('location.lat', e.target.value)} />
          <ErrorText message={errors.location?.lat} />
        </Field>
        <Field label="Longitude" required col="col-md-3">
          <Inp type="number" step="0.0000001" placeholder="e.g. 55.2708" value={formData.location?.lng || ''} onChange={e => updateForm('location.lng', e.target.value)} />
          <ErrorText message={errors.location?.lng} />
        </Field>
        <Field label="Current software" col="col-md-4">
          <Inp placeholder="e.g. VMS Pro" value={formData.currentSoftware || ''} onChange={e => updateForm('currentSoftware', e.target.value)} />
        </Field>
        <Field label="Software version" col="col-md-4">
          <Inp placeholder="e.g. 4.2.1" value={formData.softwareVersion || ''} onChange={e => updateForm('softwareVersion', e.target.value)} />
        </Field>
        <Field label="Site engineer" col="col-md-4">
          <Sel value={formData.siteEngineer || ''} onChange={e => updateForm('siteEngineer', e.target.value)}>
            <option value="">Select engineer</option>
              {engineers.map(engineer => (
                <option key={engineer.id_user} value={engineer.id_user}>
                  {engineer.full_name}
                </option>
              ))}
          </Sel>
        </Field>
        <Field label="Contact person" required col="col-md-4">
          <Inp placeholder="Full name" value={formData.contactPerson || ''} onChange={e => updateForm('contactPerson', e.target.value)} />
          <ErrorText message={errors.contactPerson} />
        </Field>
        <Field type="number" label="Contact number" required col="col-md-4">
          <Inp placeholder="0 50 000 0000" value={formData.contactNumber || ''} onChange={e => updateForm('contactNumber', e.target.value)} />
          <ErrorText message={errors.contactNumber} />
        </Field>
        <Field label="Contact email" col="col-md-4">
          <Inp type="email" placeholder="person@example.com" value={formData.contactEmail || ''} onChange={e => updateForm('contactEmail', e.target.value)} />
          <ErrorText message={errors.contactEmail} />
        </Field>
        <Field label="SIRA Connection" col="col-md-4">
            <div className="form-check form-switch mt-2">
              <input
                className="form-check-input"
                type="checkbox"
                id="isSiraConnected"
                checked={formData.isSiraConnected}
                onChange={e => updateForm("isSiraConnected", e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              <label
                className="form-check-label ms-2"
                htmlFor="isSiraConnected"
                style={{ fontSize: 13 }}
              >
                Is SIRA Connected
              </label>
            </div>
          </Field>
      </div>
    </SectionBlock>

    {/* Equipment */}
    {/* <EquipmentSection
      items={equipmentItems}
      setItems={setEquipmentItems}
      errors={errors.equipmentItems || []}
    /> */}

    {/* Contract */}
    <SectionBlock
      icon="fas fa-file-contract"
      title="Contract details"
      sub="Attach a maintenance contract to this site"
      iconBg="#FAEEDA"
      iconColor="#854F0B"
      headerRight={
        <div className="form-check form-switch mb-0">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={contractEnabled}
            onChange={e => setContractEnabled(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
        </div>
      }
    >
      {contractEnabled ? (
        <div className="row g-2">
          <Field label="Contract ref no." required col="col-md-4">
            <Inp placeholder="e.g. CONT-2024-001" name="contractRef" value={formData.contractRef || ''} onChange={e => updateForm('contractRef', e.target.value)} />
            <ErrorText message={errors.contractRef} />
          </Field>
          <Field label="Start date" required col="col-md-4">
            <Inp type="date" name="contractStart" value={formData.contractStart || ''} onChange={e => updateForm('contractStart', e.target.value)} />
            <ErrorText message={errors.contractStart} />
          </Field>
          <Field label="End date" required col="col-md-4">
            <Inp type="date" name="contractEnd" value={formData.contractEnd || ''} onChange={e => updateForm('contractEnd', e.target.value)} />
            <ErrorText message={errors.contractEnd} />
          </Field>
          <Field label="Contract amount" col="col-md-3">
            <Inp type="number" placeholder="0.00" name="contractAmt" value={formData.contractAmt || ''} onChange={e => updateForm('contractAmt', e.target.value)} />
          </Field>
          <Field label="Currency" col="col-md-3">
            <Sel name="currency" value={formData.currency || 'AED'} onChange={e => updateForm('currency', e.target.value)}>
              <option value="AED">AED</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
            </Sel>
          </Field>
          <Field label="No. of PPMs" required col="col-md-3">
            <Inp type="number" placeholder="e.g. 4" name="noOfPpms" value={formData.noOfPpms || ''} onChange={e => updateForm('noOfPpms', e.target.value)} />
            <ErrorText message={errors.noOfPpms} />
          </Field>
          <Field label="PPM frequency" col="col-md-3">
            <Sel value={formData.ppmFrequency || ''} onChange={e => updateForm('ppmFrequency', e.target.value)}>
              <option value="">Select</option>
              <option>Monthly</option><option>Quarterly</option><option>Bi-annual</option><option>Annual</option>
            </Sel>
          </Field>
          <Field label="Contractor" col="col-md-4">
            <Sel value={formData.contractor || ''} onChange={e => updateForm('contractor', e.target.value)}>
              <option value="">Select contractor</option>
              <option>TechServ LLC</option><option>Axiom Systems</option><option>Gulf Integrated</option>
            </Sel>
          </Field>
          <Field label="Contract status" col="col-md-4">
            <Sel value={formData.contractStatus || ''} onChange={e => updateForm('contractStatus', e.target.value)}>
              <option value="">Select status</option>
              <option>Active</option><option>Pending</option><option>Expired</option>
            </Sel>
          </Field>
          <Field label="Next PPM schedule" required col="col-md-4">
            <Inp type="date" name="nextPpm" value={formData.nextPpm || ''} onChange={e => updateForm('nextPpm', e.target.value)} />
            <ErrorText message={errors.nextPpm} />
          </Field>
          <Field label="Renewal reminder (days)" required col="col-md-4">
            <Inp type="number" placeholder="e.g. 30" name="renewalDays" value={formData.renewalDays || ''} onChange={e => updateForm('renewalDays', e.target.value)} />
            <ErrorText message={errors.renewalDays} />
          </Field>
          <Field label="Contract document" col="col-md-8">
            <Inp type="file" style={{ paddingTop: 4, paddingBottom: 4 }} />
          </Field>
          <Field label="Scope of work" col="col-12">
            <textarea
              className="form-control form-control-sm"
              rows={3}
              placeholder="Describe the scope of maintenance work…"
              name="scopeOfWork"
              value={formData.scopeOfWork || ''}
              onChange={e => updateForm('scopeOfWork', e.target.value)}
            />
          </Field>
        </div>
      ) : (
        <p style={{ fontSize: 12, color: '#6c757d', margin: 0 }}>
          Toggle the switch above to attach a contract to this site.
        </p>
      )}
    </SectionBlock>
  </div>
)

// ─── Action button ────────────────────────────────────────────────────────────

const ActionButton = ({ icon, label, onClick, danger }) => {
  const [hovered, setHovered] = useState(false)
  const iconMap = { eye: 'fa-eye', pencil: 'fa-pencil', trash: 'fa-trash' }
  return (
    <button
      onClick={onClick}
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer',
        transition: 'background 0.15s, color 0.15s',
        background: hovered ? (danger ? '#FCEBEB' : 'var(--color-background-secondary)') : 'transparent',
        color: hovered ? (danger ? '#A32D2D' : 'var(--color-text-primary)') : 'grey',
      }}
    >
      <i className={`fa-solid ${iconMap[icon] || 'fa-circle'}`} style={{ fontSize: 14 }} />
    </button>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

const PaginationButton = ({ onClick, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="btn btn-sm btn-outline-custom"
    style={{ padding: '5px 7px', opacity: disabled ? 0.4 : 1 }}
  >
    {children}
  </button>
)

const Pagination = ({ currentPage, totalPages, totalItems, pageSize, onPageChange }) => {
  const inputRef = useRef(null)

  const go = () => {
    const p = parseInt(inputRef.current?.value, 10)
    if (!isNaN(p)) onPageChange(Math.max(1, Math.min(totalPages, p)))
  }

  const from = (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, totalItems)

  return (
    <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.08)' }}>
      <div style={{ padding: '6px 14px', background: 'none', borderBottom: '0.5px solid rgba(0,0,0,0.06)', fontSize: 12, color: '#6c757d' }}>
        Showing <strong style={{ color: 'inherit' }}>{totalItems === 0 ? 0 : from}-{to}</strong> of <strong style={{ color: 'inherit' }}>{totalItems}</strong> results
      </div>
      <div className="d-flex align-items-center gap-2 p-3">
        <PaginationButton onClick={() => onPageChange(1)} disabled={currentPage === 1}><i className="fa-solid fa-angles-left" /></PaginationButton>
        <PaginationButton onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}><i className="fa-solid fa-angle-left" /></PaginationButton>
        <input
          key={currentPage}
          ref={inputRef}
          type="number"
          defaultValue={currentPage}
          min={1}
          max={totalPages}
          onKeyDown={e => e.key === 'Enter' && go()}
          className="form-control form-control-sm text-center"
          style={{ width: 52 }}
        />
        <span style={{ fontSize: 12, color: '#6c757d', whiteSpace: 'nowrap' }}>of {totalPages}</span>
        <button onClick={go} className="btn-outline-custom" style={{ padding: '5px 10px', fontSize: 12 }}>Go</button>
        <PaginationButton onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}><i className="fa-solid fa-angle-right" /></PaginationButton>
        <PaginationButton onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}><i className="fa-solid fa-angles-right" /></PaginationButton>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({ ...emptyProject })
  const [equipmentItems, setEquipmentItems] = useState([])
  const [contractEnabled, setContractEnabled] = useState(false)
  const [sites, setSites] = useState([])
  const [engineers, setEngineers] = useState([])

  const perPage = 10

  useEffect(() => { setTimeout(() => { setLoading(false) }, 600) }, [])

  async function fetchUsers(){
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/users')
      // Handle the response
      const engineerUsers = []
      for (const user of response.data) {
        if (user.role === 'engineer') {
          engineerUsers.push(user)
        }
      }
      setEngineers(engineerUsers)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users.')
    }
  }

  const fetchSites = useCallback(async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/sites')
      setSites(response.data)
    } catch (error) {
      console.error('Error fetching sites:', error)
      toast.error('Failed to load sites.')
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSites();
      fetchUsers();
    }, 0)

    return () => clearTimeout(timer)
  }, [fetchSites])

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const resetForm = () => {
    setFormData({ ...emptyProject })
    setEquipmentItems([])
    setContractEnabled(false)
    setErrors({})
  }

  const fetchSiteDetailsForEdit = async (site) => {
    const siteId = getSiteId(site);

    if (!siteId) {
      return site;
    }

    try {
      const response = await axios.get(
        `http://127.0.0.1:8000/api/site-details/${siteId}/`
      );

      return mergeSiteDetails(site, response.data);
    } catch (error) {
      console.error("Error fetching site details:", error);
      toast.error("Failed to load site details.");
      return site;
    }
  };

  const openAdd = () => { resetForm(); setShowAddModal(true) }
  const openEdit = async (p) => {
    setErrors({})
    setSelectedProject(p)

    const siteForEdit = await fetchSiteDetailsForEdit(p)
    const normalized = normalizeSiteToForm(siteForEdit)
    const normalizedEquipment = normalizeEquipmentToItems(getSiteEquipment(siteForEdit))

    setSelectedProject(siteForEdit)
    setFormData(normalized)
    setEquipmentItems(normalizedEquipment)
    setContractEnabled(Boolean(normalized.contractRef || normalized.contractStart || normalized.contractEnd))
    setShowEditModal(true)
  }
  const openDelete = (p) => { setSelectedProject(p); setShowDeleteModal(true) }
  const openSiteDetails = (site) => {
    const siteId = getSiteId(site)

    if (!siteId) {
      toast.error('Unable to find site id.')
      return
    }

    navigate(`/sites/${siteId}`, { state: { site } })
  }

  const updateForm = (field, value) => {
    const keys = field.split('.')
    if (keys.length === 1) setFormData(prev => ({ ...prev, [field]: value }))
    else if (keys.length === 2) setFormData(prev => ({ ...prev, [keys[0]]: { ...prev[keys[0]], [keys[1]]: value } }))
    else if (keys.length === 3) setFormData(prev => ({ ...prev, [keys[0]]: { ...prev[keys[0]], [keys[1]]: { ...prev[keys[0]][keys[1]], [keys[2]]: value } } }))
  }

  const createSite = async (values) => {
    const siteData = buildSitePayload(values, equipmentItems, contractEnabled)

    console.log('payload to be passed', siteData)
    try {
      await axios.post('http://127.0.0.1:8000/api/create-site/', siteData,
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
      toast.success('Site added successfully')
      await fetchSites()
      setShowAddModal(false)
      
    } catch (error) {

      const message =
          error.response?.data?.equipment_sl_no?.[0] ||
          error.response?.data?.contract_ref_no?.[0] ||
          error.response?.data?.error ||
          'Something went wrong'

      console.error('Error creating site:', error)
      toast.error(message)
    }
  }

  const editSite = async (values) => {
    const siteId = getSiteId(selectedProject)

    if (!siteId) {
      toast.error('Unable to find site id for update.')
      return
    }

    const siteData = buildSitePayload(values, equipmentItems, contractEnabled)

    try {
      await axios.patch(`http://127.0.0.1:8000/api/edit-site/${siteId}/`, siteData, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      toast.success('Site updated successfully')
      await fetchSites()
      setShowEditModal(false)
      setSelectedProject(null)
    } catch (error) {
      const message =
        error.response?.data?.equipment_sl_no?.[0] ||
        error.response?.data?.contract_ref_no?.[0] ||
        error.response?.data?.error ||
        'Failed to update site'

      console.error('Error updating site:', error)
      toast.error(message)
    }
  }

  const handleSave = async (isEdit) => {
    try {
      const schema = getFormSchema(contractEnabled)

      await schema.validate(
        { ...formData, equipmentItems },
        { abortEarly: false }
      )

      setErrors({})

      if (isEdit) {
        await editSite(formData)
        return
      }

      await createSite(formData)
    } catch (err) {
      const validationErrors = buildValidationErrors(err)

      setErrors(validationErrors)
      console.log('Validation errors:', validationErrors)
      toast.error('Please fix the validation errors.')
    }
  }

  const handleDelete = async (siteId) => {

    try {
      await axios.delete(`http://127.0.0.1:8000/api/delete-site/${siteId}/`);

      toast.success("Site deleted successfully");
      fetchSites(); // refresh table/list after delete
      setShowDeleteModal(false);
      setSelectedProject(null)
    } catch (error) {
      const message =
        error.response?.data?.error ||
        "Failed to delete site";

      console.error("Error deleting site:", error);
      toast.error(message);
    }
  
  }

  if (loading) return <div className="fade-in"><div className="page-header"><div className="skeleton skeleton-title"></div></div><SkeletonTable rows={8} /></div>

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header d-flex justify-content-between align-items-start flex-wrap gap-2">
        <div>
          <h4>Sites</h4>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item"><a href="#">Home</a></li>
              <li className="breadcrumb-item active">Sites</li>
            </ol>
          </nav>
        </div>
        <button className="btn-primary-custom" onClick={openAdd}>
          <i className="fa-solid fa-plus me-2"></i>Add Site
        </button>
      </div>

      {/* Table */}
      <Row>
        <Col md={12}>
          <Card className="shadow-sm border-0 rounded-4 overflow-hidden">
            <Card.Body className="p-0">
              <Table className="mb-0 hover-table" responsive>
                <thead className="" style={{ fontSize: 14 }}>
                  <tr>
                    {['#','Site','Project','Project Code','Location','S/W version','Contact Person','Contact Number','Site Engineer','Sira Connection','Created','Actions'].map(h => (
                      <th key={h} style={{ padding: '16px 14px 16px 10px', height: 48 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ fontSize: 13 }}>
                  {sites.map((site, index) => {
                  let engineerName = '-'

                  if (site.allocated_site_engineer) {
                    const engineer = engineers.find(
                      e => String(e.id_user) === String(site.allocated_site_engineer)
                    )

                    engineerName = engineer ? engineer.full_name : site.allocated_site_engineer
                  }

                  return (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{site.site_name || '-'}</td>
                      <td>{site.project_name || '-'}</td>
                      <td>{site.project_code || '-'}</td>
                      <td>{site.latitude ? `${site.latitude}, ${site.longitude}` : '-'}</td>
                      <td>{site.software_version || '-'}</td>
                      <td>{site.site_contact_name || '-'}</td>
                      <td>{site.site_contact_number || '-'}</td>
                      <td>{engineerName}</td>
                      <td>
                        {site.is_sira_connected ? (
                          <span className="status-badge active"><span className="dot"></span>Connected</span>
                        ) : (
                          <span className="status-badge upcoming"><span className="dot"></span>Not Connected</span>
                        )}
                      </td>
                      <td>{site.created_at?.split('T')[0] || '-'}</td>
                      <td className="d-flex gap-2">
                        <ActionButton icon="eye" label="View" onClick={() => openSiteDetails(site)} />
                        <ActionButton icon="pencil" label="Edit" onClick={() => openEdit(site)} />
                        <ActionButton icon="trash" label="Delete" onClick={() => openDelete(site)} danger />
                      </td>
                    </tr>
                  )
                })}
                </tbody>
              </Table>
            </Card.Body>
            <Card.Footer className="p-0" style={{ background: 'none', borderTop: 'none' }}>
              <Pagination
                currentPage={currentPage}
                totalPages={Math.max(1, Math.ceil(sites.length / perPage))}
                totalItems={sites.length}
                pageSize={perPage}
                onPageChange={setCurrentPage}
              />
            </Card.Footer>
          </Card>
        </Col>
      </Row>

      {/* ── ADD MODAL ── */}
      {showAddModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="fa-solid fa-plus me-2 text-primary"></i>Add New Site</h5>
                <button className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <div className="modal-body">
                <SiteForm
                  formData={formData}
                  updateForm={updateForm}
                  errors={errors}
                  equipmentItems={equipmentItems}
                  setEquipmentItems={setEquipmentItems}
                  contractEnabled={contractEnabled}
                  setContractEnabled={setContractEnabled}
                  engineers={engineers}
                />
              </div>
              <div className="modal-footer">
                <button className="btn-outline-custom" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button className="btn-primary-custom" onClick={() => handleSave(false)}>
                  <i className="fa-solid fa-check me-2"></i>Save Site
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {showEditModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="fa-solid fa-pen me-2 text-primary"></i>Edit Site</h5>
                <button className="btn-close" onClick={() => setShowEditModal(false)}></button>
              </div>
              <div className="modal-body">
                <SiteForm
                  formData={formData}
                  updateForm={updateForm}
                  errors={errors}
                  equipmentItems={equipmentItems}
                  setEquipmentItems={setEquipmentItems}
                  contractEnabled={contractEnabled}
                  setContractEnabled={setContractEnabled}
                />
              </div>
              <div className="modal-footer">
                <button className="btn-outline-custom" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button className="btn-primary-custom" onClick={() => handleSave(true)}>
                  <i className="fa-solid fa-check me-2"></i>Update Site
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW MODAL ── */}
      {showViewModal && selectedProject && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="fa-solid fa-eye me-2 text-primary"></i>{selectedProject.projectName || selectedProject.project_name}</h5>
                <button className="btn-close" onClick={() => setShowViewModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3 mb-4">
                  {/* <div className="col-md-6">
                    <div className="p-3 rounded-3" style={{ background: 'var(--body-bg)' }}>
                      <small className="text-muted d-block mb-1">Site Name</small>
                      <strong>{selectedProject.siteName || selectedProject.site_name}</strong>
                    </div>
                  </div> */}
                  <div className="col-md-3">
                    <div className="p-3 rounded-3" style={{ background: 'var(--body-bg)' }}>
                      <small className="text-muted d-block mb-1">Status</small>
                      {/* <StatusBadge status={selectedProject.status} /> */}
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="p-3 rounded-3" style={{ background: 'var(--body-bg)' }}>
                      <small className="text-muted d-block mb-1">Sira</small>
                      {selectedProject.is_sira_connected
                        ? <span className="status-badge active"><span className="dot"></span>Connected</span>
                        : <span className="status-badge upcoming"><span className="dot"></span>Not Connected</span>
                      }
                    </div>
                  </div>
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-md-4"><div className="p-3 rounded-3" style={{ background: 'var(--body-bg)' }}><small className="text-muted d-block mb-1">Project Code</small><strong>{selectedProject.project_code || '-'}</strong></div></div>
                  <div className="col-md-4"><div className="p-3 rounded-3" style={{ background: 'var(--body-bg)' }}><small className="text-muted d-block mb-1">Software Version</small><strong>{selectedProject.software_version || '-'}</strong></div></div>
                  <div className="col-md-4"><div className="p-3 rounded-3" style={{ background: 'var(--body-bg)' }}><small className="text-muted d-block mb-1">Location</small><strong>{selectedProject.latitude ? `${selectedProject.latitude}, ${selectedProject.longitude}` : '-'}</strong></div></div>
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-md-4"><div className="p-3 rounded-3" style={{ background: 'var(--body-bg)' }}><small className="text-muted d-block mb-1">Contact Person</small><strong>{selectedProject.site_contact_name || '-'}</strong></div></div>
                  <div className="col-md-4"><div className="p-3 rounded-3" style={{ background: 'var(--body-bg)' }}><small className="text-muted d-block mb-1">Contact Number</small><strong>{selectedProject.site_contact_number || '-'}</strong></div></div>
                  <div className="col-md-4"><div className="p-3 rounded-3" style={{ background: 'var(--body-bg)' }}><small className="text-muted d-block mb-1">Site Engineer</small><strong>{selectedProject.allocated_site_engineer || '-'}</strong></div></div>
                </div>

                {selectedProject.auditLogs?.length > 0 && (
                  <>
                    <h6 className="fw-bold mb-2"><i className="fa-solid fa-user-pen me-2"></i>Audit Info</h6>
                    <div className="row g-3 mb-4">
                      <div className="col-md-6"><small className="text-muted">Created by</small><br /><strong>{selectedProject.createdBy}</strong> — {formatDate(selectedProject.createdDate)}</div>
                      <div className="col-md-6"><small className="text-muted">Last updated by</small><br /><strong>{selectedProject.updatedBy}</strong> — {formatDate(selectedProject.updatedDate)}</div>
                    </div>
                    <h6 className="fw-bold mb-3"><i className="fa-solid fa-timeline me-2"></i>Activity Timeline</h6>
                    <AuditTimeline logs={selectedProject.auditLogs} />
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn-outline-custom" onClick={() => setShowViewModal(false)}>Close</button>
                <button className="btn-primary-custom" onClick={() => { setShowViewModal(false); openEdit(selectedProject) }}>
                  <i className="fa-regular fa-pen-to-square me-2"></i>Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ── */}
      {showDeleteModal && selectedProject && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="fa-solid fa-triangle-exclamation me-2 text-danger"></i>Delete Site</h5>
                <button className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
              </div>
              <div className="modal-body text-center py-4">
                <div className="mb-3" style={{ width: 64, height: 64, background: 'rgba(239,68,68,0.1)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: 28, color: '#ef4444' }}>
                  <i className="fa-regular fa-trash-can"></i>
                </div>
                <h5 className="fw-bold">Are you sure?</h5>
                <p className="text-muted" style={{ fontSize: 14 }}>
                  You are about to delete <strong>{selectedProject.site_name || selectedProject.siteName}</strong>. This action cannot be undone.
                </p>
              </div>
              <div className="modal-footer justify-content-center">
                <button className="btn-outline-custom" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                <button className="btn-primary-custom" style={{ background: '#ef4444' }} onClick={() => handleDelete(getSiteId(selectedProject))}>
                  <i className="fa-solid fa-trash me-2"></i>Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
