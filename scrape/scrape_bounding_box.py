import argparse
import ast
from models import BBox, Tile
from mapillary_api import (
    get_valid_ids_in_tile,
    save_images_with_detections_by_id,
    get_valid_ids_in_bbox,
)
import logging
import json
import os
from PIL import ImageDraw, Image
import matplotlib.pyplot as plt
import numpy as np

MONTREAL_BBOX = (-73.943481, 45.405380, -73.435364, 45.711154)

LOG_LEVEL_MAP = {
    "DEBUG": logging.DEBUG,
    "INFO": logging.INFO,
    "WARNING": logging.WARNING,
    "ERROR": logging.ERROR,
    "CRITICAL": logging.CRITICAL,
}


def main():
    parser = argparse.ArgumentParser()
    mutex_group = parser.add_mutually_exclusive_group(required=True)
    mutex_group.add_argument(
        "--bbox",
        type=str,
        help=(
            "Bounding box to scrape (west, south, east, north). Example: "
            "(-79.4091796875,43.644025847699496,-79.38720703125,43.659924074789096)"
        ),
    )
    mutex_group.add_argument(
        "--tile",
        type=str,
        help="Tile coordinates to scrape (Z, X, Y). Example: (14, 4579, 5979)",
    )
    parser.add_argument("--show-images", action="store_true", help="Show images")
    parser.add_argument("--output-dir", "-o", type=str, help="Output directory")
    parser.add_argument("--log-level", type=str, help="Log level", default="WARNING")
    args = parser.parse_args()

    logging.basicConfig(
        level=LOG_LEVEL_MAP[args.log_level],
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    logger = logging.getLogger(__name__)

    bbox = None
    tile_coords = None
    ids = None

    if args.bbox:
        bbox = ast.literal_eval(args.bbox)
        bbox = BBox(west=bbox[0], south=bbox[1], east=bbox[2], north=bbox[3])
        ids = get_valid_ids_in_bbox(bbox, strict=True)
    elif args.tile:
        tile_coords = ast.literal_eval(args.tile)
        tile_coords = Tile(z=tile_coords[0], x=tile_coords[1], y=tile_coords[2])
        ids = get_valid_ids_in_tile(tile_coords)

    output_dir = args.output_dir or "images"

    print(f"found {len(ids)} detection ids")
    images_with_detections = save_images_with_detections_by_id(ids, output_dir)
    print(f"Saved {images_with_detections} images with detections")

    # iterate through images with detections, in the images directory
    if args.show_images:

        for entry in os.listdir(output_dir):
            entry_path = os.path.join(output_dir, entry)
            if not os.path.isdir(entry_path):
                continue

            image_id = entry
            jpg_path = os.path.join(entry_path, f"{image_id}.jpg")
            json_path = os.path.join(entry_path, f"{image_id}.json")

            if not (os.path.isfile(jpg_path) and os.path.isfile(json_path)):
                continue

            # Load image

            with Image.open(jpg_path) as im:
                im = im.convert("RGB")  # Ensure RGB for drawing

                # Load detections
                with open(json_path, "r", encoding="utf-8") as f:
                    img_data = json.load(f)
                draw = ImageDraw.Draw(im)
                creator_username = img_data.get("creator", {}).get("username")
                creator_id = img_data.get("creator", {}).get("id")
                lat = img_data.get("lat")
                lon = img_data.get("lon")
                sequence = img_data.get("sequence")

                # Try to get extra info from the first detection if available
                detections = img_data.get("detections", [])
                det_class = None

                for det in detections:
                    det_class = det.get("value")
                    bbox = det.get("bbox")

                    if not bbox:
                        continue

                    draw.rectangle(bbox, outline="magenta", width=3)

                title = f"{det_class} | {sequence} {creator_username} ({creator_id}) | ({lat}, {lon})"

                plt.imshow(np.array(im))
                plt.title(title)
                plt.axis("off")
                plt.show()
                plt.close()


if __name__ == "__main__":
    main()
