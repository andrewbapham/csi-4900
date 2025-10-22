import json
import os
from label_studio_sdk import Client
from dotenv import load_dotenv

from label_to_class_mapping import LABEL_TO_CLASS

load_dotenv()


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

    tasks = []
    for image_id in list(images.keys())[:args.num_images]: # limit to first num_images images for testing
        image_data = images.get(image_id)
        image_url = image_data.get("url")
        width = image_data.get("width")
        height = image_data.get("height")
        image_id = image_data.get("id")

        task = {"data": {"image": image_url}}

        results = []
        predictions = image_data.get("detections") or []
        for det in predictions:
            bbox = det.get("bbox")
            label = LABEL_TO_CLASS.get(det.get("value"), "unknown")
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

            results.append(result)

        if results:
            task["predictions"] = [{"result": results}]

        tasks.append(task)

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
    parser.add_argument("num_images", type=int, help="Number of images to process from the input JSON")
    parser.add_argument(
        "--import",
        dest="do_import",
        action="store_true",
        help="If set, import the generated tasks into project 1 using LABEL_STUDIO_API_KEY",
    )
    parser.add_argument("--project-id", type=int, default=1, help="ID of the Label Studio project to import tasks into")

    args = parser.parse_args()
    prepare_json_for_label_studio(args.input, args.output)

    if args.do_import:
        try:
            with open(args.output, "r", encoding="utf-8") as f:
                data = json.load(f)
            # reuse project variable defined at module top
            ls = Client(
                url=s.getenv("LABEL_STUDIO_URL"),
                api_key=os.getenv("LABEL_STUDIO_API_KEY"),
            )
            project = ls.get_project(args.project_id)

            project.import_tasks(data)
            print(
                f"Imported tasks from {args.output} into Label Studio project {project.id}"
            )
        except Exception as e:
            print("Failed to import tasks into Label Studio:", e)