from map_utils import get_valid_ids, get_images_by_id_and_type
from PIL import ImageDraw
import matplotlib.pyplot as plt
import numpy as np

# You'll likely want to trim these into smaller boxes and iterate on them
# There is a limit on the number of signs you can get back in one query
# However, this should show you a quick demo on how I built it out

BBOX = (-76.1, 45.2, -75.4, 45.5) # OTTAWA
# BBOX = (-80.0, 40.0, -79.0, 41.0) # PITTSBURGH

TARGET_SIGNS = ["regulatory--stop--g1"]

id_results = get_valid_ids(BBOX, TARGET_SIGNS)

image_results = get_images_by_id_and_type(id_results, TARGET_SIGNS)

for img_res in image_results:
    im = img_res["image"]
    det_class = img_res["class"]
    bbox = img_res["bbox"]
    creator_username = img_res["creator_username"]
    creator_id = img_res["creator_id"]
    lat = img_res["lat"]
    lon = img_res["lon"]

    draw = ImageDraw.Draw(im)
    draw.rectangle(bbox, outline="magenta", width=3)

    title = f"{det_class} | {creator_username} ({creator_id}) | ({lat:.5f}, {lon:.5f})"

    plt.imshow(np.array(im))
    plt.title(title)
    plt.axis('off')
    plt.show()
    plt.close()

    # Save the details however you'd like.