---
name: ImageMagick contact sheets
description: Font fallback required by ImageMagick montage in this workspace.
---

When ImageMagick `montage` fails because it cannot resolve its default font, pass an explicit font path from `fc-match`, such as the DejaVu Sans font file.

**Why:** The container's ImageMagick installation did not have a working default font mapping, so contact-sheet generation failed without an explicit font.

**How to apply:** For image contact sheets in this workspace, resolve a font with `fc-match -f '%{file}' DejaVu-Sans` and pass it with `-font`.