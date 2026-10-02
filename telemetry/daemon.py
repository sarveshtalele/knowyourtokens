#!/usr/bin/env python3
"""Background poller: reconcile new transcript lines every few seconds,
apply retention hourly, and forward new data to configured integrations."""

import logging
import signal
import time

from telemetry import config
from telemetry.db import connect
from telemetry.reconcile import reconcile
from telemetry.retention import prune

log = logging.getLogger("telemetry.daemon")
RETENTION_EVERY_S = 3600


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    interval = config.poll_interval()
    stop = {"flag": False}

    def _stop(*_):
        stop["flag"] = True

    signal.signal(signal.SIGTERM, _stop)
    log.info("Token Telemetry daemon: polling %s every %ss", config.projects_dir(), interval)
    exporters = _load_exporters()
    last_prune = 0.0
    while not stop["flag"]:
        try:
            changed, _ = reconcile(force=False)
            if changed:
                log.info("Ingested new lines from %s transcript(s)", changed)
            if time.monotonic() - last_prune > RETENTION_EVERY_S:
                conn = connect()
                try:
                    stats = prune(conn)
                finally:
                    conn.close()
                if any(stats.values()):
                    log.info("Retention: %s", stats)
                last_prune = time.monotonic()
            for exporter in exporters:
                exporter.tick()
        except KeyboardInterrupt:
            break
        except Exception:  # noqa: BLE001 -- keep polling; the next tick may succeed
            log.exception("Daemon tick failed")
        for _ in range(interval * 10):
            if stop["flag"]:
                break
            time.sleep(0.1)
    log.info("Stopped.")


def _load_exporters():
    from telemetry.integrations import enabled_exporters

    return enabled_exporters()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
