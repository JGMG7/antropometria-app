from PIL import Image, ImageDraw

BLUE = (42, 120, 214, 255)   # --series-1 light
WHITE = (255, 255, 255, 255)


def draw_glyph(draw, cx, cy, s):
    # simple caliper / anthropometry glyph: two angled legs meeting at a hinge,
    # plus a small measurement arc, in white on the accent background.
    lw = max(2, int(s * 0.045))
    leg = s * 0.34
    # hinge point
    hx, hy = cx, cy - s * 0.10
    # left leg endpoint
    lx, ly = hx - leg * 0.85, hy + leg
    # right leg endpoint
    rx, ry = hx + leg * 0.85, hy + leg
    draw.line([(hx, hy), (lx, ly)], fill=WHITE, width=lw)
    draw.line([(hx, hy), (rx, ry)], fill=WHITE, width=lw)
    # feet (small perpendicular ticks)
    tick = s * 0.05
    draw.line([(lx - tick, ly), (lx + tick, ly)], fill=WHITE, width=lw)
    draw.line([(rx - tick, ry), (rx + tick, ry)], fill=WHITE, width=lw)
    # hinge dot
    r = s * 0.03
    draw.ellipse([hx - r, hy - r, hx + r, hy + r], fill=WHITE)
    # measurement dots along one leg (like a scale)
    for t in (0.35, 0.6, 0.85):
        px = hx + (rx - hx) * t
        py = hy + (ry - hy) * t
        dr = s * 0.018
        draw.ellipse([px - dr, py - dr, px + dr, py + dr], fill=WHITE)


def make_icon(size, path, maskable=False):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    pad = int(size * (0.14 if maskable else 0.0))
    radius = int(size * (0.0 if maskable else 0.22))
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=BLUE)
    draw_glyph(draw, size / 2, size / 2 + (pad * 0.15), size - pad * 2)
    img.save(path)


make_icon(192, 'icons/icon-192.png')
make_icon(512, 'icons/icon-512.png')
make_icon(512, 'icons/icon-maskable-512.png', maskable=True)
print('icons written')
