# Annotation Visualizer Backend

FastAPI backend for serving images and annotations to the visualizer frontend.

## Directory Structure

The backend expects images to be organized in the following structure:

```
images/
├── image_id_1/
│   ├── image_id_1.jpg
│   └── image_id_1.json
├── image_id_2/
│   ├── image_id_2.jpg
│   └── image_id_2.json
└── ...
```

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up your images directory:
```bash
mkdir images
# Add your image directories here
```

3. Run the server:
```bash
python main.py
```

The API will be available at `http://localhost:8000`

## Environment Variables

- `IMAGES_DIR`: Path to the images directory (default: `./images`)

## API Endpoints

- `GET /` - Health check
- `GET /api/images` - List all available image IDs
- `GET /api/images/{image_id}` - Get image file
- `GET /api/images/{image_id}/annotations` - Get annotations for image
- `GET /api/images/{image_id}/info` - Get image metadata

## Development

To run with auto-reload:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
