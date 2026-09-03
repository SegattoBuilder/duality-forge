from PIL import Image

src = Image.open("images/logo/party_image.png")
sizes = [16, 20, 32, 48, 64]

for s in sizes:
    resized = src.resize((s, s), Image.LANCZOS)
    resized.save(f"images/logo/party_{s}.png")
    print(f"Created party_{s}.png")
