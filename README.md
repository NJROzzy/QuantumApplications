# QuantumApplicationsbyNJR

An interactive, responsive website about quantum physics, its historical evolution, and real-world applications. Content is adapted from the supplied **Quantum Evolution Applications Comprehensive Guide**, prepared October 2026. The complete 19-chapter guide and its tables are preserved in `public/content/guide.json`; the original document is available to download on the site.

## Development

Requires Node.js 20 or newer. No runtime packages or installation are needed.

```sh
npm run dev
npm run check
npm run build
```

Open http://localhost:3000. The build produces `dist/` for Vercel or another static host.

## Content and scope

The guide distinguishes established quantum technologies from research, exploratory applications, and future scenarios. Vendor roadmaps are attributed forecasts. The interactive single-qubit lab is an educational probability simulation that runs locally in the browser.

## Deployment

`vercel.json` configures a static Vercel deployment. The Vercel project slug uses lowercase (`quantumapplicationsbynjr`); the website's project name is **QuantumApplicationsbyNJR**. Vercel authentication and local project identity are excluded from Git.
