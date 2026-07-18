import os
from PIL import Image

input_path = "pao_de_acucar_texture.png"
output_path = "pao_de_acucar_texture.webp"

print(f"Loading {input_path}...")
img = Image.open(input_path)

print(f"Original format: {img.format}, size: {img.size}")

# Save as WebP with 85% quality to get maximum reduction with minimal artifacting
img.save(output_path, "webp", quality=85)

input_size = os.path.getsize(input_path) / (1024 * 1024)
output_size = os.path.getsize(output_path) / (1024 * 1024)

print(f"Success! Saved as {output_path}")
print(f"Original Size: {input_size:.2f} MB")
print(f"Compressed Size: {output_size:.2f} MB")
print(f"Reduction: {(1 - output_size/input_size)*100:.2f}%")
