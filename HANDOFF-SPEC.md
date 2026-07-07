# Handoff Spec: GradeVibe Vaud — Grade Tracker PWA

Source: `github.com/pranathi-alikatte/grade-tracker` (main, July 2026)
Stack: Vanilla HTML/CSS/JS, no build step. PWA (manifest + service worker). French UI.

### Overview
Single-page grade tracker for Vaud gymnase students (1–6 scale). Three views toggled by top nav: **Accueil** (landing), **Mes Notes** (dashboard), **Guide** (rules explainer). Dashboard shows promotion status, per-subject cards or "gem" spheres, and group point balances. Data persists in `localStorage` (`gymnase_vaud_state_v5`); grade photos in IndexedDB.

### Layout
- App container: `max-width: 1040px`, centered, vertical flex, gap `--section-gap` (1.5rem)
- Body padding: `2rem 1.5rem` + `env(safe-area-inset-*)`; `min-height: 100dvh`
- Subjects list: single column on mobile → 2-col grid at `min-width: 769px`
- Modal max-width: 440px (grade details: 400px)

### Design Tokens (style.css)
Two token layers: base `:root` (dark navy) and `body.theme-light` override. **Light mode is the default** — `applyTheme()` defaults `state.isLightTheme` to `true`, so the shipped look is the light-editorial palette below. The dark values apply only when the user toggles light off.

**`body.theme-light` (default effective values)**
| Token | Value | Notes |
|-------|-------|-------|
| `--color-bg-base` | `#fcfbf9` | Warm off-white |
| `--color-bg-surface` | `#ffffff` | Cards |
| `--color-bg-elevated` | `#f4f2ee` | Elevated panels |
| `--color-border-subtle` | `rgba(0,0,0,0.06)` | Hairline borders |
| `--color-primary` / hover | `#1c1917` / `#44403c` | Charcoal editorial CTAs |
| `--color-text-primary/secondary/muted` | `#1c1917` / `#57534e` / `#8c8a85` | Stone scale |
| `--color-passing/failing/warning-bg` | `#2b6747` / `#9b2c2c` / `#b7791f` | Desaturated organic status tones |
| `--font-family-sans` | `'Plus Jakarta Sans', 'Inter', system` | Matches loaded webfont |
| `--radius-sm/md/lg` | 6 / 10 / 14px | Sharper than dark mode |
| `--section-gap` | 2rem | |

**Base `:root` (dark mode, when light is toggled off)**
| Token | Value (navy) | Usage |
|-------|-------|-------|
| `--color-bg-base` | `#0f172a` | Page background, chip bg, text on primary buttons |
| `--color-bg-surface` | `#273a5a` | Cards (used at 60–80% via `color-mix` + blur) |
| `--color-bg-elevated` | `#334155` | Elevated controls, secondary buttons |
| `--color-border-subtle` | `#2e3b5e` | Card/input borders |
| `--color-border-focus` | `#60a5fa` | Focus rings |
| `--color-text-primary` | `#f8fafc` | Body text |
| `--color-text-secondary` | `#94a3b8` | Labels, descriptions |
| `--color-text-muted` | `#64748b` | Timestamps, footnotes |
| `--color-primary` | `#60a5fa` | CTAs, active states, accents |
| `--color-primary-hover` | `#3b82f6` | Button hover |
| `--color-passing-bg` | `#10b981` | Grade ≥ 4.5 badges |
| `--color-warning-bg` | `#f59e0b` | Grade = 4.0 badges |
| `--color-failing-bg` | `#ef4444` | Grade < 4.0 badges, delete button |
| `--color-avg-*-bg/text` | rgba tints at 0.15 | Average pills (passing/warning/failing/neutral) |
| `--radius-sm / md / lg / full` | 8 / 12 / 16 / 9999px | Chips / panels / cards / buttons+pills |
| `--transition-fast` | `0.15s ease` | Hovers, color changes |
| `--transition-normal` | `0.25s cubic-bezier(0.4,0,0.2,1)` | View transitions |

**Typography**
| Token | Value | Usage |
|-------|-------|-------|
| `--font-family-sans` | `'Montserrat', 'Outfit', system stack` | UI text |
| `--font-family-serif` | `'Playfair Display', Georgia` | Decorative headings |
| `--font-family-mono` | `'JetBrains Mono', monospace` | Grades, stat values |

⚠️ **Font discrepancy to resolve:** index.html loads *JetBrains Mono, Plus Jakarta Sans, Playfair Display*. Light mode (default) correctly uses Plus Jakarta Sans. Dark-mode `:root` declares *Montserrat/Outfit* — never loaded, falls back to system — and gem/gauge styles hardcode `'Montserrat', 'Outfit'` inline. Either load Montserrat or unify on Plus Jakarta Sans.

**Theming** — two independent axes, both persisted in state and applied by `applyTheme()`:
1. Light/dark: `body.theme-light` class (default ON).
2. Color theme: 10 palettes via `[data-theme]` on `<body>`, each overriding bg/border/primary tokens: `navy` (default), `pink #ec4899`, `green #10b981`, `purple #8b5cf6`, `cozy #a7bfa4`, `honey #f59e0b`, `skyblue #38bdf8`, `crimson #f43f5e`, `mint #34d399`, `teal #14b8a6`. These are dark palettes — verify interaction with `theme-light` (light override wins for shared tokens due to class specificity).

New UI must only consume tokens — never hardcode theme colors.

### Components
| Component | Variants | Notes |
|-----------|----------|-------|
| Top nav (`.top-nav-bar`) | 3 tabs (`.nav-tab-btn`, `.active`) | `data-view` switches `.page-view` display |
| Buttons (`.btn`) | `.btn-primary`, `.btn-secondary` | Pill radius, 0.85rem/700, padding 0.6rem 1.25rem |
| Year selector (`.lang-toggle-btn`) | 4: 1ère/2ème/3ème/Évolution | Horizontal-scroll strip ≤520px (min-width 90px, hidden scrollbar) |
| Semester tabs (`.semester-tab`) | Sem 1 / Sem 2 / Annuel | |
| Promo dashboard | promoted / failing / neutral | Status badge, title/subtitle, 4 stat cards (2×2 ≤640px; `.three-cols` when compensation hidden); alternate gauge view via `#toggle-promo-view` |
| Subject card (`.subject-card`) | grid mode | Glassmorphic: `color-mix(surface 60%)` + `backdrop-filter: blur(16px) saturate(130%)`, radius-lg, hover border lighten + lift |
| Gem sphere (`.gem-sphere`) | 11 gemstone textures + custom | 140×140px (72px ≤480px); texture layer 196px; average overlaid (1.8rem/800, black); drag-to-rotate with inertia |
| Grade chips (`.chip-btn`) | values 1.0–6.0 step 0.5; TS/TA; dual/standard | Active: primary bg, base text, glow `0 0 10px rgba(96,165,250,0.3)` |
| Modals | add-subject, add-grade, grade-details (view/edit) | Backdrop `rgba(5,7,12,0.85)` + blur(8px), z-1000; add-grade & details z-1100 (stack above subject details) |
| Camera/OCR panel | in add-grade + edit | `<video>` preview ≤200px, Capturer/Fermer, Tesseract.js 5.0.5 spinner state |
| PWA install banner | hidden by default | Shown on `beforeinstallprompt`; Installer triggers `deferredPrompt.prompt()` |
| Bilan par groupe | Groupe 1 / Groupe 2 | Min/Max points text in primary color |

### States & Interactions
| Element | State | Behavior |
|---------|-------|----------|
| `.btn-primary` | Hover | bg → `--color-primary-hover`, `translateY(-1px)` |
| `.chip-btn` | Active | Primary bg + border, glow; springy transform `cubic-bezier(0.2,1,0.3,1)` 0.15s |
| Subject card | Hover | Border → `rgba(255,255,255,0.08)` |
| Gem sphere | Drag | Rotates texture, clamped vector; inertia slide on release (`transition: transform 0.1s ease-out`) |
| Gem sphere | Tap (drag < 6px) | Opens subject/grade details modal |
| Student name (`#student-name`) | Click | `contenteditable`, dashed underline affordance |
| Grade submit | value === 6.0 | Confetti (90 canvas particles) + confetti sound |
| Grade submit | value < 4.0 | "FAH" sound; < 3.0 also shows random snarky toast |
| OCR | Running | 12px spinner (`spin 0.8s linear infinite`) + status text |
| OCR | Mismatch with typed grade | Confirmation modal before accepting |
| Modal | Open | Backdrop fades 0.3s; container springs `translateY(20px)→0`, `cubic-bezier(0.34,1.56,0.64,1)`; `body.modal-open` locks scroll |

### Responsive Behavior
| Breakpoint | Changes |
|------------|---------|
| ≥820px | Wider guide/landing grid layouts |
| ≥769px | Subjects → 2-col grid |
| ≤768px | Body padding 0.75rem; logo 42px; h1 1.3rem; promo padding 1.25rem |
| ≤640px | Promo stats 4→2 cols |
| ≤520px | Year tabs become horizontal scroll strip |
| ≤480px | Modals: padding 1.25rem, `max-height: 92vh`, scroll; gem spheres 72px; simulator controls wrap |

### Animation / Motion
| Element | Trigger | Animation | Duration | Easing |
|---------|---------|-----------|----------|--------|
| Modal container | Open | Slide-up spring | 300ms | `cubic-bezier(0.34,1.56,0.64,1)` |
| Landing/guide cards | View enter | `landingFadeIn` | 500–600ms | `cubic-bezier(0.16,1,0.3,1)` |
| Sparkline path | Render | `drawPath` (stroke-dash) | 1200ms | `cubic-bezier(0.22,1,0.36,1)` |
| Sparkline nodes | Render | `popNode` overshoot | 400ms | `cubic-bezier(0.34,1.56,0.64,1)` |
| Background blobs | Ambient | `moveBlob1/2/3` | 28–38s | ease-in-out alternate infinite |
| Toasts | Show | `slideUp` | 300ms | ease-out |
| Confetti | Grade = 6.0 | Canvas rAF loop, 90 particles | until settled | — |

Recommend adding `@media (prefers-reduced-motion: reduce)` to disable blobs, confetti, and spring animations — currently absent.

### Business Logic (calculator_logic.js — do not reimplement in UI)
- Grades 1.0–6.0; subject averages rounded to nearest 0.5 (`roundToHalfPoint`)
- Promotion requires ALL: overall avg ≥ 4.0; core group sum ≥ 16 (French + Math + OS + rounded avg(L2, L3)); ≤ 4 insufficiencies (< 4.0); point balance ≥ 0 with deficits **doubled** (each point below 4 counts −2)
- Weighted averages supported (TS/TA dual-track mode vs simple mean)
- Unit tests in `test_calculator.js` — keep green

### Edge Cases
- **Empty state**: 0 subjects → promo subtitle reads "sur 0 branches"; subjects container empty. Spec a proper empty-state CTA.
- **Long subject names**: gem labels clamp at `max-width: 130px`, `word-wrap: break-word`, fixed 2.2rem height; card titles rely on flex wrap
- **Many repeat years**: year selector scrolls horizontally
- **Photo missing/large**: photo optional; stored in IndexedDB, preview ≤100–180px, `object-fit: contain`, zoom-in cursor
- **Offline**: service worker caches shell; audio may fail (autoplay policy — errors caught and logged)
- **Tesseract not loaded** (offline CDN): throws, caught with error status

### Accessibility Notes
Present: `aria-label` on modal close buttons and theme selector; `lang="fr"`; 44px touch target on photo-remove buttons.
Gaps to fix during implementation:
- Modals lack `role="dialog"`, `aria-modal`, focus trap, and Escape-to-close
- Tab/chip buttons lack `aria-pressed`/`aria-selected`; nav tabs need `role="tablist"` semantics
- Gem drag-rotate and tap targets have no keyboard equivalent — provide focusable sphere with Enter to open details
- `contenteditable` student name needs `role="textbox"` + label
- Extensive inline styles (index.html) — migrate to classes before extending; snarky low-grade toasts should be `aria-live="polite"`
- Verify contrast of `--color-text-muted` (#64748b) on surface colors across all 10 themes

### Assets
`assets/` — 11 gemstone PNGs (ruby-zoisite, red-jasper, ocean-jasper, rainbow-moonstone, selenite, sodalite, serpentine, rose-quartz, labradorite, picture-jasper, amazonite) + flower-1..4 + referenced-but-missing `custom-gem.png` (has gradient fallback). Sounds: `CONFETTI SOUND.mp3`, `FAH SOUND .mpeg` (note leading-space filename — rename recommended). `logo.svg` used for all PWA icon sizes.
