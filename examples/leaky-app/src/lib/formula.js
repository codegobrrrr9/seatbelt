// lets users type a formula like "price * 1.2" into the pricing box
export function runFormula(expr, price) {
  return eval(expr.replace(/price/g, String(price)));
}
