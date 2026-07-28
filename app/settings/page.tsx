'use client'

import { useEffect, useState } from 'react'
import Shell from '@/components/layout/shell'
import { CheckCircle, XCircle, ExternalLink, RefreshCw, Key } from 'lucide-react'

interface AuthStatus {
  connected: boolean; valid: boolean; environment: string
  expiresInMins?: number; hasFinances?: boolean
}
interface KeyStatus { hasKey: boolean; key?: { signing_key_id: string; created_at: string } }

export default function SettingsPage() {
  const [auth, setAuth]   = useState<AuthStatus | null>(null)
  const [keyS, setKeyS]   = useState<KeyStatus | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const justConnected = searchParams?.get('connected') === '1'

  useEffect(() => {
    fetch('/api/auth/status').then(r=>r.json()).then(setAuth)
    fetch('/api/finances/key-status').then(r=>r.json()).then(setKeyS)
  }, [])

  const runSync = async (label: string, fn: () => Promise<Response>) => {
    setSyncing(label)
    setResult(null)
    const r = await fn()
    const d = await r.json()
    setResult(d.error ? `Error: ${d.error}` : JSON.stringify(d))
    setSyncing(null)
  }

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">eBay connection, data sync, and account configuration</p>
      </div>

      {justConnected && (
        <div className="flex items-center gap-2 p-4 mb-6 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-700 text-sm">
          <CheckCircle size={16}/> eBay connected successfully! You can now sync your orders.
        </div>
      )}

      <div className="max-w-2xl space-y-4">
        {/* eBay Connection */}
        <div className="card p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">eBay Connection</h2>
              <p className="text-xs text-slate-500 mt-0.5">OAuth 2.0 · {process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3100'}/api/auth/callback</p>
            </div>
            {auth && (
              <div className={`flex items-center gap-1.5 text-sm font-medium ${auth.connected && auth.valid ? 'text-emerald-600' : 'text-rose-500'}`}>
                {auth.connected && auth.valid ? <CheckCircle size={15}/> : <XCircle size={15}/>}
                {auth.connected && auth.valid ? 'Connected' : 'Disconnected'}
              </div>
            )}
          </div>

          {auth && (
            <div className="space-y-2 mb-4 text-xs text-slate-600">
              <div className="flex justify-between"><span className="text-slate-500">Environment</span><span className="font-medium capitalize">{auth.environment}</span></div>
              {auth.valid && auth.expiresInMins !== undefined && (
                <div className="flex justify-between"><span className="text-slate-500">Token expires</span><span className="font-num">{auth.expiresInMins > 60 ? `${Math.floor(auth.expiresInMins/60)}h` : `${auth.expiresInMins}m`}</span></div>
              )}
              <div className="flex justify-between"><span className="text-slate-500">Finance API scope</span>
                <span className={auth.hasFinances ? 'text-emerald-600' : 'text-amber-600'}>{auth.hasFinances ? 'Granted' : 'Missing'}</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <a href="/api/auth/ebay" className="btn-primary text-sm">
              <ExternalLink size={14}/>
              {auth?.connected && auth?.valid ? 'Reconnect eBay' : 'Connect eBay'}
            </a>
            {auth?.connected && auth?.valid && (
              <button onClick={() => fetch('/api/auth/disconnect', {method:'DELETE'}).then(()=>window.location.reload())}
                className="btn-secondary text-sm text-rose-500 hover:text-rose-600">
                Disconnect
              </button>
            )}
          </div>
        </div>

        {/* Digital Signing Key */}
        <div className="card p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Finance API Signing Key</h2>
              <p className="text-xs text-slate-500 mt-0.5">Required for accessing eBay Finances API (fees, payouts)</p>
            </div>
            {keyS && (
              <div className={`flex items-center gap-1.5 text-sm font-medium ${keyS.hasKey ? 'text-emerald-600' : 'text-amber-600'}`}>
                <Key size={15}/>
                {keyS.hasKey ? 'Key present' : 'No key'}
              </div>
            )}
          </div>
          {keyS?.key && (
            <div className="text-xs text-slate-500 mb-4 font-mono bg-slate-50 rounded-lg p-3">
              <p>ID: {keyS.key.signing_key_id}</p>
              <p>Created: {keyS.key.created_at}</p>
            </div>
          )}
          <button onClick={() => runSync('key', () => fetch('/api/finances/setup-key', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})}))}
            disabled={syncing === 'key'} className="btn-secondary text-sm">
            <RefreshCw size={13} className={syncing === 'key' ? 'animate-spin' : ''}/>
            {syncing === 'key' ? 'Creating…' : keyS?.hasKey ? 'Rotate Key' : 'Create Signing Key'}
          </button>
        </div>

        {/* Data Sync */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Data Sync</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <div>
                <p className="text-sm font-medium text-slate-800">Sync eBay Orders</p>
                <p className="text-xs text-slate-500">Pull last 90 days of orders from eBay Fulfillment API</p>
              </div>
              <button onClick={() => runSync('orders', () => fetch('/api/sync/fulfillment', {method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}))}
                disabled={!!syncing} className="btn-secondary text-xs">
                <RefreshCw size={12} className={syncing === 'orders' ? 'animate-spin' : ''}/>
                {syncing === 'orders' ? 'Syncing…' : 'Sync Orders'}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <div>
                <p className="text-sm font-medium text-slate-800">Sync Finance Data</p>
                <p className="text-xs text-slate-500">Pull fees and payout data from eBay Finance API</p>
              </div>
              <button onClick={() => runSync('finances', () => fetch('/api/sync/finances', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({days:90})}))}
                disabled={!!syncing} className="btn-secondary text-xs">
                <RefreshCw size={12} className={syncing === 'finances' ? 'animate-spin' : ''}/>
                {syncing === 'finances' ? 'Syncing…' : 'Sync Finances'}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-50 border border-indigo-100">
              <div>
                <p className="text-sm font-medium text-indigo-900">Backfill Countries from eBay</p>
                <p className="text-xs text-indigo-600">Fetches buyer country for every eBay order going back to your oldest order. Runs in chunks — may take 30–60 seconds.</p>
              </div>
              <button onClick={() => runSync('countries', () => fetch('/api/sync/countries', {method:'POST'}))}
                disabled={!!syncing} className="btn-primary text-xs">
                <RefreshCw size={12} className={syncing === 'countries' ? 'animate-spin' : ''}/>
                {syncing === 'countries' ? 'Fetching…' : 'Backfill Countries'}
              </button>
            </div>
          </div>

          {result && (
            <div className={`mt-4 p-3 rounded-lg text-xs font-mono ${result.startsWith('Error') ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {result}
            </div>
          )}
        </div>

        {/* DB Info */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-2">Database</h2>
          <p className="text-xs text-slate-500 font-mono bg-slate-50 rounded-lg p-3">
            {process.env.DB_PATH || '../dropship-agent/backend/db/dropship.db'}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Shared with old agent. All existing orders, tokens and signing keys are imported automatically.
          </p>
        </div>
      </div>
    </Shell>
  )
}
