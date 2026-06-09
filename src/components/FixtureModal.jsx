import { useState } from 'react'
import { api } from '../lib/supabase'
import Flag from './Flag'

// Shows match details. `entry` is { fixture, teamA, teamB } (teams may be null
// for undecided knockout slots). Admins get inline editing of time/channel/venue.
export default function FixtureModal({ entry, isAdmin, playerId, onClose, onSaved }) {
  const { fixture, teamA, teamB } = entry
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // datetime-local wants "YYYY-MM-DDTHH:mm" in local time
  const toLocalInput = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const [kickoff, setKickoff] = useState(toLocalInput(fixture.kickoff_bst))
  const [channel, setChannel] = useState(fixture.uk_channel || '')
  const [venue, setVenue] = useState(fixture.venue || '')

  const labelA = teamA
    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}><Flag team={teamA} size={20} /> {teamA.name}</span>
    : <span>{fixture.team_a_placeholder || 'TBC'}</span>
  const labelB = teamB
    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Flag team={teamB} size={20} /> {teamB.name}</span>
    : <span>{fixture.team_b_placeholder || 'TBC'}</span>
  const done = fixture.status === 'finished' && fixture.score_a != null

  const stageLabel = {
    group: `Group ${fixture.group_code}`, R32: 'Round of 32', R16: 'Round of 16',
    QF: 'Quarter-final', SF: 'Semi-final', '3RD': 'Third place', FINAL: 'Final',
  }[fixture.stage] || fixture.stage

  const kickoffText = fixture.kickoff_bst
    ? new Date(fixture.kickoff_bst).toLocaleString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit',
      }) + ' BST'
    : 'Kick-off TBC'

  const save = async () => {
    setBusy(true); setErr('')
    const iso = kickoff ? new Date(kickoff).toISOString() : null
    const r = await api.setFixtureInfo(playerId, fixture.id, iso, channel, venue)
    setBusy(false)
    if (r?.ok) { setEditing(false); onSaved() } else setErr(r?.error || 'Failed.')
  }

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} className="panel" style={modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div style={{ fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--signal)' }}>
            {stageLabel}
          </div>
          <button onClick={onClose} style={closeBtn}>×</button>
        </div>

        {/* scoreline */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, margin: '18px 0' }}>
          <div style={{ textAlign: 'right', fontSize: 17 }}>{labelA}</div>
          <div style={{ fontFamily: 'Anton', fontSize: 30, color: 'var(--chalk)' }}>
            {done ? `${fixture.score_a}–${fixture.score_b}` : 'v'}
          </div>
          <div style={{ fontSize: 17 }}>{labelB}</div>
        </div>
        {done && fixture.pens_a != null && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginTop: -10, marginBottom: 8 }}>
            ({fixture.pens_a}–{fixture.pens_b} on penalties)
          </div>
        )}

        {/* details */}
        {!editing && (
          <div style={{ display: 'grid', gap: 8, fontSize: 14, marginTop: 6 }}>
            <Row label="Kick-off">{kickoffText}</Row>
            <Row label="UK channel">{fixture.uk_channel || '—'}</Row>
            <Row label="Venue">{fixture.venue || '—'}</Row>
          </div>
        )}

        {/* admin editor */}
        {isAdmin && !editing && (
          <button className="btn secondary" style={{ width: 'auto', padding: '9px 16px', fontSize: 13, marginTop: 18 }}
                  onClick={() => setEditing(true)}>Edit time / channel</button>
        )}
        {isAdmin && editing && (
          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            {err && <div className="notice err">{err}</div>}
            <label style={lbl}>Kick-off (BST)
              <input type="datetime-local" value={kickoff} onChange={(e) => setKickoff(e.target.value)} style={inp} />
            </label>
            <label style={lbl}>UK channel
              <input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="e.g. BBC One / ITV1" style={inp} />
            </label>
            <label style={lbl}>Venue
              <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. MetLife Stadium" style={inp} />
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" style={{ width: 'auto', padding: '10px 18px', fontSize: 14 }} onClick={save} disabled={busy}>Save</button>
              <button className="btn secondary" style={{ width: 'auto', padding: '10px 18px', fontSize: 14 }} onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: 7 }}>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{ color: 'var(--chalk)' }}>{children}</span>
    </div>
  )
}

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(3px)',
  display: 'grid', placeItems: 'center', zIndex: 50, padding: 20,
}
const modal = { width: '100%', maxWidth: 440, padding: '22px 24px' }
const closeBtn = {
  background: 'none', border: 'none', color: 'var(--muted)', fontSize: 26, lineHeight: 1,
  cursor: 'pointer', padding: 0, marginTop: -4,
}
const lbl = { display: 'grid', gap: 6, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)' }
const inp = {
  padding: '11px 13px', fontSize: 14, fontFamily: 'inherit', color: 'var(--chalk)',
  background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 9, outline: 'none',
}
