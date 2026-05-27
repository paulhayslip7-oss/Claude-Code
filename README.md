# paulhayslip7-oss/Claude-Code

A monorepo of projects. Each project lives in its own top-level subfolder so
they don't share dependencies, build config, or deploy targets.

## Projects

| Path | What it is |
| --- | --- |
| [`ironman-recap/`](./ironman-recap) | Digital storefront where Ironman participants search their result and buy a $5 personalized recap. Stripe Checkout + Strava OAuth + admin CSV importer. Deploys to Netlify. |

## Adding another project

Create a new sibling folder at the repo root (e.g. `marathon-tracker/`),
keep its own `package.json`, `node_modules`, etc. inside it. If you want
Netlify to deploy a different project, create a **separate Netlify site**
pointing at this same repo and set its base directory to the new folder.
