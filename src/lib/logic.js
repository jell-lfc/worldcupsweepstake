// Pure functions: compute group standings and resolve the knockout bracket.

// ---- GROUP STANDINGS ----
// Returns, per group code, an array of rows sorted by WC tiebreakers.
export function computeStandings(teams, fixtures) {
  const byGroup = {}
  for (const t of teams) {
    if (!byGroup[t.group_code]) byGroup[t.group_code] = {}
    byGroup[t.group_code][t.id] = {
      team: t, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0,
    }
  }
  for (const f of fixtures) {
    if (f.stage !== 'group' || f.status !== 'finished') continue
    if (f.score_a == null || f.score_b == null) continue
    const g = f.group_code
    const a = byGroup[g]?.[f.team_a_id]
    const b = byGroup[g]?.[f.team_b_id]
    if (!a || !b) continue
    a.P++; b.P++
    a.GF += f.score_a; a.GA += f.score_b
    b.GF += f.score_b; b.GA += f.score_a
    if (f.score_a > f.score_b) { a.W++; b.L++; a.Pts += 3 }
    else if (f.score_a < f.score_b) { b.W++; a.L++; b.Pts += 3 }
    else { a.D++; b.D++; a.Pts++; b.Pts++ }
  }
  const out = {}
  for (const g of Object.keys(byGroup)) {
    const rows = Object.values(byGroup[g])
    for (const r of rows) r.GD = r.GF - r.GA
    rows.sort((x, y) =>
      y.Pts - x.Pts || y.GD - x.GD || y.GF - x.GF || x.team.name.localeCompare(y.team.name))
    out[g] = rows
  }
  return out
}

// ---- RESOLVE KNOCKOUT ----
// Walks the bracket, filling in winners as results are entered.
// Returns a map slot -> { fixture, teamA, teamB } with resolved team objects.
export function resolveBracket(teams, fixtures) {
  const teamById = Object.fromEntries(teams.map((t) => [t.id, t]))
  // clone KO fixtures so winner-propagation never mutates React state objects
  const koFixtures = fixtures.filter((f) => f.slot).map((f) => ({ ...f }))
  const bySlot = Object.fromEntries(koFixtures.map((f) => [f.slot, f]))

  const winnerOf = (f) => {
    if (!f || f.status !== 'finished' || f.score_a == null) return null
    if (f.score_a > f.score_b) return f.team_a_id
    if (f.score_b > f.score_a) return f.team_b_id
    if (f.pens_a != null && f.pens_b != null) return f.pens_a > f.pens_b ? f.team_a_id : f.team_b_id
    return null
  }
  const loserOf = (f) => {
    const w = winnerOf(f)
    if (!w) return null
    return w === f.team_a_id ? f.team_b_id : f.team_a_id
  }

  // propagate winners forward (multiple passes to cascade through rounds)
  for (let pass = 0; pass < 6; pass++) {
    for (const f of koFixtures) {
      if (!f.feeds_slot) continue
      const w = winnerOf(f)
      if (!w) continue
      const target = bySlot[f.feeds_slot]
      if (!target) continue
      if (f.feeds_side === 'a' && !target.team_a_id) target.team_a_id = w
      if (f.feeds_side === 'b' && !target.team_b_id) target.team_b_id = w
    }
    // third place: losers of the two semis
    const sf1 = bySlot['SF-1'], sf2 = bySlot['SF-2'], third = bySlot['3RD']
    if (third) {
      if (!third.team_a_id) third.team_a_id = loserOf(sf1)
      if (!third.team_b_id) third.team_b_id = loserOf(sf2)
    }
  }

  const result = {}
  for (const f of koFixtures) {
    result[f.slot] = {
      fixture: f,
      teamA: f.team_a_id ? teamById[f.team_a_id] : null,
      teamB: f.team_b_id ? teamById[f.team_b_id] : null,
      winner: winnerOf(f),
    }
  }
  return result
}

// ---- ROUTE TO FINAL for a given team ----
// Returns the ordered list of slots on this team's path through the bracket.
const STAGE_RANK = { R32: 0, R16: 1, QF: 2, SF: 3, FINAL: 4, '3RD': 9 }

export function routeToFinal(teamId, bracket) {
  const slots = Object.values(bracket)
  // start at the EARLIEST-round match containing this team (not whichever
  // comes first in array order)
  const containing = slots
    .filter((s) => s.fixture.team_a_id === teamId || s.fixture.team_b_id === teamId)
    .sort((a, b) => (STAGE_RANK[a.fixture.stage] ?? 99) - (STAGE_RANK[b.fixture.stage] ?? 99))
  let current = containing[0]
  const path = []
  const visited = new Set()
  while (current && !visited.has(current.fixture.slot)) {
    visited.add(current.fixture.slot)
    path.push(current.fixture.slot)
    const feeds = current.fixture.feeds_slot
    if (!feeds) break
    current = bracket[feeds]
  }
  return path
}

// Convenience: the set of slots on a team's route (for highlighting).
export function routeSlots(teamId, bracket) {
  return new Set(routeToFinal(teamId, bracket))
}
