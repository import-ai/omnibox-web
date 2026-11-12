const reasons = new Map<string, { reason: string; at: number }>();
export function markBehaviorLeave(scope: string, reason: string) {
  reasons.set(scope, { reason, at: Date.now() });
}
export function behaviorLeaveReason(scope: string, fallback = 'navigation') {
  const value = reasons.get(scope);
  return value && Date.now() - value.at < 2000 ? value.reason : fallback;
}
