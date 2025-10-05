import os
import sys

import requests
from dotenv import load_dotenv

load_dotenv()


# ----------------------------
# Config
# ----------------------------
class MAP_CONFIG:
    TOKEN = os.getenv("MAPILLARY_TOKEN")
    if not TOKEN:
        sys.exit("ERROR: set MAPILLARY_TOKEN (starts with 'MLY|...')")

    # API politeness / retries
    SLEEP_BETWEEN_PAGES = 0.10
    RETRY_BASE_SLEEP = 1.0
    RETRY_TRIES = 6

    # Image selection
    MAX_IMAGES_PER_ID = 50
    ASPECT_PANO_RATIO = 2.0  # width/height >= => treat as panoramic
    REJECT_CT = {"spherical", "equirectangular", "fisheye"}

    # Shared session with token
    session = requests.Session()
    session.params.update({"access_token": TOKEN})
