#!/usr/bin/env python3
"""
List candidate image files from a folder for Meta Ads creative selection.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

SUPPORTED_SUFFIXES = {
    ".bmp",
    ".gif",
    ".heic",
    ".jpeg",
    ".jpg",
    ".png",
    ".tif",
    ".tiff",
    ".webp",
}


def isoformat(timestamp: float) -> str:
    return datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat()


def iter_images(folder: Path, recursive: bool) -> list[dict[str, object]]:
    walker = folder.rglob("*") if recursive else folder.glob("*")
    items: list[dict[str, object]] = []
    for path in walker:
        if not path.is_file():
            continue
        if path.suffix.lower() not in SUPPORTED_SUFFIXES:
            continue
        stat = path.stat()
        items.append(
            {
                "name": path.name,
                "path": str(path.resolve()),
                "extension": path.suffix.lower(),
                "bytes": stat.st_size,
                "modified_at": isoformat(stat.st_mtime),
            }
        )
    items.sort(key=lambda item: (str(item["extension"]), str(item["name"]).lower()))
    return items


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder", help="Folder containing candidate image assets")
    parser.add_argument(
        "--non-recursive",
        action="store_true",
        help="Do not descend into subdirectories",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit JSON instead of a human-readable table",
    )
    args = parser.parse_args()

    folder = Path(args.folder).expanduser().resolve()
    if not folder.exists():
        raise SystemExit(f"Folder not found: {folder}")
    if not folder.is_dir():
        raise SystemExit(f"Not a directory: {folder}")

    items = iter_images(folder, recursive=not args.non_recursive)

    if args.json:
        print(json.dumps({"folder": str(folder), "count": len(items), "items": items}, indent=2))
        return 0

    print(f"Folder: {folder}")
    print(f"Images: {len(items)}")
    for index, item in enumerate(items, start=1):
        print(
            f"{index}. {item['name']} | {item['extension']} | {item['bytes']} bytes | "
            f"{item['modified_at']} | {item['path']}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
