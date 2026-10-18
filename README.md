# QuantumApplicationsbyNJR

An interactive, responsive website about quantum physics, its historical evolution, and real-world applications. Content is adapted from the supplied **Quantum Evolution Applications Comprehensive Guide**, prepared October 2026. The complete 19-chapter guide and its tables are preserved in `public/content/guide.json`; the original document is available to download on the site.

**Live website:** https://quantumapplicationsbynjr.vercel.app

**Source repository:** https://github.com/NJROzzy/QuantumApplications

## Development

Requires Node.js 20.19 or newer. The page uses browser-native HTML, CSS, and JavaScript. Cheerio parses publisher feeds in the Node news service; jsdom is used only for checks.

```sh
npm install
npm run dev
npm run check
npm run build
```

Open http://localhost:3000. The build produces `dist/` for Vercel or another static host.

The local server also serves `/api/news`. A host that serves only `dist/` can show the saved news edition, but automatic research updates require the Node endpoint deployed by Vercel.

## Content and scope

The guide distinguishes established quantum technologies from research, exploratory applications, and future scenarios. Vendor roadmaps are attributed forecasts. All simulations run locally in the browser and state their assumptions.

## Interactive experiments

- **Qubit studio:** Bloch sphere, polar angle and phase, H/X/Y/Z/S/T gates with undo, X/Y/Z measurement bases, a depolarizing mixture, sampled outcomes, and gate history.
- **Double slit:** adjustable wavelength and slit separation, which-path recording, a diffraction/interference plot, individual photon detections, and a continuous source. This is a paraxial Fraunhofer model conditioned on the displayed detection window.
- **Entanglement:** linear polarization measurements of noisy Bell pairs, adjustable analyzers, joint-outcome histograms, and a four-setting CHSH sampling experiment. This is a mathematical simulation, not an experimental Bell test.
- **Tunneling:** exact stationary rectangular-barrier transmission with adjustable energy, height, and width; a probability curve and sampled transmission/reflection counts. The moving wave and particle traces are schematic.

Each experiment has a guided action and JSON result export. The lab has an expanded focus view with keyboard navigation. Continuous sources stop when changing experiments and suspend when the lab is off screen or the tab is hidden. Ambient concept art has three modes, pointer response, an energy slider, and a pause control; reduced-motion preferences pause it by default.

## Quantum Live and Industry Atlas

**Quantum Live** aggregates arXiv quant-ph, IBM Quantum's official blog, Google Quantum AI's category feed, MIT's quantum-physics feed, and Nature's npj Quantum Information RSS. Nature can fall back to Crossref's publisher-deposited journal metadata. Each item includes its original publication date, source link, source excerpt or labeled topic overview, publication type, and related concepts. Categories and suggested connections are based on topic matching; they do not establish scientific validity.

The browser checks every 15 minutes while visible and pauses automatic replacement when a dialog is open or a result link is focused. `/api/news` fetches fixed, allowlisted sources with bounded timeouts and response sizes. It coalesces concurrent requests and uses a 15-minute memory/CDN cache. A failing publisher uses its last available content or the bundled saved edition, retaining original dates and showing a **Saved** label. Complete outages use a short server cache so manual retries can recover. No API keys or database are needed.

```sh
npm run refresh:news
```

This refreshes the bundled fallback at `public/content/news-snapshot.json`; live updates do not require a new build. Browser storage keeps the last usable edition when available.

**Quantum Industry Atlas** has ten curated, dated profiles: IBM, Google, Microsoft, NVIDIA, IonQ, Quantinuum, Rigetti, D-Wave, PsiQuantum, and QuEra. Filter by technology or search research areas; each profile connects sourced milestones and developments to live mentions, applications, laboratory experiments, and the evolution timeline. Profiles live in `public/content/industry.json` and require editorial review when company technologies or milestones change. Live news enriches their coverage automatically; it does not silently rewrite company claims or forecasts.

## Deployment

`vercel.json` configures the static site and the `/api/news` Vercel Node function, including its bundled fallback file and a 25-second execution limit. The Vercel project slug uses lowercase (`quantumapplicationsbynjr`); the website's project name is **QuantumApplicationsbyNJR**. Vercel authentication and local project identity are excluded from Git.

The project is deployed in the existing `workfornjr-7532s-projects` Vercel workspace and connected to the GitHub repository. Pushes to `main` trigger production deployments.

## Verification

`npm run check` runs deterministic physics checks plus 52 content, interaction, integration, and news-service checks. It covers the original guide and experiments, RSS/Atom/RDF parsing, publisher failures, source URL restrictions, publication dates, news filters and refresh, industry profiles, contextual navigation, and unsafe publisher markup. The browser interactions use jsdom; these checks do not verify visual rendering.
