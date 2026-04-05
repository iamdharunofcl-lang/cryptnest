'use client'
import { useState } from 'react'

export default function TopBar({ title, subtitle, children, onSearch }) {
  const [q, setQ] = useState('')

  return (
    <div className="topbar">
      <div style={{ flex: 1 }}>
        <span className="topbar-title">{title}</span>
        {subtitle && <span className="topbar-sub" style={{ marginLeft: '8px' }}>{subtitle}</span>}
      </div>
      {onSearch && (
        <div className="search-bar" style={{ width: '200px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555e78" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input placeholder="Search…" value={q} onChange={e => { setQ(e.target.value); onSearch(e.target.value) }} style={{ width: '160px' }} />
        </div>
      )}
      {children}
    </div>
  )
}
