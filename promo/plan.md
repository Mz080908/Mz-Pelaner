# MzPlaner Promo Video — Creative Plan

## Concept
**"Your Mind, Organized Beautifully"** — A cinematic journey through MzPlaner's glassmorphic world, showing how chaos becomes clarity.

## Mood / Atmosphere
- **Calm confidence** — not flashy, but premium and intentional
- **Dark mode first** (premium feel), with light mode reveal
- **Persian/Arabic typography** as visual hero — Vazirmatn renders beautifully
- **Glassmorphism & Aurora** as signature visual language

## Color World (from app CSS)
| Role | Dark | Light |
|------|------|-------|
| Background | `#0f1218` | `#f5f4ef` |
| Ink | `#eef1f8` | `#1c2333` |
| Accent | `#7c8cff` | `#7c8cff` |
| Aurora 1 | `rgba(109,141,255,0.2)` | `rgba(124,140,255,0.16)` |
| Aurora 2 | `rgba(150,130,255,0.13)` | `rgba(152,210,199,0.14)` |
| Aurora 3 | `rgba(90,200,220,0.08)` | `rgba(240,195,150,0.1)` |
| Glass | `rgba(22,27,40,0.58)` | `rgba(255,255,255,0.62)` |
| Edge | `rgba(255,255,255,0.1)` | `rgba(28,35,51,0.09)` |

## Visual Story / Scenes (45s Full Version)

| Scene | Duration | Content | Visual Language |
|-------|----------|---------|-----------------|
| **0. Logo Reveal** | 3s | MzPlaner logotype forms from particles → settles into glass card | Particle → Text morph, aurora glow |
| **1. Dashboard Pan** | 6s | Camera pans across sidebar → header → main views (Today, Calendar, Habits, Projects, Notes) | Smooth camera, parallax layers, glass cards stagger in |
| **2. Today View Close-up** | 5s | Task cards with check animations, priority badges, subtasks expand | Micro-interactions: checkbox spring, card tilt, badge pulse |
| **3. Calendar (Jalali)** | 5s | Month grid with Persian numerals, today highlight, event dots | Grid morph, Persian digits animate in, lunar phase hint |
| **4. Habits Heatmap** | 4s | GitHub-style contribution grid, streaks, weekly rhythm | Cells fill with spring delay, streak fire animation |
| **5. Focus Mode** | 5s | Everything fades/recedes except one task — deep work atmosphere | Global scale/opacity, aurora intensifies, breathing pulse |
| **6. Dark ↔ Light Transition** | 4s | Seamless theme flip via view-transition, glass adapts | CSS variable morph, aurora recolors, ink inverts |
| **7. RTL / Persian Flow** | 4s | Sidebar slides from right, Persian labels, Vazirmatn beauty | Right-to-left layout, typography close-up |
| **8. Mobile Responsive** | 4s | Viewport shrinks → mobile layout, bottom nav, touch gestures | Responsive breakpoints animate, touch ripple |
| **9. Outro / CTA** | 5s | Logo + "MzPlaner.ir" + "Deployed on Vercel" + QR code | Clean hold, subtle aurora breathe |

**Total: ~45s**

## Short Version (15s) — Cut Down
| Scene | Duration | Notes |
|-------|----------|-------|
| Logo Reveal | 2s | Faster |
| Dashboard Pan (rapid) | 3s | 2x speed |
| Today + Calendar quick cuts | 3s | Jump cuts |
| Focus Mode | 2s | Key moment |
| Dark→Light flip | 2s | Signature feature |
| Outro | 3s | Logo + URL |

## Motion Vocabulary
- **Primary**: Spring (stiffness 300, damping 34) — matches Framer Motion config
- **Secondary**: Ease-out cubic (0.32, 0.72, 0, 1) — pressable feel
- **Ambient**: Slow sine loops (16-24s period) — aurora breathe
- **Stagger**: 80ms per element — cascade feel
- **Camera**: Ken Burns slow drift (0.5% per second)

## Audio Strategy (Optional)
- **Ambient bed**: Low hum (40Hz) + soft pad (C minor, sustained)
- **UI clicks**: Subtle tactile ticks (800Hz sine, 30ms)
- **Transition whooshes**: Filtered noise sweeps
- **Outro**: Resolved chord (C major)

## Technical Specs
- **Canvas**: 1920×1080 (16:9), 60fps
- **Export**: Frame sequence → ffmpeg MP4 (H.264, CRF 18)
- **Short version**: Trim via ffmpeg `-ss -t`
- **NoLoop() + _p5Ready** for deterministic capture

## Invention — Unique Visual Moments
1. **Particle-to-Text Logo**: Letters assemble from floating glass shards
2. **Aurora as Data**: Aurora blobs react to "task completion" — pulse when checkbox hit
3. **Persian Digit Morph**: Western ↔ Eastern Arabic numerals animate during theme flip
4. **Glass Refraction Trail**: Mouse leaves subtle refractive wake (like app's edge-light)
5. **Focus Mode "Breath"**: Single task card breathes (scale 1.0 → 1.02) while world dims