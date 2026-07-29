import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { SkeletonTable } from '../components/Loader'
import { Row, Col, Card, Table } from 'react-bootstrap'
import axios from 'axios'
import * as Yup from 'yup'

const API_BASE_URL = 'http://127.0.0.1:8000/api'

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'super_admin', label: 'Super Admin' },
]

const emptyUser = {
  full_name: '',
  email: '',
  phone: '',
  role: 'engineer',
  password: '',
  is_active: true,
}

const getUserSchema = (isEdit) => Yup.object({
  full_name: Yup.string().trim().required('Full name is required'),
  email: Yup.string().trim().email('Invalid email format').required('Email is required'),
  phone: Yup.string().trim().required('Phone is required'),
  role: Yup.string()
    .oneOf(roleOptions.map(option => option.value), 'Select a valid role')
    .required('Role is required'),
  password: isEdit
    ? Yup.string().test(
        'optional-password-length',
        'Password must be at least 8 characters',
        value => !value || value.length >= 8
      )
    : Yup.string().required('Password is required').min(8, 'Password must be at least 8 characters'),
  is_active: Yup.boolean(),
})

const fieldLabels = {
  full_name: 'Full name',
  email: 'Email',
  phone: 'Phone',
  role: 'Role',
  password: 'Password',
  is_active: 'Active',
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

const Sel = ({ children, ...props }) => (
  <select className="form-select form-select-sm" {...props}>{children}</select>
)

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

const normalizeUserList = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.users)) return data.users
  return []
}

const getUserId = (user = {}) =>
  user.id_user ?? user.user_id ?? user.id ?? user.pk

const getUserDisplayName = (user = {}) =>
  user.full_name || user.fullName || user.email || 'this user'

const fieldToCamel = (field) =>
  field.replace(/_([a-z])/g, (_, char) => char.toUpperCase())

const getValue = (user, key) => {
  const value = user?.[key] ?? user?.[fieldToCamel(key)]
  return value === null || value === undefined || value === '' ? '-' : value
}

const getBooleanValue = (user, key, fallback = false) => {
  const value = user?.[key] ?? user?.[fieldToCamel(key)]
  if (value === null || value === undefined) return fallback
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'active'].includes(value.toLowerCase())
  }

  return Boolean(value)
}

const formatDate = (value) => {
  if (!value) return '-'
  return String(value).split('T')[0]
}

const roleToLabel = (role) =>
  roleOptions.find(option => option.value === role)?.label ||
  String(role || '-')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())

const normalizeUserToForm = (user = {}) => ({
  ...emptyUser,
  full_name: user.full_name ?? user.fullName ?? '',
  email: user.email ?? '',
  phone: user.phone ?? user.phone_number ?? user.phoneNumber ?? '',
  role: user.role ?? 'engineer',
  password: '',
  is_active: getBooleanValue(user, 'is_active', true),
})

const buildValidationErrors = (err) => {
  const validationErrors = {}
  const errors = err.inner?.length ? err.inner : [err]

  errors.forEach(error => {
    if (!error.path || validationErrors[error.path]) return
    validationErrors[error.path] = error.message
  })

  return validationErrors
}

const extractApiFieldErrors = (data = {}) => {
  const fields = ['full_name', 'email', 'phone', 'role', 'password', 'is_active']
  const fieldErrors = {}

  fields.forEach(field => {
    const value = data?.[field]
    if (Array.isArray(value)) fieldErrors[field] = value[0]
    else if (typeof value === 'string') fieldErrors[field] = value
  })

  return fieldErrors
}

const getApiErrorMessage = (error, fallback) => {
  const data = error.response?.data
  const fieldErrors = extractApiFieldErrors(data)
  const firstFieldError = Object.values(fieldErrors)[0]

  return firstFieldError || data?.detail || data?.error || data?.message || fallback
}

const buildUserPayload = (values, isEdit) => {
  const payload = {
    full_name: values.full_name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    role: values.role,
    is_active: Boolean(values.is_active),
  }

  if (!isEdit || values.password) {
    payload.password = values.password
  }

  return payload
}

const UserForm = ({ formData, updateForm, errors = {}, isEdit = false }) => (
  <SectionBlock
    icon="fa-solid fa-users"
    title="User details"
    sub="Account access, contact details, and role"
    iconBg="#E6F1FB"
    iconColor="#185FA5"
  >
    <div className="row g-2">
      <Field label={fieldLabels.full_name} required col="col-md-6">
        <Inp
          placeholder="Enter full name"
          value={formData.full_name}
          onChange={e => updateForm('full_name', e.target.value)}
        />
        <ErrorText message={errors.full_name} />
      </Field>
      <Field label={fieldLabels.email} required col="col-md-6">
        <Inp
          type="email"
          placeholder="person@example.com"
          value={formData.email}
          onChange={e => updateForm('email', e.target.value)}
        />
        <ErrorText message={errors.email} />
      </Field>
      <Field label={fieldLabels.phone} required col="col-md-4">
        <Inp
          placeholder="0501234567"
          value={formData.phone}
          onChange={e => updateForm('phone', e.target.value)}
        />
        <ErrorText message={errors.phone} />
      </Field>
      <Field label={fieldLabels.role} required col="col-md-4">
        <Sel value={formData.role} onChange={e => updateForm('role', e.target.value)}>
          {roleOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Sel>
        <ErrorText message={errors.role} />
      </Field>
      <Field label={fieldLabels.password} required={!isEdit} col="col-md-4">
        <Inp
          type="password"
          placeholder={isEdit ? 'Leave blank to keep current password' : 'Enter password'}
          value={formData.password}
          onChange={e => updateForm('password', e.target.value)}
        />
        <ErrorText message={errors.password} />
      </Field>
      <div className="col-12">
        <div className="form-check form-switch mt-1">
          <input
            id="user-is-active"
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={Boolean(formData.is_active)}
            onChange={e => updateForm('is_active', e.target.checked)}
          />
          <label className="form-check-label fw-semibold" htmlFor="user-is-active" style={{ fontSize: 12 }}>
            {fieldLabels.is_active}
          </label>
        </div>
      </div>
    </div>
  </SectionBlock>
)

const ActionButton = ({ icon, label, onClick, danger }) => {
  const [hovered, setHovered] = useState(false)
  const iconMap = { pencil: 'fa-pen', trash: 'fa-trash' }

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

export default function UsersPage() {
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({ ...emptyUser })
  const [users, setUsers] = useState([])
  const perPage = 10

  const totalPages = Math.max(1, Math.ceil(users.length / perPage))
  const activePage = Math.min(currentPage, totalPages)
  const visibleUsers = useMemo(() => {
    const start = (activePage - 1) * perPage
    return users.slice(start, start + perPage)
  }, [users, activePage])

  const fetchUsers = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users`)
      setUsers(normalizeUserList(response.data))
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers()
    }, 0)

    return () => clearTimeout(timer)
  }, [fetchUsers])

  const resetForm = () => {
    setFormData({ ...emptyUser })
    setErrors({})
  }

  const openAdd = () => {
    resetForm()
    setShowAddModal(true)
  }

  const openEdit = (user) => {
    setSelectedUser(user)
    setFormData(normalizeUserToForm(user))
    setErrors({})
    setShowEditModal(true)
  }

  const openDelete = (user) => {
    setSelectedUser(user)
    setShowDeleteModal(true)
  }

  const closeAdd = () => {
    setShowAddModal(false)
    resetForm()
  }

  const closeEdit = () => {
    setShowEditModal(false)
    setSelectedUser(null)
    resetForm()
  }

  const updateForm = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const saveApiErrors = (error, fallback) => {
    const fieldErrors = extractApiFieldErrors(error.response?.data)

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
    }

    toast.error(getApiErrorMessage(error, fallback))
  }

  const createUser = async (values) => {
    try {
      await axios.post(`${API_BASE_URL}/create-user/`, buildUserPayload(values, false), {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      toast.success('User added successfully')
      await fetchUsers()
      closeAdd()
    } catch (error) {
      console.error('Error creating user:', error)
      saveApiErrors(error, 'Failed to add user')
    }
  }

  const editUser = async (values) => {
    const userId = getUserId(selectedUser)

    if (!userId) {
      toast.error('Unable to find user id for update.')
      return
    }

    try {
      await axios.put(`${API_BASE_URL}/edit-user/${userId}/`, buildUserPayload(values, true), {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      toast.success('User updated successfully')
      await fetchUsers()
      closeEdit()
    } catch (error) {
      console.error('Error updating user:', error)
      saveApiErrors(error, 'Failed to update user')
    }
  }

  const handleSave = async (isEdit) => {
    try {
      await getUserSchema(isEdit).validate(formData, { abortEarly: false })
      setErrors({})

      if (isEdit) {
        await editUser(formData)
        return
      }

      await createUser(formData)
    } catch (err) {
      const validationErrors = buildValidationErrors(err)

      setErrors(validationErrors)
      toast.error('Please fix the validation errors.')
    }
  }

  const handleDelete = async (userId) => {
    if (!userId) {
      toast.error('Unable to find user id.')
      return
    }

    try {
      await axios.delete(`${API_BASE_URL}/delete-user/${userId}/`)

      toast.success('User deleted successfully')
      await fetchUsers()
      setShowDeleteModal(false)
      setSelectedUser(null)
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to delete user')

      console.error('Error deleting user:', error)
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
          <h4>Users</h4>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item"><a href="#">Home</a></li>
              <li className="breadcrumb-item active">Users</li>
            </ol>
          </nav>
        </div>
        <button className="btn-primary-custom" onClick={openAdd}>
          <i className="fa-solid fa-plus me-2"></i>Add User
        </button>
      </div>

      <Row>
        <Col md={12}>
          <Card className="shadow-sm border-0 rounded-4 overflow-hidden">
            <Card.Body className="p-0">
              <Table className="mb-0 hover-table" responsive>
                <thead style={{ fontSize: 14 }}>
                  <tr>
                    {['#', 'Full Name', 'Email', 'Phone', 'Role', 'Status', 'Created', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '16px 14px 16px 10px', height: 48 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ fontSize: 13 }}>
                  {visibleUsers.map((user, index) => {
                    const isActive = getBooleanValue(user, 'is_active', false)

                    return (
                      <tr key={getUserId(user) ?? index}>
                        <td>{(activePage - 1) * perPage + index + 1}</td>
                        <td>{getValue(user, 'full_name')}</td>
                        <td>{getValue(user, 'email')}</td>
                        <td>{getValue(user, 'phone')}</td>
                        <td>
                          <span className="equipment-badge">
                            <i className="fa-solid fa-user-shield"></i>
                            {roleToLabel(getValue(user, 'role'))}
                          </span>
                        </td>
                        <td>
                          {isActive ? (
                            <span className="status-badge active"><span className="dot"></span>Active</span>
                          ) : (
                            <span className="status-badge expired"><span className="dot"></span>Inactive</span>
                          )}
                        </td>
                        <td>{formatDate(user.created_at ?? user.createdAt)}</td>
                        <td className="d-flex gap-2">
                          <ActionButton icon="pencil" label="Edit" onClick={() => openEdit(user)} />
                          <ActionButton icon="trash" label="Delete" onClick={() => openDelete(user)} danger />
                        </td>
                      </tr>
                    )
                  })}
                  {visibleUsers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-4 text-muted">
                        No users found.
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
                totalItems={users.length}
                pageSize={perPage}
                onPageChange={setCurrentPage}
              />
            </Card.Footer>
          </Card>
        </Col>
      </Row>

      {showAddModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="fa-solid fa-plus me-2 text-primary"></i>Add New User</h5>
                <button className="btn-close" onClick={closeAdd}></button>
              </div>
              <div className="modal-body">
                <UserForm
                  formData={formData}
                  updateForm={updateForm}
                  errors={errors}
                />
              </div>
              <div className="modal-footer">
                <button className="btn-outline-custom" onClick={closeAdd}>Cancel</button>
                <button className="btn-primary-custom" onClick={() => handleSave(false)}>
                  <i className="fa-solid fa-check me-2"></i>Save User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedUser && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="fa-solid fa-pen me-2 text-primary"></i>Edit User</h5>
                <button className="btn-close" onClick={closeEdit}></button>
              </div>
              <div className="modal-body">
                <UserForm
                  formData={formData}
                  updateForm={updateForm}
                  errors={errors}
                  isEdit
                />
              </div>
              <div className="modal-footer">
                <button className="btn-outline-custom" onClick={closeEdit}>Cancel</button>
                <button className="btn-primary-custom" onClick={() => handleSave(true)}>
                  <i className="fa-solid fa-check me-2"></i>Update User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && selectedUser && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="fa-solid fa-triangle-exclamation me-2 text-danger"></i>Delete User</h5>
                <button className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
              </div>
              <div className="modal-body text-center py-4">
                <div className="mb-3" style={{ width: 64, height: 64, background: 'rgba(239,68,68,0.1)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: 28, color: '#ef4444' }}>
                  <i className="fa-regular fa-trash-can"></i>
                </div>
                <h5 className="fw-bold">Are you sure?</h5>
                <p className="text-muted" style={{ fontSize: 14 }}>
                  You are about to delete <strong>{getUserDisplayName(selectedUser)}</strong>. This action cannot be undone.
                </p>
              </div>
              <div className="modal-footer justify-content-center">
                <button className="btn-outline-custom" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                <button className="btn-primary-custom" style={{ background: '#ef4444' }} onClick={() => handleDelete(getUserId(selectedUser))}>
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
