import { useMemo, useState } from 'react'
import { resolveBracket, routeSlots } from '../lib/logic'
import Flag from './Flag'

// Shared knockout bracket.
//  - `highlightTeamIds`: teams to badge (e.g. your teams or a player's).
//  - clicking a highlighted team isolates its route to the final.
//  - clicking any match opens the detail modal via `onOpenFixture`.
const ROUNDS = [
  { stage: 'R32', label: 'Round of 32' },
  { stage: 'R16', label: 'Round of 16' },
  { stage: 'QF', label: 'Quarter-finals' },
  { stage: 'SF', label: 'Semi-finals' },
  { stage: 'FINAL', label: 'Final' },
]

export default function Bracket({ teams, fixtures, highlightTeamIds = [] }) {
  const bracket = useMemo(() => resolveBracket(teams, fixtures), [teams, fixtures])
  const [selected, setSelected] = useState(null) // teamId whose route is isolated

  const highlightSet = useMemo(() => new Set(highlightTeamIds), [highlightTeamIds])
  const route = useMemo(() => (selected ? routeSlots(selected, bracket) : null), [selected, bracket])

  const hasAnyTeams = Object.values(bracket).some((b) => b.teamA || b.teamB)

  if (!hasAnyTeams) {
    return (
      <div className="stub">
        <h2>Knockout bracket</h2>
        <p>The bracket lights up once the group stage is done and the admin enters the Round of 32 pairings.</p>
      </div>
    )
  }

  const third = bracket['3RD']

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
          {selected ? 'Showing one route to the final.' : 'Tap one of your teams to trace its route to the final.'}
        </span>
        {selected && (
          <button className="btn secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}
                  onClick={() => setSelected(null)}>Clear route</button>
        )}
      </div>

      <div style={bracketScroll}>
        <div style={{ display: 'flex', gap: 22, minWidth: 'min-content' }}>
          {ROUNDS.map((round) => {
            const matches = Object.values(bracket)
              .filter((b) => b.fixture.stage === round.stage)
              .sort((a, b) => slotNum(a.fixture.slot) - slotNum(b.fixture.slot))
            return (
              <div key={round.stage} style={roundCol}>
                <div style={roundHead}>{round.label}</div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', flex: 1, gap: 10 }}>
                  {matches.map((m) => (
                    <MatchBox key={m.fixture.slot} m={m}
                              highlightSet={highlightSet} selected={selected} route={route}
                              onPickTeam={(tid) => setSelected(tid === selected ? null : tid)} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {third && (third.teamA || third.teamB) && (
        <div style={{ marginTop: 24, maxWidth: 280 }}>
          <div style={roundHead}>Third-place play-off</div>
          <MatchBox m={third} highlightSet={highlightSet} selected={selected} route={route}
                    onPickTeam={(tid) => setSelected(tid === selected ? null : tid)} />
        </div>
      )}
    </div>
  )
}

function MatchBox({ m, highlightSet, selected, route, onPickTeam }) {
  const { fixture, teamA, teamB, winner } = m
  const onRoute = route ? route.has(fixture.slot) : null
  const dimmed = route && !onRoute
  const done = fixture.status === 'finished' && fixture.score_a != null

  return (
    <div style={{
      ...matchBox,
      opacity: dimmed ? 0.28 : 1,
      borderColor: onRoute ? 'var(--signal)' : 'var(--line)',
      boxShadow: onRoute ? '0 0 0 1px var(--signal), 0 0 22px rgba(212,255,63,.15)' : 'none',
    }}>
      <TeamSlot team={teamA} placeholder={fixture.team_a_placeholder}
                score={done ? fixture.score_a : null} isWinner={winner && winner === fixture.team_a_id}
                highlightSet={highlightSet} selected={selected} onPickTeam={onPickTeam} />
      <div style={matchDivider} />
      <TeamSlot team={teamB} placeholder={fixture.team_b_placeholder}
                score={done ? fixture.score_b : null} isWinner={winner && winner === fixture.team_b_id}
                highlightSet={highlightSet} selected={selected} onPickTeam={onPickTeam} />
    </div>
  )
}

function TeamSlot({ team, placeholder, score, isWinner, highlightSet, selected, onPickTeam }) {
  const isHighlight = team && highlightSet.has(team.id)
  const isSelected = team && team.id === selected
  const clickable = !!team && isHighlight
  return (
    <div
      onClick={clickable ? (e) => { e.stopPropagation(); onPickTeam(team.id) } : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 7, padding: '6px 8px',
        cursor: clickable ? 'pointer' : 'default',
        background: isSelected ? 'rgba(212,255,63,.16)' : 'transparent',
        borderRadius: 6,
      }}
    >
      <span style={{ display: 'inline-flex' }}>{team ? <Flag team={team} size={16} /> : <span style={{ color: 'var(--muted)' }}>·</span>}</span>
      <span style={{
        flex: 1, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        color: team ? (isWinner ? 'var(--chalk)' : 'var(--muted)') : 'var(--muted)',
        fontWeight: isWinner || isSelected ? 700 : 400,
      }}>
        {team ? team.name : (placeholder || 'TBC')}
        {isHighlight && <span style={dot} />}
      </span>
      {score != null && (
        <span style={{ fontFamily: 'Anton', fontSize: 15, color: isWinner ? 'var(--signal)' : 'var(--muted)' }}>{score}</span>
      )}
    </div>
  )
}

function slotNum(slot) {
  const m = slot.match(/-(\d+)$/)
  return m ? Number(m[1]) : 0
}

const bracketScroll = { overflowX: 'auto', paddingBottom: 12, WebkitOverflowScrolling: 'touch' }
const roundCol = { display: 'flex', flexDirection: 'column', minWidth: 168, width: 168 }
const roundHead = {
  fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--muted)',
  marginBottom: 12, textAlign: 'center',
}
const matchBox = {
  position: 'relative', background: 'var(--ink-3)', border: '1px solid var(--line)',
  borderRadius: 9, padding: '3px', transition: 'opacity .2s, box-shadow .2s, border-color .2s',
}
const matchDivider = { height: 1, background: 'var(--line)', margin: '0 8px' }
const dot = { display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: 'var(--signal)', marginLeft: 6, verticalAlign: 'middle' }
