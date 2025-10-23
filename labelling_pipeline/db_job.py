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

    # --- SQL Query for getting a specific number of images for each label balanced by city ---
    MAIN_QUERY = """
        WITH
        -- 1. Get all base detections matching filters, plus city
        BaseDetections AS (
            SELECT
                i.id AS image_id,
                i.city,
                i.creator_id,
                i.location,
                i.uploaded,
                d.id AS detection_id,
                d.value AS label,
                c.username AS creator
            FROM
                image i
            JOIN
                detection d ON i.id = d.image_id
            JOIN 
                creator c ON i.creator_id = c.id
            WHERE
                d.value IN %s -- <-- This is the placeholder for our labels
                AND i.uploaded = FALSE
                AND NOT i.location && ST_MakeEnvelope(-75.239868, 44.938314, -70.526733, 47.238919, 4326)
                AND i.city IN ('Ottawa', 'Toronto', 'Vancouver')
        ),

        -- 2. Create a scaffold of all desired labels and cities
        DistinctLabels AS (
            SELECT DISTINCT label FROM BaseDetections
        ),
        Cities AS (
            SELECT unnest(ARRAY['Ottawa', 'Toronto', 'Vancouver']) AS city
        ),
        LabelCityScaffold AS (
            SELECT
                l.label,
                c.city
            FROM DistinctLabels l
            CROSS JOIN Cities c
        ),

        -- 3. Get actual counts for each (label, city) pair
        CountsPerLabelAndCity AS (
            SELECT
                label,
                city,
                COUNT(*) AS total
            FROM BaseDetections
            GROUP BY label, city
        ),

        -- 4. Join scaffold with counts, defaulting to 0
        Counts AS (
            SELECT
                s.label,
                s.city,
                COALESCE(cpc.total, 0) AS total
            FROM
                LabelCityScaffold s
            LEFT JOIN
                CountsPerLabelAndCity cpc ON s.label = cpc.label AND s.city = cpc.city
        ),

        -- 5. Calculate base target (100 per label / 3 cities)
        Targets AS (
            SELECT
                *,
                (100.0 / 3.0) AS base_target -- 100 total detections divided by 3 cities
            FROM Counts
        ),

        -- 6. First pass: take the minimum of what's available or the target
        Initial AS (
            SELECT
                *,
                LEAST(total, base_target) AS taken
            FROM Targets
        ),

        -- 7. Calculate remaining detections to fetch (per label)
        Leftover AS (
            SELECT
                label,
                100 - SUM(taken) AS remaining
            FROM Initial
            GROUP BY label
        ),

        -- 8. Determine which cities can take more and how many are eligible
        Eligible AS (
            SELECT
                i.*,
                l.remaining,
                (i.total - i.taken) AS can_take_more,
                SUM(CASE WHEN (i.total - i.taken) > 0 THEN 1 ELSE 0 END) OVER (PARTITION BY i.label) AS eligible_cities_count
            FROM Initial i
            JOIN Leftover l ON i.label = l.label
        ),

        -- 9. Redistribute the leftovers among eligible cities
        Redistributed AS (
            SELECT
                label,
                city,
                taken +
                    CASE
                        -- Only redistribute if there are leftovers, this city can take more, and eligible cities exist
                        WHEN remaining > 0 AND can_take_more > 0 AND eligible_cities_count > 0 THEN
                            LEAST(
                                remaining / eligible_cities_count, -- Share of leftovers
                                can_take_more                     -- Max this city can take
                            )
                        ELSE 0
                    END AS final_target
            FROM Eligible
        ),

        -- 10. Rank the actual detections within each (label, city) partition
        RankedDetections AS (
            SELECT
                bd.*,
                -- This partition orders by image_id to get a stable rank
                ROW_NUMBER() OVER(PARTITION BY bd.label, bd.city ORDER BY bd.image_id) AS rn
            FROM
                BaseDetections bd
        )

        -- 11. Final selection
        SELECT
            r.image_id,
            r.detection_id,
            r.label,
            r.city,
            r.creator,
            r.rn -- You can select any other columns you need from RankedDetections
        FROM
            RankedDetections r
        JOIN
            Redistributed d ON r.label = d.label AND r.city = d.city
        WHERE
            r.rn <= CEIL(d.final_target); -- Use CEIL to round up fractional targets
    """

    # --- Connect to PostgreSQL ---
    with psycopg2.connect(**conn_params) as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Fetch rows
            cur.execute(
                MAIN_QUERY,
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
                "city": row.get("city"),
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
