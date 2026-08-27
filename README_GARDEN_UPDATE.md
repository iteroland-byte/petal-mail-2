# Petal Post — Garden Graphic Update

This update uses the supplied Library artwork for the garden creatures and tree.

## Included
- `petal-post-app-updated.js` — updated shared app logic.
- `assets/garden/tree-new.png` — cleaned/recolored supplied tree with transparent background.
- `assets/garden/bird-flying-*-sprite.png` — four-frame flying bird sprites derived from the supplied multi-part bird sheet.
- `assets/garden/bird-perched-*.png` — perched bird artwork derived from the supplied bird sheet.
- `assets/garden/butterfly-*.png` — transparent butterfly artwork in several colors derived from the supplied butterfly.

## Changes made
- Butterflies now use the supplied butterfly artwork, are tilted forward from the top, flap subtly, and enter/leave the viewport instead of being confined to page cells.
- Garden butterflies and birds are slightly faster.
- Garden trees now use the supplied tree artwork, with the trunk/roots recolored brown and a soil shadow so the roots read as grounded.
- Trees sway gently.
- Birds use the supplied multi-part bird sheet as animated four-frame flying sprites and switch to a perched pose when landing.
- Bird colors are red and green.
- Bird perch points are restricted to fixed branch locations on the supplied tree rather than arbitrary canopy locations.
- Clouds, sun and grass were restyled to match the supplied tree's illustrated palette.
- Buttons and common controls receive a softer, rounded illustrated-card aesthetic.

## Asset paths
Keep the `assets/garden/` folder beside the HTML files that load the shared JS, so paths such as `assets/garden/tree-new.png` resolve correctly.
