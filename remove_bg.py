from PIL import Image
import os

def remove_background(image_path, output_path, threshold=240):
    if not os.path.exists(image_path):
        print(f"Error: {image_path} not found.")
        return
    
    img = Image.open(image_path)
    img = img.convert("RGBA")
    
    datas = img.getdata()
    
    newData = []
    for item in datas:
        # If the pixel is near white, make it transparent
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(output_path, "PNG")
    print(f"Saved transparent image to {output_path}")

base_dir = r"c:\ObraControle\em-breve"
remove_background(os.path.join(base_dir, "logo_cube_plus.jpg"), os.path.join(base_dir, "logo_cube_plus.png"))
remove_background(os.path.join(base_dir, "logo_conceito_cortein.jpg"), os.path.join(base_dir, "logo_conceito_cortein.png"))
