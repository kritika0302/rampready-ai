// Deterministic, synthetic decision-support model. No aircraft movement authorization.
export type ScenarioId = 'ordinary' | 'sb-low' | 'sb-medium' | 'sb-high';
export type WaveMode = 'arrival' | 'exodus';
export const SCENARIOS: Record<ScenarioId, {label: string; multiplier: number; baseConfidence: number}> = {
  ordinary: {label: 'Ordinary week', multiplier: .72, baseConfidence: 95},
  'sb-low': {label: 'Super Bowl low demand', multiplier: .88, baseConfidence: 94},
  'sb-medium': {label: 'Super Bowl medium demand', multiplier: 1, baseConfidence: 92},
  'sb-high': {label: 'Super Bowl high demand', multiplier: 1.22, baseConfidence: 85},
};
export const HOURS = Array.from({length: 12}, (_, i) => i + 8);
export const BASELINE = [22,18,24,31,48,68,82,88,76,57,43,27];
const EXODUS_BASELINE = [48,82,88,76,68,57,43,31,27,24,22,18];
export const FIXED_STAFF = 9;
export const EMPLOYEE_CAPACITY = 8;
export const CLOSURE_CAPACITY_FACTOR = .8;
export const FUEL_THRESHOLD = 5000;
export const WING_WALK_MULTIPLIER = 1.35;
export const WING_WALK_CREW = 3;
export const fmtHour = (h: number) => `${h % 12 || 12}:00 ${h >= 12 ? 'PM' : 'AM'}`;
export const shortHour = (h: number) => `${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}`;
export type Aircraft = { flightId: string; arrivalTime: string; departureTime: string; arrivalHour: number; aircraftType: string; size: 'light'|'midsize'|'heavy'; passengers: number; fueling: boolean; fuelGallons: number; passengerService: boolean; rampMinutes: number; parkingZone: string; priority: string; score: number };
export function workloadScore(a: Omit<Aircraft,'score'>, disruption = 0) {
  return 3 + a.rampMinutes / 15 + a.fuelGallons / 500 + (a.passengerService ? a.passengers * .2 : 0) + (a.size === 'heavy' ? 3 : a.size === 'midsize' ? 1 : 0) + disruption;
}
export function generateFleet(): Aircraft[] {
  const times = ['08:10','09:05','10:15','11:25','12:10','12:40','13:05','13:35','14:00','14:20','14:35','15:00','15:15','15:40','16:10','16:45','17:20','19:00'];
  return times.map((time,i) => {
    const special = i === 9;
    const size = special || i % 3 === 0 ? 'heavy' : i % 3 === 1 ? 'midsize' : 'light';
    const hour = Number(time.slice(0,2));
    const a: Omit<Aircraft,'score'> = {flightId: special ? 'SB-104' : `SB-${201+i}`, arrivalTime: time, departureTime: special ? '17:10' : `${String(Math.min(23,hour+2)).padStart(2,'0')}:30`, arrivalHour: hour, aircraftType: special ? 'Large business jet (G650)' : size === 'heavy' ? 'Global 7500' : size === 'midsize' ? 'Challenger 350' : 'Phenom 300', size, passengers: special ? 9 : 3 + i % 10, fueling: i % 4 !== 2, fuelGallons: special ? 1850 : i % 4 === 2 ? 0 : size === 'heavy' ? 1800 : size === 'midsize' ? 850 : 400, passengerService: i % 5 !== 2, rampMinutes: special ? 42 : 25 + i % 5 * 7, parkingZone: special ? 'Row-1 Deep Stack (2 Blockers)' : `Row-${i%3+1} / Zone ${i%2 ? 'B' : 'A'}`, priority: special ? 'VIP Standard' : i%3 ? 'Standard' : 'Priority'};
    return {...a, score: workloadScore(a)};
  });
}
export const FLEET = generateFleet();
export type TelexLoad = {id: string; aircraft: number; heavy: boolean; fuelGallons: number; hour: number; workload: number; crew: number; quickTurn: boolean; vip: boolean; source: string};
export const HEAVY_PRESET = '2x G650 delayed to 14:15, +3,600 gal Jet-A, VIP escort';
export const QUICK_PRESET = 'Global 7500 at 15:00, 35-min turn, priority tow';
export function parseTelex(text: string): {load?: TelexLoad; error?: string} {
  const heavy = /g650|global\s*7500|heavy|large\s*(cabin|jet)/i.test(text);
  const known = heavy || /phenom|citation|challenger|light\s*jet|midsize/i.test(text);
  const time = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (!known || !time) return {error: 'Aircraft type and a 24-hour arrival time are required (for example G650 at 14:15).'};
  const hour = Number(time[1]);
  if (hour < 8 || hour > 19) return {error: 'Arrival is outside the 08:00–19:59 planning window.'};
  const aircraft = Math.max(1,Math.min(20,Number(text.match(/\b(\d+)\s*x\b/i)?.[1] ?? 1)));
  const fuelGallons = Number((text.match(/([\d,]+)\s*(?:gal|gallons)/i)?.[1] ?? '0').replaceAll(',',''));
  const turn = Number(text.match(/(\d+)\s*-?\s*min/i)?.[1] ?? 60);
  const vip = /vip|escort/i.test(text), quickTurn = turn < 45;
  const workload = Math.round(aircraft * (heavy ? 12 : 7) + fuelGallons / 400 + (vip ? 4 : 0) + (quickTurn ? 6 : 0));
  return {load: {id: text.trim().toLowerCase(), aircraft, heavy, fuelGallons, hour, workload, crew: heavy ? 3 : 0, quickTurn, vip, source: text}};
}
export type Inputs = {scenario: ScenarioId; surge: number; closure: boolean; delayWave: boolean; manualAdj?: number; wave?: WaveMode; injections?: TelexLoad[]; preStage?: boolean; topOff?: boolean};
export type HourRow = {hour: number; arrivals: number; fuelGallons: number; cumulativeFuel: number; rawWorkload: number; workload: number; fixedWorkload: number; fixedStaff: number; aiStaff: number; fixedCapacity: number; aiCapacity: number; gap: number; coverage: number; bottlenecks: string[]; crewLock: boolean; status: 'On plan'|'Peak watch'|'Coverage gap'};
export function computePlan(inp: Inputs) {
  const wave = inp.wave ?? 'arrival', exodus = wave === 'exodus';
  const {multiplier,baseConfidence} = SCENARIOS[inp.scenario];
  const factor = multiplier * (1 + inp.surge / 100);
  const cap = EMPLOYEE_CAPACITY * (inp.closure ? CLOSURE_CAPACITY_FACTOR : 1);
  const preStage = inp.preStage ?? true, topOff = inp.topOff ?? true;
  const event = inp.scenario !== 'ordinary';
  const injections = inp.injections ?? [];
  const wl = (exodus ? EXODUS_BASELINE : BASELINE).map(v => v * factor);
  const arrivals = HOURS.map(h => (exodus ? [2,3,3,3,2,1,1,1,1,0,1,0][h-8] ?? 0 : FLEET.filter(a => a.arrivalHour === h).length) * factor);
  const fuel = HOURS.map(h => (exodus ? [1600,2400,2700,2200,1800,850,400,300,250,200,100,0][h-8] ?? 0 : FLEET.filter(a => a.arrivalHour === h).reduce((s,a) => s+a.fuelGallons,0)) * factor);
  if (inp.delayWave) {
    const src = exodus ? [0,1] : [4,5], dst = exodus ? [2,3,4] : [6,7,8,9];
    for (const series of [wl,arrivals,fuel]) {
      let moved = 0;
      src.forEach(i => { moved += (series[i] ?? 0) * .3; series[i] = (series[i] ?? 0) * .7; });
      dst.forEach(i => {series[i] = (series[i] ?? 0) + moved / dst.length;});
    }
    dst.forEach(i => {wl[i] = (wl[i] ?? 0) * 1.08;});
  }
  injections.forEach(a => { const i = a.hour-8; wl[i] = (wl[i] ?? 0)+a.workload; arrivals[i] = (arrivals[i] ?? 0)+a.aircraft; fuel[i] = (fuel[i] ?? 0)+a.fuelGallons; });
  const towHour = exodus ? 9 : 14, preStageTime = exodus ? '8:00 AM' : '11:30 AM', topOffTime = exodus ? '8:00 AM' : '1:00 PM';
  const fuelStart = exodus ? 9 : 14, fuelEnd = exodus ? 13 : 17;
  let cumFuel = 0;
  const fuelRiskHour = HOURS.find(h => {
    if (h < fuelStart || h > fuelEnd) return false;
    cumFuel += fuel[h-8] ?? 0;
    return cumFuel > FUEL_THRESHOLD;
  });
  const maxW = Math.max(...wl);
  const peakHours = HOURS.filter((_,i) => (wl[i] ?? 0) >= maxW * .8);
  let cumulativeFuel = 0;
  const rows: HourRow[] = HOURS.map((hour,i) => {
    const peakHour = peakHours.includes(hour);
    const rawWorkload = Math.round(wl[i] ?? 0);
    const crewLock = inp.closure || (event && peakHour);
    // Heavy towing is 20% of baseline demand; congestion adds 35% to that portion.
    const wingExtra = crewLock ? (wl[i] ?? 0) * .2 * (WING_WALK_MULTIPLIER-1) : 0;
    const digOut = event && hour === towHour ? (preStage ? 0 : 24) : 0;
    const refill = hour === fuelRiskHour && !topOff ? EMPLOYEE_CAPACITY * 40 / 60 : 0;
    const workload = Math.round(rawWorkload + wingExtra + digOut + refill);
    const fixedWorkload = Math.round(rawWorkload + wingExtra + (event && hour === towHour ? 24 : 0) + (hour === fuelRiskHour ? EMPLOYEE_CAPACITY * 40/60 : 0));
    let aiStaff = Math.max(FIXED_STAFF,Math.ceil(workload/cap));
    if (peakHour) aiStaff = Math.max(1,aiStaff+(inp.manualAdj ?? 0));
    const fixedCapacity = FIXED_STAFF*cap;
    const gap = Math.max(0,fixedWorkload-fixedCapacity);
    cumulativeFuel += fuel[i] ?? 0;
    const bottlenecks = [...(event && hour === towHour ? ['Row-1 Dig-Out'] : []),...(hour === fuelRiskHour ? ['Fuel Refill Risk'] : []),...(crewLock ? ['Wing-Walk Lock'] : [])];
    return {hour,arrivals: Math.round(arrivals[i] ?? 0),fuelGallons: Math.round(fuel[i] ?? 0),cumulativeFuel: Math.round(cumulativeFuel),rawWorkload,workload,fixedWorkload,fixedStaff: 9,aiStaff,fixedCapacity,aiCapacity: aiStaff*cap,gap: Math.round(gap),coverage: Math.min(100,Math.round(fixedCapacity/Math.max(1,fixedWorkload)*100)),bottlenecks,crewLock,status: gap>0 ? 'Coverage gap' : workload>fixedCapacity*.85 ? 'Peak watch' : 'On plan'};
  });
  const first = rows[0];
  if (!first) throw new Error('Planning window is empty');
  const peak = rows.reduce((a,b) => b.workload>a.workload ? b : a,first);
  const peakStart = Math.min(...peakHours), peakEnd = Math.max(...peakHours)+1;
  const peakStaff = Math.max(...rows.map(r=>r.aiStaff));
  const peakRows = rows.filter(r=>peakHours.includes(r.hour));
  const fixedDelay = Math.round(rows.reduce((s,r)=>s+Math.max(0,r.fixedWorkload-r.fixedCapacity)*.8,0));
  const aiDelay = Math.round(rows.reduce((s,r)=>s+Math.max(0,r.workload-r.aiCapacity)*.8,0));
  const extra = Math.max(0,peakStaff-9), fuelAdd = extra > 0 ? Math.max(1,Math.round(extra/3)) : 0, rampAdd = Math.max(0,extra-fuelAdd);
  const shifts = {bridgeStaff: rampAdd, fuelOvertime: fuelAdd, csrFloat: extra>0 ? 1 : 0, bridgeStart: exodus ? '8:00 AM' : '10:00 AM', bridgeEnd: exodus ? '4:30 PM' : '6:30 PM', overtimeStart: exodus ? '9:00 AM' : '2:00 PM', overtimeEnd: exodus ? '11:00 AM' : '4:00 PM', staffHours: rampAdd*8.5+fuelAdd*2};
  const peakAircraft = peakRows.reduce((s,r)=>s+r.arrivals,0);
  const aiUnder = rows.filter(r=>r.workload>r.aiCapacity).length;
  const safetyFixed = !rows.some(r=>r.crewLock && r.fixedWorkload>r.fixedCapacity);
  const safetyAi = !rows.some(r=>r.crewLock && (r.aiStaff<FIXED_STAFF || r.workload>r.aiCapacity));
  return {rows,peak,peakStart,peakEnd,peakStaff,firstGap: rows.find(r=>r.aiStaff>9),fixedDelay,aiDelay,delayReduction: fixedDelay ? Math.round((fixedDelay-aiDelay)/fixedDelay*100) : 0,fixedUnder: rows.filter(r=>r.gap>0).length,aiUnder,extraHours: shifts.staffHours,peakAircraft,confidence: Math.max(50,Math.round(baseConfidence-inp.surge*.2-(inp.closure?5:0)-(inp.delayWave?7:0)-injections.length*2)),cap,handledFixed: Math.round(peakRows.reduce((s,r)=>s+r.arrivals*Math.min(1,r.fixedCapacity/r.fixedWorkload),0)),handledAi: Math.round(peakRows.reduce((s,r)=>s+r.arrivals*Math.min(1,r.aiCapacity/r.workload),0)),peakCovFixed: peak.coverage,peakCovAi: Math.min(100,Math.round(peak.aiCapacity/peak.workload*100)),expectedAircraft: rows.reduce((s,r)=>s+r.arrivals,0),heavyAircraft: Math.round(FLEET.filter(a=>a.size==='heavy').length*factor)+injections.filter(a=>a.heavy).reduce((s,a)=>s+a.aircraft,0),categories:{ramp:{base:5,add:rampAdd},fuel:{base:2,add:fuelAdd},pax:{base:2,add:0}},shifts,preStage,topOff,event,fuelRisk: fuelRiskHour !== undefined,fuelRiskHour,preStageTime,topOffTime,towHour,wingMultiplier: crewLockMultiplier(inp.closure,event),savedRampMinutes: event&&preStage?45:0,refillMinutes:40,digOutMinutes:60,towCrew:3,safetyFixed,safetyAi,otCost: Math.round((rampAdd*3+fuelAdd*2)*60),revenueProtected: Math.round(38500*factor),idleHoursSaved: rampAdd*3,wave};
}
function crewLockMultiplier(closure: boolean,event: boolean) {return closure||event ? 1.35 : 1;}
export type Plan = ReturnType<typeof computePlan>;
export function dispatchBrief(plan: Plan, approvedAt: string, scenario: ScenarioId) {
  const s = plan.shifts;
  return `Official Super Bowl Shift & Ramp Pre-Stage Dispatch Brief\nSYNTHETIC PLANNING — not a movement clearance\nVan Nuys (VNY) · ${SCENARIOS[scenario].label} · ${plan.wave === 'arrival' ? 'Arrival / midday turns' : 'Monday post-game exodus'}\nPeak coverage: ${plan.peakStaff} staff, ${fmtHour(plan.peakStart)}–${fmtHour(plan.peakEnd)}\nRoster: ${5+plan.categories.ramp.add} ramp agents; ${2+plan.categories.fuel.add} fuel specialists; 2 CSRs (${s.csrFloat} cross-utilized float, not extra headcount).\nPeak bridge: ${s.bridgeStaff} qualified ramp techs, ${s.bridgeStart}–${s.bridgeEnd}.\nFuel overtime: ${s.fuelOvertime} specialists, ${s.overtimeStart}–${s.overtimeEnd} (2-hour hold).\n${plan.event&&plan.preStage ? `${plan.preStageTime}: proposed SB-104 Row-1 to Row-3 pre-stage, 1 tug driver + 2 wing-walkers; saves 45 ramp minutes. Subject to ramp supervisor clearance.` : 'No proactive SB-104 tow scheduled.'}\n${plan.fuelRisk&&plan.topOff ? `${plan.topOffTime}: proposed Fuel Truck #2 top-off and sump-test before peak.` : 'No proactive fuel top-off scheduled.'}\n${plan.aiUnder ? `WARNING: ${plan.aiUnder} uncovered hours; manager override leaves coverage gaps.` : 'Workload coverage: no uncovered hours in this synthetic forecast.'}\nTow-crew feasibility: ${plan.safetyAi ? 'Full crew allocation modeled' : 'At risk — supervisor review required'}. Actual NATA/safety compliance is not certified by this prototype.\nApproved by FBO Manager · ${approvedAt}\nFinal staffing decisions remain with the FBO manager. Does not authorize aircraft movement or override ramp safety.`;
}
