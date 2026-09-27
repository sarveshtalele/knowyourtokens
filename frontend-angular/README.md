# frontend-angular

An Angular 18 port of `frontend/` (the React 18 + Tailwind dashboard), with the same DOM, the same Tailwind config and the same behaviour.

The port was verified with the codebase-migration factory's skills: every page of the running app was screenshot in the original and in this port, against the same backend and under the same pinned browser settings. The result: **0% pixel difference** on all 11 pages, and all 122 sidebar and page click edges land in the same place.

## Run it

Start the backend as usual:

```bash
cd backend && python run.py
```

Then start the port. It is served on port 4501, and `/api` and `/ws` are proxied to the backend on port 8000:

```bash
cd frontend-angular && npm install && npx ng serve
```

Open http://localhost:4501.

## Where things are

- `src/app/layout/`: AppLayout, Sidebar, TopBar and ConnectionBanner.
- `src/app/pages/`: one component per React page.
- `src/app/ui/`, `src/app/data/`: Badge, Button, Tooltip, Drawer, TabNav, DataTable, StatRow and MetricCard. Each is an attribute component on the same element React renders.
- `src/app/charts/`: recharts rewritten as plain SVG, with the same frame and sizes. Empty charts match exactly; charts with data are close but not pixel-identical to recharts.
- `src/app/api/`, `src/app/lib/`: the API layer, types and formatting, unchanged from `frontend/src`.

## Not verified

`/projects/:id` and `/requests/:id` are ported but had no data to compare against: the verification backend was empty.
