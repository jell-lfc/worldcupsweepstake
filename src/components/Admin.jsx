import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/supabase'
import KnockoutAdmin from './KnockoutAdmin'
import Flag from './Flag'

export default function Admin({ session, teams, fixtures, settings, players, allocations, onChange }) {
  const [msg, setMsg] = useState(null) // {type, text}
  const [busy, setBusy] = useState(false)

  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000) }

  const teamById = useMemo(() => Object.fromEntries(teams.map(t => [t.id, t])), [teams])

  // ---- settings ----
  const toggleSignup = async () => {
    setBusy(true)
    const r = await api.setSettings(session.player_id, !settings.signup_open, settings.allocation_locked)
    setBusy(false)
    if (r?.ok) { flash('ok', `Sign-ups ${!settings.signup_open ? 'opened' : 'closed'}.`); onChange() }
    else flash('err', r?.error || 'Failed.')
  }

  // ---- draw ----
  const runDraw = async () => {
    if (allocations.length > 0) { flash('err', 'Draw already done. Reset first to re-run.'); return }
    if (!confirm(`Run the draw for ${players.length} player(s)? This locks teams in and closes sign-ups.`)) return
    setBusy(true)
    const r = await api.runAllocation(session.player_id)
    setBusy(false)
    if (r?.ok) { flash('ok', `Draw complete — ${r.teams} teams across ${r.players} players.`); onChange() }
    else flash('err', r?.error || 'Failed.')
  }

  const resetDraw = async () => {
    if (!confirm('Clear the draw and re-open sign-ups? Use this for testing only.')) return
    setBusy(true)
    const r = await api.resetAllocation(session.player_id)
    setBusy(false)
    if (r?.ok) { flash('ok', 'Draw cleared, sign-ups re-opened.'); onChange() }
    else flash('err', r?.error || 'Failed.')
  }

  const clearAll = async () => {
    if (!confirm('Blank EVERY score and set all matches back to scheduled? Testing only.')) return
    setBusy(true)
    const r = await api.clearAllResults(session.player_id)
    setBusy(false)
    if (r?.ok) { flash('ok', 'All results cleared.'); onChange() }
    else flash('err', r?.error || 'Failed.')
  }

  // who got what is computed inline below

  return (
    <div style={{ padding: '26px 24px' }}>
      {msg && <div className={`notice ${msg.type === 'ok' ? 'ok' : 'err'}`}>{msg.text}</div>}

      {/* ---- CONTROLS ---- */}
      <section style={section}>
        <h3 style={h3}>Sign-ups &amp; Draw</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={pill}>
            Sign-ups: <b style={{ color: settings.signup_open ? 'var(--signal)' : 'var(--warn)' }}>
              {settings.signup_open ? 'OPEN' : 'CLOSED'}</b>
          </span>
          <span style={pill}>Players: <b>{players.length}</b></span>
          <span style={pill}>
            Draw: <b style={{ color: allocations.length ? 'var(--signal)' : 'var(--muted)' }}>
              {allocations.length ? 'DONE' : 'not yet'}</b>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          <button className="btn secondary" style={btnAuto} onClick={toggleSignup} disabled={busy}>
            {settings.signup_open ? 'Close sign-ups' : 'Open sign-ups'}
          </button>
          <button className="btn" style={btnAuto} onClick={runDraw}
                  disabled={busy || allocations.length > 0}>
            Run the draw
          </button>
          {allocations.length > 0 && (
            <button className="btn secondary" style={{ ...btnAuto, borderColor: 'var(--warn)', color: 'var(--warn)' }}
                    onClick={resetDraw} disabled={busy}>
              Reset draw (testing)
            </button>
          )}
        </div>

        {allocations.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
              Who got what
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {players.map(p => {
                const owned = allocations.filter(a => a.player_id === p.id).map(a => teamById[a.team_id]).filter(Boolean)
                if (!owned.length) return null
                return (
                  <div key={p.id} style={{ fontSize: 14 }}>
                    <b style={{ color: 'var(--chalk)' }}>{p.name}</b>{p.is_admin ? ' ·admin' : ''}{'  '}
                    <span style={{ color: 'var(--muted)' }}>
                      {owned.map(t => (
                        <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginRight: 12, whiteSpace: 'nowrap' }}>
                          <Flag team={t} size={14} /> {t.name}
                        </span>
                      ))}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* ---- GROUP RESULTS ---- */}
      <section style={section}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ ...h3, marginBottom: 0 }}>Enter group results</h3>
          <button className="btn secondary"
                  style={{ ...btnAuto, padding: '8px 14px', fontSize: 13, borderColor: 'var(--warn)', color: 'var(--warn)' }}
                  onClick={clearAll} disabled={busy}>
            Clear all results
          </button>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: 10 }}>
          Standings update automatically as you save. Use the × on a match to blank that one, or
          Clear all results to wipe the slate. Knockout results &amp; R32 pairings come next.
        </p>
        <GroupResults session={session} teams={teams} fixtures={fixtures} teamById={teamById}
                      onSaved={() => { flash('ok', 'Result saved.'); onChange() }}
                      onError={(e) => flash('err', e)} />
      </section>

      {/* ---- KNOCKOUTS ---- */}
      <KnockoutAdmin session={session} teams={teams} fixtures={fixtures}
                     onChange={onChange} onFlash={flash} />
    </div>
  )
}

function GroupResults({ session, teams, fixtures, teamById, onSaved, onError }) {
  const groups = [...new Set(teams.map(t => t.group_code))].sort()
  const [openGroup, setOpenGroup] = useState(groups[0] || 'A')
  const groupFixtures = fixtures
    .filter(f => f.stage === 'group' && f.group_code === openGroup)

  return (
    <div>
      <div className="tabs" style={{ marginBottom: 16 }}>
        {groups.map(g => (
          <button key={g} className={`tab ${openGroup === g ? 'active' : ''}`}
                  style={{ fontSize: 14, padding: '8px 12px' }} onClick={() => setOpenGroup(g)}>
            {g}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {groupFixtures.map(f => (
          <ResultRow key={f.id} fixture={f} teamById={teamById} session={session}
                     onSaved={onSaved} onError={onError} />
        ))}
      </div>
    </div>
  )
}

function ResultRow({ fixture, teamById, session, onSaved, onError }) {
  const a = teamById[fixture.team_a_id]
  const b = teamById[fixture.team_b_id]
  const [sa, setSa] = useState(fixture.score_a ?? '')
  const [sb, setSb] = useState(fixture.score_b ?? '')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (sa === '' || sb === '') { onError('Enter both scores.'); return }
    setBusy(true)
    const r = await api.setResult(session.player_id, fixture.id, Number(sa), Number(sb), null, null, 'finished')
    setBusy(false)
    if (r?.ok) onSaved(); else onError(r?.error || 'Failed.')
  }

  const clear = async () => {
    setBusy(true)
    const r = await api.setResult(session.player_id, fixture.id, null, null, null, null, 'scheduled')
    setBusy(false)
    if (r?.ok) { setSa(''); setSb(''); onSaved() } else onError(r?.error || 'Failed.')
  }

  const done = fixture.status === 'finished'

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', alignItems: 'center', gap: 10,
      padding: '10px 14px', background: 'var(--ink-3)', border: '1px solid var(--line)',
      borderRadius: 10, opacity: done ? 1 : 0.95,
    }}>
      <div style={{ textAlign: 'right', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 7, justifyContent: 'flex-end' }}><Flag team={a} size={16} /> {a?.name}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input value={sa} onChange={e => setSa(e.target.value)} inputMode="numeric"
               style={scoreBox} />
        <span style={{ color: 'var(--muted)' }}>v</span>
        <input value={sb} onChange={e => setSb(e.target.value)} inputMode="numeric"
               style={scoreBox} />
      </div>
      <div style={{ fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 7 }}><Flag team={b} size={16} /> {b?.name}</div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button className="btn" style={{ width: 'auto', padding: '8px 14px', fontSize: 13 }}
                onClick={save} disabled={busy}>
          {done ? 'Update' : 'Save'}
        </button>
        {done && (
          <button onClick={clear} disabled={busy} title="Clear this result"
                  style={{
                    width: 30, height: 30, borderRadius: 8, cursor: 'pointer',
                    background: 'transparent', color: 'var(--warn)', border: '1px solid var(--line)',
                    fontSize: 15, lineHeight: 1,
                  }}>×</button>
        )}
      </div>
    </div>
  )
}

const section = { marginBottom: 30, paddingBottom: 24, borderBottom: '1px solid var(--line)' }
const h3 = { fontSize: 22, marginBottom: 14, color: 'var(--chalk)' }
const pill = { padding: '7px 13px', background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 999, fontSize: 13 }
const btnAuto = { width: 'auto', padding: '11px 18px', fontSize: 15 }
const scoreBox = {
  width: 44, textAlign: 'center', padding: '8px', fontSize: 15, fontFamily: 'inherit',
  color: 'var(--chalk)', background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 8,
}
