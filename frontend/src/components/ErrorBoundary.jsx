import { Component } from 'react'

const STALE_CHUNK = /dynamically imported module|Loading chunk|Importing a module script failed|error loading dynamically/i
const reloadOnce = () => {
  // A new version was deployed while this tab was open: its old script files are gone. Reload once to pick up the new ones.
  try {
    const last = Number(sessionStorage.getItem('reloaded-at') || 0)
    if (Date.now() - last < 15000) return false
    sessionStorage.setItem('reloaded-at', String(Date.now()))
  } catch {
    /* storage unavailable: fall through to a single reload */
  }
  window.location.reload()
  return true
}

// Vite fires this when a lazily loaded chunk 404s (typically right after an update).
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault()
  reloadOnce()
})

/** Never show a blank white page: render a recoverable message instead. */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error(error)
    if (STALE_CHUNK.test(String(error?.message || error))) reloadOnce()
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ maxWidth: 520, margin: '12vh auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif', color: '#2a2f3a' }}>
        <div style={{ height: 5, display: 'flex', marginBottom: 24 }}>
          <i style={{ flex: 1, background: '#e8851f' }} /><i style={{ flex: 1, background: '#1b3a6b' }} /><i style={{ flex: 1, background: '#2a7f4e' }} />
        </div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, margin: '0 0 8px' }}>Something went wrong</h1>
        <p style={{ margin: '0 0 20px', lineHeight: 1.6 }}>
          The page could not be displayed. This usually fixes itself after reloading. Your saved notes are safe.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{ background: '#1b3a6b', color: '#fff', border: 0, borderRadius: 6, padding: '13px 26px', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
        >
          Reload page
        </button>
      </div>
    )
  }
}
