#!/usr/bin/env python3
"""
Startup script for the Annotation Visualizer Backend
"""
import os
import uvicorn
import argparse
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(
        description="Start the Annotation Visualizer Backend"
    )
    parser.add_argument(
        "--img-dir",
        type=str,
        default="./images",
        help="Directory containing images and annotations (default: ./images)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to run the server on (default: 8000)",
    )
    parser.add_argument(
        "--host",
        type=str,
        default="0.0.0.0",
        help="Host to bind the server to (default: 0.0.0.0)",
    )

    args = parser.parse_args()

    # Set the images directory environment variable
    images_dir = Path(args.img_dir).resolve()
    os.environ["IMAGES_DIR"] = str(images_dir)

    # Create images directory if it doesn't exist
    images_dir.mkdir(parents=True, exist_ok=True)

    print("🚀 Starting Annotation Visualizer Backend")
    print(f"📁 Images directory: {images_dir}")
    print(f"🌐 API will be available at: http://{args.host}:{args.port}")
    print(f"📖 API docs at: http://{args.host}:{args.port}/docs")
    print("\nTo add images, create directories in the images folder with structure:")
    print("images/")
    print("├── image_id_1/")
    print("│   ├── image_id_1.jpg")
    print("│   └── image_id_1.json")
    print("└── image_id_2/")
    print("    ├── image_id_2.jpg")
    print("    └── image_id_2.json")
    print("\nPress Ctrl+C to stop the server")

    uvicorn.run("main:app", host=args.host, port=args.port, reload=True)


if __name__ == "__main__":
    main()
