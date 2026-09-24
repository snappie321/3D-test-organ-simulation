# Organ Pipe Simulator

A 3D web simulation of a single labial (flue) organ pipe. Adjust the pipe's
geometry and wind, watch the air move, and hear the resulting tone in real
time. Built as the first step toward a multi-pipe / multi-register organ.

**Live demo:** once GitHub Pages is enabled for this repository (Settings →
Pages → Source: `gh-pages` branch, `/` root), the app is available at
<https://snappie321.github.io/3D-test-organ-simulation/>.

## Stack

- React + React Three Fiber (3D scene, cutaway pipe view, air particles)
- Web Audio API (harmonic bank + jet noise, driven by the physics model)
- Vite, Zustand

## Physics model (`src/physics/pipePhysics.js`)

The tone is computed from the pipe's dimensions, not from a fixed sample:

- **Resonance**: fundamental from the effective acoustic length
  (physical length + mouth and open-end corrections) of a stopped-foot /
  open-top pipe: `f0 = c / 2·Leff`.
- **Air jet**: wind pressure → jet speed `v = √(2P/ρ)` at the flue slit.
  The **Strouhal number** `St = f·E / v` (cut-up height E) determines how
  well the jet locks to the pipe: around **St ≈ 0.15** the pipe speaks
  optimally; too much wind pushes it into **overblowing** (mode 2/3).
- **Spectrum**: pipe scale (width/length) sets the harmonic slope — narrow
  pipes (strings) are rich in harmonics, wide pipes (flutes) are round.
- **Material damping**: wooden walls damp high harmonics more than metal.
- **Chiff**: the attack transient and jet noise band are estimated from
  the jet speed and flue gap.

Parameters you can control: length in organ feet (½′–32′) with mm fine
tuning, width, depth (wood), wall thickness, cut-up, flue gap, wind
pressure, material (metal/wood), pipe type (flue or reed/tongwerk),
stopped (capped) mode, and an adjustable tremulant on a visible wedge
bellows. Every option has an (i) info button explaining its effect on the
tone. Sliders for wind and cut-up grey out the region where the pipe would
stop speaking or overblow, and settings are normalised so the pipe always
stays in its playable range.

## Run

```bash
npm install
npm run dev
```

Open the printed URL. Click **Send Wind** (the browser requires one gesture
before audio may start). Drag to orbit, scroll to zoom.

## Tests

```bash
npm run physics:check
```

Smoke-tests the pure physics module: presets speak at the expected pitch,
length doubling halves the frequency, overblowing is detected, and invalid
geometry is reported.

## Roadmap

- Multiple pipes / ranks on a windchest
- Keyboard input (virtual manual + computer keys)
- Registers (stops) with mixtures
- Recorded/chirped attack transients, more material models

## Deployment

The live demo runs from the `gh-pages` branch (static build of `main`).
After merging changes, rebuild and republish that branch.
