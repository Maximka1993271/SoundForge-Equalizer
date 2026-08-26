import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math

# === НАСТРОЙКИ ===
SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024]
ICO_SIZES = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]

# Цвета
COLOR_BG_START = (20, 24, 33)
COLOR_BG_END = (7, 9, 13)
COLOR_GLOW = (0, 161, 112, 76)
COLOR_TEXT = (255, 255, 255, 89)
COLOR_TEXT_OFF = (255, 255, 255, 40)


def create_gradient(width, height, color_start, color_end):
    """Создает вертикальный градиент."""
    img = Image.new('RGBA', (width, height))
    for y in range(height):
        ratio = y / height
        r = int(color_start[0] * (1 - ratio) + color_end[0] * ratio)
        g = int(color_start[1] * (1 - ratio) + color_end[1] * ratio)
        b = int(color_start[2] * (1 - ratio) + color_end[2] * ratio)
        for x in range(width):
            img.putpixel((x, y), (r, g, b, 255))
    return img


def draw_eq_spectrum(draw, img, size, cx, cy, width, height, is_off=False):
    """Рисует спектр эквалайзера."""
    num_bars = 10
    bar_max_height = int(height * 0.6)
    bar_width = max(2, int(width / (num_bars + 1.5)))
    spacing = max(1, int(bar_width * 0.25))
    total_width = num_bars * (bar_width + spacing) - spacing
    start_x = cx - total_width // 2
    
    # Высоты полос для имитации аудиосигнала
    if size < 48:
        heights = [0.4, 0.3, 0.5, 0.4, 0.6, 0.5, 0.7, 0.6, 0.5, 0.3]
    elif size < 96:
        heights = [0.5, 0.3, 0.6, 0.5, 0.7, 0.6, 0.8, 0.7, 0.5, 0.3]
    else:
        heights = [0.7, 0.4, 0.8, 0.6, 0.9, 0.7, 1.0, 0.8, 0.5, 0.3]
    
    for i in range(num_bars):
        bar_height = max(2, int(bar_max_height * heights[i]))
        x = start_x + i * (bar_width + spacing)
        y = cy + height // 2 - bar_height // 2
        
        # Цвет полосы
        if is_off:
            gray = 60 + int(i / (num_bars - 1) * 40)
            color = (gray, gray, gray, 180)
        else:
            ratio = i / (num_bars - 1)
            if ratio < 0.5:
                t = ratio * 2
                r = int(76 + (255 - 76) * t)
                g = int(175 - (175 - 193) * t)
                b = int(80 - (80 - 7) * t)
            else:
                t = (ratio - 0.5) * 2
                r = 255
                g = int(193 - (193 - 82) * t)
                b = int(7 - (7 - 82) * t)
            color = (r, g, b, 220)
        
        # Рисуем полосу
        radius = max(1, int(bar_width * 0.15))
        draw.rounded_rectangle(
            [x, y, x + bar_width, y + bar_height],
            radius=radius,
            fill=color
        )


def draw_waveform(draw, size, cx, cy, width, height, is_off=False):
    """Рисует волновую форму."""
    if size < 48:
        points = 20
        amplitude = int(height * 0.25)
    else:
        points = 40
        amplitude = int(height * 0.3)
    
    step = width / (points - 1)
    start_x = cx - width // 2
    phase = 0.7
    
    color = (120, 136, 152, 160) if is_off else (0, 200, 150, 200)
    
    points_list = []
    for i in range(points):
        x = start_x + i * step
        y_offset = math.sin(i / points * 4 * math.pi + phase) * 0.6 + \
                   math.sin(i / points * 2 * math.pi + phase * 2) * 0.3 + \
                   math.sin(i / points * 8 * math.pi + phase * 0.5) * 0.1
        y = cy + y_offset * amplitude
        points_list.append((x, y))
    
    if len(points_list) > 1:
        for i in range(len(points_list) - 1):
            draw.line(
                [points_list[i], points_list[i + 1]],
                fill=color,
                width=max(1, int(size * 0.02))
            )


def draw_icon(size, is_off=False):
    """Отрисовывает иконку эквалайзера."""
    margin = int(size * 0.03)
    radius = int(size * 0.22)
    
    # Создаем холст
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Маска для закругления
    mask = Image.new('L', (size, size), 0)
    draw_mask = ImageDraw.Draw(mask)
    draw_mask.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=radius,
        fill=255
    )
    
    # Свечение
    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=radius,
        fill=COLOR_GLOW
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=size * 0.05))
    img.alpha_composite(glow)
    
    # Фон
    bg_gradient = create_gradient(size, size, COLOR_BG_START, COLOR_BG_END)
    img.paste(bg_gradient, (0, 0), mask)
    
    # Окантовка
    border_color = (255, 255, 255, 40) if is_off else (76, 175, 80, 60)
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=radius,
        outline=border_color,
        width=max(1, int(size * 0.012))
    )
    
    # Эквалайзер
    cx, cy = size // 2, size // 2
    
    if size < 48:
        draw_eq_spectrum(draw, img, size, cx, cy, int(size * 0.65), int(size * 0.45), is_off)
    elif size < 96:
        draw_eq_spectrum(draw, img, size, cx, cy - int(size * 0.05), int(size * 0.55), int(size * 0.35), is_off)
        draw_waveform(draw, size, cx, cy + int(size * 0.12), int(size * 0.5), int(size * 0.2), is_off)
    else:
        draw_eq_spectrum(draw, img, size, cx, cy - int(size * 0.08), int(size * 0.5), int(size * 0.3), is_off)
        draw_waveform(draw, size, cx, cy + int(size * 0.15), int(size * 0.6), int(size * 0.2), is_off)
    
    # Текст для больших иконок
    if size >= 128:
        txt_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        txt_draw = ImageDraw.Draw(txt_img)
        font_size = int(size * 0.045)
        
        try:
            font = ImageFont.truetype("arialbd.ttf", font_size)
        except:
            font = ImageFont.load_default()
        
        text = "SOUNDFORGE"
        text_bbox = txt_draw.textbbox((0, 0), text, font=font)
        text_w = text_bbox[2] - text_bbox[0]
        
        txt_x = (size - text_w) / 2
        txt_y = size - margin - radius - int(size * 0.02)
        
        text_color = COLOR_TEXT_OFF if is_off else COLOR_TEXT
        txt_draw.text((txt_x, txt_y), text, font=font, fill=text_color)
        img.alpha_composite(txt_img)
    
    # Индикатор для активной иконки
    if not is_off and size >= 48:
        dot_size = max(2, int(size * 0.015))
        dot_x = size - margin - int(size * 0.04)
        dot_y = margin + int(size * 0.04)
        draw.ellipse(
            [dot_x - dot_size, dot_y - dot_size, dot_x + dot_size, dot_y + dot_size],
            fill=(76, 175, 80, 200)
        )
    
    return img


def main():
    print("🎨 Начинаю генерацию иконок эквалайзера SoundForge...")
    
    # Папка для вывода
    output_dir = "icons_pack"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"📁 Создана папка: {output_dir}")
    
    ico_images_active = []
    ico_images_off = []

    # Генерация PNG
    for size in SIZES:
        print(f"[*] Генерация {size}x{size}...")
        
        # Активная иконка
        img_active = draw_icon(size, is_off=False)
        filename_active = f"SoundForge_{size}x{size}.png"
        filepath_active = os.path.join(output_dir, filename_active)
        img_active.save(filepath_active, "PNG")
        print(f"    ✅ {filename_active}")
        
        if (size, size) in ICO_SIZES:
            ico_images_active.append(img_active)
        
        # Отключенная иконка
        img_off = draw_icon(size, is_off=True)
        filename_off = f"SoundForge-off_{size}x{size}.png"
        filepath_off = os.path.join(output_dir, filename_off)
        img_off.save(filepath_off, "PNG")
        print(f"    ✅ {filename_off}")
        
        if (size, size) in ICO_SIZES:
            ico_images_off.append(img_off)

    # Генерация ICO
    if ico_images_active:
        print("[*] Сборка SoundForge.ico...")
        ico_path = os.path.join(output_dir, "SoundForge.ico")
        ico_images_active[0].save(
            ico_path,
            format="ICO",
            sizes=ICO_SIZES,
            append_images=ico_images_active[1:]
        )
        print(f"    ✅ SoundForge.ico")

    if ico_images_off:
        print("[*] Сборка SoundForge-off.ico...")
        ico_path = os.path.join(output_dir, "SoundForge-off.ico")
        ico_images_off[0].save(
            ico_path,
            format="ICO",
            sizes=ICO_SIZES,
            append_images=ico_images_off[1:]
        )
        print(f"    ✅ SoundForge-off.ico")

    print(f"\n✅ Готово! {len(SIZES) * 2} PNG и 2 ICO сохранены в папку '{output_dir}'.")
    print("   🟢 SoundForge_*.png — активная иконка")
    print("   ⚪ SoundForge-off_*.png — отключенная иконка")


if __name__ == "__main__":
    main()