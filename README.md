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

## Quantum Universe and the evolution story

The interactive universe connects **119 topics through 334 labeled relationships**: principles, applications, techniques, software, companies, people and teams, current projects, and historical contributors. Select a node to recenter its constellation; the map displays up to twelve direct neighbors while the connection list exposes every neighbor. Search the topic index, filter its eight categories, follow four guided journeys, or trace a shortest connection between any two topics. Each step explains the relationship and links to a source where available. Keyboard controls, a selection history, and reset support exploration.

The universe opens the existing concepts, application dialogs, toolkit entries, company profiles, researcher/project profiles, guide, and laboratory experiments. Application details link back to the universe. The graph is an educational map: conceptual links, organizational relationships, and historical contributions retain their labels. Related methods do not assert software usage, causation, or demonstrated quantum advantage. Category filters affect the topic index, preserving the map’s surrounding context.

Evolution now includes **27 sourced milestones across four eras**, from Young’s classical optics through the October 2026 research frontier. It names representative contributors including Planck, Einstein, Bohr, Bose, de Broglie, Heisenberg, Born, Jordan, Pauli, Schrödinger, Bell, Feynman, Bennett, Brassard, Deutsch, Shor, Steane, Calderbank, and Grover. The introduction states that quantum theory has no single founder. Award years are distinguished from experimental dates; current program goals and reported results retain their scope.

A six-chapter story follows the puzzles, new mathematical language, everyday technologies, entanglement debate, quantum computation, and unfinished engineering frontier. Each chapter links to its milestones and sources, a connected universe journey, a related lab, and the complete guide. Navigation is manual; the browser remembers the last chapter when local storage is available.

`public/content/evolution.json` owns the dated historical and narrative content. `public/universe-model.js` builds the graph from this history and the existing industry, toolkit, and innovators catalogs. Editing those catalogs updates the graph on reload; editorial history is not automatically rewritten from the news feed. `public/evolution.js` and `public/universe.js` render the two experiences without external graph libraries. Failed catalog loads display explicit fallback messages while the remaining guide stays available.

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

## Quantum Toolkit

The toolkit contains **12 software platforms and 12 techniques**, curated from official documentation and primary educational sources. Search across tool names, languages, use cases, and related methods; filter by the task you want to explore. Compare up to three software platforms by language, use, execution environment, access requirements, and practical limits.

Profiles explain software setup and method workflows and connect to the guide, applications, Industry Atlas, and the four educational lab models. Company filters identify tools developed by that company; related techniques are suggested learning connections. SDK execution happens in the software’s own environment. The site does not submit cloud jobs or run these external packages in the browser.

Edit `public/content/toolkit.json` to review or expand the dated catalog. Unlike Quantum Live, this catalog is editorial content and is not automatically rewritten from news. `scripts/toolkit-check.mjs` validates references, filters, profiles, keyboard tabs, comparison behavior, and failure handling; the main interaction suite verifies cross-section navigation.

## Quantum Innovators and Current Projects

The People & Projects directory adds ten named researchers, two research teams or networks, and eleven connected projects or programs. It includes university groups, industrial research, QuTech’s Quantum Internet Alliance, and India’s National Quantum Mission hubs. Search by researcher, institution, or project; filter both views by region and research area. Profile and project dialogs link in both directions and connect to the Industry Atlas, toolkit, applications, lab, and guide.

`public/content/innovators.json` records the editorial review date, official profiles, source publication dates, source types, and project stage. Undated program pages remain explicitly undated. Company reports, theory, preprints, experimental results, available platforms, and future development goals retain their evidence labels. Names are representative contributors or research leaders, not claims of sole project authorship. Related toolkit/lab links are educational connections and do not imply a team uses that software or that the browser reproduces its results.

This catalog is curated, not automatically refreshed. Review profiles and project evidence when updating it; Quantum Live continues to supply automatic research news. `scripts/innovators-check.mjs` validates the catalog, all profiles, search, filters, keyboard tabs, navigation history, source safety, and failure behavior.

## Deployment

`vercel.json` configures the static site and the `/api/news` Vercel Node function, including its bundled fallback file and a 25-second execution limit. The Vercel project slug uses lowercase (`quantumapplicationsbynjr`); the website's project name is **QuantumApplicationsbyNJR**. Vercel authentication and local project identity are excluded from Git.

The project is deployed in the existing `workfornjr-7532s-projects` Vercel workspace and connected to the GitHub repository. Pushes to `main` trigger production deployments.
## New dev OTW" 
## Verification

`npm run check` runs deterministic physics checks plus 105 content, interaction, integration, and news-service checks. It covers the guide and experiments, publisher feeds and failures, source safety, news filters and refresh, industry profiles, toolkit search and comparisons, researcher/project profiles, universe reachability and path validation, keyboard exploration, story progress and persistence, historical credits, and cross-section navigation. Automated DOM interactions use jsdom. `scripts/universe-check.mjs` includes loading queues, escaped catalog content, invalid routes, source links, and catalog outages. The toolkit was previously reviewed in a browser at desktop, tablet, and mobile widths. Browser access was unavailable for the People & Projects addition and the universe/story update (the Mac was locked for the latter), so these additions have automated DOM verification without a new visual review.
