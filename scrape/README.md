## Running Image Scraping

Requires a .env file with a MAPILLARY_TOKEN key, or set through the env.
You can obtain a key [here](https://www.mapillary.com/dashboard/developers).

For now, `mapillary_demo.py` provides a demo of downloading all images for relevant street sign categories in a given tile. You can test out another tile by changing the X/Y value in the demo script. You can look up tiles here: [https://labs.mapbox.com/what-the-tile/](https://labs.mapbox.com/what-the-tile/)

**Important Note:** The Mapillary API only supports downloading tiles with a zoom level of 14; which are roughly 3km^2 in size.