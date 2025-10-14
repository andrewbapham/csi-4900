from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
import json
from pathlib import Path
import uvicorn

app = FastAPI(title="Annotation Visualizer API", version="1.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
IMAGES_DIR = os.getenv("IMAGES_DIR", "./images")
IMAGES_DIR = Path(IMAGES_DIR)


@app.get("/")
async def root():
    return {"message": "Annotation Visualizer API"}


@app.get("/api/images")
async def get_images(page: int = 1, limit: int = 10):
    """Get paginated list of available image IDs"""
    if not IMAGES_DIR.exists():
        raise HTTPException(status_code=404, detail="Images directory not found")

    # Get all valid image IDs
    image_ids = []
    for item in IMAGES_DIR.iterdir():
        if item.is_dir():
            # Check if both image and annotation files exist
            image_id = item.name
            image_file = item / f"{image_id}.jpg"
            json_file = item / f"{image_id}.json"

            if image_file.exists() and json_file.exists():
                image_ids.append(image_id)

    # Sort and paginate
    image_ids = sorted(image_ids)
    total_images = len(image_ids)
    total_pages = (total_images + limit - 1) // limit  # Ceiling division

    # Validate page number
    if page < 1:
        page = 1
    if page > total_pages and total_pages > 0:
        page = total_pages

    # Calculate pagination
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_images = image_ids[start_idx:end_idx]

    return {
        "image_ids": paginated_images,
        "pagination": {
            "page": page,
            "limit": limit,
            "total_images": total_images,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
        },
    }


@app.get("/api/images/{image_id}")
async def get_image(image_id: str):
    """Get image file"""
    image_path = IMAGES_DIR / image_id / f"{image_id}.jpg"

    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")

    # Set Content-Disposition to attachment with a filename so browsers download instead of preview
    return FileResponse(
        image_path,
        media_type="image/jpeg",
        filename=f"{image_id}.jpg",
        headers={"Content-Disposition": f'attachment; filename="{image_id}.jpg"'},
    )


@app.get("/api/images/{image_id}/annotations")
async def get_annotations(image_id: str):
    """Get annotations for a specific image"""
    json_path = IMAGES_DIR / image_id / f"{image_id}.json"

    if not json_path.exists():
        raise HTTPException(status_code=404, detail="Annotations not found")

    try:
        with open(json_path, "r") as f:
            data = json.load(f)
        return data
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid JSON file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")


@app.get("/api/images/{image_id}/info")
async def get_image_info(image_id: str):
    """Get basic info about an image (dimensions, file size, etc.)"""
    image_path = IMAGES_DIR / image_id / f"{image_id}.jpg"
    json_path = IMAGES_DIR / image_id / f"{image_id}.json"

    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")

    info = {
        "image_id": image_id,
        "image_exists": image_path.exists(),
        "annotations_exist": json_path.exists(),
        "image_size": image_path.stat().st_size if image_path.exists() else 0,
    }

    # Try to get dimensions from annotations if available
    if json_path.exists():
        try:
            with open(json_path, "r") as f:
                data = json.load(f)
                if "width" in data and "height" in data:
                    info["width"] = data["width"]
                    info["height"] = data["height"]
        except:
            pass

    return info


@app.post("/api/images/{image_id}/annotations")
async def add_annotation(image_id: str, annotation: dict):
    """Add a new annotation to a specific image"""
    json_path = IMAGES_DIR / image_id / f"{image_id}.json"

    if not json_path.exists():
        raise HTTPException(status_code=404, detail="Image annotations not found")

    # Validate required fields
    required_fields = ["id", "value", "geometry", "bbox"]
    for field in required_fields:
        if field not in annotation:
            raise HTTPException(
                status_code=400, detail=f"Missing required field: {field}"
            )

    try:
        # Read existing annotations
        with open(json_path, "r") as f:
            data = json.load(f)

        # Create new annotation object with image_id
        new_annotation = {
            "id": annotation["id"],
            "value": annotation["value"],
            "geometry": annotation["geometry"],
            "bbox": annotation["bbox"],  # Assume it's already a list
            "image_id": int(image_id),
        }

        # Add to annotations list
        if "annotations" not in data:
            data["annotations"] = []
        data["annotations"].append(new_annotation)

        # Write back to file
        with open(json_path, "w") as f:
            json.dump(data, f, indent=2)

        return {
            "message": "Annotation added successfully",
            "annotation": new_annotation,
        }

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid JSON file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
