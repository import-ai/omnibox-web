let nextClientKey = 1;

export function createClientKey(): number {
  return nextClientKey++;
}
