// Thin fetch wrapper for the Django REST API (session cookie + CSRF header).

export class ApiError extends Error {
  constructor(status, detail, fields = {}) {
    super(detail)
    this.status = status
    this.detail = detail
    this.fields = fields // { fieldName: [messages] }
  }
  /** First message for a field, or '' */
  field(name) {
    const m = this.fields?.[name]
    return Array.isArray(m) ? m[0] : m || ''
  }
}

const cookie = (name) =>
  document.cookie
    .split('; ')
    .find((c) => c.startsWith(name + '='))
    ?.split('=')
    .slice(1)
    .join('=')

async function request(method, path, body) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET') headers['X-CSRFToken'] = decodeURIComponent(cookie('csrftoken') || '')
  let res
  try {
    res = await fetch('/api' + path, {
      method,
      headers,
      credentials: 'same-origin',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.')
  }
  if (res.status === 204) return null
  let data = null
  try {
    data = await res.json()
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok) {
    const detail =
      res.status === 429
        ? 'Too many attempts. Please wait a minute and try again.'
        : data?.detail || (res.status >= 500 ? 'Something went wrong on the server. Please try again.' : 'Request failed.')
    throw new ApiError(res.status, detail, data?.fields || {})
  }
  return data
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b = {}) => request('POST', p, b),
  patch: (p, b) => request('PATCH', p, b),
  del: (p) => request('DELETE', p),
  csrf: () => request('GET', '/csrf/'),
}

export const qs = (obj) => {
  const p = new URLSearchParams()
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== '' && v !== undefined && v !== null) p.append(k, v)
  })
  const s = p.toString()
  return s ? '?' + s : ''
}
