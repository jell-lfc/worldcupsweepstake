// Maps each team to a flagcdn code (ISO 3166-1 alpha-2, or GB subdivisions).
// Used to render real flag images, because Windows doesn't ship flag emoji.
const FLAG_CODES = {
  // Group A
  'Mexico': 'mx', 'South Korea': 'kr', 'South Africa': 'za', 'Czechia': 'cz',
  // B
  'Canada': 'ca', 'Switzerland': 'ch', 'Qatar': 'qa', 'Bosnia and Herzegovina': 'ba',
  // C
  'Brazil': 'br', 'Morocco': 'ma', 'Scotland': 'gb-sct', 'Haiti': 'ht',
  // D
  'USA': 'us', 'Paraguay': 'py', 'Australia': 'au', 'Türkiye': 'tr',
  // E
  'Germany': 'de', 'Ecuador': 'ec', 'Ivory Coast': 'ci', 'Curaçao': 'cw',
  // F
  'Netherlands': 'nl', 'Japan': 'jp', 'Sweden': 'se', 'Tunisia': 'tn',
  // G
  'Belgium': 'be', 'Egypt': 'eg', 'Iran': 'ir', 'New Zealand': 'nz',
  // H
  'Spain': 'es', 'Uruguay': 'uy', 'Saudi Arabia': 'sa', 'Cape Verde': 'cv',
  // I
  'France': 'fr', 'Senegal': 'sn', 'Norway': 'no', 'Iraq': 'iq',
  // J
  'Argentina': 'ar', 'Austria': 'at', 'Algeria': 'dz', 'Jordan': 'jo',
  // K
  'Portugal': 'pt', 'Colombia': 'co', 'DR Congo': 'cd', 'Uzbekistan': 'uz',
  // L
  'England': 'gb-eng', 'Croatia': 'hr', 'Ghana': 'gh', 'Panama': 'pa',
}

export function flagCode(team) {
  if (!team) return null
  return FLAG_CODES[team.name] || null
}

export function flagUrl(team, width = 40) {
  const code = flagCode(team)
  return code ? `https://flagcdn.com/w${width}/${code}.png` : null
}
