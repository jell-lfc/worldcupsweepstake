import { useMemo, useState } from 'react'
import { api } from '../lib/supabase'
import { resolveBracket } from '../lib/logic'
import Flag from './Flag'

// small label: flag + name, or placeholder text if the team is undecided
function Lbl({ team, placeholder, align }) {
  if (!team) return <span>{placeholder || 'TBC'}</span>
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
      <Flag team={team} size={15} /> {team.name}
    </span>
  )
}

const KO_ROUNDS = [
  ['R32', 'Round of 32'], ['R16', 'Round of 16'], ['QF', 'Quarter-finals'],
  ['SF', 'Semi-finals'], ['3RD', 'Third place'], ['FINAL', 'Final'],
]

export default function KnockoutAdmin({ session, teams, fixtures, onChange, onFlash }) {
  const [mode, setMode] = useState('pairings') // 'pairings' | 'results'
  const bracket = useMemo(() => resolveBracket(teams, fixtures), [teams, fixtures])

  return (
    <section style={{ marginBottom: 30 }}>
      <h3 style={{ fontSize: 22, marginBottom: 8, color: 'var(--chalk)' }}>Knockouts</h3>
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab ${mode === 'pairings' ? 'active' : ''}`} style={subTab}
                onClick={() => setMode('pairings')}>Set R32 pairings</button>
        <button className={`tab ${mode === 'results' ? 'active' : ''}`} style={subTab}
                onClick={() => setMode('results')}>Enter KO results</button>
      </div>

      {mode === 'pairings'
        ? <Pairings session={session} teams={teams} fixtures={fixtures} onChange={onChange} onFlash={onFlash} />
        : <KoResults session={session} bracket={bracket} onChange={onChange} onFlash={onFlash} />}
    </section>
  )
}

// ---- R32 PAIRINGS ----
function Pairings({ session, teams, fixtures, onChange, onFlash }) {
  const r32 = fixtures.filter(f => f.stage === 'R32')
    .sort((a, b) => slotNum(a.slot) - slotNum(b.slot))
  const sortedTeams = [...teams].sort((a, b) => a.group_code.localeCompare(b.group_code) || a.name.localeCompare(b.name))

  return (
    <div>
      <p style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: 0 }}>
        Once the group stage finishes, set each Round-of-32 match from the official bracket.
        Winners then advance automatically through the rest of the rounds.
      </p>
      <div style={{ display: 'grid', gap: 8 }}>
        {r32.map(f => (
          <PairingRow key={f.id} fixture={f} teams={sortedTeams} session={session}
                      onChange={onChange} onFlash={onFlash} />
        ))}
      </div>
    </div>
  )
}

function PairingRow({ fixture, teams, session, onChange, onFlash }) {
  const [a, setA] = useState(fixture.team_a_id || '')
  const [b, setB] = useState(fixture.team_b_id || '')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!a || !b) { onFlash('err', 'Pick both teams.'); return }
    if (a === b) { onFlash('err', 'Two different teams, please.'); return }
    setBusy(true)
    const r = await api.setKoTeams(session.player_id, fixture.id, a, b)
    setBusy(false)
    if (r?.ok) { onFlash('ok', `${fixture.slot} set.`); onChange() } else onFlash('err', r?.error || 'Failed.')
  }

  const clear = async () => {
    setBusy(true)
    const r = await api.setKoTeams(session.player_id, fixture.id, null, null)
    setBusy(false)
    if (r?.ok) { setA(''); setB(''); onFlash('ok', `${fixture.slot} cleared.`); onChange() }
    else onFlash('err', r?.error || 'Failed.')
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr auto auto', gap: 8, alignItems: 'center',
                  padding: '8px 12px', background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 9 }}>
      <span style={{ fontSize: 11, color: 'var(--muted)', width: 48 }}>{fixture.slot}</span>
      <TeamSelect value={a} onChange={setA} teams={teams} placeholder={fixture.team_a_placeholder} />
      <span style={{ color: 'var(--muted)', fontSize: 12 }}>v</span>
      <TeamSelect value={b} onChange={setB} teams={teams} placeholder={fixture.team_b_placeholder} />
      <button className="btn" style={{ width: 'auto', padding: '7px 12px', fontSize: 12 }} onClick={save} disabled={busy}>Save</button>
      {(fixture.team_a_id || fixture.team_b_id) && (
        <button onClick={clear} disabled={busy} title="Clear"
                style={{ width: 26, height: 26, borderRadius: 7, background: 'transparent', color: 'var(--warn)', border: '1px solid var(--line)', cursor: 'pointer' }}>×</button>
      )}
    </div>
  )
}

function TeamSelect({ value, onChange, teams, placeholder }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
      <option value="">{placeholder || 'Select team'}</option>
      {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.group_code})</option>)}
    </select>
  )
}

// ---- KO RESULTS ----
function KoResults({ session, bracket, onChange, onFlash }) {
  return (
    <div>
      <p style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: 0 }}>
        Enter scores as teams progress. If a knockout match is level, fill the penalty boxes to decide the winner.
      </p>
      {KO_ROUNDS.map(([stage, label]) => {
        const matches = Object.values(bracket)
          .filter(b => b.fixture.stage === stage)
          .sort((a, b) => slotNum(a.fixture.slot) - slotNum(b.fixture.slot))
        return (
          <div key={stage} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', margin: '10px 0 8px' }}>{label}</div>
            <div style={{ display: 'grid', gap: 7 }}>
              {matches.map(m => <KoResultRow key={m.fixture.slot} m={m} session={session} onChange={onChange} onFlash={onFlash} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function KoResultRow({ m, session, onChange, onFlash }) {
  const { fixture, teamA, teamB } = m
  const [sa, setSa] = useState(fixture.score_a ?? '')
  const [sb, setSb] = useState(fixture.score_b ?? '')
  const [pa, setPa] = useState(fixture.pens_a ?? '')
  const [pb, setPb] = useState(fixture.pens_b ?? '')
  const [busy, setBusy] = useState(false)

  const ready = teamA && teamB
  const level = sa !== '' && sb !== '' && Number(sa) === Number(sb)

  const save = async () => {
    if (sa === '' || sb === '') { onFlash('err', 'Enter both scores.'); return }
    if (level && (pa === '' || pb === '')) { onFlash('err', 'Level match — enter penalties to decide it.'); return }
    setBusy(true)
    const r = await api.setResult(session.player_id, fixture.id, Number(sa), Number(sb),
      level ? Number(pa) : null, level ? Number(pb) : null, 'finished')
    setBusy(false)
    if (r?.ok) { onFlash('ok', 'Result saved.'); onChange() } else onFlash('err', r?.error || 'Failed.')
  }

  const clear = async () => {
    setBusy(true)
    const r = await api.setResult(session.player_id, fixture.id, null, null, null, null, 'scheduled')
    setBusy(false)
    if (r?.ok) { setSa(''); setSb(''); setPa(''); setPb(''); onFlash('ok', 'Cleared.'); onChange() } else onFlash('err', r?.error || 'Failed.')
  }

  return (
    <div style={{ padding: '8px 12px', background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 9,
                  opacity: ready ? 1 : 0.55 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: 8, alignItems: 'center' }}>
        <div style={{ textAlign: 'right', fontSize: 13 }}><Lbl team={teamA} placeholder={fixture.team_a_placeholder} align="right" /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <input value={sa} onChange={e => setSa(e.target.value)} disabled={!ready} inputMode="numeric" style={scoreBox} />
          <span style={{ color: 'var(--muted)' }}>v</span>
          <input value={sb} onChange={e => setSb(e.target.value)} disabled={!ready} inputMode="numeric" style={scoreBox} />
        </div>
        <div style={{ fontSize: 13 }}><Lbl team={teamB} placeholder={fixture.team_b_placeholder} /></div>
        <div style={{ display: 'flex', gap: 5 }}>
          <button className="btn" style={{ width: 'auto', padding: '6px 11px', fontSize: 12 }} onClick={save} disabled={busy || !ready}>Save</button>
          {fixture.status === 'finished' && (
            <button onClick={clear} disabled={busy} title="Clear"
                    style={{ width: 26, height: 26, borderRadius: 7, background: 'transparent', color: 'var(--warn)', border: '1px solid var(--line)', cursor: 'pointer' }}>×</button>
          )}
        </div>
      </div>
      {level && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 7, fontSize: 12, color: 'var(--muted)' }}>
          Penalties:
          <input value={pa} onChange={e => setPa(e.target.value)} inputMode="numeric" style={{ ...scoreBox, width: 34 }} />
          <span>v</span>
          <input value={pb} onChange={e => setPb(e.target.value)} inputMode="numeric" style={{ ...scoreBox, width: 34 }} />
        </div>
      )}
    </div>
  )
}

function slotNum(slot) { const m = slot.match(/-(\d+)$/); return m ? Number(m[1]) : 0 }

const subTab = { fontSize: 14, padding: '8px 14px' }
const selectStyle = {
  width: '100%', padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', color: 'var(--chalk)',
  background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 8, outline: 'none',
}
const scoreBox = {
  width: 40, textAlign: 'center', padding: '7px', fontSize: 14, fontFamily: 'inherit',
  color: 'var(--chalk)', background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 7,
}
