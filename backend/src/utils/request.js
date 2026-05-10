function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function cleanText(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }
  return value.trim();
}

function parseAmount(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function isValidDateString(value) {
  return !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTimeString(value) {
  return !value || /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

module.exports = {
  cleanText,
  isValidDateString,
  isValidTimeString,
  parseAmount,
  parsePositiveInt,
};
