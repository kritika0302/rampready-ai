<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep this planner frontend-only with deterministic synthetic state in `src/lib/surge.ts`; no persistence or external model is needed for the prototype.
- Compute demand, mitigation deltas, category staffing, and dispatch rosters in the shared planning engine so all dashboard views use the same rules.
- Preserve the supplied hourly baseline as calibrated demand; add congestion only to its modeled heavy-towing share, which explains the 12-person medium peak at eight units per employee.
- Label compliance as modeled tow-crew feasibility, never certified real-world safety compliance; planning approval is not aircraft movement clearance.
- Use shift blocks for execution and identify afternoon handoff and break/roster checks, because hourly demand targets alone do not prove available staff.
