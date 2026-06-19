/* ================================================================
   Cat Care PWA — Utility Functions
   Age calculation, date formatting, knowledge bundle helpers
   ================================================================ */

/**
 * Calculate age from birthday in weeks and days.
 * Handles future birthdays gracefully (returns zeros).
 *
 * @param {string} birthday   "YYYY-MM-DD"
 * @param {string} [todayOverride]  Optional "YYYY-MM-DD" for testing
 * @returns {{weeks: number, days: number, totalDays: number}}
 */
function calculateAge(birthday, todayOverride) {
  var birth = new Date(birthday + 'T00:00:00');
  var today = todayOverride
    ? new Date(todayOverride + 'T00:00:00')
    : new Date(new Date().toLocaleDateString('en-CA'));
  var diffDays = Math.floor((today - birth) / 86400000);

  // Future birthday — the cat hasn't been born yet
  if (diffDays < 0) {
    return { weeks: 0, days: 0, totalDays: 0 };
  }

  return {
    weeks: Math.floor(diffDays / 7),
    days: diffDays % 7,
    totalDays: diffDays
  };
}

/**
 * Resolve a tutorial reference key from the knowledge bundle.
 *
 * @param {string} refKey   e.g. "litter_box_training"
 * @param {object} bundle   The knowledge-bundle.json parsed object
 * @returns {object|null}   The tutorial object, or null if not found
 */
function resolveTutorialRef(refKey, bundle) {
  if (!bundle || !bundle.training || !bundle.training.tutorials) {
    return null;
  }
  return bundle.training.tutorials[refKey] || null;
}

/**
 * Format an ISO date string into Chinese date format.
 *
 * @param {string} isoStr   e.g. "2026-06-19T08:00:00.000Z"
 * @returns {string}        e.g. "2026年6月19日"
 */
function formatDate(isoStr) {
  var d = new Date(isoStr);
  if (isNaN(d.getTime())) {
    return '未知日期';
  }
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
}

/**
 * Get today's date string in "YYYY-MM-DD" format (locale-neutral).
 *
 * @returns {string}  e.g. "2026-06-19"
 */
function getTodayStr() {
  return new Date().toLocaleDateString('en-CA');
}
