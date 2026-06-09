import { useMemo, useState } from 'react'
import { computeStandings } from '../lib/logic'
import Bracket from './Bracket'
import Flag from './Flag'

export default function YourTeams({ session, teams, fixtures, allocations }) {
  const teamById = useMemo(() => Object.fromEntries(teams.map(t => [t.id, t])), [teams])
  const [view, setView] = useState('groups') // 'groups' | 'bracket'

  const myTeams = useMemo(() => {
    const ids = allocations.filter(a => a.player_id === session.player_id).map(a => a.team_id)
    return ids.map(id => teamById[id]).filter(Boolean)
      .sort((a, b) => a.group_code.localeCompare(b.group_code) || a.name.localeCompare(b.name))
  }, [allocations, teamById, session.player_id])

  const standings = useMemo(() => computeStandings(teams, fixtures), [teams, fixtures])

  if (!myTeams.length) {
    return <div className="stub"><h2>Your Teams</h2><p>No teams allocated to you yet.</p></div>
  }

  return (
    <div style={{ padding: '26px 24px' }}>
      <div style={{ fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
        {myTeams.length} teams · {session.name}
      </div>
      <h2 style={{ fontSize: 30, marginBottom: 18, color: 'var(--chalk)' }}>Your Teams</h2>

      <div className="tabs" style={{ marginBottom: 22 }}>
        <button className={`tab ${view === 'groups' ? 'active' : ''}`} style={{ fontSize: 15, padding: '8px 14px' }}
                onClick={() => setView('groups')}>Groups</button>
        <button className={`tab ${view === 'bracket' ? 'active' : ''}`} style={{ fontSize: 15, padding: '8px 14px' }}
                onClick={() => setView('bracket')}>Knockout bracket</button>
      </div>

      {view === 'bracket' ? (
        <Bracket teams={teams} fixtures={fixtures}
                 highlightTeamIds={myTeams.map(t => t.id)} />
      ) : (
        <div style={{ display: 'grid', gap: 24 }}>
          {myTeams.map(team => (
            <TeamCard key={team.id} team={team} fixtures={fixtures} teamById={teamById}
                      standing={standings[team.group_code]} />
          ))}
        </div>
      )}
    </div>
  )
}

function TeamCard({ team, fixtures, teamById, standing }) {
  const myFixtures = fixtures
    .filter(f => f.stage === 'group' && (f.team_a_id === team.id || f.team_b_id === team.id))

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
      {/* header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
        background: 'linear-gradient(90deg, var(--turf-dim), transparent)',
        borderBottom: '1px solid var(--line)',
      }}>
        <span style={{ display: 'inline-flex' }}><Flag team={team} size={34} /></span>
        <div>
          <div style={{ fontFamily: 'Anton', fontSize: 24, color: 'var(--chalk)', textTransform: 'uppercase' }}>
            {team.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Group {team.group_code}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0 }}>
        {/* fixtures */}
        <div style={{ padding: '14px 18px' }}>
          <SectionLabel>Fixtures</SectionLabel>
          <div style={{ display: 'grid', gap: 7 }}>
            {myFixtures.map(f => <FixtureLine key={f.id} f={f} team={team} teamById={teamById} />)}
          </div>
        </div>

        {/* standings */}
        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--line)' }}>
          <SectionLabel>Group {team.group_code} standings</SectionLabel>
          <StandingsTable rows={standing} highlightId={team.id} />
        </div>
      </div>
    </div>
  )
}

function FixtureLine({ f, team, teamById }) {
  const a = teamById[f.team_a_id]
  const b = teamById[f.team_b_id]
  const done = f.status === 'finished' && f.score_a != null
  const isA = f.team_a_id === team.id
  const opp = isA ? b : a
  const mine = isA ? f.score_a : f.score_b
  const theirs = isA ? f.score_b : f.score_a
  let outcome = null
  if (done) outcome = mine > theirs ? 'W' : mine < theirs ? 'L' : 'D'
  const oColor = outcome === 'W' ? 'var(--signal)' : outcome === 'L' ? 'var(--warn)' : 'var(--muted)'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, fontSize: 14,
      padding: '8px 12px', background: 'var(--ink-3)', borderRadius: 8,
    }}>
      <span style={{ color: 'var(--muted)', fontSize: 12, width: 16 }}>v</span>
      <span style={{ flex: 1, display: 'inline-flex', alignItems: 'center', gap: 7 }}><Flag team={opp} size={16} /> {opp?.name}</span>
      {done ? (
        <>
          <span style={{ fontFamily: 'Anton', fontSize: 16 }}>{mine}–{theirs}</span>
          <span style={{ color: oColor, fontWeight: 800, width: 16, textAlign: 'center' }}>{outcome}</span>
        </>
      ) : (
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>
          {f.kickoff_bst ? new Date(f.kickoff_bst).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'TBC'}
        </span>
      )}
    </div>
  )
}

function StandingsTable({ rows, highlightId }) {
  if (!rows) return null
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ color: 'var(--muted)', textAlign: 'right' }}>
          <th style={{ textAlign: 'left', fontWeight: 600, padding: '4px 6px' }}>Team</th>
          {['P', 'W', 'D', 'L', 'GD', 'Pts'].map(h => (
            <th key={h} style={{ fontWeight: 600, padding: '4px 6px' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const hl = r.team.id === highlightId
          const qualifies = i < 2
          return (
            <tr key={r.team.id} style={{
              background: hl ? 'rgba(212,255,63,.10)' : 'transparent',
              color: hl ? 'var(--chalk)' : 'var(--muted)',
            }}>
              <td style={{ padding: '6px', textAlign: 'left' }}>
                <span style={{
                  display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                  marginRight: 7, background: qualifies ? 'var(--signal)' : 'transparent',
                }} />
                <Flag team={r.team} size={15} /> <span style={{ fontWeight: hl ? 700 : 400, marginLeft: 4 }}>{r.team.name}</span>
              </td>
              <td style={cell}>{r.P}</td><td style={cell}>{r.W}</td><td style={cell}>{r.D}</td>
              <td style={cell}>{r.L}</td><td style={cell}>{r.GD > 0 ? '+' + r.GD : r.GD}</td>
              <td style={{ ...cell, fontWeight: 800, color: hl ? 'var(--signal)' : 'var(--chalk)' }}>{r.Pts}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

const cell = { padding: '6px', textAlign: 'right' }
function SectionLabel({ children }) {
  return <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>{children}</div>
}
