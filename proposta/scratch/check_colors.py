import os
from PIL import Image

img_path = os.path.join(os.path.dirname(__file__), 'clean_perspective.png')
print("Opening image:", img_path)

if not os.path.exists(img_path):
    print("Error: Image does not exist!")
    exit(1)

img = Image.open(img_path)
width, height = img.size
print(f"Image dimensions: {width}x{height}")

# Sample at X = width / 2 (center) at different Y values
x = width // 2
y_targets = [100, 400, 550, 570, 650, 750, 850]

print("Sampled colors at X = 700 (center):")
for y in y_targets:
    r, g, b = img.getpixel((x, y))[:3]
    hex_color = f"#{r:02x}{g:02x}{b:02x}"
    print(f"Y={y}: rgb({r}, {g}, {b}) / hex: {hex_color}")
