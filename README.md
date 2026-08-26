# Petal Post — split build

This is `original.html` (your one-file version) rebuilt as real, separate
pages that link to each other, sharing one stylesheet and one script file.
Nothing about the Firebase data model was thrown away — gifts, gardens and
notifications still live in the same collections — but the growth and
watering logic was tightened up and a few new features were added. Read
this file before you drop in your real photos; the naming convention below
is what makes them show up automatically.

## File structure

```
petal-post-split/
├── index.html          landing page — "send a flower" / "my garden"
├── send.html            pick a flower, write a note, get a share link
├── garden-entry.html     enter your handle to open your garden
├── receive.html          "a letter has arrived" — first screen a recipient sees
├── vase.html             day-by-day growing + watering screen
├── garden.html           the saved-flowers garden scene
├── notifications.html    updates on flowers you've sent
├── bloom.html            the reveal screen once a flower finishes blooming
├── styles.css            everything visual, shared by every page
├── app.js                everything behavioural, shared by every page
├── README.md             this file
└── original.html         your original single-file version, kept as-is
```

Every page is a normal `<a href="...">` link to the next — there's no more
`go('screen')` JS router. State that needs to survive a page load (which
gift, which garden handle) travels in the URL as a query string
(`vase.html?gift=g_abc123`, `garden.html?handle=ite`) or, for convenience,
in `localStorage` under `petalpost.handle` so your own handle is
pre-filled next time you open the send or garden-entry forms.

## How watering & growth work now

A gift needs **3 waterings** to bloom. The first can happen the moment the
recipient opens the flower; after that, each next watering is gated by a
**24‑hour cooldown**, so a flower watered right on schedule blooms **72
hours (3 days)** after the first watering, growing one visible stage each
time:

| Waterings so far | Stage      | Image used                          |
|---|---|---|
| 0 | seed in soil | *(no image — just soil)* |
| 1 | day-one sapling | `<flower> sapling day one.jpg` |
| 2 | bud | `<flower> bud.jpg` |
| 3 (finishing) | bud opens → bloom | `<flower> bud opens.jpg` then `<flower> bloom.jpg` |

`vase.html` shows a live countdown ("next watering in 6h 42m 10s") while
the cooldown is active, and disables the water button until it clears.
This replaced the old calendar-date comparison (which only checked
"different day"), so it now reflects the "every 72 hours" timing exactly,
even for someone in a different time zone than the sender.

The sender's note stays out of the data shown anywhere in `vase.html` —
it's only read out of Firestore and displayed once `bloom.html` confirms
`gift.bloomed === true`, so there's no way to peek at it early from the
browser.

## Asset naming convention (this is the important part)

Every flower needs **five images**, all lowercase, all living in
`assets/flowers/`, named from the flower's name + a fixed suffix:

```
assets/flowers/carnation.jpg                    <- picker thumbnail (send.html)
assets/flowers/carnation sapling day one.jpg     <- stage after 1st watering
assets/flowers/carnation bud.jpg                 <- stage after 2nd watering
assets/flowers/carnation bud opens.jpg           <- bloom animation frame
assets/flowers/carnation bloom.jpg               <- final bloom (bloom.html + garden.html)
```

Do this for every flower in the `FLOWERS` list at the top of `app.js`
(carnation, sunflower, lavender, tulip, hibiscus, marigold, orchid, daisy,
rose, jasmine, lily, peony, poppy, iris, chrysanthemum, bougainvillea) and
everything just works — `app.js`'s `flowerImg()` helper builds the path
from the flower's name automatically, so there's nothing to wire up by
hand.

**Until a real photo exists, nothing breaks.** Every image tag has a
built-in emoji fallback (the `emoji` field in the `FLOWERS` array) that
shows automatically if the file 404s, so you can add photos one flower —
even one stage — at a time and the site upgrades itself as each file
lands.

### The vase image

Drop your vase photo at `assets/vase.png` (transparent background works
best). Until it's there, an illustrated pot shape is used instead.

For the growing flower to look like it's actually standing inside the
vase, the stem is bottom-anchored **82px above the base of the vase
image**, inside a 150×150 vase box that sits 14px above the floor of the
scene. If your vase photo's opening sits somewhere else vertically, open
`styles.css` and adjust the single `bottom` value on `.vase-stack`
(currently `96px`, which is `14px + 82px`) until the stem lines up with
the neck of your vase — everything else (the stage image swap, the sway
animation, the bloom-burst animation) will keep working unchanged.

## The garden page's new behaviour

- **No drifting background butterflies here** — `garden.html` is the one
  page that doesn't load the ambient butterfly overlay used everywhere
  else on the site.
- **Click a flower (or a tree) and a butterfly flies in and perches on
  it.** Click a different one and the same butterfly relocates. This is
  handled by `perchButterflyOn()` in `app.js`.
- **Bees wander and pause** across the flower bed on their own, no click
  needed (`startBees()`).
- **Birds sing in the trees** — each tree has a small perched bird that
  pops a music note above the canopy every couple of seconds
  (`startAmbientBirdsong()`), independent of the two birds still flying
  across the sky for atmosphere.
- **Trees, bushes and flowers all sway** using the same `sway` keyframe
  as the rest of the site.
- **People in the background** are dark-skinned Nigerians walking,
  cycling and driving past on the path (`🚶🏿`, `🚴🏾`, `🚶🏾‍♀️`, `🚗`) — feel
  free to swap these emoji for real sprite images later the same way the
  flowers were: give each figure an `<img>` with an emoji fallback.

## Firebase

The same project/config from your original file is reused as-is
(`petal-post-45cd4`). Collections are unchanged: `gifts/{giftId}`,
`gardens/{handle}`, `notifications/{handle}`. The only schema change is
that a gift's `wateredDates` (array of date strings) became `waterings`
(array of millisecond timestamps), which is what makes the 24‑hour
cooldown possible. `loadGift()` in `app.js` auto-migrates any old-format
record it encounters, so nothing already in your database needs to be
touched by hand.

## Running it locally

These are plain static files — no build step. Serve the folder with
any static server (Firestore's SDK needs `http(s)://`, not `file://`),
e.g. `npx serve .` or `python3 -m http.server`, then open `index.html`.
