import { useEffect, useState } from 'react'
import { api } from './lib/supabase'
import Auth from './components/Auth'
import Holding from './components/Holding'
import Admin from './components/Admin'
import YourTeams from './components/YourTeams'
import OtherTeams from './components/OtherTeams'

export default function App() {
  const [session, setSession] = useState(null)
  const [settings, setSettings] = useState(null)
  const [allocated, setAllocated] = useState(false)
  const [tab, setTab] = useState('your-teams')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ teams: [], fixtures: [], players: [], allocations: [] })

  // restore session + load settings/allocation state
  useEffect(() => {
    const saved = sessionStorage.getItem('wc_session')
    if (saved) { try { setSession(JSON.parse(saved)) } catch {} }
    refresh()
  }, [])

  const refresh = async () => {
    const [s, allocs, teams, fixtures, players] = await Promise.all([
      api.settings(), api.allocations(), api.teams(), api.fixtures(), api.players(),
    ])
    setSettings(s)
    setData({ teams, fixtures, players, allocations: allocs })
    setAllocated(s?.allocation_locked && (allocs?.length || 0) > 0)
    setLoading(false)
  }

  const logout = () => { sessionStorage.removeItem('wc_session'); setSession(null) }

  if (loading) {
    return <div className="auth-wrap"><div className="holding"><span className="pulse-dot" /> Loading…</div></div>
  }

  // not logged in
  if (!session) {
    return <Auth signupOpen={settings?.signup_open ?? true} onAuthed={(s) => { setSession(s); refresh() }} />
  }

  // logged in, but the draw hasn't happened yet → holding screen
  // (admins skip this so they can reach the Admin panel and run the draw)
  if (!allocated && !session.is_admin) {
    return (
      <div className="shell">
        <BrandBar session={session} onLogout={logout} />
        <div className="panel"><Holding session={session} /></div>
      </div>
    )
  }

  // main app (tabs). Non-admins see Your Teams + Other Teams once allocated.
  const tabs = [
    ...(allocated ? [['your-teams', 'Your Teams'], ['other-teams', 'Other Teams']] : []),
    ...(session.is_admin ? [['admin', 'Admin']] : []),
  ]
  // make sure the selected tab actually exists
  const activeTab = tabs.find(([id]) => id === tab) ? tab : (tabs[0]?.[0] || 'admin')

  return (
    <div className="shell">
      <BrandBar session={session} onLogout={logout} />
      <div className="tabs">
        {tabs.map(([id, label]) => (
          <button key={id} className={`tab ${activeTab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="panel">
        {activeTab === 'your-teams' && (
          <YourTeams session={session} teams={data.teams} fixtures={data.fixtures} allocations={data.allocations} />
        )}
        {activeTab === 'other-teams' && (
          <OtherTeams session={session} teams={data.teams} fixtures={data.fixtures}
                      players={data.players} allocations={data.allocations} />
        )}
        {activeTab === 'admin' && (
          <Admin session={session} teams={data.teams} fixtures={data.fixtures} settings={settings}
                 players={data.players} allocations={data.allocations} onChange={refresh} />
        )}
      </div>

      {!allocated && session.is_admin && (
        <div className="foot">The draw hasn't run yet — head to the Admin tab to open sign-ups, then run it.</div>
      )}

      <div className="foot">World Cup 2026 Sweepstake · {settings?.tournament_name}</div>
    </div>
  )
}

function BrandBar({ session, onLogout }) {
  return (
    <div className="brandbar">
      <div>
        <div className="kicker">World Cup 2026</div>
        <h1>The <em>Sweepstake</em></h1>
      </div>
      <div className="whoami">
        <b>{session.name}{session.is_admin ? ' · admin' : ''}</b>
        <button className="linkish" onClick={onLogout}>Log out</button>
      </div>
    </div>
  )
}
