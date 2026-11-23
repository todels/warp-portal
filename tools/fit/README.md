# Fitting the default look

The default frame (seed 1, t = 0) is fitted to a reference still. Needs a venv with numpy, pillow, scipy, torch.

1. Put the reference at `ref.png` (and a text-free copy at `ref_clean.png`). Set the vanishing point (`CX, CY`) and text masks in `fit2.py`.
2. `python fit2.py 150 1080 3000`: free fit of 150 radial wedges (logistic fades).
3. `python fit3.py 1500`: refine with the shader's smoothstep fades.
4. `python fit4.py 1200`: refit against a fixed in-gamut 5-color palette (`PAL0`).
5. `python gen_ref.py 0.8 0.025 8 fit4.json`: groups wedges into lobes (`clusters.py`) and writes the data into `portal.js` (between `/*REF*/` and `/*END*/`). Arguments: perspective exponent, spawn radius, seconds per trip.

`render3.py fit4.json out.png` renders the fit in numpy for a quick comparison.
