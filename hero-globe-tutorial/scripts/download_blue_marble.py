"""
download_blue_marble.py
========================
Downloads the NASA Blue Marble Next Generation image and saves it as
blue_marble.jpg, optionally resizing it for better web performance.

About the Blue Marble
─────────────────────
The NASA Blue Marble Next Generation (BMG) is a composite of MODIS satellite
imagery captured over a full month.  MODIS (Moderate Resolution Imaging
Spectroradiometer) orbits at ~700 km altitude and covers the entire Earth
every 1–2 days.  The monthly composite removes cloud cover and blends the
cleanest observations.

The image uses an *equirectangular* (plate carrée) projection:
  - Longitude −180° maps to the LEFT  edge of the image (pixel x = 0)
  - Longitude +180° maps to the RIGHT edge of the image
  - Latitude  −90° maps to the BOTTOM edge of the image (pixel y = height)
  - Latitude  +90° maps to the TOP    edge of the image

This projection is ideal for a texture-mapped sphere because Three.js's
SphereGeometry UV mapping matches it exactly: no rotation or offset is needed.

The full-resolution image is 8192 × 4096 pixels (≈ 70 MB as JPEG).
For the web we resize to 4096 × 2048 (≈ 7 MB), which is sharp enough at
the globe sizes used in this tutorial.

License
───────
NASA imagery is in the public domain.  No attribution is legally required,
but it is good practice to credit "NASA/GSFC, MODIS Land Group."

Months available
─────────────────
Replace "200408" in the URL with any month from "200401" to "200412"
(the year 2004 is used for the classic Blue Marble NGx release).
"""

import os
import sys
import urllib.request

# ── Configuration ─────────────────────────────────────────────────────────────
# August 2004 composite — rich green continents, full Arctic/Antarctic coverage
NASA_URL = (
    'https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74117/'
    'world.200408.3x8192x4096.jpg'
)

# Save relative to this script's location, up one level and into site/assets/
SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PATH = os.path.join(SCRIPT_DIR, '..', 'site', 'assets', 'blue_marble.jpg')
OUTPUT_PATH = os.path.normpath(OUTPUT_PATH)

# If you want to save it elsewhere, change the line above, e.g.:
# OUTPUT_PATH = os.path.join(SCRIPT_DIR, '..', 'site', 'assets', 'blue_marble.jpg')

# Target resolution after optional resize.  Set to None to keep 8192 × 4096.
TARGET_SIZE = (4096, 2048)


def show_progress(block_num, block_size, total_size):
    """Progress callback for urlretrieve."""
    if total_size > 0:
        downloaded = block_num * block_size
        pct = min(100, downloaded * 100 // total_size)
        mb  = downloaded / (1024 * 1024)
        total_mb = total_size / (1024 * 1024)
        print(f'\r  {pct:3d}%  {mb:.1f} / {total_mb:.1f} MB', end='', flush=True)


def download(url, dest_path):
    """Download url to dest_path, showing a progress bar."""
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    tmp = dest_path + '.tmp'
    print(f'Downloading:\n  {url}\n→ {dest_path}')
    urllib.request.urlretrieve(url, tmp, show_progress)
    print()  # newline after progress bar
    os.replace(tmp, dest_path)
    size_mb = os.path.getsize(dest_path) / (1024 * 1024)
    print(f'  Saved {size_mb:.1f} MB')


def resize_image(src_path, dest_path, target_size):
    """Resize the image using Pillow.  Falls back to copying if Pillow is absent."""
    try:
        from PIL import Image
    except ImportError:
        print('  Pillow not found — keeping original resolution.')
        print('  To resize, run:  pip install pillow  then re-run this script.')
        if src_path != dest_path:
            import shutil
            shutil.copy2(src_path, dest_path)
        return

    print(f'Resizing to {target_size[0]} × {target_size[1]}…')
    with Image.open(src_path) as img:
        # LANCZOS is the highest-quality downsampling filter
        resized = img.resize(target_size, Image.LANCZOS)
        # subsampling=0 keeps better chroma detail; quality=90 is sharp but not huge
        resized.save(dest_path, 'JPEG', quality=90, subsampling=0)
    size_mb = os.path.getsize(dest_path) / (1024 * 1024)
    print(f'  Resized image saved: {size_mb:.1f} MB')


def main():
    print('Blue Marble texture downloader')
    print('=' * 40)

    # Download to a temporary path so we can resize in a second step
    if TARGET_SIZE:
        raw_path = OUTPUT_PATH.replace('.jpg', '_full.jpg')
    else:
        raw_path = OUTPUT_PATH

    if os.path.exists(raw_path):
        size_mb = os.path.getsize(raw_path) / (1024 * 1024)
        print(f'Already downloaded: {raw_path} ({size_mb:.1f} MB)')
        print('Delete the file and re-run to re-download.')
    else:
        try:
            download(NASA_URL, raw_path)
        except Exception as e:
            print(f'\nDownload failed: {e}', file=sys.stderr)
            print('The NASA server sometimes throttles requests.  Try again in a few minutes.')
            sys.exit(1)

    if TARGET_SIZE:
        if os.path.exists(OUTPUT_PATH):
            print(f'Resized file already exists: {OUTPUT_PATH}')
        else:
            resize_image(raw_path, OUTPUT_PATH, TARGET_SIZE)
        # Optionally remove the full-resolution file to save disk space
        # os.remove(raw_path)
    else:
        OUTPUT_PATH_ = raw_path  # noqa — already at the right path

    print()
    print('Done.')
    print(f'The texture is at:  {OUTPUT_PATH}')
    print()
    print('Steps 2–9 of the tutorial reference this file at:')
    print('  ../site/assets/blue_marble.jpg')
    print('which is exactly where it has been saved.')
    print()
    print('Alternative: other months of 2004 are available.')
    print('Replace "200408" in NASA_URL with 200401–200412.')


if __name__ == '__main__':
    main()
