# Generated art

The rivals' portraits and figures, the world-map regions, the hero (body, hair, faces), the items (icons and
worn layers), the pets, the fight backdrops, the boards and the piece sets drawn for the game in this folder, and the app icons in public/, were made with ChatGPT's image
generation (November 2026), from the project's own prompts and reference drawings (the art kit made from the
code-drawn art), for Pawnquest, and are released with the project under the AGPL-3.0.

`tools/art/process.py` turns the generated images into these files (cut out, scaled down, WebP) and writes
`src/data/art.ts`, the list of what has art. Whatever is not listed is still drawn in code.
