import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area, Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, CheckCircle2, Clock, Fuel, Gauge, Info, Minus, Pencil, Plane, Plus, ShieldCheck, TrendingDown, Users, UserRound, Wrench,
} from "lucide-react";
import { computePlan, FIXED_STAFF, fmtHour, SCENARIOS, shortHour, type ScenarioId, type HourRow } from "@/lib/surge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FBO SurgeGuard AI — Event-week staffing planner" },
      { name: "description", content: "Explainable hourly workload forecasts and staffing recommendations for FBO ramp operations during Super Bowl week." },
      { property: "og:title", content: "FBO SurgeGuard AI" },
      { property: "og:description", content: "Prepare the ramp before demand lands. Explainable event-week staffing for FBOs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const card = "rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]";

function Dashboard() {
  const [scenario, setScenario] = useState<ScenarioId>("sb-medium");
  const [surge, setSurge] = useState(0);
  const [closure, setClosure] = useState(false);
  const [delayWave, setDelayWave] = useState(false);
  const [manualAdj, setManualAdj] = useState(0);
  const [editing, setEditing] = useState(false);
  const [approved, setApproved] = useState(false);

  const plan = useMemo(() => computePlan({ scenario, surge, closure, delayWave, manualAdj }), [scenario, surge, closure, delayWave, manualAdj]);
  const touch = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setApproved(false); };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground lg:flex">
      <Sidebar
        scenario={scenario} setScenario={touch(setScenario)}
        surge={surge} setSurge={touch(setSurge)}
        closure={closure} setClosure={touch(setClosure)}
        delayWave={delayWave} setDelayWave={touch(setDelayWave)}
      />
      <main className="min-w-0 flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
        <Header />
        {(closure || delayWave) && (
          <div className="grid gap-3 md:grid-cols-2">
            {closure && <Alert text="One ramp zone is unavailable, so effective service capacity is reduced and additional coverage is needed." />}
            {delayWave && <Alert text="Delayed arrivals overlap during the afternoon peak, increasing workload and required staffing." />}
          </div>
        )}
        <Kpis plan={plan} />
        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <ChartCard plan={plan} />
          <Recommendation plan={plan} scenario={scenario} closure={closure} delayWave={delayWave}
            editing={editing} setEditing={setEditing} manualAdj={manualAdj} setManualAdj={touch(setManualAdj)}
            approved={approved} setApproved={setApproved} />
        </div>
        <div className="grid gap-6 xl:grid-cols-[1fr_1.6fr]">
          <Categories plan={plan} closure={closure} delayWave={delayWave} />
          <Impact plan={plan} />
        </div>
        <HourlyTable rows={plan.rows} />
        <footer className="flex items-start gap-3 rounded-2xl border border-border bg-secondary p-4 text-sm text-secondary-foreground">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          <p>Synthetic planning data. SurgeGuard supports FBO preparation; it does not authorize aircraft movement, override ramp-safety procedures, or replace airport personnel. Final staffing decisions remain with the FBO manager.</p>
        </footer>
      </main>
    </div>
  );
}

function Sidebar(p: {
  scenario: ScenarioId; setScenario: (v: ScenarioId) => void; surge: number; setSurge: (v: number) => void;
  closure: boolean; setClosure: (v: boolean) => void; delayWave: boolean; setDelayWave: (v: boolean) => void;
}) {
  return (
    <aside className="bg-navy p-6 text-navy-foreground lg:sticky lg:top-0 lg:h-screen lg:w-80 lg:shrink-0 lg:overflow-y-auto">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary"><Plane className="h-6 w-6 -rotate-45 text-primary-foreground" /></div>
        <div>
          <p className="font-display text-lg font-bold leading-tight">FBO SurgeGuard AI</p>
          <p className="text-xs text-navy-muted">Event-week operations planner</p>
        </div>
      </div>
      <div className="mt-8 space-y-6">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-navy-muted">Demand scenario</span>
          <select value={p.scenario} onChange={(e) => p.setScenario(e.target.value as ScenarioId)}
            className="mt-2 w-full rounded-lg border border-navy-border bg-sidebar-accent px-3 py-2.5 text-sm text-navy-foreground outline-none focus:ring-2 focus:ring-ring">
            {Object.entries(SCENARIOS).map(([id, s]) => <option key={id} value={id}>{s.label} (×{s.multiplier.toFixed(2)})</option>)}
          </select>
        </label>
        <label className="block">
          <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-navy-muted">
            <span>Arrival surge</span><span className="font-mono text-cyan">+{p.surge}%</span>
          </div>
          <input type="range" min={0} max={70} step={5} value={p.surge} onChange={(e) => p.setSurge(Number(e.target.value))} className="mt-3 w-full accent-[var(--cyan-strong)]" />
          <div className="flex justify-between text-[10px] text-navy-muted"><span>0%</span><span>70%</span></div>
        </label>
        <div className="space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-navy-muted">Disruption simulations</span>
          <Toggle checked={p.closure} onChange={p.setClosure} label="Simulate one ramp zone closed" />
          <Toggle checked={p.delayWave} onChange={p.setDelayWave} label="Simulate a 90-minute delay wave" />
        </div>
        <div className="rounded-xl border border-navy-border bg-sidebar-accent p-4">
          <p className="flex items-center gap-2 text-sm font-semibold"><Info className="h-4 w-4 text-cyan" />How the AI helps</p>
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-navy-muted">
            <li>• Forecasts hourly aircraft-service workload</li>
            <li>• Recommends targeted staffing coverage</li>
            <li>• Explains uncertainty with a confidence score</li>
            <li>• Keeps the manager in control — nothing is applied without approval</li>
          </ul>
        </div>
      </div>
    </aside>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${checked ? "border-warning bg-sidebar-accent" : "border-navy-border"}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[var(--warning)]" />
      {label}
    </label>
  );
}

function Header() {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Van Nuys · Los Angeles · seven-day planning window</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">Prepare the ramp before demand lands.</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">SurgeGuard forecasts hourly aircraft-service workload and recommends targeted staffing coverage for event-week operations — compared side by side with the fixed baseline of {FIXED_STAFF} employees per hour.</p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-success-soft px-3 py-1.5 text-sm font-medium text-success">
        <span className="h-2 w-2 rounded-full bg-success" />Human review required
      </span>
    </header>
  );
}

function Alert({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-warning bg-warning-soft p-3 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />{text}
    </div>
  );
}

function Kpis({ plan }: { plan: ReturnType<typeof computePlan> }) {
  const items = [
    { icon: Plane, label: "Expected aircraft today", value: plan.expectedAircraft, sub: "8 AM – 8 PM arrivals" },
    { icon: Gauge, label: "Peak workload", value: plan.peak.workload, sub: `at ${fmtHour(plan.peak.hour)}` },
    { icon: Users, label: "Peak staff required", value: plan.peakStaff, sub: `vs ${FIXED_STAFF} fixed`, accent: "text-primary" },
    { icon: Clock, label: "Projected delay", value: `${plan.aiDelay} min`, sub: `fixed: ${plan.fixedDelay} min` },
    { icon: TrendingDown, label: "Delay reduction", value: `${plan.delayReduction}%`, sub: "vs fixed staffing", accent: "text-success" },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
      {items.map((k) => (
        <div key={k.label} className={`${card} p-4`}>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><k.icon className="h-4 w-4" />{k.label}</div>
          <p className={`mt-2 font-display text-3xl font-bold ${k.accent ?? ""}`}>{k.value}</p>
          <p className="text-xs text-muted-foreground">{k.sub}</p>
        </div>
      ))}
    </div>
  );
}

function ChartCard({ plan }: { plan: ReturnType<typeof computePlan> }) {
  const data = plan.rows.map((r) => ({ name: shortHour(r.hour), Workload: r.workload, "AI staff capacity": r.aiCapacity, "Fixed capacity": r.fixedCapacity, "Coverage gap": r.gap }));
  return (
    <section className={`${card} p-5`}>
      <h2 className="font-display text-lg font-semibold">Hourly workload vs staff capacity</h2>
      <p className="text-sm text-muted-foreground">Shaded band marks the peak period ({fmtHour(plan.peakStart)} – {fmtHour(plan.peakEnd)}). Red bars show workload fixed staffing cannot cover.</p>
      <div className="mt-4 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--border)" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceArea x1={shortHour(plan.peakStart)} x2={shortHour(plan.peakEnd - 1)} fill="var(--warning)" fillOpacity={0.12} label={{ value: "Peak", position: "insideTop", fontSize: 11, fill: "var(--foreground)" }} />
            <Area type="monotone" dataKey="Workload" fill="var(--cyan)" stroke="var(--cyan-strong)" fillOpacity={0.55} />
            <Bar dataKey="Coverage gap" fill="var(--destructive)" barSize={14} radius={[4, 4, 0, 0]} />
            <Line type="stepAfter" dataKey="AI staff capacity" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
            <Line type="stepAfter" dataKey="Fixed capacity" stroke="var(--muted-foreground)" strokeDasharray="5 4" strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function Recommendation(p: {
  plan: ReturnType<typeof computePlan>; scenario: ScenarioId; closure: boolean; delayWave: boolean;
  editing: boolean; setEditing: (v: boolean) => void; manualAdj: number; setManualAdj: (v: number) => void;
  approved: boolean; setApproved: (v: boolean) => void;
}) {
  const { plan } = p;
  const extra = plan.peakStaff - FIXED_STAFF;
  const start = plan.firstGap?.hour ?? plan.peakStart;
  const headline = extra > 0 ? `Add ${plan.categories.ramp.add > 0 ? `${plan.categories.ramp.add} ramp` : extra} staff at ${fmtHour(start)}` : "Keep fixed staffing of 9 per hour";
  const reasons = [
    `Workload rises above 80% of the daily peak between ${fmtHour(plan.peakStart)} and ${fmtHour(plan.peakEnd)}, peaking at ${plan.peak.workload} points.`,
    extra > 0 ? `Fixed staffing covers only ${plan.peakCovFixed}% of peak workload, leaving ${plan.fixedUnder} understaffed hour${plan.fixedUnder === 1 ? "" : "s"}.` : `Fixed staffing already covers ${plan.peakCovFixed}% of peak workload.`,
    plan.categories.fuel.add > 0 ? "Reserve one fueling specialist for overlapping service requests." : "Fueling demand stays within the existing specialist rota.",
    `Scenario "${SCENARIOS[p.scenario].label}" applies a ×${SCENARIOS[p.scenario].multiplier.toFixed(2)} demand multiplier to the baseline.`,
    ...(p.closure ? ["One ramp zone is closed, reducing effective capacity per employee by 15%."] : []),
    ...(p.delayWave ? ["A 90-minute delay wave shifts midday arrivals into the 2–5 PM window, compounding overlap."] : []),
  ];
  const confColor = plan.confidence >= 80 ? "bg-success" : plan.confidence >= 65 ? "bg-warning" : "bg-destructive";
  return (
    <section className={`${card} flex flex-col p-5`}>
      <h2 className="font-display text-lg font-semibold">AI staffing recommendation</h2>
      <div className="mt-3 rounded-xl bg-navy p-4 text-navy-foreground">
        <p className="font-display text-2xl font-bold">{headline}</p>
        <p className="mt-1 text-sm text-navy-muted">
          Workload rises above 80% between {fmtHour(plan.peakStart)} and {fmtHour(plan.peakEnd)}. {extra > 0 ? "The system recommends additional ramp coverage during this period while keeping normal staffing during lower-demand hours." : "No added coverage is needed; normal staffing holds through the day."}
        </p>
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {reasons.map((r) => <li key={r} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{r}</li>)}
      </ul>
      {plan.delayReduction > 0 && <p className="mt-3 text-sm text-muted-foreground">Compared with fixed staffing, SurgeGuard reduces projected service delay while keeping the rest of the day at normal staffing levels.</p>}
      <div className="mt-4">
        <div className="flex justify-between text-sm"><span className="font-medium">Forecast confidence</span><span className="font-mono font-semibold">{plan.confidence}%</span></div>
        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full transition-all ${confColor}`} style={{ width: `${plan.confidence}%` }} /></div>
        <p className="mt-1 text-xs text-muted-foreground">Lower with higher surge and active disruptions — treat as a planning range, not a guarantee.</p>
      </div>
      {p.editing && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-border p-3 text-sm">
          <span>Manager adjustment to peak hours</span>
          <div className="flex items-center gap-2">
            <button aria-label="Decrease" onClick={() => p.setManualAdj(p.manualAdj - 1)} className="rounded-md border border-border p-1 hover:bg-muted"><Minus className="h-4 w-4" /></button>
            <span className="w-8 text-center font-mono">{p.manualAdj > 0 ? `+${p.manualAdj}` : p.manualAdj}</span>
            <button aria-label="Increase" onClick={() => p.setManualAdj(p.manualAdj + 1)} className="rounded-md border border-border p-1 hover:bg-muted"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
      )}
      <div className="mt-auto pt-4">
        <p className="mb-3 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-success" />Recommendation only. The FBO manager reviews and approves every staffing change.</p>
        {p.approved ? (
          <div className="flex items-center justify-between rounded-lg bg-success-soft p-3 text-sm font-medium text-success">
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Plan approved by FBO manager</span>
            <button onClick={() => p.setApproved(false)} className="underline">Undo</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => { p.setApproved(true); p.setEditing(false); }} className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Approve plan</button>
            <button onClick={() => p.setEditing(!p.editing)} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"><Pencil className="h-4 w-4" />{p.editing ? "Done" : "Edit plan"}</button>
          </div>
        )}
      </div>
    </section>
  );
}

function Categories({ plan, closure, delayWave }: { plan: ReturnType<typeof computePlan>; closure: boolean; delayWave: boolean }) {
  const c = plan.categories;
  const items = [
    { icon: Wrench, name: "Ramp agents", ...c.ramp, reason: closure ? "Extra tows and repositioning around the closed zone." : "Marshalling, chocks and towing scale fastest with arrivals." },
    { icon: Fuel, name: "Fueling specialists", ...c.fuel, reason: delayWave ? "Delayed arrivals request fuel at the same time." : "Reserve capacity for overlapping fuel requests." },
    { icon: UserRound, name: "Passenger-service staff", ...c.pax, reason: "Lounge, baggage and ground-transport handoffs for larger cabins." },
  ];
  return (
    <section className={`${card} p-5`}>
      <h2 className="font-display text-lg font-semibold">Peak-window staff breakdown</h2>
      <p className="text-sm text-muted-foreground">{fmtHour(plan.peakStart)} – {fmtHour(plan.peakEnd)}</p>
      <div className="mt-4 space-y-3">
        {items.map((i) => (
          <div key={i.name} className="flex items-start gap-3 rounded-xl border border-border p-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent"><i.icon className="h-5 w-5 text-primary" /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-medium">{i.name}</p>
                <p className="font-display text-xl font-bold">{i.base + i.add}{i.add > 0 && <span className="ml-1 text-sm font-semibold text-success">+{i.add}</span>}</p>
              </div>
              <p className="text-xs text-muted-foreground">{i.reason}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Impact({ plan }: { plan: ReturnType<typeof computePlan> }) {
  const rows = [
    { label: "Understaffed hours", fixed: plan.fixedUnder, ai: plan.aiUnder, better: plan.aiUnder < plan.fixedUnder },
    { label: "Estimated service-delay minutes", fixed: plan.fixedDelay, ai: plan.aiDelay, better: plan.aiDelay < plan.fixedDelay },
    { label: "Peak coverage", fixed: `${plan.peakCovFixed}%`, ai: `${plan.peakCovAi}%`, better: plan.peakCovAi > plan.peakCovFixed },
    { label: "Additional staffing hours", fixed: 0, ai: `+${plan.extraHours}`, better: false },
    { label: "Aircraft handled in peak window", fixed: `${plan.handledFixed} / ${plan.peakAircraft}`, ai: `${plan.handledAi} / ${plan.peakAircraft}`, better: plan.handledAi > plan.handledFixed },
  ];
  return (
    <section className={`${card} p-5`}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">Impact comparison</h2>
        <p className="font-display text-2xl font-bold text-success">−{plan.fixedDelay - plan.aiDelay} delay min</p>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="py-2 font-medium">Metric</th><th className="py-2 text-right font-medium">Fixed staffing (9)</th><th className="py-2 text-right font-medium text-primary">SurgeGuard</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-border last:border-0">
                <td className="py-3">{r.label}</td>
                <td className="py-3 text-right font-mono">{r.fixed}</td>
                <td className={`py-3 text-right font-mono text-base font-semibold ${r.better ? "text-success" : ""}`}>{r.ai}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const statusStyle: Record<HourRow["status"], string> = {
  "On plan": "bg-success-soft text-success",
  "Peak watch": "bg-warning-soft text-foreground",
  "Coverage gap": "bg-danger-soft text-destructive",
};

function HourlyTable({ rows }: { rows: HourRow[] }) {
  return (
    <section className={`${card} p-5`}>
      <h2 className="font-display text-lg font-semibold">Hourly operations</h2>
      <p className="text-sm text-muted-foreground">Coverage = share of workload that fixed staffing can serve.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            {["Time", "Arrivals", "Workload", "Fixed staff", "AI staff", "Coverage", "Status"].map((h) => <th key={h} className="py-2 font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.hour} className="border-b border-border last:border-0">
                <td className="py-2.5 font-medium">{fmtHour(r.hour)}</td>
                <td className="py-2.5 font-mono">{r.arrivals}</td>
                <td className="py-2.5 font-mono">{r.workload}</td>
                <td className="py-2.5 font-mono text-muted-foreground">{r.fixedStaff}</td>
                <td className={`py-2.5 font-mono font-semibold ${r.aiStaff > r.fixedStaff ? "text-primary" : ""}`}>{r.aiStaff}{r.aiStaff > r.fixedStaff && ` (+${r.aiStaff - r.fixedStaff})`}</td>
                <td className="py-2.5 font-mono">{r.coverage}%</td>
                <td className="py-2.5"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle[r.status]}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
