'use client'

import { Suspense, useState, FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Zap } from 'lucide-react'

function LoginForm() {
  const router      = useRouter()
  const params      = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const r = await fetch('/api/session/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const d = await r.json()
    setLoading(false)
    if (!r.ok) { setError(d.error || 'Login failed'); return }
    router.push(params.get('from') || '/dashboard')
    router.refresh()
  }

  return (
    <div className="card p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Username</label>
          <input
            className="input"
            autoComplete="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <p className="text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mb-3 shadow-lg">
            <Zap size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Dropship Intelligence</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your account</p>
        </div>

        <Suspense fallback={<div className="card p-6 h-48 animate-pulse bg-slate-50"/>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
