from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "Logo.png"


def make_mark(im: Image.Image, size: int, pad: float = 0.14) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    max_w = int(size * (1 - pad * 2))
    max_h = int(size * (1 - pad * 2))
    w, h = im.size
    scale = min(max_w / w, max_h / h)
    nw, nh = int(w * scale), int(h * scale)
    resized = im.resize((nw, nh), Image.LANCZOS)
    x = (size - nw) // 2
    y = (size - nh) // 2
    canvas.alpha_composite(resized, (x, y))
    return canvas


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Logo source not found: {SRC}")

    im = Image.open(SRC).convert("RGBA")

    (ROOT / "images" / "branding").mkdir(parents=True, exist_ok=True)

    # logo mark used in header/placeholders
    # slightly less padding so the mark looks bigger in header
    make_mark(im, 512, pad=0.00).save(ROOT / "images" / "branding" / "logo-mark.png")

    # favicons / app icons
    # icons: keep a bit of padding, but smaller than before so it reads better
    make_mark(im, 16, pad=0.06).save(ROOT / "favicon-16.png")
    make_mark(im, 32, pad=0.06).save(ROOT / "favicon-32.png")
    make_mark(im, 48, pad=0.06).save(ROOT / "favicon-48.png")
    make_mark(im, 180, pad=0.06).save(ROOT / "apple-touch-icon.png")
    make_mark(im, 192, pad=0.06).save(ROOT / "android-chrome-192.png")
    make_mark(im, 512, pad=0.06).save(ROOT / "android-chrome-512.png")

    # multi-size .ico
    make_mark(im, 256, pad=0.06).save(
        ROOT / "favicon.ico",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )

    print("Regenerated logo-mark + favicons from", SRC.name)


if __name__ == "__main__":
    main()

