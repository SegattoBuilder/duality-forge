from PIL import Image
import os

SRC = os.path.join(os.path.dirname(__file__), "images", "logo", "new_logo_duality_forge.png")
FAVICON_SRC = os.path.join(os.path.dirname(__file__), "images", "logo", "logo_reduced_favicon.png")
OUT = os.path.join(os.path.dirname(__file__), "images", "logo")

img = Image.open(SRC).convert("RGBA")
fav = Image.open(FAVICON_SRC).convert("RGBA")

# PNG icons at various sizes
sizes = {
    "icon-16.png": 16,
    "icon-32.png": 32,
    "icon-192.png": 192,
    "icon-512.png": 512,
    "apple-touch-icon.png": 180,
}

for name, size in sizes.items():
    # Use the reduced favicon source for small sizes
    src = fav if size <= 32 else img
    resized = src.resize((size, size), Image.LANCZOS)
    resized.save(os.path.join(OUT, name), "PNG")
    print(f"Created {name} ({size}x{size})")

# favicon.ico (multi-size ICO from the reduced favicon)
ico_sizes = [16, 32, 48]
ico_images = [fav.resize((s, s), Image.LANCZOS) for s in ico_sizes]
ico_images[0].save(os.path.join(OUT, "favicon.ico"), format="ICO", sizes=[(s, s) for s in ico_sizes], append_images=ico_images[1:])
print(f"Created favicon.ico ({', '.join(str(s) for s in ico_sizes)})")

print("\nAll icons generated in images/logo/")
