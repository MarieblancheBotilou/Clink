// "Today" and "this week" in the USER's time zone, not the server's.
// Example: 11:30 PM in College Station is still today for that user,
// even though it's already tomorrow in UTC. Weeks start on Monday.
const { DateTime } = require('luxon');

function getPeriods(timezone, now = new Date()) {
  const local = DateTime.fromJSDate(now).setZone(timezone);
  return {
    dayStart: local.startOf('day').toJSDate(),
    dayEnd: local.endOf('day').toJSDate(),
    weekStart: local.startOf('week').toJSDate(), // Luxon weeks start Monday
    weekEnd: local.endOf('week').toJSDate(),
    dayOfWeek: local.weekday - 1, // Luxon: 1 = Monday ... 7 = Sunday -> our 0 ... 6
  };
}

module.exports = { getPeriods };
