// users pick a markup from a fixed list instead of typing code
const MARKUPS = { standard: 1.2, premium: 1.5, wholesale: 0.9 };

export function runFormula(name, price) {
  const m = MARKUPS[name];
  if (m === undefined) throw new Error('unknown markup');
  return price * m;
}
