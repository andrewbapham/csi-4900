## Running Image Scraping

Requires a .env file with a MAPILLARY_TOKEN key, or set through the env.
You can obtain a key [here](https://www.mapillary.com/dashboard/developers).

For now, `mapillary_demo.py` provides a demo of downloading all images for relevant street sign categories in a given tile. You can test out another tile by changing the X/Y value in the demo script. You can look up tiles here: [https://labs.mapbox.com/what-the-tile/](https://labs.mapbox.com/what-the-tile/)

**Important Note:** The Mapillary API only supports downloading tiles with a zoom level of 14; which are roughly 3km^2 in size.

You can also use the `scrape_bounding_box.py` script like so:

```bash
> python scrape_bounding_box.py --help
usage: scrape_bounding_box.py [-h] (--bbox BBOX | --tile TILE) [--show-images] [--output-dir OUTPUT_DIR]

options:
  -h, --help            show this help message and exit
  --bbox BBOX           Bounding box to scrape. Example: (-79.4091796875,43.644025847699496,-79.38720703125,43.659924074789096)
  --tile TILE           Tile coordinates to scrape (Z, X, Y). Example: (14, 4579, 5979)
  --show-images         Show images
  --output-dir OUTPUT_DIR, -o OUTPUT_DIR
                        Output directory
```

For example, this will scrape the bounding box of a zoom level 14 tile in downtown Toronto:
```bash
python scrape_bounding_box.py --bbox "(-79.4091796875,43.644025847699496,-79.38720703125,43.659924074789096)"
```

or, this will scrape the same tile, just by specifying the vector tile instead:

```bash
python scrape_bounding_box.py --tile "(14,4578,5979)" 
```

Note that tile and bbox are mutually exclusive.

Greater Toronto Area Bbox: (-80.156245, 43.421036, -78.662243, 44.040219)
Greater Vancouver Area Bbox: (-123.284454, 49.009220, -122.498932, 49.373599)
Greater Montreal Area Bbox: (-73.943481, 45.405380, -73.435364, 45.711154)
Greater Ottawa Area Bbox: (-75.897675,45.310813,-75.510406,45.511339)
Quebec City Bbox: (-71.721497,46.496856,-70.776672,47.038661)