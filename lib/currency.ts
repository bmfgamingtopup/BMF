export function formatHtgAmount(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount)} HTG`;
}

export function normalizeCurrencyLabel(value: string): string {
  return value.replace(/\bFCFA\b/gi, 'HTG');
}