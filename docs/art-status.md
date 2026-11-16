# Artwork status and remaining visual checks

The requested artwork is present and connected: both playable heroes, all 57 wardrobe items (icons and worn layers), 34 pet images, seven map regions, seven fight backdrops, twelve boards, eleven piece sets in both colours and the app icon. The adventurous hero stance is deployed.

Asset coverage is complete; that does not establish correct occlusion for every combination of six equipment slots.

## Layer ordering

- [x] Keep long hair behind the shoulders and clothing, with the fringe over the face.
- [x] Keep face accessories and headgear registered with the posed face.
- [x] Keep held items rigid and attached to their wrists.
- [x] Reserve canvas clearance for tilted tall hats.
- [x] Restore exposed hands above ordinary clothes, including Traveller’s Cloak, Ranger’s Cloak and Hero’s Mantle. Preserve the painted gauntlets on armour.
- [x] Keep fingers over weapon grips, with the lute, shields and books in front of the holding hand.
- [ ] Extend visual combination coverage beyond the existing representative combinations: all compatible head/hair/body combinations and main/off-hand pairs. Individual item coverage and representative screenshots are already checked; exhaustive combination coverage is not.

## Hand regression

`node tools/art/check-hero-hands.mjs http://localhost:5173 /tmp/hero-hands.png` checks actual rendered wrist pixels against the base skin layer for ten non-armoured garments, both body choices and all six skin tones. It tests empty hands and a held sword, for 480 hand checks. It also captures the three cloaks for visual inspection.

The separate `check-hero.mjs` tool checks all 57 items on both bodies, colour choices, expressions and canvas-edge clearance. The production Playwright hero test checks creation, editing and persistence.

## Separate longer-term roadmap

The project roadmap still lists calibration against real players in the 400–1200 range, Android and a connection to the repertoire app. These are separate product plans, not missing artwork.
