# Mobile design review — 2026-10-30

Scope: improve the phone experience while preserving the desktop design. This
review proposes a mobile redesign; the only product change made during this
review is suppressing vertical overscroll actions on mobile/touch browsers.

## Observed layout

Measured in Chromium with a fixed October 29, 2026 reference date at 40°N, 0°.

| Viewport | Visible wheel width | Month label height | Main location button height |
|---|---:|---:|---:|
| 360 × 740 | 250 px | 4.25 px | 24 px |
| 390 × 844 | 271 px | 4.61 px | 24 px |
| 430 × 932 | 300 px | 5.09 px | 24 px |
| 844 × 390, touch landscape | 163 px | 2.30 px | 20 px |

At 390 × 844 the SVG canvas is 384 px wide, but its actual colored wheel is only
271 px wide. Internal SVG margins account for much of the lost space. The center
is mainly branding while the selected date and daylight remain below the wheel.
The details block uses about 245 px of vertical space, with location on a separate
row. The page content ends around 684 px, leaving about 160 px below it.

Individual day strips are only roughly 2–3 px wide at the outside edge. Touch
hover is deliberately ignored in the current implementation; selecting days by
tap works, but dragging does not continuously explore the wheel. Controls are
visually restrained but have small touch targets. The existing mobile place
panel is already fixed near the bottom; it needs refinement rather than a second
location picker. Its keyboard behavior needs real-device testing.

## Recommended mobile direction, in priority order

1. **Make the wheel the main control.** Fit the SVG to the actual mobile artwork
   and reposition labels deliberately. Aim for a visible wheel around 320–340 px
   on a 390 px phone, subject to label clearance. Check short/long polar day
   lengths, all seasonal labels, today's marker and the optional 12-hour line;
   avoid enlarging by clipping the drawing.
2. **Put live information inside the center.** Use the open center for a prominent
   daylight number and the explored date, with a smaller Solar Year identity.
   This keeps feedback visible beside the finger and allows a much shorter
   details section below. Keep desktop center branding as it is.
3. **Add real touch exploration.** A broad ring-shaped touch area should map the
   finger angle to the nearest day, with pointer capture during a drag. Do not
   require touching the exact narrow strip. Reserve one-finger wheel gestures
   for exploration while keeping page scrolling elsewhere and pinch zoom.
   Add discreet previous/next-day and Today actions for precise selection.
4. **Design readable phone typography and touch targets.** Give labels intentional
   on-screen sizes rather than shrinking desktop SVG text. Target roughly
   10–12 px for secondary wheel labels where space allows, and 44 × 44 px hit
   areas for controls, using transparent padding rather than oversized visuals.
   Adjust labels and hierarchy instead of simply increasing every font.
5. **Consolidate location and options.** A compact city/latitude control can open
   the existing place picker as a refined bottom sheet, with a clear Close
   action, large results, and keyboard-safe positioning. Keep the 12-hour-line
   option secondary. Reduce stacked rules and separate metadata sections.
6. **Handle short screens and landscape deliberately.** Adapt spacing to available
   height and safe areas. Use a wheel/details side-by-side arrangement on phone
   landscape instead of the present 163 px wheel. Keep useful scrolling and
   browser zoom; avoid locking the whole page to a fixed height.

The first design experiment should combine the larger wheel, center readout,
touch exploration, and compact location control. Preserve the palette, type
character, radial geometry and calm tone. Evaluate at 360, 390 and 430 px widths,
in landscape, with a long city name, an open keyboard, and polar locations.

## Pull-to-refresh change completed

`overscroll-behavior-y: none` is applied to the document and body at narrow widths
and on coarse-pointer touch devices. Page scrolling and browser zoom are not
locked. Computed styles and overflow were checked at the viewports above; the
ordinary desktop layout retains its previous overscroll setting. Browser/OS
support governs native pull-to-refresh, so physical iOS/Android gesture testing
remains necessary to confirm those browsers' behavior.

Four full-page views were archived in
`iterations/2026-10-30-02-prevent-mobile-pull-to-refresh/`.

## Implemented — 2026-10-30

The mobile composition now uses an adaptive SVG frame, fixed on-screen label
sizes, live center information, a broad touch ring with pointer capture, and
44 px day-navigation controls below the wheel. Location and the reference-line
option share one compact footer. The place sheet supports explicit closing,
focus trapping/restoration, device location, offline search and visual-viewport
keyboard bounds. Phone landscape places the wheel beside its controls.

Native Chromium touch tests passed at 320/360/390/430 px phone widths and 844 px
landscape, including both poles, zero-light days, long place names, date
navigation and a simulated keyboard viewport. The production build and all 17
existing calendar/location/reference tests passed. The desktop default screenshot
matches the preceding version byte-for-byte; its reference-line capture differs
only in ten anti-aliased pixels at the switch. Desktop artwork/layout is retained.

Final states are archived in
`iterations/2026-10-30-04-refine-mobile-touch-and-place-selection/` (16 images).
The preceding mobile experiment is retained as iteration 03.

## Follow-up simplification — 2026-10-30

Moved date and daylight below the mobile wheel, immediately above location.
Restored the Solar Year identity in the center. Removed mobile Today/arrow
buttons, autumn/spring equinox labels, and the exploration hint. Touch dragging,
keyboard exploration, solstice labels and desktop styling are retained. Mobile
browser checks pass at all five phone viewports. Final captures are in
`iterations/2026-10-30-06-clean-mobile-wheel-with-lower-day-details/`.
