import { useState } from 'react'
import { api } from '../lib/supabase'

export default function Auth({ onAuthed, signupOpen }) {
  const [mode, setMode] = useState('signup') // 'signup' | 'login'
  const [name, setName] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    setErr('')
    if (!name.trim() || !pw) { setErr('Enter a name and password.'); return }
    setBusy(true)
    const fn = mode === 'signup' ? api.signup : api.login
    const res = await fn(name.trim(), pw)
    setBusy(false)
    if (!res || !res.ok) { setErr((res && res.error) || 'Something went wrong.'); return }
    // persist a tiny session
    const session = { player_id: res.player_id, name: res.name, is_admin: res.is_admin }
    sessionStorage.setItem('wc_session', JSON.stringify(session))
    onAuthed(session)
  }

  const onKey = (e) => { if (e.key === 'Enter') submit() }

  return (
    <div className="auth-wrap">
      <div className="panel auth-card">
        <div className="kicker">World Cup 2026 · USA · Canada · Mexico</div>
        <h1>The <em>Sweep<br />stake</em></h1>
        <p className="sub">
          {mode === 'signup'
            ? 'Pick a name and a password to join. Teams are drawn the day before kickoff.'
            : 'Welcome back. Log in to see your teams.'}
        </p>

        {err && <div className="notice err">{err}</div>}
        {mode === 'signup' && !signupOpen && (
          <div className="notice err">Sign-ups are closed — the draw may already be done. Try logging in.</div>
        )}

        <div className="field">
          <label>Your name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onKey}
                 placeholder="e.g. Joe" autoComplete="username" />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={onKey}
                 placeholder="at least 4 characters" autoComplete="current-password" />
        </div>

        <button className="btn" onClick={submit}
                disabled={busy || (mode === 'signup' && !signupOpen)}>
          {busy ? 'Working…' : mode === 'signup' ? 'Join the sweepstake' : 'Log in'}
        </button>

        <div className="switcher">
          {mode === 'signup' ? (
            <>Already joined? <button onClick={() => { setMode('login'); setErr('') }}>Log in</button></>
          ) : (
            <>Need an account? <button onClick={() => { setMode('signup'); setErr('') }}>Sign up</button></>
          )}
        </div>
      </div>
    </div>
  )
}
