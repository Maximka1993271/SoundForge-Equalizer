#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SOUNDFORGE PREMIUM ICON GENERATOR v3.22.8
High-end icon system for Chrome / Firefox / Windows.

Design direction:
- premium dark glass / metal surface
- electric emerald + cyan audio spectrum
- restrained amber/red peak accents
- multi-layer bloom and specular highlights
- crisp vector-like geometry rendered at high resolution
- supersampling for excellent 16..1024px output
- active + disabled variants
- PNG + multi-resolution ICO

Requires:
    pip install Pillow
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops


# ============================================================================
# CONFIGURATION
# ============================================================================

VERSION = "3.22.8"

PNG_SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024]
ICO_SIZES = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]

# Render large, then downsample. This is the most important quality improvement
# for tiny extension icons: curves, glow and diagonal highlights survive resize.
SUPERSAMPLE = 4

OUTPUT_DIR = Path("icons")

# Premium palette. Kept deliberately restrained so the icon looks expensive
# rather than like a generic RGB gaming icon.
THEMES = {
    "active": {
        "bg_top": (20, 27, 36),
        "bg_bottom": (5, 9, 15),
        "glass": (255, 255, 255, 13),
        "glass_highlight": (255, 255, 255, 255),
        "rim": (122, 255, 220, 150),
        "rim_soft": (48, 220, 174, 85),
        "cyan": (54, 238, 214),
        "emerald": (51, 235, 155),
        "lime": (169, 245, 92),
        "amber": (255, 184, 74),
        "red": (255, 88, 102),
        "wave": (87, 255, 223),
        "white": (244, 255, 252),
        "muted": (157, 190, 188),
        "shadow": (0, 0, 0, 170),
        "glow": (46, 255, 190, 145),
    },
    "off": {
        "bg_top": (28, 33, 41),
        "bg_bottom": (10, 13, 18),
        "glass": (255, 255, 255, 9),
        "glass_highlight": (255, 255, 255, 120),
        "rim": (164, 177, 187, 105),
        "rim_soft": (120, 136, 150, 45),
        "cyan": (118, 133, 145),
        "emerald": (103, 118, 129),
        "lime": (138, 150, 158),
        "amber": (126, 136, 145),
        "red": (105, 116, 126),
        "wave": (139, 154, 165),
        "white": (225, 231, 235),
        "muted": (125, 137, 148),
        "shadow": (0, 0, 0, 155),
        "glow": (125, 145, 160, 45),
    },
}


# ============================================================================
# BASIC HELPERS
# ============================================================================

def S(value: float, scale: int) -> int:
    return max(1, int(round(value * scale)))


def rgba(color: tuple[int, int, int], alpha: int = 255) -> tuple[int, int, int, int]:
    return (color[0], color[1], color[2], alpha)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp_color(
    a: tuple[int, int, int],
    b: tuple[int, int, int],
    t: float,
) -> tuple[int, int, int]:
    return tuple(round(lerp(a[i], b[i], t)) for i in range(3))


def make_vertical_gradient(
    width: int,
    height: int,
    top: tuple[int, int, int],
    bottom: tuple[int, int, int],
) -> Image.Image:
    img = Image.new("RGBA", (width, height))
    px = img.load()

    denom = max(1, height - 1)
    for y in range(height):
        t = y / denom
        # Slightly ease the gradient to create a deeper lower glass surface.
        t = t * t * (3.0 - 2.0 * t)
        c = lerp_color(top, bottom, t)
        for x in range(width):
            px[x, y] = (*c, 255)

    return img


def add_radial_glow(
    base: Image.Image,
    center: tuple[float, float],
    radius: float,
    color: tuple[int, int, int],
    alpha: int,
    blur: float,
) -> None:
    w, h = base.size
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    pix = glow.load()
    cx, cy = center
    r = max(1.0, radius)

    left = max(0, int(cx - r))
    right = min(w, int(cx + r))
    top = max(0, int(cy - r))
    bottom = min(h, int(cy + r))

    for y in range(top, bottom + 1):
        for x in range(left, right + 1):
            d = math.hypot(x - cx, y - cy) / r
            if d >= 1:
                continue
            a = int(alpha * ((1 - d) ** 2))
            if a:
                pix[x, y] = (*color, a)

    if blur:
        glow = glow.filter(ImageFilter.GaussianBlur(blur))

    base.alpha_composite(glow)


def rounded_mask(size: int, margin: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle(
        (margin, margin, size - margin - 1, size - margin - 1),
        radius=radius,
        fill=255,
    )
    return mask


def composite_masked(base: Image.Image, layer: Image.Image, mask: Image.Image) -> None:
    base.paste(layer, (0, 0), mask)


def get_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "SegoeUI-Semibold.ttf",
        "segoeuib.ttf",
        "Arial Bold.ttf",
        "arialbd.ttf",
        "SFNSDisplay-Bold.ttf",
        "DejaVuSans-Bold.ttf",
    ]
    for name in candidates:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


# ============================================================================
# PREMIUM ICON COMPONENTS
# ============================================================================

def draw_glass_surface(
    img: Image.Image,
    size: int,
    theme: dict,
    margin: int,
    radius: int,
) -> Image.Image:
    """Dark premium glass tile with depth, rim light and subtle specular band."""
    mask = rounded_mask(size, margin, radius)

    # Deep drop shadow.
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    offset = S(1.5, 1)
    sd.rounded_rectangle(
        (
            margin + offset,
            margin + offset,
            size - margin - 1 + offset,
            size - margin - 1 + offset,
        ),
        radius=radius,
        fill=theme["shadow"],
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(S(2.5, 1)))
    img.alpha_composite(shadow)

    # Main gradient surface.
    surface = make_vertical_gradient(size, size, theme["bg_top"], theme["bg_bottom"])
    composite_masked(img, surface, mask)

    # Inner glass sheen.
    sheen = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sheen)
    sd.rounded_rectangle(
        (margin + 1, margin + 1, size - margin - 2, int(size * 0.55)),
        radius=max(1, radius - 1),
        fill=theme["glass"],
    )
    sheen = ImageChops.multiply(sheen, Image.merge("RGBA", [mask] * 4))
    img.alpha_composite(sheen)

    # Soft top-left reflection.
    highlight = Image.new("RGBA", img.size, (0, 0, 0, 0))
    hd = ImageDraw.Draw(highlight)
    hd.rounded_rectangle(
        (
            margin + S(2, 1),
            margin + S(1, 1),
            size - margin - S(2, 1),
            margin + max(2, int(size * 0.055)),
        ),
        radius=max(1, int(radius * 0.45)),
        fill=theme["glass_highlight"],
    )
    highlight = highlight.filter(ImageFilter.GaussianBlur(max(1, S(size * 0.008, 1))))
    highlight.putalpha(ImageChops.multiply(highlight.getchannel("A"), mask))
    img.alpha_composite(highlight)

    # Outer luminous rim.
    rim = Image.new("RGBA", img.size, (0, 0, 0, 0))
    rd = ImageDraw.Draw(rim)
    rd.rounded_rectangle(
        (margin, margin, size - margin - 1, size - margin - 1),
        radius=radius,
        outline=theme["rim"],
        width=max(1, S(size * 0.010, 1)),
    )
    rim_blur = rim.filter(ImageFilter.GaussianBlur(max(1, S(size * 0.010, 1))))
    img.alpha_composite(rim_blur)
    img.alpha_composite(rim)

    return mask


def gradient_bar(
    width: int,
    height: int,
    start: tuple[int, int, int],
    mid: tuple[int, int, int],
    end: tuple[int, int, int],
    alpha: int,
) -> Image.Image:
    """Horizontal three-stop gradient used by EQ bars."""
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    px = img.load()

    for x in range(width):
        t = x / max(1, width - 1)
        if t < 0.5:
            c = lerp_color(start, mid, t * 2)
        else:
            c = lerp_color(mid, end, (t - 0.5) * 2)
        for y in range(height):
            px[x, y] = (*c, alpha)

    return img


def draw_eq_bars(
    layer: Image.Image,
    size: int,
    cx: float,
    cy: float,
    theme: dict,
    active: bool,
) -> None:
    """Crisp EQ columns with micro-highlights and controlled bloom."""
    d = ImageDraw.Draw(layer)
    n = 11

    heights = [
        0.30, 0.46, 0.62, 0.44, 0.76,
        0.94, 0.70, 0.84, 0.58, 0.40, 0.27,
    ]

    usable_w = size * 0.50
    bar_w = max(S(size * 0.030, 1), int(usable_w / 20))
    gap = max(S(size * 0.014, 1), int(bar_w * 0.62))
    total = n * bar_w + (n - 1) * gap
    start_x = cx - total / 2
    max_h = size * 0.34

    for i, h in enumerate(heights):
        bh = max(S(size * 0.055, 1), int(max_h * h))
        x = int(start_x + i * (bar_w + gap))
        y = int(cy - bh / 2)

        if active:
            if i < 4:
                color = theme["cyan"]
            elif i < 8:
                color = theme["emerald"]
            elif i == 8:
                color = theme["lime"]
            elif i == 9:
                color = theme["amber"]
            else:
                color = theme["red"]
        else:
            color = theme["cyan"]

        # Bloom behind the bar.
        glow = Image.new("RGBA", layer.size, (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        gd.rounded_rectangle(
            (x, y, x + bar_w, y + bh),
            radius=max(1, bar_w // 2),
            fill=(*color, 80 if active else 25),
        )
        glow = glow.filter(ImageFilter.GaussianBlur(max(1, int(size * 0.018))))
        layer.alpha_composite(glow)

        # Main bar.
        d.rounded_rectangle(
            (x, y, x + bar_w, y + bh),
            radius=max(1, bar_w // 2),
            fill=(*color, 235 if active else 130),
        )

        # Thin top specular highlight.
        if size >= 32:
            d.rounded_rectangle(
                (x + max(1, bar_w // 4), y + 1, x + max(1, bar_w // 2), y + max(1, bh // 9)),
                radius=max(1, bar_w // 4),
                fill=(255, 255, 255, 105 if active else 45),
            )


def waveform_points(
    size: int,
    cx: float,
    cy: float,
    width: float,
    amplitude: float,
    count: int,
) -> list[tuple[float, float]]:
    points = []
    for i in range(count):
        t = i / max(1, count - 1)
        x = cx - width / 2 + t * width

        envelope = math.sin(math.pi * t) ** 0.65
        signal = (
            0.64 * math.sin(t * math.pi * 4.0 + 0.35)
            + 0.25 * math.sin(t * math.pi * 10.0 + 1.1)
            + 0.11 * math.sin(t * math.pi * 18.0 + 0.2)
        )
        y = cy + signal * amplitude * envelope
        points.append((x, y))
    return points


def draw_waveform(
    layer: Image.Image,
    size: int,
    cx: float,
    cy: float,
    theme: dict,
    active: bool,
) -> None:
    """Thin premium waveform with a soft luminous core."""
    points = waveform_points(
        size,
        cx,
        cy,
        size * 0.58,
        size * 0.105,
        64 if size >= 96 else 36,
    )

    color = theme["wave"]

    # Wide atmospheric bloom.
    glow = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.line(
        points,
        fill=(*color, 110 if active else 45),
        width=max(2, S(size * 0.028, 1)),
        joint="curve",
    )
    glow = glow.filter(ImageFilter.GaussianBlur(max(1, S(size * 0.020, 1))))
    layer.alpha_composite(glow)

    d = ImageDraw.Draw(layer)
    d.line(
        points,
        fill=(*color, 225 if active else 120),
        width=max(1, S(size * 0.012, 1)),
        joint="curve",
    )

    # Central luminous spine for larger icons.
    if size >= 64:
        d.line(
            points,
            fill=(235, 255, 250, 120 if active else 55),
            width=max(1, S(size * 0.004, 1)),
            joint="curve",
        )


def draw_center_badge(
    layer: Image.Image,
    size: int,
    cx: float,
    cy: float,
    theme: dict,
    active: bool,
) -> None:
    """Small circular power/status jewel; subtle, not a distracting logo."""
    if size < 48:
        return

    r = size * 0.035
    if r < 1:
        return

    glow = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((cx - r * 2.4, cy - r * 2.4, cx + r * 2.4, cy + r * 2.4),
               fill=(*theme["emerald"], 150 if active else 30))
    glow = glow.filter(ImageFilter.GaussianBlur(max(1, int(r * 1.8))))
    layer.alpha_composite(glow)

    d = ImageDraw.Draw(layer)
    d.ellipse(
        (cx - r, cy - r, cx + r, cy + r),
        fill=(*theme["emerald"], 240 if active else 100),
        outline=(255, 255, 255, 120 if active else 35),
        width=max(1, int(size * 0.006)),
    )


def draw_wordmark(layer: Image.Image, size: int, theme: dict, active: bool) -> None:
    """Very small wordmark only where there is enough canvas."""
    if size < 256:
        return

    d = ImageDraw.Draw(layer)
    font = get_font(max(8, int(size * 0.043)))
    text = "SOUNDFORGE"

    bbox = d.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    x = (size - tw) / 2
    y = size * 0.855

    # Letter spacing is intentionally omitted for compatibility with Pillow
    # versions commonly found on Windows.
    d.text(
        (x + 1, y + 1),
        text,
        font=font,
        fill=(0, 0, 0, 110),
    )
    d.text(
        (x, y),
        text,
        font=font,
        fill=(*theme["white"], 180 if active else 80),
    )


def draw_corner_status(layer: Image.Image, size: int, theme: dict, active: bool) -> None:
    """Tiny premium status mark in the upper-right corner."""
    if size < 64:
        return

    r = max(2.0, size * 0.017)
    x = size * 0.855
    y = size * 0.145

    if active:
        glow = Image.new("RGBA", layer.size, (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        gd.ellipse((x-r*2.5, y-r*2.5, x+r*2.5, y+r*2.5),
                   fill=(*theme["emerald"], 135))
        glow = glow.filter(ImageFilter.GaussianBlur(max(1, int(r * 1.8))))
        layer.alpha_composite(glow)

    d = ImageDraw.Draw(layer)
    d.ellipse(
        (x-r, y-r, x+r, y+r),
        fill=(*theme["emerald"], 235 if active else 60),
        outline=(255, 255, 255, 95 if active else 30),
        width=max(1, int(size * 0.004)),
    )


# ============================================================================
# MAIN RENDER
# ============================================================================

def draw_icon(size: int, is_off: bool = False) -> Image.Image:
    """
    Render one icon at 4x internal resolution and downsample to final size.

    The icon remains visually simple at 16px and gains detail progressively
    at 32/48/64/128/256+px, avoiding the common mistake of shrinking a large
    logo into an unreadable miniature.
    """
    theme = THEMES["off" if is_off else "active"]
    scale = SUPERSAMPLE
    hi = size * scale

    margin = max(1, int(hi * 0.045))
    radius = max(2, int(hi * 0.235))

    img = Image.new("RGBA", (hi, hi), (0, 0, 0, 0))

    # Atmospheric green/cyan bloom, contained behind the glass tile.
    if not is_off:
        add_radial_glow(
            img,
            (hi * 0.48, hi * 0.49),
            hi * 0.46,
            theme["glow"][:3],
            theme["glow"][3],
            hi * 0.045,
        )
        add_radial_glow(
            img,
            (hi * 0.72, hi * 0.30),
            hi * 0.28,
            theme["cyan"],
            45,
            hi * 0.035,
        )

    draw_glass_surface(img, hi, theme, margin, radius)

    # Content layer.
    content = Image.new("RGBA", (hi, hi), (0, 0, 0, 0))
    cx = hi * 0.50
    cy = hi * (0.455 if size < 128 else 0.445)

    draw_eq_bars(content, hi, cx, cy, theme, not is_off)

    # Waveform occupies lower third; at 16/24 it is omitted to preserve
    # recognition and prevent muddy pixels.
    if size >= 32:
        draw_waveform(
            content,
            hi,
            cx,
            hi * (0.665 if size < 128 else 0.64),
            theme,
            not is_off,
        )

    draw_center_badge(
        content,
        hi,
        cx,
        hi * 0.505,
        theme,
        not is_off,
    )

    draw_corner_status(content, hi, theme, not is_off)
    draw_wordmark(content, hi, theme, not is_off)

    # A very subtle vertical glass reflection over the artwork.
    reflection = Image.new("RGBA", (hi, hi), (0, 0, 0, 0))
    rd = ImageDraw.Draw(reflection)
    rd.polygon(
        [
            (margin, margin),
            (int(hi * 0.34), margin),
            (int(hi * 0.19), hi - margin),
            (margin, hi - margin),
        ],
        fill=(255, 255, 255, 9 if not is_off else 5),
    )
    reflection = reflection.filter(ImageFilter.GaussianBlur(max(1, S(hi * 0.006, 1))))

    # Clip content and reflection to the rounded tile.
    mask = rounded_mask(hi, margin, radius)
    content.putalpha(ImageChops.multiply(content.getchannel("A"), mask))
    reflection.putalpha(ImageChops.multiply(reflection.getchannel("A"), mask))

    img.alpha_composite(content)
    img.alpha_composite(reflection)

    # Downsample with high-quality Lanczos.
    final = img.resize((size, size), Image.Resampling.LANCZOS)

    # Clean fully transparent edge pixels: prevents dark halos in browsers.
    alpha = final.getchannel("A")
    final.putalpha(alpha)

    return final


# ============================================================================
# EXPORT
# ============================================================================

def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(
        path,
        format="PNG",
        optimize=True,
        compress_level=9,
    )


def save_ico(images: list[Image.Image], path: Path) -> None:
    """Write a Windows ICO containing the requested resolutions."""
    if not images:
        return

    # Pillow uses the first image as the base and can encode all supplied
    # resolutions into a single ICO.
    base = images[-1].copy()
    base.save(
        path,
        format="ICO",
        sizes=ICO_SIZES,
    )


def generate_all() -> None:
    print("=" * 72)
    print(f"  SOUNDFORGE PREMIUM ICON GENERATOR v{VERSION}")
    print("  High-quality glass / audio-spectrum icon system")
    print("=" * 72)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    active_images: list[Image.Image] = []
    off_images: list[Image.Image] = []

    generated = 0

    for size in PNG_SIZES:
        print(f"  Rendering {size:4d}x{size:<4d} ...", end=" ")

        active = draw_icon(size, False)
        off = draw_icon(size, True)

        save_png(active, OUTPUT_DIR / f"SoundForge_{size}x{size}.png")
        save_png(off, OUTPUT_DIR / f"SoundForge-off_{size}x{size}.png")

        if (size, size) in ICO_SIZES:
            active_images.append(active)
            off_images.append(off)

        generated += 2
        print("OK")

    print("  Building ICO files ...", end=" ")
    save_ico(active_images, OUTPUT_DIR / "SoundForge.ico")
    save_ico(off_images, OUTPUT_DIR / "SoundForge-off.ico")
    print("OK")

    print("-" * 72)
    print(f"  DONE: {generated} PNG + 2 ICO")
    print(f"  Output: {OUTPUT_DIR.resolve()}")
    print("-" * 72)


def main() -> None:
    try:
        generate_all()
    except KeyboardInterrupt:
        print("\nCancelled.")
        raise SystemExit(130)
    except Exception as exc:
        print(f"\nERROR: {exc}")
        print("Install Pillow with: python -m pip install Pillow")
        raise


if __name__ == "__main__":
    main()
