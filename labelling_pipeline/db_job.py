import os
import argparse
import psycopg2
from psycopg2.extras import RealDictCursor
import json
from dotenv import load_dotenv
from constants import TRAFFIC_SIGN_LABELS

load_dotenv()


def main():

    # --- Command-line arguments ---
    parser = argparse.ArgumentParser(
        description="Export detections grouped by image to JSON"
    )
    parser.add_argument(
        "--output", "-o", default="output.json", help="Output JSON file name"
    )
    parser.add_argument(
        "--value", "-v", required=False, help="Detection value/class to filter"
    )
    args = parser.parse_args()

    # --- PostgreSQL connection from environment variables ---
    conn_params = {
        "user": os.getenv("PGUSER"),
        "password": os.getenv("PGPASSWORD"),
        "host": os.getenv("PGHOST"),
        "port": os.getenv("PGPORT"),
    }

    # --- Connect to PostgreSQL ---
    with psycopg2.connect(**conn_params) as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Fetch rows
            cur.execute(
                """
                    WITH RankedResults AS (
                        SELECT
                            i.*,
                            d.*,
                            c.username as creator,
                            ROW_NUMBER() OVER(PARTITION BY d.value ORDER BY i.id) AS rn
                        FROM
                            image i
                        JOIN
                            detection d ON i.id = d.image_id
                        JOIN 
                            creator c ON i.creator_id = c.id
                        WHERE
                            d.value IN %s
                            AND i.uploaded = FALSE
                            AND NOT i.location && ST_MakeEnvelope(-75.239868, 44.938314, -70.526733, 47.238919, 4326)
                    )
                    SELECT
                        * FROM
                        RankedResults
                    WHERE
                        rn <= 100;
                """,
                (args.value if args.value else TRAFFIC_SIGN_LABELS,),
            )
            rows = cur.fetchall()

    # --- Group rows by image_id ---
    output = {}
    for row in rows:
        image_id = row["image_id"]
        if image_id not in output:
            output[image_id] = {
                "url": row.get("url"),
                "width": row.get("width"),
                "height": row.get("height"),
                "id": image_id,
                "detections": [],
                "sequence_id": row.get("sequence_id"),
                "creator": row.get("creator"),
                "camera_type": row.get("camera_type"),
                "lat": row.get("lat"),
                "lon": row.get("lon"),
            }
        output[image_id]["detections"].append(
            {"id": row.get("id"), "value": row.get("value"), "bbox": row.get("bbox")}
        )

    # --- Write to JSON ---
    with open(args.output, "w") as f:
        json.dump(output, f, indent=4)

    print(f"Exported {len(output)} images to {args.output}")


if __name__ == "__main__":
    main()
