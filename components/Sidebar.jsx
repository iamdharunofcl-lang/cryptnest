'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', d: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
  { href: '/files', label: 'My Files', d: 'M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z' },
  { href: '/starred', label: 'Starred', d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
  { href: '/recycle', label: 'Recycle Bin', d: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6' },
]

const ADMIN_NAV = [
  { href: '/admin', label: 'User Management', d: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z' },
  { href: '/audit', label: 'Audit Logs', d: 'M22 12h-4l-3 9L9 3l-3 9H2' },
  { href: '/security', label: 'Security Center', d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
]

const MANAGER_NAV = [
  { href: '/admin', label: 'Charts & Analytics', d: 'M18 20V10M12 20V4M6 20v-6' },
  { href: '/audit', label: 'Dept Audit Logs', d: 'M22 12h-4l-3 9L9 3l-3 9H2' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = ['superadmin', 'admin'].includes(session?.user?.role)
  const isManager = session?.user?.role === 'manager'
  const initials = session?.user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'

  function NavItem({ href, label, d }) {
    const active = pathname === href
    return (
      <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 9px', borderRadius: '6px', color: active ? '#f4a829' : '#8b93aa', background: active ? '#252c3e' : 'transparent', marginBottom: '2px', fontSize: '12px', fontWeight: 500, transition: '.15s', textDecoration: 'none' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
        {label}
      </Link>
    )
  }

  return (
    <div style={{ width: '210px', minHeight: '100vh', background: '#181c27', borderRight: '1px solid #2e3650', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ height: '52px', display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px', borderBottom: '1px solid #2e3650', flexShrink: 0 }}>
        <div style={{ width: '28px', height: '28px', background: '#f4a829', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><path d="M20 16.5A4.5 4.5 0 0015.5 12H14a6 6 0 10-5.91 7h7.41A4.5 4.5 0 0020 16.5z" /></svg>
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#e8ecf4', lineHeight: 1.2 }}>Crypt<span style={{ color: '#f4a829' }}>Nest</span></div>
          <div style={{ fontSize: '9px', color: '#555e78' }}>A safe nest for every file.</div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        <div style={{ fontSize: '9px', letterSpacing: '1.5px', color: '#555e78', padding: '8px 8px 4px', textTransform: 'uppercase', fontWeight: 500 }}>Navigation</div>
        {NAV.map(item => <NavItem key={item.href} {...item} />)}

        {isAdmin && (
          <>
            <div style={{ fontSize: '9px', letterSpacing: '1.5px', color: '#555e78', padding: '12px 8px 4px', textTransform: 'uppercase', fontWeight: 500 }}>Admin</div>
            {ADMIN_NAV.map(item => <NavItem key={item.href} {...item} />)}
          </>
        )}

        {isManager && !isAdmin && (
          <>
            <div style={{ fontSize: '9px', letterSpacing: '1.5px', color: '#555e78', padding: '12px 8px 4px', textTransform: 'uppercase', fontWeight: 500 }}>Manager</div>
            {MANAGER_NAV.map(item => <NavItem key={item.href} {...item} />)}
          </>
        )}
      </nav>

      <div style={{ padding: '12px 14px', borderTop: '1px solid #2e3650', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '10px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#f4a829', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#000', flexShrink: 0 }}>{initials}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#e8ecf4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session?.user?.name || 'User'}</div>
            <div style={{ fontSize: '10px', color: '#555e78', textTransform: 'capitalize' }}>{session?.user?.role || 'member'}</div>
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: '/login' })} style={{ width: '100%', padding: '6px', background: '#1e2435', border: '1px solid #2e3650', borderRadius: '6px', color: '#f05b5b', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Sign out
        </button>
      </div>
    </div>
  )
}
