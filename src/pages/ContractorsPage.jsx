import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { SkeletonTable } from '../components/Loader'
import { Row, Col, Card, Table } from 'react-bootstrap'
import axios from 'axios'
import * as Yup from 'yup'

// const API_BASE_URL = 'http://127.0.0.1:8000/api'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const emptyContractor = {
  company_name: '',
  contact_person: '',
  contact_phone: '',
  contact_email: '',
  address: '',
  trade_license_no: '',
  trade_license_expiry: '',
  vat_trn: '',
}

const ContractorSchema = Yup.object({
  company_name: Yup.string().required('Company name is required'),
  contact_person: Yup.string().required('Contact person is required'),
  contact_phone: Yup.string().required('Contact phone is required'),
  contact_email: Yup.string().email('Invalid email format'),
  trade_license_expiry: Yup.date()
    .transform((value, originalValue) => (originalValue === '' ? undefined : value))
    .typeError('Trade license expiry must be a valid date')
    .required('Trade license expiry is required'),
})

const fieldLabels = {
  company_name: 'Company name',
  contact_person: 'Contact person',
  contact_phone: 'Contact phone',
  contact_email: 'Contact email',
  address: 'Address',
  trade_license_no: 'Trade license no.',
  trade_license_expiry: 'Trade license expiry',
  vat_trn: 'VAT TRN',
}

const Field = ({ label, required, children, col = 'col-md-4' }) => (
  <div className={col}>
    <label className="form-label fw-semibold" style={{ fontSize: 12 }}>
      {label} {required && <span className="text-danger">*</span>}
    </label>
    {children}
  </div>
)

const Inp = (props) => <input className="form-control form-control-sm" {...props} />

const ErrorText = ({ message }) => (
  message ? <div className="text-danger small">{message}</div> : null
)

const SectionBlock = ({ icon, title, sub, iconBg, iconColor, children }) => (
  <div className="mb-3" style={{
    background: 'var(--bs-body-bg, #fff)',
    border: '0.5px solid rgba(0,0,0,0.1)',
    borderRadius: 12,
    padding: '1.1rem',
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
        flexShrink: 0,
      }}>
        <i className={icon} aria-hidden="true" />
      </div>
      <div className="flex-grow-1">
        <div style={{ fontSize: 13, fontWeight: 500 }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: '#6c757d', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
    {children}
  </div>
)

const normalizeContractorList = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.contractors)) return data.contractors
  return []
}

const getContractorId = (contractor = {}) =>
  contractor.id_contractor ?? contractor.contractor_id ?? contractor.id ?? contractor.pk

const getContractorDisplayName = (contractor = {}) =>
  contractor.company_name || contractor.companyName || 'this contractor'

const getValue = (contractor, key) => {
  const value = contractor?.[key] ?? contractor?.[fieldToCamel(key)]
  return value || '-'
}

const fieldToCamel = (field) =>
  field.replace(/_([a-z])/g, (_, char) => char.toUpperCase())

const formatDate = (value) => {
  if (!value) return '-'
  return String(value).split('T')[0]
}

const buildValidationErrors = (err) => {
  const validationErrors = {}
  const errors = err.inner?.length ? err.inner : [err]

  errors.forEach(error => {
    if (!error.path || validationErrors[error.path]) return
    validationErrors[error.path] = error.message
  })

  return validationErrors
}

const ContractorForm = ({ formData, updateForm, errors = {} }) => (
  <SectionBlock
    icon="fa-solid fa-users-gear"
    title="Contractor details"
    sub="Basic company and license information"
    iconBg="#E6F1FB"
    iconColor="#185FA5"
  >
    <div className="row g-2">
      <Field label={fieldLabels.company_name} required col="col-md-6">
        <Inp
          placeholder="Enter company name"
          value={formData.company_name}
          onChange={e => updateForm('company_name', e.target.value)}
        />
        <ErrorText message={errors.company_name} />
      </Field>
      <Field label={fieldLabels.contact_person} required col="col-md-6">
        <Inp
          placeholder="Full name"
          value={formData.contact_person}
          onChange={e => updateForm('contact_person', e.target.value)}
        />
        <ErrorText message={errors.contact_person} />
      </Field>
      <Field label={fieldLabels.contact_phone} required col="col-md-4">
        <Inp
          placeholder="0 50 000 0000"
          value={formData.contact_phone}
          onChange={e => updateForm('contact_phone', e.target.value)}
        />
        <ErrorText message={errors.contact_phone} />
      </Field>
      <Field label={fieldLabels.contact_email} col="col-md-4">
        <Inp
          type="email"
          placeholder="person@example.com"
          value={formData.contact_email}
          onChange={e => updateForm('contact_email', e.target.value)}
        />
        <ErrorText message={errors.contact_email} />
      </Field>
      <Field label={fieldLabels.vat_trn} col="col-md-4">
        <Inp
          placeholder="Enter VAT TRN"
          value={formData.vat_trn}
          onChange={e => updateForm('vat_trn', e.target.value)}
        />
      </Field>
      <Field label={fieldLabels.trade_license_no} col="col-md-6">
        <Inp
          placeholder="Enter trade license no."
          value={formData.trade_license_no}
          onChange={e => updateForm('trade_license_no', e.target.value)}
        />
      </Field>
      <Field label={fieldLabels.trade_license_expiry} col="col-md-6">
        <Inp
          type="date"
          value={formData.trade_license_expiry}
          onChange={e => updateForm('trade_license_expiry', e.target.value)}
        />
        <ErrorText message={errors.trade_license_expiry} />
      </Field>
      <Field label={fieldLabels.address} col="col-12">
        <textarea
          className="form-control form-control-sm"
          rows={3}
          placeholder="Enter address"
          value={formData.address}
          onChange={e => updateForm('address', e.target.value)}
        />
      </Field>
    </div>
  </SectionBlock>
)

const ActionButton = ({ icon, label, onClick, danger }) => {
  const [hovered, setHovered] = useState(false)
  const iconMap = { trash: 'fa-trash', pencil: 'fa-pencil' }

  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        transition: 'background 0.15s, color 0.15s',
        background: hovered ? (danger ? '#FCEBEB' : 'var(--color-background-secondary)') : 'transparent',
        color: hovered ? (danger ? '#A32D2D' : 'var(--color-text-primary)') : 'grey',
      }}
    >
      <i className={`fa-solid ${iconMap[icon] || 'fa-circle'}`} style={{ fontSize: 14 }} />
    </button>
  )
}

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
    if (!Number.isNaN(p)) onPageChange(Math.max(1, Math.min(totalPages, p)))
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

export default function ContractorsPage() {
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedContractor, setSelectedContractor] = useState(null)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({ ...emptyContractor })
  const [contractors, setContractors] = useState([])
  const perPage = 10

  const totalPages = Math.max(1, Math.ceil(contractors.length / perPage))
  const activePage = Math.min(currentPage, totalPages)
  const visibleContractors = useMemo(() => {
    const start = (activePage - 1) * perPage
    return contractors.slice(start, start + perPage)
  }, [contractors, activePage])

  const fetchContractors = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/contractors`)
      setContractors(normalizeContractorList(response.data))
    } catch (error) {
      console.error('Error fetching contractors:', error)
      toast.error('Failed to load contractors.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContractors()
    }, 0)

    return () => clearTimeout(timer)
  }, [fetchContractors])

  const resetForm = () => {
    setFormData({ ...emptyContractor })
    setErrors({})
  }

  const openAdd = () => {
    resetForm()
    setShowAddModal(true)
  }

  const openDelete = (contractor) => {
    setSelectedContractor(contractor)
    setShowDeleteModal(true)
  }

  const updateForm = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const createContractor = async (values) => {
    values.is_active = true
    try {
      await axios.post(`${API_BASE_URL}/api/create-contractor/`, values, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      toast.success('Contractor added successfully')
      await fetchContractors()
      setShowAddModal(false)
      resetForm()
    } catch (error) {
      const message =
        error.response?.data?.company_name?.[0] ||
        error.response?.data?.contact_email?.[0] ||
        error.response?.data?.error ||
        'Failed to add contractor'

      console.error('Error creating contractor:', error)
      toast.error(message)
    }
  }

  const handleSave = async () => {
    try {
      await ContractorSchema.validate(formData, { abortEarly: false })
      setErrors({})
      await createContractor(formData)
    } catch (err) {
      const validationErrors = buildValidationErrors(err)

      setErrors(validationErrors)
      toast.error('Please fix the validation errors.')
    }
  }

  const handleDelete = async (contractorId) => {
    if (!contractorId) {
      toast.error('Unable to find contractor id.')
      return
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/delete-contractor/${contractorId}/`)

      toast.success('Contractor deleted successfully')
      await fetchContractors()
      setShowDeleteModal(false)
      setSelectedContractor(null)
    } catch (error) {
      const message =
        error.response?.data?.error ||
        'Failed to delete contractor'

      console.error('Error deleting contractor:', error)
      toast.error(message)
    }
  }

  if (loading) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div className="skeleton skeleton-title"></div>
        </div>
        <SkeletonTable rows={8} />
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="page-header d-flex justify-content-between align-items-start flex-wrap gap-2">
        <div>
          <h4>Contractors</h4>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item"><a href="#">Home</a></li>
              <li className="breadcrumb-item active">Contractors</li>
            </ol>
          </nav>
        </div>
        <button className="btn-primary-custom" onClick={openAdd}>
          <i className="fa-solid fa-plus me-2"></i>Add Contractor
        </button>
      </div>

      <Row>
        <Col md={12}>
          <Card className="shadow-sm border-0 rounded-4 overflow-hidden">
            <Card.Body className="p-0">
              <Table className="mb-0 hover-table" responsive>
                <thead style={{ fontSize: 14 }}>
                  <tr>
                    {['#', 'Company', 'Contact Person', 'Phone', 'Email', 'Address', 'Trade License No.', 'Trade License Expiry', 'VAT TRN', 'Created', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '16px 14px 16px 10px', height: 48 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ fontSize: 13 }}>
                  {visibleContractors.map((contractor, index) => (
                    <tr key={getContractorId(contractor) ?? index}>
                      <td>{(activePage - 1) * perPage + index + 1}</td>
                      <td>{getValue(contractor, 'company_name')}</td>
                      <td>{getValue(contractor, 'contact_person')}</td>
                      <td>{getValue(contractor, 'contact_phone')}</td>
                      <td>{getValue(contractor, 'contact_email')}</td>
                      <td>{getValue(contractor, 'address')}</td>
                      <td>{getValue(contractor, 'trade_license_no')}</td>
                      <td>{formatDate(getValue(contractor, 'trade_license_expiry'))}</td>
                      <td>{getValue(contractor, 'vat_trn')}</td>
                      <td>{formatDate(contractor.created_at ?? contractor.createdAt)}</td>
                      <td className="d-flex gap-2">
                        <ActionButton icon="pencil" label="Edit" onClick={() => openAdd(contractor)} />
                        <ActionButton icon="trash" label="Delete" onClick={() => openDelete(contractor)} danger />
                      </td>
                    </tr>
                  ))}
                  {visibleContractors.length === 0 && (
                    <tr>
                      <td colSpan={11} className="text-center py-4 text-muted">
                        No contractors found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
            <Card.Footer className="p-0" style={{ background: 'none', borderTop: 'none' }}>
              <Pagination
                currentPage={activePage}
                totalPages={totalPages}
                totalItems={contractors.length}
                pageSize={perPage}
                onPageChange={setCurrentPage}
              />
            </Card.Footer>
          </Card>
        </Col>
      </Row>

      {showAddModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="fa-solid fa-plus me-2 text-primary"></i>Add New Contractor</h5>
                <button className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <div className="modal-body">
                <ContractorForm
                  formData={formData}
                  updateForm={updateForm}
                  errors={errors}
                />
              </div>
              <div className="modal-footer">
                <button className="btn-outline-custom" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button className="btn-primary-custom" onClick={handleSave}>
                  <i className="fa-solid fa-check me-2"></i>Save Contractor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && selectedContractor && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="fa-solid fa-triangle-exclamation me-2 text-danger"></i>Delete Contractor</h5>
                <button className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
              </div>
              <div className="modal-body text-center py-4">
                <div className="mb-3" style={{ width: 64, height: 64, background: 'rgba(239,68,68,0.1)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: 28, color: '#ef4444' }}>
                  <i className="fa-regular fa-trash-can"></i>
                </div>
                <h5 className="fw-bold">Are you sure?</h5>
                <p className="text-muted" style={{ fontSize: 14 }}>
                  You are about to delete <strong>{getContractorDisplayName(selectedContractor)}</strong>. This action cannot be undone.
                </p>
              </div>
              <div className="modal-footer justify-content-center">
                <button className="btn-outline-custom" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                <button className="btn-primary-custom" style={{ background: '#ef4444' }} onClick={() => handleDelete(getContractorId(selectedContractor))}>
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
