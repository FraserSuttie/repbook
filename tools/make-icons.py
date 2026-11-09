#!/usr/bin/env python3
"""Generate Repbook's app icons (plum square, white open-book mark).

Run from the repo root:  python3 tools/make-icons.py
Needs Pillow. Writes icons/icon-180.png (apple-touch-icon, full bleed so iOS
can apply its own rounded mask), icons/icon-192.png and icons/icon-512.png
(rounded square with transparent corners).
"""
from pathlib import Path
from PIL import Image, ImageDraw

PLUM = (0x9D, 0x17, 0x4D, 255)
WHITE = (255, 255, 255, 255)
SS = 4  # supersampling factor


def cubic(p0, p1, p2, p3, n=40):
    out = []
    for i in range(n + 1):
        t = i / n
        mt = 1 - t
        x = mt**3 * p0[0] + 3 * mt**2 * t * p1[0] + 3 * mt * t**2 * p2[0] + t**3 * p3[0]
        y = mt**3 * p0[1] + 3 * mt**2 * t * p1[1] + 3 * mt * t**2 * p2[1] + t**3 * p3[1]
        out.append((x, y))
    return out


def book_paths():
    """The mock-up's book mark, in its 24x24 viewBox.

    M3 5.5 C5 4.5 8 4.5 12 6.5 c4-2 7-2 9-1 v13 c-2-1-5-1-9 1 -4-2-7-2-9-1 z
    M12 6.5 v13
    """
    outline = []
    outline += cubic((3, 5.5), (5, 4.5), (8, 4.5), (12, 6.5))
    outline += cubic((12, 6.5), (16, 4.5), (19, 4.5), (21, 5.5))[1:]
    outline += [(21, 18.5)]
    outline += cubic((21, 18.5), (19, 17.5), (16, 17.5), (12, 19.5))[1:]
    outline += cubic((12, 19.5), (8, 17.5), (5, 17.5), (3, 18.5))[1:]
    outline += [(3, 5.5)]
    spine = [(12, 6.5), (12, 19.5)]
    return [outline, spine]


def make(size, rounded):
    big = size * SS
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, big - 1, big - 1], radius=int(big * 0.225), fill=PLUM)
    else:
        d.rectangle([0, 0, big, big], fill=PLUM)

    mark = big * 0.62          # mark spans ~62% of the icon
    scale = mark / 24.0
    off = (big - mark) / 2
    stroke = 2 * scale
    for path in book_paths():
        pts = [(off + x * scale, off + y * scale) for x, y in path]
        # Stamp a round brush along the path: smooth round joins and caps.
        r = stroke / 2
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            steps = max(1, int(((x1 - x0) ** 2 + (y1 - y0) ** 2) ** 0.5))
            for k in range(steps + 1):
                x = x0 + (x1 - x0) * k / steps
                y = y0 + (y1 - y0) * k / steps
                d.ellipse([x - r, y - r, x + r, y + r], fill=WHITE)
    return img.resize((size, size), Image.LANCZOS)


def main():
    out = Path(__file__).resolve().parent.parent / "icons"
    out.mkdir(exist_ok=True)
    make(180, rounded=False).save(out / "icon-180.png")
    make(192, rounded=True).save(out / "icon-192.png")
    make(512, rounded=True).save(out / "icon-512.png")
    print("Wrote", ", ".join(p.name for p in sorted(out.glob("icon-*.png"))))


if __name__ == "__main__":
    main()
