import { useState } from 'react'
import { flagCode } from '../lib/flags'

// Renders a real flag image (Windows has no flag emoji). Falls back to the
// two-letter code in a little chip if the image fails or the team is unknown.
export default function Flag({ team, size = 20 }) {
  const [err, setErr] = useState(false)
  const code = team ? flagCode(team) : null
  const h = Math.round(size * 0.7)

  if (!team || !code || err) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size, height: h, fontSize: 9, fontWeight: 700, letterSpacing: '.02em',
        background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 2,
        color: 'var(--muted)', verticalAlign: 'middle', textTransform: 'uppercase',
      }}>
        {team ? (code ? code.replace('gb-', '').slice(0, 3) : (team.fifa_code || '·')) : '·'}
      </span>
    )
  }

  return (
    <img
      src={`https://flagcdn.com/w${size * 2}/${code}.png`}
      width={size} height={h} alt=""
      onError={() => setErr(true)}
      style={{ borderRadius: 2, objectFit: 'cover', verticalAlign: 'middle', display: 'inline-block' }}
    />
  )
}
