const localeCurrencyMap = [
  ['IN', 'INR'],
  ['US', 'USD'],
  ['GB', 'GBP'],
  ['EU', 'EUR'],
  ['DE', 'EUR'],
  ['FR', 'EUR'],
  ['IT', 'EUR'],
  ['ES', 'EUR'],
  ['NL', 'EUR'],
  ['CA', 'CAD'],
  ['AU', 'AUD'],
  ['NZ', 'NZD'],
  ['JP', 'JPY'],
  ['CN', 'CNY'],
  ['SG', 'SGD'],
  ['AE', 'AED'],
];

export function getUserLocale() {
  return navigator.languages?.[0] || navigator.language || 'en-IN';
}

export function getUserCurrency(locale = getUserLocale()) {
  const region = locale.split('-')[1]?.toUpperCase();
  const match = localeCurrencyMap.find(([countryCode]) => countryCode === region);
  return match?.[1] || 'USD';
}

export function formatMoney(amount, locale = getUserLocale(), currency = getUserCurrency(locale)) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(Number(amount || 0));
}

export function getCurrencyLabel(locale = getUserLocale()) {
  return getUserCurrency(locale);
}
