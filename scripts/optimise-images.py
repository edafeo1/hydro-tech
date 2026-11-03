"""Rebuild responsive copies of the supplied project photographs (Pillow required).

Originals live in public/assets and remain available for the gallery and downloads.
The normal Node build uses the committed variants; it does not require Pillow.
"""
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[1]
assets = root / "public/assets"
manifest = {}
for source in sorted(assets.glob("*")):
    if source.suffix.lower() not in (".jpg", ".jpeg", ".png"):
        continue
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original)
        width, height = image.size
        entry = {"width": width, "height": height, "variants": []}
        if source.suffix.lower() != ".png":
            targets = (480, 800, 1200) if source.name == "hero.jpg" else (480, 1200)
            for target in sorted({min(target, width) for target in targets}):
                resized = image.convert("RGB")
                resized.thumbnail((target, round(height * target / width)), Image.Resampling.LANCZOS)
                name = f"{source.stem}-{resized.width}.webp"
                resized.save(assets / name, "WEBP", quality=78, method=6)
                entry["variants"].append({"name": name, "width": resized.width, "bytes": (assets / name).stat().st_size})
        entry["sourceSha256"] = hashlib.sha256(source.read_bytes()).hexdigest()
        manifest[source.name] = entry
(root / "src/image-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
total = sum(v["bytes"] for e in manifest.values() for v in e["variants"])
print(f"Prepared {len(manifest)} images; responsive WebP variants total {total:,} bytes.")
