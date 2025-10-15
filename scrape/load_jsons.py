import os
import sys
import json
import argparse
from pathlib import Path
from typing import Any, Dict, List
import tqdm

import psycopg2
from psycopg2.extras import execute_batch


def get_conn():
    host = os.getenv("PGHOST", "localhost")
    port = int(os.getenv("PGPORT", "5432"))
    dbname = os.getenv("PGDATABASE", "postgres")
    user = os.getenv("PGUSER", "postgres")
    password = os.getenv("PGPASSWORD", "")

    return psycopg2.connect(
        host=host, port=port, dbname=dbname, user=user, password=password
    )


def load_json_file(path: Path) -> Dict[str, Any]:
    with path.open("r") as f:
        return json.load(f)


def upsert_creator(cur, creator: Dict[str, Any]):
    sql = """
        INSERT INTO creator (id, username)
        VALUES (%s, %s)
        ON CONFLICT DO NOTHING
        """
    cur.execute(sql, (int(creator["id"]), creator.get("username", "")))


def upsert_image(cur, img: Dict[str, Any]):
    sql = """
        INSERT INTO image (
            id, url, camera_type, lat, lon, width, height, creator_id, sequence_id
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT DO NOTHING
        """
    cur.execute(
        sql,
        (
            int(img["id"]),
            img.get("url", ""),
            img.get("camera_type", ""),
            float(img.get("lat")),
            float(img.get("lon")),
            int(img.get("width")),
            int(img.get("height")),
            int(img["creator"]["id"]) if isinstance(img.get("creator"), dict) else None,
            img.get("sequence", ""),
        ),
    )


def upsert_detections(cur, detections: List[Dict[str, Any]], image_id: int):
    if not detections:
        return

    sql = """
        INSERT INTO detection (id, image_id, value, geometry, bbox)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT DO NOTHING
        """

    params = []
    for det in detections:
        det_id = int(det["id"]) if "id" in det else None
        val = det.get("value", "")
        geom = det.get("geometry", "")
        bbox = det.get("bbox", [])

        # Ensure bbox is a 4-length list of ints
        if not isinstance(bbox, list) or len(bbox) != 4:
            raise ValueError(f"Invalid bbox for detection {det_id}: {bbox}")
        bbox = [int(b) for b in bbox]

        params.append((det_id, image_id, val, geom, bbox))

    execute_batch(cur, sql, params, page_size=100)


def process_json(cur, data: Dict[str, Any]):
    required_top = [
        "id",
        "url",
        "camera_type",
        "lat",
        "lon",
        "width",
        "height",
        "creator",
        "sequence",
    ]
    for key in required_top:
        if key not in data:
            raise ValueError(f"Missing required key: {key}")

    # Upsert creator
    creator = data["creator"]
    if not isinstance(creator, dict) or "id" not in creator:
        raise ValueError("creator must be an object with an id")
    upsert_creator(cur, creator)

    # Upsert image
    upsert_image(cur, data)

    # Upsert detections
    detections = data.get("detections", [])
    img_id = int(data["id"])
    upsert_detections(cur, detections, img_id)


def iter_json_files(root: Path):
    """Yield JSON files following <root>/<id>/<id>.json layout.

    Only entries that are directories under root are considered. For each
    directory named <id>, we expect a file <root>/<id>/<id>.json.
    """
    if not root.exists() or not root.is_dir():
        return
    for entry in os.listdir(root):
        if entry == ".DS_Store":
            continue
        entry_dir = root / entry
        if not entry_dir.is_dir():
            continue
        candidate = entry_dir / f"{entry}.json"
        if candidate.exists() and candidate.is_file():
            yield candidate


def main():
    parser = argparse.ArgumentParser(
        description="Load JSON annotation files into PostgreSQL database",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python load_jsons.py /path/to/json/folder
  python load_jsons.py /path/to/json/folder --batch-size 1000
  python load_jsons.py /path/to/json/folder --dry-run
        """,
    )

    parser.add_argument(
        "folder",
        type=str,
        help="Path to folder containing JSON files in <id>/<id>.json structure",
    )

    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Number of files to process before committing (default: 500)",
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and validate JSON files without inserting into database",
    )

    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Show detailed progress information",
    )

    args = parser.parse_args()

    folder = Path(args.folder)
    if not folder.exists():
        print(f"Error: Folder not found: {folder}", file=sys.stderr)
        sys.exit(1)

    if not folder.is_dir():
        print(f"Error: Path is not a directory: {folder}", file=sys.stderr)
        sys.exit(1)

    # Count total files first for progress bar
    json_files = list(iter_json_files(folder))
    total_files = len(json_files)

    if total_files == 0:
        print(f"No JSON files found in {folder}")
        return

    print(f"Found {total_files} JSON files to process")

    if args.dry_run:
        print("DRY RUN MODE - No database operations will be performed")
        count = 0
        for json_path in tqdm.tqdm(json_files, desc="Validating JSON files"):
            try:
                data = load_json_file(json_path)
                # Validate structure without inserting
                required_top = [
                    "id",
                    "url",
                    "camera_type",
                    "lat",
                    "lon",
                    "width",
                    "height",
                    "creator",
                    "sequence",
                ]
                for key in required_top:
                    if key not in data:
                        print(f"Warning: {json_path} missing required key: {key}")
                count += 1
            except Exception as e:
                print(f"Error validating {json_path}: {e}")
        print(f"Validated {count}/{total_files} JSON files")
        return

    conn = get_conn()
    conn.autocommit = False

    try:
        with conn.cursor() as cur:
            count = 0
            for json_path in tqdm.tqdm(json_files, desc="Processing JSON files"):
                try:
                    data = load_json_file(json_path)
                    process_json(cur, data)
                    count += 1

                    # Commit every batch_size files
                    if count % args.batch_size == 0:
                        conn.commit()
                        if args.verbose:
                            print(f"Committed batch at {count} files")

                except Exception as e:
                    print(f"Error processing {json_path}: {e}")
                    # Continue with next file instead of failing entire batch
                    continue

            # Commit any remaining files
            conn.commit()
            print(
                f"Successfully processed {count}/{total_files} JSON files from {folder}"
            )
    except Exception as e:
        print(f"Database error: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
