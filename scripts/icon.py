# Regenerates the site icon set in public/ from a single design:
# a 5x5 neon board with the starting word "балда" in the middle row and the
# added letter "ф" above it (the classic first move: балда -> фалда).
#
#   public/favicon.svg          vector icon (Chrome/Firefox/Edge)
#   public/favicon.ico          16/32/48/64 raster fallback (Safari, old browsers)
#   public/apple-touch-icon.png 180x180, full-bleed square (iOS rounds it itself)
#   public/icon-192.png         full-bleed 192x192, the web app manifest
#   public/icon-512.png         full-bleed 512x512, the web app manifest
#
# Run:  python scripts/icon.py      (requires Pillow: pip install Pillow)
#
# All geometry is in viewBox units (VB x VB); colors mirror the neon theme
# block in src/styles/index.css.

import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

VB = 112  # SVG viewBox / design-grid size
PAD, CELL, GAP = 16, 12, 5
STEP = CELL + GAP
RX_CELL, RX_BOARD = 2.8, 18

BG_TOP, BG_BOT = (58, 37, 120), (13, 10, 31)  # neon page bg, top brightened
BORDER = (150, 120, 255, 115)  # neon board-frame border at 45% opacity

EMPTY_FILL, EMPTY_STROKE = (255, 255, 255, 23), (150, 120, 255, 51)
NEUTRAL_FILL, NEUTRAL_STROKE = (255, 255, 255, 36), (177, 157, 255, 166)
SEL_TOP, SEL_BOT, SEL_STROKE, SEL_TEXT = (61, 252, 176), (14, 211, 146), (10, 174, 124), (3, 46, 30)
ADD_TOP, ADD_BOT, ADD_STROKE, ADD_TEXT = (255, 106, 213), (230, 33, 173), (180, 20, 139), (255, 255, 255)
TEXT_NEUTRAL = (242, 238, 255)

ADD_CELL = (1, 1)  # "ф" above the second letter of the starting word
PATH_CELLS = [(2, 1), (2, 2), (2, 3), (2, 4)]  # the dragged word: а-л-д-а
LETTERS = {(2, 0): "б", (2, 1): "а", (2, 2): "л", (2, 3): "д", (2, 4): "а", ADD_CELL: "ф"}

ALL_CELLS = [(r, c) for r in range(5) for c in range(5)]
EMPTY_CELLS = [rc for rc in ALL_CELLS if rc[0] != 2 and rc != ADD_CELL]

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public")


def cell_xy(rc):
    r, c = rc
    return PAD + STEP * c, PAD + STEP * r


def hex3(color):
    return "#%02x%02x%02x" % color[:3]


def build_svg():
    lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VB} {VB}">',
        "<defs>",
        '<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#3a2570"/><stop offset="1" stop-color="#0d0a1f"/></linearGradient>',
        '<linearGradient id="sel" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0" stop-color="{hex3(SEL_TOP)}"/><stop offset="1" stop-color="{hex3(SEL_BOT)}"/></linearGradient>',
        '<linearGradient id="add" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0" stop-color="{hex3(ADD_TOP)}"/><stop offset="1" stop-color="{hex3(ADD_BOT)}"/></linearGradient>',
        '<filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3"/></filter>',
        "</defs>",
        f'<rect x="1" y="1" width="{VB - 2}" height="{VB - 2}" rx="{RX_BOARD}" fill="url(#bg)" '
        f'stroke="{hex3(BORDER)}" stroke-opacity="0.45" stroke-width="2"/>',
        '<g fill="#ffffff" fill-opacity="0.09" stroke="#9678ff" stroke-opacity="0.2" stroke-width="1">',
    ]
    for r, c in EMPTY_CELLS:
        x, y = cell_xy((r, c))
        lines.append(f'<rect x="{x}" y="{y}" width="{CELL}" height="{CELL}" rx="{RX_CELL}"/>')
    lines.append("</g>")

    # soft neon halos under the colored cells
    lines.append('<g filter="url(#glow)" opacity="0.55">')
    for rc in PATH_CELLS:
        x, y = cell_xy(rc)
        lines.append(f'<rect x="{x}" y="{y}" width="{CELL}" height="{CELL}" rx="{RX_CELL}" fill="{hex3(SEL_BOT)}"/>')
    x, y = cell_xy(ADD_CELL)
    lines.append(f'<rect x="{x}" y="{y}" width="{CELL}" height="{CELL}" rx="{RX_CELL}" fill="{hex3(ADD_BOT)}"/>')
    lines.append("</g>")

    x, y = cell_xy((2, 0))  # "б" — the letter not taken into the word
    lines.append(f'<rect x="{x}" y="{y}" width="{CELL}" height="{CELL}" rx="{RX_CELL}" '
                 'fill="#ffffff" fill-opacity="0.14" stroke="#b19dff" stroke-opacity="0.65" stroke-width="1"/>')

    lines.append('<g fill="url(#sel)" stroke="%s" stroke-width="1">' % hex3(SEL_STROKE))
    for rc in PATH_CELLS:
        x, y = cell_xy(rc)
        lines.append(f'<rect x="{x}" y="{y}" width="{CELL}" height="{CELL}" rx="{RX_CELL}"/>')
    lines.append("</g>")

    x, y = cell_xy(ADD_CELL)
    lines.append(f'<rect x="{x}" y="{y}" width="{CELL}" height="{CELL}" rx="{RX_CELL}" '
                 f'fill="url(#add)" stroke="{hex3(ADD_STROKE)}" stroke-width="1"/>')

    lines.append('<g font-family="Arial, \'Segoe UI\', sans-serif" font-weight="700" '
                 'font-size="8.5" text-anchor="middle">')
    for rc, ch in LETTERS.items():
        if rc in PATH_CELLS:
            fill = hex3(SEL_TEXT)
        elif rc == ADD_CELL:
            fill = hex3(ADD_TEXT)
        else:
            fill = hex3(TEXT_NEUTRAL)
        x, y = cell_xy(rc)
        lines.append(f'<text x="{x + CELL / 2}" y="{y + 9}" fill="{fill}">{ch}</text>')
    lines.append("</g>")
    lines.append("</svg>")
    return "\n".join(lines) + "\n"


def load_font(px):
    for name in ("arialbd.ttf", "seguisb.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(name, px)
        except OSError:
            continue
    return ImageFont.load_default(size=px)


def lerp(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def vgrad(w, h, top, bot):
    strip = Image.new("RGB", (1, max(h, 2)))
    for i in range(strip.height):
        strip.putpixel((0, i), lerp(top, bot, i / (strip.height - 1)))
    return strip.resize((w, h))


def grad_rounded_rect(img, box, radius, top, bot, stroke=None, stroke_w=1):
    x0, y0, x1, y1 = box
    w, h = x1 - x0 + 1, y1 - y0 + 1
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], radius=radius, fill=255)
    tile = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    tile.paste(vgrad(w, h, top, bot), (0, 0), mask)
    if stroke:
        ImageDraw.Draw(tile).rounded_rectangle([0, 0, w - 1, h - 1], radius=radius,
                                               outline=stroke, width=stroke_w)
    img.alpha_composite(tile, (x0, y0))


def rounded_tile(w, h, radius, fill=None, outline=None, width=1):
    tile = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(tile).rounded_rectangle([0, 0, w - 1, h - 1], radius=radius,
                                           fill=fill, outline=outline, width=width)
    return tile


def render_png(size, full_bleed=False, ss=4):
    s = size * ss
    u = s / VB  # design unit -> px
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))

    radius = 0 if full_bleed else round(RX_BOARD * u)
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, s - 1, s - 1], radius=radius, fill=255)
    img.paste(vgrad(s, s, BG_TOP, BG_BOT), (0, 0), mask)

    def cbox(rc):
        x, y = cell_xy(rc)
        return [round(x * u), round(y * u), round((x + CELL) * u) - 1, round((y + CELL) * u) - 1]

    # ImageDraw replaces pixels instead of blending, so every translucent shape
    # (empty cells, frame border) goes onto a layer that is alpha-composited.
    layer = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    for rc in EMPTY_CELLS:  # faint empty cells
        ld.rounded_rectangle(cbox(rc), radius=round(RX_CELL * u), fill=EMPTY_FILL,
                             outline=EMPTY_STROKE, width=max(1, round(u)))
    if not full_bleed:
        ld.rounded_rectangle([round(u), round(u), s - 1 - round(u), s - 1 - round(u)],
                             radius=radius, outline=BORDER, width=max(1, round(2 * u)))
    img = Image.alpha_composite(img, layer)

    glow = Image.new("RGBA", (s, s), (0, 0, 0, 0))  # neon halos
    gd = ImageDraw.Draw(glow)
    for rc in PATH_CELLS:
        gd.rounded_rectangle(cbox(rc), radius=round(RX_CELL * u), fill=SEL_BOT + (255,))
    gd.rounded_rectangle(cbox(ADD_CELL), radius=round(RX_CELL * u), fill=ADD_BOT + (255,))
    glow = glow.filter(ImageFilter.GaussianBlur(round(3 * u)))
    glow.putalpha(glow.getchannel("A").point(lambda a: round(a * 0.55)))
    img = Image.alpha_composite(img, glow)

    x0, y0, x1, y1 = cbox((2, 0))  # "б" — a translucent glass cell, not a gradient
    img.alpha_composite(rounded_tile(x1 - x0 + 1, y1 - y0 + 1, round(RX_CELL * u),
                                     fill=NEUTRAL_FILL, outline=NEUTRAL_STROKE,
                                     width=max(1, round(u))), (x0, y0))
    d = ImageDraw.Draw(img)
    for rc in PATH_CELLS:
        grad_rounded_rect(img, cbox(rc), round(RX_CELL * u), SEL_TOP, SEL_BOT,
                          stroke=SEL_STROKE + (255,), stroke_w=max(1, round(u)))
    grad_rounded_rect(img, cbox(ADD_CELL), round(RX_CELL * u), ADD_TOP, ADD_BOT,
                      stroke=ADD_STROKE + (255,), stroke_w=max(1, round(u)))

    font = load_font(round(8.5 * u))
    for rc, ch in LETTERS.items():
        fill = SEL_TEXT if rc in PATH_CELLS else ADD_TEXT if rc == ADD_CELL else TEXT_NEUTRAL
        x, y = cell_xy(rc)
        d.text((round((x + CELL / 2) * u), round((y + CELL / 2) * u)), ch,
               font=font, fill=fill, anchor="mm")

    return img.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "favicon.svg"), "w", encoding="utf-8") as f:
        f.write(build_svg())
    render_png(512).save(os.path.join(OUT_DIR, "favicon.ico"),
                         sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    render_png(180, full_bleed=True).convert("RGB").save(os.path.join(OUT_DIR, "apple-touch-icon.png"))
    render_png(192, full_bleed=True).convert("RGB").save(os.path.join(OUT_DIR, "icon-192.png"))
    render_png(512, full_bleed=True).convert("RGB").save(os.path.join(OUT_DIR, "icon-512.png"))
    print("icons written to", OUT_DIR)


if __name__ == "__main__":
    main()
