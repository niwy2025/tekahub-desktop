/**
 * Compare semver-like versions (major.minor.patch[+prerelease]).
 * Returns -1 if a < b, 0 if equal, 1 if a > b.
 */
export function compareVersions(a: string, b: string): number {
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    if (pa.nums[i] < pb.nums[i]) return -1;
    if (pa.nums[i] > pb.nums[i]) return 1;
  }
  if (pa.pre === pb.pre) return 0;
  if (!pa.pre) return 1;
  if (!pb.pre) return -1;
  return pa.pre < pb.pre ? -1 : pa.pre > pb.pre ? 1 : 0;
}

export function isNewerVersion(candidate: string, current: string): boolean {
  return compareVersions(candidate, current) > 0;
}

function parse(v: string): { nums: [number, number, number]; pre: string } {
  const clean = v.trim().replace(/^v/i, "");
  const [core, ...rest] = clean.split("-");
  const parts = core.split(".").map((n) => parseInt(n, 10) || 0);
  return {
    nums: [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0],
    pre: rest.join("-"),
  };
}
