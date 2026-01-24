#!/usr/bin/env python3
"""
Miro to Obsidian sync module.

Fetches board information from Miro API and saves as Markdown.
Since Miro content is visual, we save metadata and links.
"""
import os
from datetime import datetime
from pathlib import Path

try:
    import requests
except ImportError:
    requests = None

# Miro configuration
MIRO_BOARD_ID = "uXjVGPKWI70="  # Sharity board
MIRO_API_BASE = "https://api.miro.com/v2"
MIRO_BOARD_URL = f"https://miro.com/app/board/{MIRO_BOARD_ID}/"


def get_miro_token() -> str | None:
    """Get Miro API token from environment."""
    return os.environ.get("MIRO_ACCESS_TOKEN")


def miro_request(endpoint: str) -> dict | None:
    """Make a request to Miro API."""
    if requests is None:
        print("   ❌ requests library not installed. Run: pip install requests")
        return None

    token = get_miro_token()
    if not token:
        print("   ❌ MIRO_ACCESS_TOKEN not set in environment")
        print("   Create .env file with MIRO_ACCESS_TOKEN=xxx...")
        return None

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }

    url = f"{MIRO_API_BASE}/{endpoint}"

    try:
        response = requests.get(url, headers=headers, timeout=30)

        if response.status_code == 200:
            return response.json()
        else:
            print(f"   ❌ Miro API error: {response.status_code}")
            print(f"      {response.text[:200]}")
            return None
    except requests.RequestException as e:
        print(f"   ❌ Request error: {e}")
        return None


def get_board() -> dict | None:
    """Fetch board information."""
    return miro_request(f"boards/{MIRO_BOARD_ID}")


def get_board_items() -> list:
    """Fetch items from the board."""
    result = miro_request(f"boards/{MIRO_BOARD_ID}/items?limit=50")
    if result:
        return result.get("data", [])
    return []


def get_board_frames() -> list:
    """Fetch frames from the board."""
    result = miro_request(f"boards/{MIRO_BOARD_ID}/frames?limit=50")
    if result:
        return result.get("data", [])
    return []


def sync_miro(output_folder: Path, force: bool = False) -> bool:
    """
    Sync Miro board to Obsidian.

    Args:
        output_folder: Path to output folder in Obsidian
        force: Force update even if cache is fresh

    Returns:
        True if successful, False otherwise
    """
    token = get_miro_token()
    if not token:
        print("   ⚠️  MIRO_ACCESS_TOKEN not set")
        print("   To set up Miro sync:")
        print("   1. Go to https://miro.com/app/settings/user-profile/apps")
        print("   2. Create an app or use existing one")
        print("   3. Add MIRO_ACCESS_TOKEN=xxx to .env file")

        # Create placeholder file
        output_folder.mkdir(parents=True, exist_ok=True)
        create_miro_placeholder(output_folder)
        return True

    if requests is None:
        print("   ❌ requests library not installed")
        print("   Run: pip install requests")
        create_miro_placeholder(output_folder)
        return True

    print("   Fetching board info...")

    board = get_board()
    if not board:
        print("   ⚠️  Could not fetch board, creating placeholder")
        output_folder.mkdir(parents=True, exist_ok=True)
        create_miro_placeholder(output_folder)
        return True

    # Get board details
    board_name = board.get("name", "Sharity Board")
    board_description = board.get("description", "")
    created_at = board.get("createdAt", "")
    modified_at = board.get("modifiedAt", "")

    # Get frames (sections of the board)
    frames = get_board_frames()
    frames_md = ""
    if frames:
        frames_md = "\n## Frames\n\n"
        for frame in frames:
            frame_title = frame.get("data", {}).get("title", "Untitled Frame")
            frames_md += f"- **{frame_title}**\n"

    # Get items summary
    items = get_board_items()
    items_summary = ""
    if items:
        item_types = {}
        for item in items:
            item_type = item.get("type", "unknown")
            item_types[item_type] = item_types.get(item_type, 0) + 1

        items_summary = "\n## Content Summary\n\n"
        for item_type, count in sorted(item_types.items()):
            items_summary += f"- {item_type}: {count}\n"

    # Create markdown content
    now = datetime.now().isoformat(timespec="seconds")
    output_folder.mkdir(parents=True, exist_ok=True)

    md_content = f"""---
source: miro
source_url: {MIRO_BOARD_URL}
source_id: "{MIRO_BOARD_ID}"
title: "{board_name}"
synced_at: {now}
tags:
  - sharity
  - miro
  - architecture
---

# {board_name}

{board_description or "_No description_"}

## Quick Links

- **[Open in Miro]({MIRO_BOARD_URL})** - View and edit the board
- Created: {created_at[:10] if created_at else "Unknown"}
- Last modified: {modified_at[:10] if modified_at else "Unknown"}

{frames_md}
{items_summary}

## Usage

This board contains architecture diagrams and visual documentation for the Sharity project.

To view or edit:
1. Click the link above to open in Miro
2. Or use the Miro app on your device

---
_Synced: {now}_
_Source: [Miro Board]({MIRO_BOARD_URL})_
"""

    file_path = output_folder / "index.md"
    file_path.write_text(md_content, encoding="utf-8")
    print(f"   ✅ Saved: {file_path.name}")
    print(f"   📁 Synced to: {output_folder}")

    return True


def create_miro_placeholder(output_folder: Path):
    """Create a placeholder file when API is not available."""
    now = datetime.now().isoformat(timespec="seconds")

    md_content = f"""---
source: miro
source_url: {MIRO_BOARD_URL}
source_id: "{MIRO_BOARD_ID}"
title: "Sharity Architecture"
synced_at: {now}
tags:
  - sharity
  - miro
  - architecture
---

# Sharity Architecture

## Quick Links

- **[Open in Miro]({MIRO_BOARD_URL})** - View the architecture diagrams

## About

This Miro board contains:
- System architecture diagrams
- User flow diagrams
- Database schema visualizations
- Component relationships

## API Setup (Optional)

To enable full sync with board metadata:

1. Go to https://miro.com/app/settings/user-profile/apps
2. Create a new app or use an existing one
3. Generate an access token
4. Add to `.env` file:
   ```
   MIRO_ACCESS_TOKEN=your_token_here
   ```
5. Run sync again: `python scripts/sync_docs.py --miro --force`

---
_Synced: {now}_
_Source: [Miro Board]({MIRO_BOARD_URL})_
"""

    file_path = output_folder / "index.md"
    file_path.write_text(md_content, encoding="utf-8")
    print(f"   ✅ Created placeholder: {file_path.name}")


if __name__ == "__main__":
    # For testing
    import sys

    # Load env
    env_file = Path(__file__).parent.parent / ".env"
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ.setdefault(key.strip(), value.strip())

    output = Path.home() / "Library/Mobile Documents/iCloud~md~obsidian/Documents/Main/02-Projects/Sharity/Architecture"
    success = sync_miro(output, force=True)
    sys.exit(0 if success else 1)
