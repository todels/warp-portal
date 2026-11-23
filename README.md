# Warp Portal

Light-streak tunnel shader (WebGL2). The default opening frame is fitted to a purple/pink/blue warp reference still (150 radial wedges, about 6/255 average error), then animated: lobes of wedges fly outward with perspective and come back near the center at almost the same angle, and the wide soft wedges around the center stay put as ambient glow. See `tools/fit/` for how the default was fitted.

- `portal.js`: the shader runtime, `createPortal(canvas, params, options)`. Self-contained, so "Copy code" embeds it.
- `app.js`: editor UI (presets, colors, motion, rays, center, finish, export).
- `vendor/mp4-muxer.mjs`: MP4 container for the WebCodecs export.

Run: `python3 -m http.server 5242 --bind 127.0.0.1` then open http://127.0.0.1:5242

Exports: Copy PNG (clipboard, export size), Download PNG, Export MP4 (H.264, optional seamless loop), Copy code (HTML snippet with current settings, canvas fills its parent).

Keys: Space play/pause, R shuffle layout, F fullscreen, Cmd+C copy PNG. Drag on the canvas to move the vanishing point, double-click to re-center. Double-click a slider label to reset it.
