# RampReady AI

Build a polished, responsive web application called “FBO SurgeGuard AI.”

The product is an explainable staffing-planning tool for a fictional fixed-base operator near Van Nuys Airport in Los Angeles. It helps the FBO prepare for increased business-aviation traffic during the seven-day period around Super Bowl week.

This is a hackathon prototype for the “The Intelligent FBO” aviation track. The chosen focus area is staffing.

PRODUCT STATEMENT

Use this headline:

“Prepare the ramp before demand lands.”

Use this supporting text:

“SurgeGuard forecasts hourly aircraft-service workload and recommends targeted staffing coverage for event-week operations.”

The product should feel like a modern aviation operations control center: professional, trustworthy, operational, and easy to understand in a three-minute demo.

IMPORTANT SCOPE

- Build a self-contained frontend prototype.
- Use seeded synthetic data only.
- Do not require login or external API keys.
- Do not use sensitive passenger information.
- Do not claim that the system authorizes aircraft movement.
- Keep the focus on staffing.
- Do not build full airport parking, aircraft dispatch, or fuel-inventory functionality.
- Include visible human approval and responsible-AI language.

PRIMARY USER

The primary user is an FBO operations manager preparing staffing coverage for a major event.

USER FLOW

1. The user selects one scenario:
   - Ordinary week
   - Super Bowl low demand
   - Super Bowl medium demand
   - Super Bowl high demand

2. The user adjusts an arrival-surge slider from 0% to 70%.

3. The user can activate:
   - Simulate one ramp zone closed
   - Simulate a 90-minute delay wave

4. The application updates:
   - Hourly workload
   - Staff recommendation
   - Forecast confidence
   - Delay estimate
   - Impact comparison
   - Hourly operations table

5. The user reviews the recommendation and approves or edits the plan.

AI AND PLANNING LOGIC

Do not create a static dashboard. The controls must change the results.

Use this workflow:

1. Create seeded synthetic aircraft records containing:
   - Flight ID
   - Arrival time
   - Departure time
   - Aircraft type
   - Passenger count
   - Fueling required
   - Passenger service required
   - Ramp service duration
   - Priority

2. Calculate an aircraft workload score using:
   - Base ramp workload
   - Fueling workload
   - Passenger-service workload
   - Aircraft-size adjustment
   - Disruption adjustment

3. Aggregate workload by hour.

4. Apply the selected scenario multiplier:

   - Ordinary week: 0.72
   - Super Bowl low demand: 0.88
   - Super Bowl medium demand: 1.00
   - Super Bowl high demand: 1.22

5. Apply the arrival-surge slider.

6. If the ramp-zone closure is active:
   - Reduce effective service capacity
   - Increase workload during affected hours
   - Explain the operational effect

7. If the delay wave is active:
   - Shift several arrivals into the 2:00 PM–5:00 PM period
   - Increase overlapping service demand
   - Explain why staffing changes

8. Calculate:

   recommended staff = ceiling(hourly workload / employee capacity)

9. Compare the recommendation with fixed staffing.

10. Generate a plain-language recommendation.

DEFAULT DATA

Use this 12-hour baseline workload:

8 AM: 22
9 AM: 18
10 AM: 24
11 AM: 31
12 PM: 48
1 PM: 68
2 PM: 82
3 PM: 88
4 PM: 76
5 PM: 57
6 PM: 43
7 PM: 27

Use a fixed staffing baseline of 9 employees per hour.

In the default medium-demand scenario, the application should recommend approximately 12 employees during the afternoon peak.

STAFF CATEGORIES

Show three categories:

- Ramp agents
- Fueling specialists
- Passenger-service staff

The main KPI may show total employees, but include a detailed category breakdown for the peak window.

REQUIRED UI

1. LEFT SIDEBAR

Include:

- Airplane logo or simple aviation mark
- Product name: FBO SurgeGuard AI
- Subtitle: Event-week operations planner
- Demand scenario dropdown
- Arrival-surge slider
- Ramp-zone closure checkbox
- Delay-wave checkbox
- Information card titled “How the AI helps”

The information card should say that SurgeGuard forecasts hourly workload, recommends staffing coverage, explains uncertainty, and keeps the manager in control.

2. HEADER

Include:

- “Van Nuys · Los Angeles · seven-day planning window”
- “Prepare the ramp before demand lands.”
- Supporting text explaining the comparison between fixed staffing and AI staffing
- Green status pill: “Human review required”

3. KPI CARDS

Show:

- Expected aircraft today
- Peak workload
- Peak staff required
- Projected delay
- Delay reduction compared with fixed staffing

4. WORKLOAD CHART

Create an hourly chart from 8 AM to 7 PM showing:

- Forecasted workload
- AI staff capacity
- Coverage gaps
- Peak period
- Clear legend

Use red for coverage gaps, blue for staff capacity, and light cyan for workload.

5. AI RECOMMENDATION PANEL

Include:

- Title: AI staffing recommendation
- Recommendation such as “Add 3 ramp staff at 2:00 PM”
- Explanation of the recommendation
- At least three reasons
- Forecast confidence percentage
- Confidence bar
- Human approval reminder

Example explanation:

“Workload rises above 80% between 2:00 PM and 5:00 PM. The system recommends additional ramp coverage during this period while keeping normal staffing during lower-demand hours.”

6. HOURLY OPERATIONS TABLE

Include:

- Time
- Arrivals
- Workload
- Fixed staff
- AI staff
- Coverage
- Status

Use status labels:

- On plan
- Peak watch
- Coverage gap

7. STAFF CATEGORY BREAKDOWN

Show the peak-period staffing recommendation for:

- Ramp agents
- Fueling specialists
- Passenger-service staff

Include a short reason for each category.

8. IMPACT COMPARISON

Compare fixed staffing and SurgeGuard using:

- Understaffed hours
- Estimated service-delay minutes
- Peak coverage
- Additional staffing hours
- Aircraft handled during the peak window

9. RESPONSIBLE-AI FOOTER

Display:

“Synthetic planning data. SurgeGuard supports FBO preparation; it does not authorize aircraft movement, override ramp-safety procedures, or replace airport personnel. Final staffing decisions remain with the FBO manager.”

INTERACTION REQUIREMENTS

All controls must update without a page reload:

- KPI cards
- Workload chart
- AI recommendation
- Confidence score
- Hourly table
- Impact comparison
- Staff-category breakdown

When the ramp-zone closure is activated, show:

“One ramp zone is unavailable, so effective service capacity is reduced and additional coverage is needed.”

When the delay wave is activated, show:

“Delayed arrivals overlap during the afternoon peak, increasing workload and required staffing.”

VISUAL DESIGN

- Use dark navy, blue, cyan, green, amber, and red.
- Use a light gray-blue background.
- Use white cards with rounded corners.
- Use subtle borders and shadows.
- Make the dashboard responsive.
- Make the recommendation and impact numbers visually prominent.
- Avoid unnecessary photos, excessive decoration, and clutter.

DEFAULT DEMO TEXT

Use these examples in the default medium-demand state:

“Workload rises above 80% between 2:00 PM and 5:00 PM.”

“Add 3 ramp staff at 2:00 PM.”

“Reserve one fueling specialist for overlapping service requests.”

“Compared with fixed staffing, SurgeGuard reduces projected service delay while keeping the rest of the day at normal staffing levels.”

ACCEPTANCE CRITERIA

The application is complete only when:

- It loads without login.
- It works without external APIs.
- All four demand scenarios produce different results.
- The arrival-surge slider changes the forecast.
- The ramp-zone closure changes the recommendation.
- The delay-wave toggle changes the peak workload.
- The chart compares workload and staff capacity.
- The table updates dynamically.
- The AI recommendation is written in plain language.
- The fixed-staffing baseline is visible.
- The impact comparison is visible.
- Staff categories are shown.
- Responsible-AI language is visible.
- The layout is polished and responsive.
- Every main control changes the dashboard.

FINAL DEMO STORY

Start with ordinary-week staffing. Switch to Super Bowl medium demand and show the afternoon peak. Explain that fixed staffing creates a coverage gap. Activate the delay-wave scenario and show the system adapt. Finish by showing the reduction in projected delay and state clearly that the FBO manager remains the final decision-maker.

Do not add flight booking, passenger identity, real-time aircraft tracking, aircraft movement authorization, or a full airport resource-management system.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9ffa3964-afab-4cd4-94d8-4a855a185d81).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
