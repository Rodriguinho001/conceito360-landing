from PIL import Image
import os

def optimize_favicon(image_path, output_path):
    if not os.path.exists(image_path):
        print(f"Error: {image_path} not found.")
        return
    
    img = Image.open(image_path)
    img = img.convert("RGBA")
    
    # Get the bounding box of non-transparent pixels
    bbox = img.getbbox()
    if bbox:
        # Crop the image to the bounding box
        img = img.crop(bbox)
        
        # Make it square by adding padding to the shorter side
        width, height = img.size
        new_size = max(width, height)
        new_img = Image.new("RGBA", (new_size, new_size), (255, 255, 255, 0))
        
        # Center the cropped image in the new square image
        left = (new_size - width) // 2
        top = (new_size - height) // 2
        new_img.paste(img, (left, top))
        
        # Resize to standard favicon sizes (e.g., 64x64 or 128x128)
        # Browsers like higher resolution for crispness
        final_img = new_img.resize((128, 128), Image.Resampling.LANCZOS)
        final_img.save(output_path, "PNG")
        print(f"Optimized favicon saved to {output_path}")
    else:
        print("Error: Could not find bounding box (image might be empty or fully transparent).")

base_dir = r"c:\ObraControle\em-breve"
optimize_favicon(os.path.join(base_dir, "logo_cube_plus.png"), os.path.join(base_dir, "favicon_optimized.png"))
