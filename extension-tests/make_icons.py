"""Generate the extension icons (an orange Q mark on a LeetCode-dark tile). Run: python extension-tests/make_icons.py"""

from pathlib import Path

from PIL import Image, ImageDraw

TILE = (40, 40, 40, 255)  # --lc-layer-1 #282828
BRAND = (255, 161, 22, 255)  # --lc-brand #ffa116
OUT = Path(__file__).resolve().parents[1] / "extension" / "icons"
CANVAS = 512


def draw_master() -> Image.Image:
    img = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((16, 16, CANVAS - 16, CANVAS - 16), radius=112, fill=TILE)
    ring = 58
    box = (118, 108, 394, 384)
    d.ellipse(box, outline=BRAND, width=ring)
    d.line((300, 300, 410, 410), fill=BRAND, width=ring)
    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    master = draw_master()
    for size in (16, 32, 48, 128):
        master.resize((size, size), Image.Resampling.LANCZOS).save(OUT / f"icon{size}.png", optimize=True)
    print(f"wrote icons to {OUT}")


if __name__ == "__main__":
    main()
