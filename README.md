# Traelvia website

Static site for `https://traelvia.github.io/` and the App Store Connect marketing, support and privacy URLs.

## Publish

Publish the contents of this directory from the `traelvia.github.io` GitHub Pages repository (or configure the repository Pages workflow to deploy this directory). No build step or third-party dependency is required.

## App Store Connect URLs

The canonical metadata mapping and submission checklist live in `../appstore/METADATA-URLS.md`.

- Marketing URL: `https://traelvia.github.io/`
- Support URL: `https://traelvia.github.io/support.html`
- Privacy Policy URL: `https://traelvia.github.io/privacy.html`
- Terms of Use: `https://traelvia.github.io/terms.html`
- Contact: `https://traelvia.github.io/contact.html`

## Media

`media/` holds web copies of the English App Store screenshots (`appstore/en/screenshots/`, resized to 1600 px, WebP + JPEG fallback) and `hero.mp4`, a 1920 px, silent re-encode of `appstore/creative-assets/header-3840x1646.mp4`. Regenerate them when the App Store gallery changes:

```sh
sips -Z 1600 appstore/en/screenshots/01-run-the-mountains.png --out /tmp/01.png && cwebp -q 78 /tmp/01.png -o site/media/01-run-the-mountains.webp
ffmpeg -i appstore/creative-assets/header-3840x1646.mp4 -an -vf scale=1920:-2 -c:v libx264 -crf 27 -pix_fmt yuv420p -movflags +faststart site/media/hero.mp4
```

The home page sky follows the scroll from night through dawn and day to dusk (palette stops from `docs/DESIGN_SYSTEM.md`); the hero video, gallery autoplay and animations are skipped when the visitor prefers reduced motion.

The site intentionally has no cookies, analytics, forms or external runtime assets. The `_headers` file is useful on hosts that support custom response headers; GitHub Pages ignores it.
