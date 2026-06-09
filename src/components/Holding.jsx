import { useEffect, useState } from 'react'
import { api } from '../lib/supabase'

// Live estimate of teams-per-player if the draw happened right now.
function estimate(n) {
  const base = Math.floor(48 / n)   // everyone gets at least this many
  const extra = 48 % n              // this many players get one more
  if (extra === 0) {
    return `If the draw happened now: ${n} ${n === 1 ? 'player' : 'players'} → ${base} teams each.`
  }
  return `If the draw happened now: ${extra} ${extra === 1 ? 'player' : 'players'} would get ${base + 1} teams and the rest ${base}.`
}

export default function Holding({ session }) {
  const [count, setCount] = useState(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      const players = await api.players()
      if (alive) setCount(players.length)
    }
    load()
    const t = setInterval(load, 8000) // light polling so the count ticks up live
    return () => { alive = false; clearInterval(t) }
  }, [])

  return (
    <div className="holding">
      <div className="kicker" style={{ letterSpacing: '.28em', color: 'var(--signal)', fontWeight: 800, fontSize: 11 }}>
        You're in, {session.name}
      </div>
      <h1 className="big">Waiting for<br /><em>the draw</em></h1>
      <p>
        <span className="pulse-dot" />
        All 48 teams are randomly shared out the day before kickoff. Everyone gets an
        equal share — within one team of each other, however many of us join.
      </p>
      <p>Come back once the draw is done and your teams will appear here.</p>

      <div className="count-pill">
        <b>{count == null ? '—' : count}</b>
        {count === 1 ? 'player so far' : 'players so far'}
      </div>

      {count > 0 && (
        <p style={{ marginTop: 18, fontSize: 14 }}>
          {estimate(count)}
        </p>
      )}
    </div>
  )
}
