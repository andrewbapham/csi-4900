import time
import random
import logging
from typing import Optional

import requests

from config import MAP_CONFIG

logger = logging.getLogger(__name__)


def _backoff_sleep(attempt: int) -> None:
    time.sleep(MAP_CONFIG.RETRY_BASE_SLEEP * (2**attempt) + random.uniform(0, 0.5))


def call_map_api(
    url: str, params: Optional[dict] = None, raw_bytes: bool = False
) -> tuple[str, Optional[dict]]:
    """GET with retry/backoff. Returns ("ok", json) | ("hard", None) | ("fail", None)."""
    for attempt in range(MAP_CONFIG.RETRY_TRIES):
        try:
            logger.debug(
                "attempt %d/%d calling map_api with url: %s",
                attempt,
                MAP_CONFIG.RETRY_TRIES,
                url,
            )
            r = MAP_CONFIG.session.get(url, params=params, timeout=30)
            code = r.status_code
            logger.debug("HTTP status code: %d", code)
            if code == 429 or 500 <= code < 600:
                _backoff_sleep(attempt)
                continue

            if 400 <= code < 500:
                # Log and stop; caller decides what to do with "hard".
                try:
                    err = r.json()
                except requests.RequestException:
                    err = r.text
                logger.warning("[hard] %d %s params=%s body=%s", code, url, params, err)
                return "hard", None

            r.raise_for_status()
            if raw_bytes:
                return "ok", r.content
            return "ok", r.json()

        except requests.Timeout:
            _backoff_sleep(attempt)
            continue
        except requests.RequestException as e:
            logger.warning("Request failed: %s", e)
            _backoff_sleep(attempt)
            continue

    return "fail", None
