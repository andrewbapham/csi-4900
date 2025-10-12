import cv2
import numpy as np
from mapillary_api import _call_map_api
import pathlib
import shutil


def undistort_from_params(img, camera_parameters, mode="width"):
    """
    Undistort an image given camera_parameters = [f_ratio, k1, k2].

    Args:
        img : numpy array (OpenCV image, BGR)
        camera_parameters : list/array of 3 floats [f_ratio, k1, k2]
        mode : "width" or "maxdim"
            - "width": f_pixels = f_ratio * image width
            - "maxdim": f_pixels = f_ratio * max(width, height)

    Returns:
        undistorted image (numpy array)
    """
    f_ratio, k1, k2 = camera_parameters
    h, w = img.shape[:2]

    if mode == "width":
        f_pixels = f_ratio * w
    elif mode == "maxdim":
        f_pixels = f_ratio * max(w, h)
    else:
        raise ValueError("mode must be 'width' or 'maxdim'")

    cx, cy = w / 2.0, h / 2.0

    # Camera matrix
    K = np.array([[f_pixels, 0, cx], [0, f_pixels, cy], [0, 0, 1]], dtype=np.float64)

    # Distortion vector (k1,k2 only, others zero)
    dist = np.array([k1, k2, 0, 0, 0], dtype=np.float64)

    # Compute undistortion maps
    newK, _ = cv2.getOptimalNewCameraMatrix(K, dist, (w, h), alpha=0)
    map1, map2 = cv2.initUndistortRectifyMap(K, dist, None, newK, (w, h), cv2.CV_32FC1)
    undistorted = cv2.remap(img, map1, map2, interpolation=cv2.INTER_LINEAR)

    return undistorted


def get_camera_parameters_from_id(img_id: int) -> list[float]:
    fields = "id,make,model,camera_parameters,camera_type"
    url = f"https://graph.mapillary.com/{img_id}"
    status, data = _call_map_api(url, params={"fields": fields})
    if status != "ok" or not data:
        return None
    camera_parameters = data.get("camera_parameters")
    if not camera_parameters:
        raise ValueError(f"Camera parameters not found for id {img_id}")
    return camera_parameters


def project_image(img_id: int, input_path: str, output_path: str):
    camera_parameters = get_camera_parameters_from_id(img_id)
    img = cv2.imread(input_path)
    undist_max = undistort_from_params(img, camera_parameters, mode="maxdim")
    cv2.imwrite(output_path, undist_max)


# Example usage
if __name__ == "__main__":
    ids = [
        "160013082758811",
        "1948247598666326",
        "337793764425985",
        "3055748137993656",
        "4244195922268065",
    ]
    for img_id in ids:
        output_path = pathlib.Path(
            f"camera_projections/results/{img_id}/{img_id}_undist.jpg"
        )
        output_path.parent.mkdir(parents=True, exist_ok=True)
        input_path = f"images/{img_id}/{img_id}.jpg"
        project_image(img_id, input_path, output_path)

        shutil.copy(input_path, output_path.parent / f"{img_id}.jpg")
