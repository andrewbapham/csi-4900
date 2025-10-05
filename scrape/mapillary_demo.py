from map_utils import get_valid_ids_in_tile, get_images_by_id_and_type
from PIL import ImageDraw
import matplotlib.pyplot as plt
import numpy as np

from models import Tile

# You'll likely want to trim these into smaller boxes and iterate on them
# There is a limit on the number of signs you can get back in one query
# However, this should show you a quick demo on how I built it out

# BBOX = (-76.1, 45.2, -75.4, 45.5) # OTTAWA
# BBOX = (-80.0, 40.0, -79.0, 41.0) # PITTSBURGH
TILE_COORDS = Tile(
    z=14, x=4627, y=5938
)  # somewhere in peterborough; 19 sign detections
TILE_COORDS = Tile(z=14, x=4746, y=5867)  # somewhere in markham
TARGET_SIGNS = None

id_results = get_valid_ids_in_tile(TILE_COORDS, TARGET_SIGNS)
print(f"found {len(id_results)} sign detections")
image_results = get_images_by_id_and_type(id_results)
print(f"found {len(image_results)} images")
print([i.image.id for i in image_results])
for img_res in image_results:
    im = img_res.image.image
    draw = ImageDraw.Draw(im)
    detections = img_res.detections
    for det in detections:
        det_class = det.value
        bbox = det.bbox
        creator_username = det.image.creator.username
        creator_id = det.image.creator.id
        lat = det.image.lat
        lon = det.image.lon

        if not bbox:
            continue

        draw.rectangle(bbox, outline="magenta", width=3)

    title = f"{det_class} | {img_res.image.sequence} {creator_username} ({creator_id}) | ({lat:.5f}, {lon:.5f})"

    plt.imshow(np.array(im))
    plt.title(title)
    plt.axis("off")
    plt.show()
    plt.close()

    # Save the details however you'd like.
