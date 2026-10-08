# Fernly Motion Specification

Audit target: `https://demo.codeandchill.store/fernly/`  
Audit date: 2026-10-08  
Viewport measured: `1366x900`  
Runtime observed: GSAP 3.15.0

## Method

The reference was inspected with Playwright and its production JavaScript/CSS bundles were checked to distinguish measured behavior from visual estimates.

Artifacts:

- `scripts/inspect-fernly-motion.mjs`
- `test-results/fernly-motion-reference/inspection.json`
- `test-results/fernly-motion-reference/load-finished.png`
- `test-results/fernly-motion-reference/tasks-transition.png`

Playwright sampled computed `opacity` and `transform` at 0, 50, 120, 220, 400, 700, and 1100 ms. The exact GSAP parameters below were then verified against the reference bundle.

## Global Sequence

The initial app load is a coordinated timeline, not a generic fade applied to every node.

| Start | Target | From | To | Duration | Ease | Stagger |
| ---: | --- | --- | --- | ---: | --- | ---: |
| 0.00 s | App shell | `opacity:0; y:18; scale:.99` | visible/rest | 0.90 s | `power3.out` | none |
| 0.15 s | Brand, sidebar labels, nav links, utility panel | `opacity:0; x:-16` | visible/rest | 0.60 s | `power3.out` | 0.035 s |
| 0.20 s | Topbar menu, search, actions | `opacity:0; y:-12` | visible/rest | 0.60 s | `power3.out` | 0.060 s |
| 0.25 s | Active view entrance | Section-specific sequence below | visible/rest | mixed | mixed | mixed |
| 0.55 s | Active sidebar rail | `scaleY:0` | `scaleY:1` | 0.60 s | `back.out(2)` | none |

The shell entrance runs once. The bundle guards it with a boolean before calling the app entrance function again.

## View Entrance

Every view starts with the same heading/header sequence, followed by section-specific content.

### Heading

- The heading is split into words and then characters.
- Each word clips overflow; each character moves independently.
- From: `yPercent:115`.
- To: `yPercent:0`.
- Duration: `0.85 s`.
- Ease: `power4.out`.
- Character stagger: `0.024 s`.
- Opacity is not animated.
- The transform is cleared after completion.

Measured first-character position:

| Time | Computed translateY |
| ---: | ---: |
| 0 ms | 32.15 px |
| 50 ms | 16.64 px |
| 120 ms | 8.67 px |
| 220 ms | 2.55 px |
| 400 ms | 0.16 px |
| 700 ms | cleared |

### Subtitle, Paragraph, Header Actions

- Targets: subtitle, direct header actions, and elements marked as header content.
- From: `opacity:0; y:10`.
- To: visible/rest.
- Start within view timeline: `0.08 s`.
- Duration: `0.55 s`.
- Ease: `power3.out`.
- Stagger: `0.05 s`.

Measured subtitle opacity: `0 -> .405 -> .729 -> .948 -> 1` at `0/50/120/220/400 ms`.

### Hero and Cards

Fernly has no marketing hero. The closest representative is the dark primary statistic card.

- Targets: elements marked `data-card`.
- From: `opacity:0; y:36; scale:.985`.
- To: `opacity:1; y:0; scale:1`.
- Start within view timeline: `0.10 s`.
- Duration: `0.85 s`.
- Ease: `power3.out`.
- Card stagger: `0.07 s` by default.
- Transform and opacity inline properties are cleared after completion.

Measured primary card:

| Time | Opacity | TranslateY | Scale |
| ---: | ---: | ---: | ---: |
| 0 ms | 0.000 | 36.00 px | .9850 |
| 50 ms | .204 | 28.67 px | .9881 |
| 120 ms | .494 | 18.23 px | .9924 |
| 220 ms | .779 | 7.97 px | .9967 |
| 400 ms | .961 | 1.42 px | .9994 |
| 700 ms | 1.000 | approximately 0 | 1.0000 |

### Compact Rows and Secondary Content

- From: `opacity:0; y:12`.
- To: visible/rest.
- Duration: `0.55 s`.
- Ease: `power3.out`.
- Default stagger: `0.05 s`.
- Some horizontal lists override this with `x:14-18; y:0` and `0.035-0.05 s` stagger.

### Image

The dashboard reference contains no content image reveal in its main views. `RevealImage` therefore uses the verified compact-content pattern (`opacity:0`, `y:12`, `scale:.985`, `0.55 s`, `power3.out`). The small scale value is an adaptation for BotUang media and is marked as an estimate, not a directly observed Fernly image parameter.

### Footer

Fernly is an application shell and has no page footer. No footer reveal parameter could be measured. BotUang does not add one solely for animation.

## View Change

Navigation between hash views repeats the active view entrance. It is not a scroll reveal.

Exit sequence:

- Targets: current view header, header content, and cards that are currently visible.
- From: current state.
- To: `opacity:0; y:-10`.
- Duration: `0.22 s`.
- Ease: `power2.in`.
- Stagger: `0.015 s`.
- After exit, the old view is hidden and its inline opacity/transform are cleared.
- The next view then runs its own heading, header-content, card, and row entrance timelines.

Playwright observed four transition animations immediately after selecting Tasks and none remaining by approximately 220 ms for the nav-state portion. The content entrance continues through its own GSAP timeline.

## Scroll Behavior

No viewport reveal system was found:

- No `IntersectionObserver` construction exists in the production bundle.
- No observed animations were created by scrolling from top to bottom, back to top, and down again.
- The measured page was only 99 px taller than the 900 px viewport; scrolling did not start a reveal.
- The bundle includes GSAP internals containing the `ScrollTrigger` name, but no active scroll-triggered section reveal was detected.

Conclusion: use mount/view-change animation for BotUang. Do not animate cards merely because they enter the viewport.

## Repeat Rules

- Shell entrance: once per full document load.
- View entrance: each time a dashboard view becomes active.
- Scroll reveal: not used.
- Hover lift and magnetic controls: repeat on pointer interaction only and only on fine-pointer devices.
- Continuous/repeating motion is reserved for functional widgets such as an active timer or recording indicator, not page decoration.

## Reduced Motion

Fernly checks `prefers-reduced-motion: reduce` and maps timing values through a helper that returns `0` under reduced motion. It also immediately advances active entrance timelines to completion.

BotUang requirements:

- `useReducedMotion()` disables initial transforms and stagger delays.
- Content remains visible with no intermediate hidden state.
- Page exit duration becomes zero.
- Functional state changes remain available without relying on motion.

## BotUang Component Mapping

- `RevealHeading`: exact character reveal for page titles only.
- `FadeUp` `card`: primary panels and top-level cards.
- `FadeUp` `content`/`compact`: subtitles, toolbars, lists, and secondary content.
- `StaggerContainer`: sibling card/list groups only; default card stagger is `0.07 s`.
- `RevealImage`: real QRIS/media only, using the documented estimate.
- Dashboard view wrapper: exact `0.22 s`, `power2.in`, `y:-10` exit before the next keyed view mounts.

Avoid nested stagger sequences, scroll-triggered reveals, and delays beyond the reference timeline. They make data-heavy pages feel slower and do not match Fernly.

## Automated Verification

`e2e/fernly-dashboard.spec.ts` verifies the implemented motion against three temporal states after an in-app view change:

- Start: the incoming compact content is below full opacity and carries its entrance transform.
- Midpoint (`+120 ms`): opacity has progressed toward the resting state.
- End (`+900 ms`): opacity is `1` and the transform is cleared or an identity matrix.

The test saves `motion-<project>-start.png`, `motion-<project>-mid.png`, and `motion-<project>-end.png` under `test-results/`. A separate reduced-motion test verifies that all marked reveal content is immediately visible with no transform. Existing viewport tests continue to cover `360`, `390`, `768`, `1366`, and `1440` px widths.
