import os
import shutil

src_dir = r"C:\Users\dell\Desktop\aqa gallerie hub\AQA events"
dest_dir = r"c:\Users\dell\Desktop\aqasportsdotpro\public\events"

if not os.path.exists(dest_dir):
    os.makedirs(dest_dir)

print(f"Scanning source directory: {src_dir}")
files = os.listdir(src_dir)

copied_count = 0
for f in files:
    if f.startswith("Fav img") or f.startswith("Fav main vid"):
        src_path = os.path.join(src_dir, f)
        dest_path = os.path.join(dest_dir, f)
        print(f"Copying {f} to {dest_path}...")
        shutil.copy2(src_path, dest_path)
        copied_count += 1

print(f"Successfully copied {copied_count} files!")
