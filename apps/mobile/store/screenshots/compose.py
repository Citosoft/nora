"""Builds App Store frames from raw simulator captures: headline on brand green, rounded screenshot below.

Usage: python3 compose.py [iphone|ipad ...]   (default: both)
  iphone: raw/*.png      -> framed/*.png       at 1290x2796 (6.9" iPhone)
  ipad:   raw-ipad/*.png -> framed-ipad/*.png  at 2064x2752 (13" iPad)
"""
import sys
from dataclasses import dataclass, field
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).parent
BACKGROUND = (13, 20, 16)
ACCENT = (52, 211, 153)
FONT = "/System/Library/Fonts/SFNS.ttf"

# (raw file, headline, subheading) in App Store order.
FRAMES = [
    ("04-inbox.png", "Approve from anywhere", "Answer your agents in a tap"),
    ("01-thread.png", "Follow every thread", "Live progress as your agents work"),
    ("02-approval.png", "Stay in control", "Nothing ships without your say-so"),
    ("03-activity.png", "See what's running", "Every task on your computer, at a glance"),
    ("05-home.png", "Start work on the go", "Send instructions from your phone"),
]


@dataclass(frozen=True)
class Device:
    raw: str
    framed: str
    size: tuple[int, int]
    shot_width: int
    radius: int
    title_size: int
    subtitle_size: int
    title_y: int
    subtitle_y: int
    shot_top: int
    # Areas of a raw capture to blank with a flat colour, e.g. the account footer that shows the signed-in email.
    redactions: dict[str, list[tuple[tuple[int, int, int, int], tuple[int, int, int]]]] = field(default_factory=dict)


DEVICES = {
    "iphone": Device("raw", "framed", (1290, 2796), 1060, 80, 104, 54, 230, 350, 470),
    "ipad": Device("raw-ipad", "framed-ipad", (2064, 2752), 1720, 56, 120, 64, 220, 350, 470,
                   {"05-home.png": [((0, 2585, 597, 2752), (249, 249, 249))]}),
}


def font(size: int, weight: int) -> ImageFont.FreeTypeFont:
    face = ImageFont.truetype(FONT, size)
    # SF is a variable font: set only the weight axis and leave width/optical size at their defaults.
    axes = face.get_variation_axes()
    face.set_variation_by_axes([weight if axis["name"] in (b"Weight", "Weight") else axis["default"] for axis in axes])
    return face


def rounded(image: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", image.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, *image.size), radius=radius, fill=255)
    out = image.convert("RGBA")
    out.putalpha(mask)
    return out


def frame(device: Device, raw: Path, title: str, subtitle: str, out: Path) -> None:
    width, height = device.size
    canvas = Image.new("RGB", device.size, BACKGROUND)
    draw = ImageDraw.Draw(canvas)
    draw.text((width // 2, device.title_y), title, font=font(device.title_size, 700), fill=(255, 255, 255), anchor="mm")
    draw.text((width // 2, device.subtitle_y), subtitle, font=font(device.subtitle_size, 500), fill=ACCENT, anchor="mm")

    shot = Image.open(raw).convert("RGB")
    shot_draw = ImageDraw.Draw(shot)
    for box, colour in device.redactions.get(raw.name, []):
        shot_draw.rectangle(box, fill=colour)
    shot = shot.resize((device.shot_width, round(shot.height * device.shot_width / shot.width)), Image.LANCZOS)
    visible = shot.crop((0, 0, device.shot_width, min(shot.height, height - device.shot_top + 120)))
    left = (width - device.shot_width) // 2
    border = rounded(Image.new("RGB", (visible.width + 16, visible.height + 16), (40, 52, 45)), device.radius + 8)
    canvas.paste(border, (left - 8, device.shot_top - 8), border)
    framed = rounded(visible, device.radius)
    canvas.paste(framed, (left, device.shot_top), framed)
    canvas.save(out, "PNG")


def build(name: str) -> None:
    device = DEVICES[name]
    (ROOT / device.framed).mkdir(exist_ok=True)
    for index, (raw_name, title, subtitle) in enumerate(FRAMES, start=1):
        raw = ROOT / device.raw / raw_name
        target = ROOT / device.framed / f"{index:02d}-{Path(raw_name).stem.split('-', 1)[1]}.png"
        frame(device, raw, title, subtitle, target)
        print(name, target.name, Image.open(target).size)


if __name__ == "__main__":
    for device_name in sys.argv[1:] or list(DEVICES):
        build(device_name)
