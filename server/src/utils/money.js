// Money helpers. We do all math in whole cents (integers) so we never get
// floating-point surprises like 0.1 + 0.2 = 0.30000000000000004.

const MAX_AMOUNT_CENTS = 1_000_000_00; // $1,000,000.00 sanity limit

// Turns 6, 6.5, "6.50", or "$1,234.56" into cents (650, 123456).
// Returns null if it isn't a valid amount above $0.
function toCents(value) {
  if (typeof value === 'string') value = value.replace(/[$,\s]/g, '');
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const cents = Math.round(number * 100);
  if (cents <= 0 || cents > MAX_AMOUNT_CENTS) return null;
  return cents;
}

// 650 -> 6.5 (a number for JSON responses)
function fromCents(cents) {
  return cents / 100;
}

// 650 -> "$6.50", -500 -> "−$5.00" (uses a real minus sign for readability)
function formatCents(cents) {
  const abs = (Math.abs(cents) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${cents < 0 ? '−' : ''}$${abs}`;
}

module.exports = { toCents, fromCents, formatCents };
