import json
import os
from label_studio_sdk import Client
from dotenv import load_dotenv
import psycopg2
from label_to_class_mapping import LABEL_TO_CLASS

load_dotenv()

uploaded_images = set()

def prepare_json_for_label_studio(input_json_path: str, output_json_path: str):
    with open(input_json_path, "r", encoding="utf-8") as f:
        images = json.load(f)
    """
    Convert an input JSON (single image object or list of such objects) into a Label Studio
    tasks JSON file. The input format must match the example provided by the user where each
    image object contains keys like: id, url, width, height, detections (list of objects with
    bbox [x1,y1,x2,y2] and value label string).

    The output will be a list of tasks where each task is a dict with a `data` entry for the
    image url and an optional `annotations` entry containing pre-annotations. BBoxes are
    converted from pixels to percentages (Label Studio expects x,y,width,height in percent).

    Assumptions:
    - Each detection has a `bbox` of [x1,y1,x2,y2]. Detections without bbox are skipped.
    - The labeling control names are assumed to be `label` (from_name) and `image` (to_name).
      If your project uses different names, adjust the returned objects accordingly.

    """

    # input may be a single dict or a list

    tasks = {}

    for image_id in list(images.keys()): # [:100]: <-- limit to first <number> images for testing

        unknown_label_found = False

        image_data = images.get(image_id)
        image_url = image_data.get("url")
        width = image_data.get("width")
        height = image_data.get("height")
        image_id = image_data.get("id")
        sequence = image_data.get("sequence")
        creator = image_data.get("creator")
        camera_type = image_data.get("camera_type")
        lat = image_data.get("lat")
        lon = image_data.get("lon")

        results = []
        predictions = image_data.get("detections") or []

        detections_by_class = {}
        for det in predictions:
            bbox = det.get("bbox")
            label = LABEL_TO_CLASS.get(det.get("value"), "unknown")

            if label == "unknown":
                print(f"Warning: unknown label '{det.get('value')}' for detection id {det.get('id')}. Skipping.")
                unknown_label_found = True
                break
                
            det_id = det.get("id") or f"{image_id}-{len(results)}"

            if not bbox or width in (None, 0) or height in (None, 0):
                # skip detections we cannot convert
                continue

            try:
                x1, y1, x2, y2 = bbox
            except Exception:
                # malformed bbox
                continue

            # convert to percentages expected by Label Studio
            x = (x1 / width) * 100
            y = (y1 / height) * 100
            w = ((x2 - x1) / width) * 100
            h = ((y2 - y1) / height) * 100

            result = {
                "id": str(det_id),
                "type": "rectanglelabels",
                "from_name": "label",
                "to_name": "image",
                "image_rotation": 0,
                "original_width": width,
                "original_height": height,
                "value": {
                    "x": x,
                    "y": y,
                    "width": w,
                    "height": h,
                    "rotation": 0,
                    "rectanglelabels": [label] if label else [],
                },
            }

            if label not in detections_by_class:
                detections_by_class[label] = []

            detections_by_class[label].append(result)


        if unknown_label_found:
            continue
        else:
            uploaded_images.add(image_id)

        for det_class in detections_by_class.keys():
            if det_class not in tasks:
                tasks[det_class] = []
            for det in detections_by_class[det_class]:
                tasks[det_class].append(
                    {
                        "data": {"image": image_url},
                        "predictions": [{"result": detections_by_class[det_class]}],
                        "meta": {
                            "image_id": image_id,
                            "image_width": width,
                            "image_height": height,
                            "sequence_id": sequence_id,
                            "creator": creator,
                            "camera_type": camera_type,
                            "lat": lat,
                            "lon": lon,
                        },
                    }
                )


    # write tasks to output
    with open(output_json_path, "w", encoding="utf-8") as out:
        json.dump(tasks, out, ensure_ascii=False, indent=2)

    print(f"Wrote {len(tasks)} tasks to {output_json_path}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Convert image JSON(s) to Label Studio tasks.json"
    )
    parser.add_argument("input", help="Path to input JSON file (single object or list)")
    parser.add_argument("output", help="Path to write Label Studio tasks JSON")
    parser.add_argument(
        "--import",
        dest="do_import",
        action="store_true",
        help="If set, import the detections into Label Studio using LABEL_STUDIO_API_KEY",
    )

    args = parser.parse_args()
    prepare_json_for_label_studio(args.input, args.output)

    if args.do_import:
        try:
            with open(args.output, "r", encoding="utf-8") as f:
                data = json.load(f)
            # reuse project variable defined at module top
            ls = Client(
                url=os.getenv("LABEL_STUDIO_URL"),
                api_key=os.getenv("LABEL_STUDIO_API_KEY"),
            )
            projects = ls.get_projects()
            project_dict = {p.title: p for p in projects}

            for class_name in data.keys():
                project = project_dict.get(class_name)
                if not project:
                    print(f"No Label Studio project found with title '{class_name}'. Skipping import for this class.")
                    continue

                project.import_tasks(data[class_name])
                print(
                    f"Imported tasks from {args.output} into Label Studio project {project.id}"
                )

            conn = psycopg2.connect(
                user=os.getenv("PGUSER"),
                password=os.getenv("PGPASSWORD"),
                host=os.getenv("PGHOST"),
                port=os.getenv("PGPORT"),
            )

            cur = conn.cursor()

            cur.execute(
                """
                UPDATE image
                SET uploaded = TRUE
                WHERE id = ANY(%s);
                """,
                (list(uploaded_images),)
            )

            conn.commit()
            cur.close()
            conn.close()

            print(f"Uploaded detections from {len(uploaded_images)} images into Label Studio.")
            print(f"Marked {len(uploaded_images)} images as uploaded in the database.")

        except Exception as e:
            print("Failed to import tasks into Label Studio:", e)