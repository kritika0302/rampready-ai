// SurgeGuard planning engine — seeded synthetic data only.
export type ScenarioId = "ordinary" | "sb-low" | "sb-medium" | "sb-high";

export const SCENARIOS: Record<ScenarioId, { label: string; multiplier: number; baseConfidence: number }> = {
  ordinary: { label: "Ordinary week", multiplier: 0.72, baseConfidence: 93 },
  "sb-low": { label: "Super Bowl low demand", multiplier: 0.88, baseConfidence: 89 },
  "sb-medium": { label: "Super Bowl medium demand", multiplier: 1.0, baseConfidence: 86 },
  "sb-high": { label: "Super Bowl high demand", multiplier: 1.22, baseConfidence: 78 },
};

export const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
export const BASELINE = [22, 18, 24, 31, 48, 68, 82, 88, 76, 57, 43, 27];
export const FIXED_STAFF = 9;
export const EMPLOYEE_CAPACITY = 7.5; // workload points one employee covers per hour
export const CLOSURE_CAPACITY_FACTOR = 0.85;
export const DELAY_MIN_PER_POINT = 3.5;

export const fmtHour = (h: number) => `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? "PM" : "AM"}`;
export const shortHour = (h: number) => `${h > 12 ? h - 12 : h} ${h >= 12 ? "PM" : "AM"}`;

// ---------- Seeded synthetic aircraft ----------
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const TYPES = [
  { type: "Citation CJ3", size: "light", pax: [2, 6] },
  { type: "Challenger 350", size: "midsize", pax: [4, 9] },
  { type: "Gulfstream G650", size: "heavy", pax: [8, 14] },
  { type: "Global 7500", size: "heavy", pax: [8, 16] },
  { type: "Phenom 300", size: "light", pax: [2, 6] },
] as const;

export type Aircraft = {
  flightId: string;
  arrivalHour: number;
  departureHour: number;
  aircraftType: string;
  size: "light" | "midsize" | "heavy";
  passengers: number;
  fueling: boolean;
  passengerService: boolean;
  rampMinutes: number;
  priority: "Standard" | "High";
  score: number;
};

export function workloadScore(a: Omit<Aircraft, "score">, disruption = 0) {
  const base = 3 + a.rampMinutes / 30;
  const fuel = a.fueling ? 2.5 : 0;
  const pax = a.passengerService ? 1 + a.passengers * 0.15 : 0;
  const size = a.size === "heavy" ? 1.4 : a.size === "midsize" ? 1.15 : 1;
  return (base + fuel + pax) * size * (1 + disruption);
}

export function generateFleet(seed = 2026): Aircraft[] {
  const r = rng(seed);
  const fleet: Aircraft[] = [];
  let n = 1;
  HOURS.forEach((h, i) => {
    const count = Math.max(1, Math.round(BASELINE[i] / 8));
    for (let k = 0; k < count; k++) {
      const t = TYPES[Math.floor(r() * TYPES.length)];
      const a = {
        flightId: `SG${String(100 + n++)}`,
        arrivalHour: h,
        departureHour: Math.min(23, h + 1 + Math.floor(r() * 6)),
        aircraftType: t.type,
        size: t.size,
        passengers: t.pax[0] + Math.floor(r() * (t.pax[1] - t.pax[0])),
        fueling: r() > 0.3,
        passengerService: r() > 0.25,
        rampMinutes: 30 + Math.floor(r() * 60),
        priority: (r() > 0.8 ? "High" : "Standard") as Aircraft["priority"],
      } as Omit<Aircraft, "score">;
      fleet.push({ ...a, score: workloadScore(a) });
    }
  });
  return fleet;
}

export const FLEET = generateFleet();

// ---------- Plan ----------
export type Inputs = { scenario: ScenarioId; surge: number; closure: boolean; delayWave: boolean; manualAdj?: number };

export type HourRow = {
  hour: number;
  arrivals: number;
  workload: number;
  fixedStaff: number;
  aiStaff: number;
  fixedCapacity: number;
  aiCapacity: number;
  gap: number;
  coverage: number; // fixed coverage %
  status: "On plan" | "Peak watch" | "Coverage gap";
};

export function computePlan(inp: Inputs) {
  const { multiplier, baseConfidence } = SCENARIOS[inp.scenario];
  const surge = inp.surge / 100;
  const cap = EMPLOYEE_CAPACITY * (inp.closure ? CLOSURE_CAPACITY_FACTOR : 1);
  const arrivalsBase = HOURS.map((h) => FLEET.filter((a) => a.arrivalHour === h).length);

  let wl = BASELINE.map((b) => b * multiplier * (1 + surge));
  let arrivals = arrivalsBase.map((a) => a * multiplier * (1 + surge));

  if (inp.closure) {
    // longer tows / repositioning in the busy midday window
    wl = wl.map((w, i) => (HOURS[i] >= 11 && HOURS[i] <= 16 ? w * 1.08 : w));
  }
  if (inp.delayWave) {
    // 90-minute delay: shift 30% of 11AM–1PM arrivals into 2–4PM, plus overlap penalty
    const src = [3, 4, 5];
    const dst = [6, 7, 8];
    let moved = 0, movedArr = 0;
    src.forEach((i) => {
      moved += wl[i] * 0.3; wl[i] *= 0.7;
      movedArr += arrivals[i] * 0.3; arrivals[i] *= 0.7;
    });
    dst.forEach((i) => {
      wl[i] = (wl[i] + moved / 3) * 1.08;
      arrivals[i] += movedArr / 3;
    });
  }

  const peakIdxs = new Set<number>();
  const maxW = Math.max(...wl);
  wl.forEach((w, i) => w >= maxW * 0.8 && peakIdxs.add(i));

  const rows: HourRow[] = HOURS.map((h, i) => {
    const workload = Math.round(wl[i]);
    let aiStaff = Math.max(FIXED_STAFF, Math.ceil(workload / cap));
    if (peakIdxs.has(i) && inp.manualAdj) aiStaff = Math.max(1, aiStaff + inp.manualAdj);
    const fixedCapacity = FIXED_STAFF * cap;
    const gap = Math.max(0, workload - fixedCapacity);
    const coverage = Math.min(100, Math.round((fixedCapacity / Math.max(1, workload)) * 100));
    const status: HourRow["status"] = gap > 0 ? "Coverage gap" : workload >= fixedCapacity * 0.85 ? "Peak watch" : "On plan";
    return { hour: h, arrivals: Math.round(arrivals[i]), workload, fixedStaff: FIXED_STAFF, aiStaff, fixedCapacity: Math.round(fixedCapacity), aiCapacity: Math.round(aiStaff * cap), gap: Math.round(gap), coverage, status };
  });

  const peak = rows.reduce((a, b) => (b.workload > a.workload ? b : a));
  const peakRows = rows.filter((_, i) => peakIdxs.has(i));
  const peakStart = peakRows[0].hour;
  const peakEnd = peakRows[peakRows.length - 1].hour + 1;
  const peakStaff = Math.max(...rows.map((r) => r.aiStaff));
  const firstGap = rows.find((r) => r.aiStaff > FIXED_STAFF);

  const delayFor = (staffOf: (r: HourRow) => number) =>
    Math.round(rows.reduce((s, r) => s + Math.max(0, r.workload - staffOf(r) * cap) * DELAY_MIN_PER_POINT, 0));
  const fixedDelay = delayFor(() => FIXED_STAFF);
  const aiDelay = delayFor((r) => r.aiStaff);
  const delayReduction = fixedDelay > 0 ? Math.round(((fixedDelay - aiDelay) / fixedDelay) * 100) : 0;

  const fixedUnder = rows.filter((r) => r.workload > FIXED_STAFF * cap).length;
  const aiUnder = rows.filter((r) => r.workload > r.aiStaff * cap).length;
  const extraHours = rows.reduce((s, r) => s + Math.max(0, r.aiStaff - FIXED_STAFF), 0);
  const peakAircraft = peakRows.reduce((s, r) => s + r.arrivals, 0);
  const handled = (staffOf: (r: HourRow) => number) =>
    Math.round(peakRows.reduce((s, r) => s + r.arrivals * Math.min(1, (staffOf(r) * cap) / r.workload), 0));
  const peakCoverage = (staffOf: (r: HourRow) => number) =>
    Math.min(100, Math.round(((staffOf(peak) * cap) / peak.workload) * 100));

  let confidence = baseConfidence - inp.surge * 0.22 - (inp.closure ? 5 : 0) - (inp.delayWave ? 7 : 0);
  confidence = Math.max(50, Math.round(confidence));

  // Category breakdown at peak: fixed split 4 ramp / 3 fuel / 2 pax
  const extra = Math.max(0, peakStaff - FIXED_STAFF);
  const cat = { ramp: 4, fuel: 3, pax: 2 };
  const add = { ramp: 0, fuel: 0, pax: 0 };
  const order: (keyof typeof cat)[] = ["ramp", "ramp", "ramp", "fuel", "pax", "ramp", "fuel", "pax"];
  for (let k = 0; k < extra; k++) add[order[k % order.length]]++;

  return {
    rows, peak, peakStart, peakEnd, peakStaff, firstGap, fixedDelay, aiDelay, delayReduction,
    fixedUnder, aiUnder, extraHours, peakAircraft, confidence, cap,
    handledFixed: handled(() => FIXED_STAFF), handledAi: handled((r) => r.aiStaff),
    peakCovFixed: peakCoverage(() => FIXED_STAFF), peakCovAi: peakCoverage((r) => r.aiStaff),
    expectedAircraft: rows.reduce((s, r) => s + r.arrivals, 0),
    categories: {
      ramp: { base: cat.ramp, add: add.ramp },
      fuel: { base: cat.fuel, add: add.fuel },
      pax: { base: cat.pax, add: add.pax },
    },
  };
}
export type Plan = ReturnType<typeof computePlan>;
