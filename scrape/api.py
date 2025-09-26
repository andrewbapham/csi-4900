import time
import random
from typing import Optional

import requests

from config import MAP_CONFIG


def _backoff_sleep(attempt: int) -> None:
    time.sleep(MAP_CONFIG.RETRY_BASE_SLEEP * (2**attempt) + random.uniform(0, 0.5))


def call_map_api(
    url: str, params: Optional[dict] = None, raw_bytes: bool = False
) -> tuple[str, Optional[dict]]:
    """GET with retry/backoff. Returns ("ok", json) | ("hard", None) | ("fail", None)."""
    for attempt in range(MAP_CONFIG.RETRY_TRIES):
        try:
            print(
                f"attempt {attempt} of {MAP_CONFIG.RETRY_TRIES} calling map_api with url: {url}"
            )
            r = MAP_CONFIG.session.get(url, params=params, timeout=30)
            code = r.status_code
            print("code:", code)
            if code == 429 or 500 <= code < 600:
                _backoff_sleep(attempt)
                continue

            if 400 <= code < 500:
                # Log and stop; caller decides what to do with "hard".
                try:
                    err = r.json()
                except requests.RequestException:
                    err = r.text
                print(f"[hard] {code} {url} params={params} body={err}")
                return "hard", None

            r.raise_for_status()
            if raw_bytes:
                return "ok", r.content
            return "ok", r.json()

        except requests.Timeout:
            _backoff_sleep(attempt)
            continue
        except requests.RequestException as e:
            print(e)
            _backoff_sleep(attempt)
            continue

    return "fail", None
