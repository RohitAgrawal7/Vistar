export async function withExclusiveLock<T>(name: string, run: () => T | Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks?.request) return run();
  return locks.request(name, () => run());
}
