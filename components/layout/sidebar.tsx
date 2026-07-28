'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, ShoppingBag, DollarSign, BarChart2,
  MessageSquare, Settings, Package, Zap, LogOut, User, ScrollText,
} from 'lucide-react'

const NAV = [
  { href: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/orders',     label: 'Orders',       icon: ShoppingBag },
  { href: '/costs',      label: 'Cost Entry',   icon: Package },
  { href: '/pnl',        label: 'P&L',          icon: DollarSign },
  { href: '/analytics',  label: 'Analytics',    icon: BarChart2 },
  { href: '/ai',         label: 'AI Assistant', icon: MessageSquare },
  { href: '/settings',   label: 'Settings',     icon: Settings },
]

const ADMIN_NAV = [
  { href: '/logs', label: 'Activity Logs', icon: ScrollText },
]

interface AuthStatus {
  connected: boolean
  valid: boolean
  environment: string
  expiresInMins?: number
}

interface SessionUser { username: string; role: string }

export default function Sidebar() {
  const pathname = usePathname()
  const [auth, setAuth]   = useState<AuthStatus | null>(null)
  const [user, setUser]   = useState<SessionUser | null>(null)

  useEffect(() => {
    fetch('/api/auth/status').then(r => r.json()).then(setAuth).catch(() => {})
    fetch('/api/session/me').then(r => r.json()).then(d => setUser(d.user)).catch(() => {})
  }, [])

  const logout = async () => {
    await fetch('/api/session/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white"
           style={{ width: 'var(--sidebar-width)' }}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <Zap size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 leading-tight">Dropship</p>
          <p className="text-[10px] text-slate-400 leading-tight">Intelligence v2</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                active
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <Icon size={17} className={cn(
                'flex-shrink-0',
                active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600',
              )} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Admin-only nav */}
      {user?.role === 'admin' && (
        <div className="px-3 pb-2">
          {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link key={href} href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                  active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )}>
                <Icon size={17} className={cn('flex-shrink-0', active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600')} />
                {label}
              </Link>
            )
          })}
        </div>
      )}

      {/* eBay status */}
      <div className="px-4 py-4 border-t border-slate-100">
        {/* Logged in user + logout */}
        {user && (
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <User size={13} className="text-slate-400"/>
              <span className="font-medium">{user.username}</span>
              <span className="text-slate-400 capitalize">({user.role})</span>
            </div>
            <button onClick={logout} className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors" title="Sign out">
              <LogOut size={13}/>
            </button>
          </div>
        )}
        {auth ? (
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-xs',
            auth.connected && auth.valid
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-rose-50 text-rose-600',
          )}>
            <span className={cn(
              'w-2 h-2 rounded-full flex-shrink-0',
              auth.connected && auth.valid ? 'bg-emerald-500' : 'bg-rose-400',
            )} />
            <span className="font-medium">
              {auth.connected && auth.valid
                ? `eBay ${auth.environment}`
                : 'eBay disconnected'}
            </span>
          </div>
        ) : (
          <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
        )}
      </div>
    </aside>
  )
}
