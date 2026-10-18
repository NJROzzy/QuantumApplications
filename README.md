# QuantumApplicationsbyNJR

An interactive, responsive website about quantum physics, its historical evolution, and real-world applications. Content is adapted from the supplied **Quantum Evolution Applications Comprehensive Guide**, prepared October 2026. The complete 19-chapter guide and its tables are preserved in `public/content/guide.json`; the original document is available to download on the site.

**Live website:** https://quantumapplicationsbynjr.vercel.app

**Source repository:** https://github.com/NJROzzy/QuantumApplications

## Development

Requires Node.js 20.19 or newer. The website has no runtime packages. Install the development dependency to run interaction checks.

```sh
npm install
npm run dev
npm run check
npm run build
```

Open http://localhost:3000. The build produces `dist/` for Vercel or another static host.

## Content and scope

The guide distinguishes established quantum technologies from research, exploratory applications, and future scenarios. Vendor roadmaps are attributed forecasts. All simulations run locally in the browser and state their assumptions.

## Interactive experiments

- **Qubit studio:** Bloch sphere, polar angle and phase, H/X/Y/Z/S/T gates with undo, X/Y/Z measurement bases, a depolarizing mixture, sampled outcomes, and gate history.
- **Double slit:** adjustable wavelength and slit separation, which-path recording, a diffraction/interference plot, individual photon detections, and a continuous source. This is a paraxial Fraunhofer model conditioned on the displayed detection window.
- **Entanglement:** linear polarization measurements of noisy Bell pairs, adjustable analyzers, joint-outcome histograms, and a four-setting CHSH sampling experiment. This is a mathematical simulation, not an experimental Bell test.
- **Tunneling:** exact stationary rectangular-barrier transmission with adjustable energy, height, and width; a probability curve and sampled transmission/reflection counts. The moving wave and particle traces are schematic.

Each experiment has a guided action and JSON result export. The lab has an expanded focus view with keyboard navigation. Continuous sources stop when changing experiments and suspend when the lab is off screen or the tab is hidden. Ambient concept art has three modes, pointer response, an energy slider, and a pause control; reduced-motion preferences pause it by default.

## Deployment

`vercel.json` configures a static Vercel deployment. The Vercel project slug uses lowercase (`quantumapplicationsbynjr`); the website's project name is **QuantumApplicationsbyNJR**. Vercel authentication and local project identity are excluded from Git.

The project is deployed in the existing `workfornjr-7532s-projects` Vercel workspace and connected to the GitHub repository. Pushes to `main` trigger production deployments.

## Verification

`npm run check` runs deterministic physics checks and 25 interaction/content checks using jsdom. It covers gate identities, Born-rule probabilities, diffraction, Bell marginals and CHSH, barrier limits, content preservation, navigation, simulations, animated-source timing, exported results, and finite canvas coordinates. These checks exercise the actual page scripts; they do not verify visual rendering.
