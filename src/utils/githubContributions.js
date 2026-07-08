// Pure, dependency-free functions for working with a normalized GitHub
// contribution calendar (see the shape written by
// scripts/update-github-data.mjs and read by src/hooks/useGitHubData.js).
// Every date here is handled as a plain "YYYY-MM-DD" calendar string —
// never passed through the visitor's local Date parsing — specifically so
// a contribution can never silently shift to the wrong day because of the
// browser's timezone.

// Frontend-owned vocabulary (translated once, at generation time, from
// GitHub's own `ContributionLevel` GraphQL enum) so nothing downstream of
// this file needs to know GitHub's enum names.
export const CONTRIBUTION_LEVELS = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'];

const LEVEL_RANK = {
  NONE: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  VERY_HIGH: 4,
};

const LEVEL_LABEL = {
  NONE: 'No contributions',
  LOW: 'Low activity',
  MEDIUM: 'Moderate activity',
  HIGH: 'High activity',
  VERY_HIGH: 'Very high activity',
};

// Translates GitHub's actual GraphQL enum (FIRST_QUARTILE, etc.) into the
// stable vocabulary above — the one place that mapping lives, so both the
// generation script and (defensively) the frontend can reuse it.
export function mapGraphQLContributionLevel(rawLevel) {
  switch (rawLevel) {
    case 'NONE': return 'NONE';
    case 'FIRST_QUARTILE': return 'LOW';
    case 'SECOND_QUARTILE': return 'MEDIUM';
    case 'THIRD_QUARTILE': return 'HIGH';
    case 'FOURTH_QUARTILE': return 'VERY_HIGH';
    default: return null;
  }
}

// A level string that doesn't match our known vocabulary (corrupted cache,
// future API change) falls back to a rank derived from the count itself —
// never crashes, never silently renders as "no contribution" when a real
// count is present.
export function getLevelRank(level, count = 0) {
  if (Object.prototype.hasOwnProperty.call(LEVEL_RANK, level)) return LEVEL_RANK[level];
  if (!Number.isFinite(count) || count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}

export function getLevelLabel(level) {
  return LEVEL_LABEL[level] ?? 'Contribution activity';
}

// Parses a "YYYY-MM-DD" calendar string into its own UTC-anchored
// millisecond timestamp — deliberately not `new Date(dateString)` (whose
// behavior for non-date-only strings depends on the runtime) and never
// influenced by the visitor's local timezone.
export function dateStringToUTC(dateStr) {
  if (typeof dateStr !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return null;
  // Explicit Number() per group — NOT `match.map(parseInt)`, which passes
  // Array.map's own (value, index, array) to parseInt and silently uses
  // the index as the radix (the classic ['1','2'].map(parseInt) bug).
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const utc = Date.UTC(y, m - 1, d);
  // Rejects e.g. "2026-02-30" — Date.UTC silently rolls invalid days
  // forward into the next month, so round-tripping catches that instead
  // of treating a corrupt date as valid.
  const check = new Date(utc);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return utc;
}

function diffInCalendarDays(fromDateStr, toDateStr) {
  const from = dateStringToUTC(fromDateStr);
  const to = dateStringToUTC(toDateStr);
  if (from === null || to === null) return null;
  return Math.round((to - from) / 86400000);
}

// Validates and coerces one raw day entry. Returns null (never throws) for
// anything unusable so a single corrupted entry can't break the whole
// calendar — the caller filters nulls out.
export function normalizeContributionDay(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const utc = dateStringToUTC(raw.date);
  if (utc === null) return null;

  const count = Number.isFinite(raw.count) && raw.count >= 0 ? Math.trunc(raw.count) : 0;
  const level = mapGraphQLContributionLevel(raw.level) ?? (CONTRIBUTION_LEVELS.includes(raw.level) ? raw.level : null) ?? null;

  return { date: raw.date, count, level: level ?? (count > 0 ? null : 'NONE') };
}

// Flattens the week-grouped calendar into one chronologically sorted,
// validated array of days — the shape every other function here expects.
export function flattenContributionWeeks(weeks) {
  if (!Array.isArray(weeks)) return [];
  const days = [];
  for (const week of weeks) {
    const weekDays = Array.isArray(week?.days) ? week.days : [];
    for (const raw of weekDays) {
      const normalized = normalizeContributionDay(raw);
      if (normalized) days.push(normalized);
    }
  }
  // ISO "YYYY-MM-DD" strings sort correctly as plain strings, but comparing
  // explicitly (rather than relying on that being obvious at every call
  // site) keeps this resilient even if the source ever supplies days out
  // of order.
  return days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function sumContributions(days) {
  return days.reduce((total, day) => total + (Number.isFinite(day.count) ? day.count : 0), 0);
}

export function countActiveDays(days) {
  return days.reduce((total, day) => total + (day.count > 0 ? 1 : 0), 0);
}

export function findBusiestDay(days) {
  let busiest = null;
  for (const day of days) {
    if (!busiest || day.count > busiest.count) busiest = day;
  }
  return busiest && busiest.count > 0 ? busiest : null;
}

// Longest and current streaks of consecutive *calendar* days (not array
// positions) with count > 0. Missing dates are implicitly zero. Leap days
// need no special handling here since diffInCalendarDays works in real
// UTC milliseconds, which already accounts for February's length in any
// given year.
export function computeStreaks(days) {
  if (!days.length) return { currentStreak: 0, longestStreak: 0 };

  let longestStreak = 0;
  let running = 0;
  for (let i = 0; i < days.length; i++) {
    if (days[i].count > 0) {
      const contiguous = i === 0 || diffInCalendarDays(days[i - 1].date, days[i].date) === 1;
      running = contiguous ? running + 1 : 1;
      longestStreak = Math.max(longestStreak, running);
    } else {
      running = 0;
    }
  }

  // Current streak: walk backward from the most recent day in the data.
  // Deliberately data-relative, not "today" by the visitor's clock — the
  // dataset is a periodic snapshot, so anchoring to its own last entry
  // avoids ever needing `new Date()` (and the timezone risk that implies)
  // to decide what "today" means.
  let currentStreak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count <= 0) break;
    if (i < days.length - 1 && diffInCalendarDays(days[i].date, days[i + 1].date) !== 1) break;
    currentStreak += 1;
  }

  return { currentStreak, longestStreak };
}

// The one function the UI calls — everything above composed into the
// compact summary the profile header/summary strip actually renders.
export function computeContributionSummary(days, { totalContributions } = {}) {
  const { currentStreak, longestStreak } = computeStreaks(days);
  const computedTotal = sumContributions(days);
  return {
    totalContributions: Number.isFinite(totalContributions) ? totalContributions : computedTotal,
    activeDays: countActiveDays(days),
    currentStreak,
    longestStreak,
    busiestDay: findBusiestDay(days),
  };
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// 0 = Sunday .. 6 = Saturday. Computed from the date string itself (never
// trusting an API-provided weekday number) so the grid can never be laid
// out one column off from what the calendar actually shows for that date.
export function getWeekdayIndex(dateStr) {
  const utc = dateStringToUTC(dateStr);
  if (utc === null) return null;
  return new Date(utc).getUTCDay();
}

// Reshapes a flat, sorted day list into week columns (7 rows each, Sunday
// first) for the heatmap grid, padding leading/trailing gaps with `null`
// so a range that doesn't start on a Sunday still lines up in the correct
// row rather than assuming the source always hands back neat, complete
// weeks. Also derives month-label column positions from the same pass.
export function buildContributionGrid(days) {
  if (!days.length) return { weeks: [], monthLabels: [] };

  const weeks = [];
  let week = new Array(7).fill(null);
  let touched = false;

  days.forEach((day) => {
    const weekday = getWeekdayIndex(day.date);
    if (weekday === null) return;
    week[weekday] = day;
    touched = true;
    if (weekday === 6) {
      weeks.push(week);
      week = new Array(7).fill(null);
      touched = false;
    }
  });
  if (touched) weeks.push(week);

  const rawLabels = [];
  let lastMonth = null;
  weeks.forEach((weekCells, weekIndex) => {
    const firstRealCell = weekCells.find((cell) => cell !== null);
    if (!firstRealCell) return;
    const month = new Date(dateStringToUTC(firstRealCell.date)).getUTCMonth();
    if (month !== lastMonth) {
      rawLabels.push({ weekIndex, label: MONTH_LABELS[month] });
      lastMonth = month;
    }
  });

  // The very first week of the range is often a partial week (the data
  // rarely starts on a Sunday), which can put the first month's label just
  // one column before the next month's — too close for two 3-letter labels
  // to render without overlapping. Drop a label that's crowded by the next
  // one rather than let them visually merge.
  const MIN_LABEL_COLUMN_GAP = 2;
  const monthLabels = rawLabels.filter((entry, i) => {
    const next = rawLabels[i + 1];
    return !next || next.weekIndex - entry.weekIndex >= MIN_LABEL_COLUMN_GAP;
  });

  return { weeks, monthLabels };
}
