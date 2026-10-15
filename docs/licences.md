# Licences

Third-party assets that ship with Pins & Ribbons, and the licence for each. The credits screen (PLAN 10) must list everything here.

## Fonts

Self-hosted in `assets/fonts/` (decision 0003). Each woff2 file is an unmodified conversion of the TTF file in the [google/fonts](https://github.com/google/fonts) repository. The licence text sits next to each font.

| Font | Files | Designer | Copyright | Licence | Licence file |
| --- | --- | --- | --- | --- | --- |
| Stardos Stencil | Regular, Bold | Vernon Adams | Copyright (c) 2011 by vernon adams, with Reserved Font Names "Stardos" and "Stardos Stencil" | SIL Open Font License 1.1 | `assets/fonts/stardos-stencil/OFL.txt` |
| Special Elite | Regular | Astigmatic (Brian J. Bonislawsky) | Copyright (c) 2010 by Brian J. Bonislawsky DBA Astigmatic (AOETI) | Apache License 2.0 | `assets/fonts/special-elite/LICENSE.txt` |
| IM Fell English | Regular, Italic | Igino Marini | Copyright (c) 2010, Igino Marini, with Reserved Font Names "IM FELL English Roman" and "IM FELL English Italic" | SIL Open Font License 1.1 | `assets/fonts/im-fell-english/OFL.txt` |
| Reenie Beanie | Regular | James Grieshaber | Copyright (c) 2010, James Grieshaber | SIL Open Font License 1.1 | `assets/fonts/reenie-beanie/OFL.txt` |

To do before release: the Tauri bundle must include the licence files above (the Vite build only copies the woff2 files), and the credits must name each font and its licence.
