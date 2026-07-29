import axios from 'axios'

export const AUTH_STORAGE_KEYS = {
  access: 'access',
  refresh: 'refresh',
  user: 'user',
}

export const setAuthorizationToken = (token) => {
  if (token) {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`
    return
  }

  delete axios.defaults.headers.common.Authorization
}

export const hydrateAuthSession = () => {
  setAuthorizationToken(localStorage.getItem(AUTH_STORAGE_KEYS.access))
}

export const saveAuthSession = ({ access, refresh, user }) => {
  localStorage.setItem(AUTH_STORAGE_KEYS.access, access)
  localStorage.setItem(AUTH_STORAGE_KEYS.refresh, refresh)
  localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(user))
  setAuthorizationToken(access)
}

export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_STORAGE_KEYS.access)
  localStorage.removeItem(AUTH_STORAGE_KEYS.refresh)
  localStorage.removeItem(AUTH_STORAGE_KEYS.user)
  setAuthorizationToken(null)
}

export const isAuthenticated = () =>
  Boolean(localStorage.getItem(AUTH_STORAGE_KEYS.access))

export const getStoredUser = () => {
  const storedUser = localStorage.getItem(AUTH_STORAGE_KEYS.user)
  if (!storedUser) return null

  try {
    return JSON.parse(storedUser)
  } catch {
    return null
  }
}

export const getUserDisplayName = (user = getStoredUser()) =>
  user?.full_name || user?.email || 'User'

export const getUserEmail = (user = getStoredUser()) =>
  user?.email || ''

export const getUserRoleLabel = (user = getStoredUser()) => {
  const role = user?.role || 'User'

  return role
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

export const getUserInitials = (user = getStoredUser()) => {
  const source = getUserDisplayName(user).trim()
  const parts = source.split(/\s+/).filter(Boolean)

  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}
