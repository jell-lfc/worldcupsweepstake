import { createClient } from '@supabase/supabase-js'

// ⚠️ Fill these from your NEW Supabase project:
//   Project Settings → API → Project URL and the "anon / public" key.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://YOUR-PROJECT.supabase.co'
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON || 'YOUR_ANON_KEY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

// ---- RPC wrappers ----
const rpc = async (fn, args) => {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) return { ok: false, error: error.message }
  return data
}

export const api = {
  signup: (name, password) => rpc('signup', { p_name: name, p_password: password }),
  login: (name, password) => rpc('login', { p_name: name, p_password: password }),
  setSettings: (adminId, signupOpen, locked) =>
    rpc('set_settings', { p_admin_id: adminId, p_signup_open: signupOpen, p_locked: locked }),
  runAllocation: (adminId) => rpc('run_allocation', { p_admin_id: adminId }),
  resetAllocation: (adminId) => rpc('reset_allocation', { p_admin_id: adminId }),
  clearAllResults: (adminId) => rpc('clear_all_results', { p_admin_id: adminId }),
  setResult: (adminId, fixtureId, a, b, pensA = null, pensB = null, status = 'finished') =>
    rpc('set_result', {
      p_admin_id: adminId, p_fixture_id: fixtureId,
      p_score_a: a, p_score_b: b, p_pens_a: pensA, p_pens_b: pensB, p_status: status,
    }),
  setKoTeams: (adminId, fixtureId, teamA, teamB) =>
    rpc('set_ko_teams', { p_admin_id: adminId, p_fixture_id: fixtureId, p_team_a_id: teamA, p_team_b_id: teamB }),
  setFixtureInfo: (adminId, fixtureId, kickoff, channel, venue) =>
    rpc('set_fixture_info', {
      p_admin_id: adminId, p_fixture_id: fixtureId,
      p_kickoff: kickoff, p_channel: channel, p_venue: venue,
    }),

  // ---- reads ----
  async settings() {
    const { data } = await supabase.from('settings').select('*').eq('id', 1).single()
    return data
  },
  async teams() {
    const { data } = await supabase.from('teams').select('*').order('group_code').order('name')
    return data || []
  },
  async fixtures() {
    const { data } = await supabase.from('fixtures').select('*')
    return data || []
  },
  async allocations() {
    const { data } = await supabase.from('allocations').select('*')
    return data || []
  },
  async players() {
    const { data } = await supabase.from('players_public').select('*').order('name')
    return data || []
  },
}
