export function getExponentialPages(current: number, max: number): number[] {
  if (!Number.isFinite(current) || current < 1) current = 1;
  if (!Number.isFinite(max) || max < 1) max = 1;
  
  if (max <= 1) return [1];
  
  const min = 1;
  const pages = new Set<number>();
  pages.add(current);

  // Safety break counter
  let iterations = 0;
  const MAX_ITER = 100;

  // Left side
  let k = 1;
  while (iterations++ < MAX_ITER) {
    const offset = Math.pow(2, k) - 1;
    const pLeft = current - offset;
    if (pLeft <= min) {
      pages.add(min);
      break;
    }
    pages.add(pLeft);
    k++;
  }

  // Right side
  k = 1;
  iterations = 0;
  while (iterations++ < MAX_ITER) {
    const offset = Math.pow(2, k) - 1;
    const pRight = current + offset;
    if (pRight >= max) {
      pages.add(max);
      break;
    }
    pages.add(pRight);
    k++;
  }

  return Array.from(pages).sort((a, b) => a - b);
}
