import { describe, it, expect } from "vitest";
import { computePlan } from "./surge";

const base = { surge: 0, closure: false, delayWave: false } as const;

describe("SurgeGuard rules", () => {
  it("medium demand recommends 12 staff at peak vs fixed 9", () => {
    const p = computePlan({ ...base, scenario: "sb-medium" });
    expect(p.peakStaff).toBe(12);
    expect(p.peak.workload).toBe(88);
    expect(p.peakStart).toBe(14);
    expect(p.peakEnd).toBe(17);
  });
  it("all four scenarios differ in peak workload", () => {
    const peaks = (["ordinary", "sb-low", "sb-medium", "sb-high"] as const).map((s) => computePlan({ ...base, scenario: s }).peak.workload);
    expect(new Set(peaks).size).toBe(4);
  });
  it("delay wave raises peak workload; closure raises staff", () => {
    const m = computePlan({ ...base, scenario: "sb-medium" });
    expect(computePlan({ ...base, scenario: "sb-medium", delayWave: true }).peak.workload).toBeGreaterThan(m.peak.workload);
    expect(computePlan({ ...base, scenario: "sb-medium", closure: true }).peakStaff).toBeGreaterThan(m.peakStaff);
  });
});
