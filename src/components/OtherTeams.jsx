import { useMemo, useState } from 'react'
import Bracket from './Bracket'
import Flag from './Flag'

export default function OtherTeams({ session, teams, fixtures, players, allocations }) {
  const teamById = useMemo(() => Object.fromEntries(teams.map(t => [t.id, t])), [teams])

  const teamsByPlayer = useMemo(() => {
    const m = {}
    for (const a of allocations) {
      if (!m[a.player_id]) m[a.player_id] = []
      const t = teamById[a.team_id]
      if (t) m[a.player_id].push(t)
    }
    for (const k of Object.keys(m)) m[k].sort((x, y) => x.group_code.localeCompare(y.group_code) || x.name.localeCompare(y.name))
    return m
  }, [allocations, teamById])

  // default to first player who isn't me, else me
  const others = players.filter(p => p.id !== session.player_id)
  const [picked, setPicked] = useState((others[0] || players[0])?.id || '')

  const pickedTeams = teamsByPlayer[picked] || []
  const pickedPlayer = players.find(p => p.id === picked)

  if (!players.length) {
    return <div className="stub"><h2>Other Teams</h2><p>No players yet.</p></div>
  }

  return (
    <div style={{ padding: '26px 24px' }}>
      <h2 style={{ fontSize: 30, marginBottom: 6, color: 'var(--chalk)' }}>Other Teams</h2>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 0, marginBottom: 18 }}>
        Pick a player to see their teams and trace their routes to the final.
      </p>

      {/* player chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {players.map(p => (
          <button key={p.id} onClick={() => setPicked(p.id)} style={{
            padding: '8px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 13,
            fontFamily: 'inherit',
            background: picked === p.id ? 'var(--signal)' : 'var(--ink-3)',
            color: picked === p.id ? 'var(--ink)' : 'var(--chalk)',
            border: '1px solid ' + (picked === p.id ? 'var(--signal)' : 'var(--line)'),
            fontWeight: picked === p.id ? 700 : 400,
          }}>
            {p.name}{p.id === session.player_id ? ' (you)' : ''}
          </button>
        ))}
      </div>

      {/* their teams */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
          {pickedPlayer?.name}'s teams · {pickedTeams.length}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {pickedTeams.map(t => (
            <span key={t.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px',
              background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13,
            }}>
              <Flag team={t} size={16} /> {t.name} <span style={{ color: 'var(--muted)', fontSize: 11 }}>{t.group_code}</span>
            </span>
          ))}
        </div>
      </div>

      {/* bracket with their teams highlighted */}
      <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14 }}>
        Bracket — {pickedPlayer?.name}'s teams highlighted
      </div>
      <Bracket teams={teams} fixtures={fixtures}
               highlightTeamIds={pickedTeams.map(t => t.id)} />
    </div>
  )
}
