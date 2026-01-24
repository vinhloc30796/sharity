#!/usr/bin/env python3
"""
Figma to Obsidian sync module.

Fetches file information from Figma API and saves as Markdown.
Since Figma content is visual, we save metadata, frames, and links.
"""
import os
from datetime import datetime
from pathlib import Path

try:
    import requests
except ImportError:
    requests = None

# Figma configuration
FIGMA_FILE_KEY = "S74LV4AyyLLK7L2G5Y211m"  # Sharity design file
FIGMA_NODE_ID = "2004-4099"  # Specific frame
FIGMA_API_BASE = "https://api.figma.com/v1"
FIGMA_FILE_URL = f"https://figma.com/design/{FIGMA_FILE_KEY}/Sharity"


def get_figma_token() -> str | None:
    """Get Figma API token from environment."""
    return os.environ.get("FIGMA_ACCESS_TOKEN")


def figma_request(endpoint: str) -> dict | None:
    """Make a request to Figma API."""
    if requests is None:
        print("   ❌ requests library not installed. Run: pip install requests")
        return None

    token = get_figma_token()
    if not token:
        print("   ❌ FIGMA_ACCESS_TOKEN not set in environment")
        print("   Create .env file with FIGMA_ACCESS_TOKEN=figd_xxx...")
        return None

    headers = {
        "X-Figma-Token": token,
    }

    url = f"{FIGMA_API_BASE}/{endpoint}"

    try:
        response = requests.get(url, headers=headers, timeout=30)

        if response.status_code == 200:
            return response.json()
        else:
            print(f"   ❌ Figma API error: {response.status_code}")
            print(f"      {response.text[:200]}")
            return None
    except requests.RequestException as e:
        print(f"   ❌ Request error: {e}")
        return None


def get_file() -> dict | None:
    """Fetch file information."""
    return figma_request(f"files/{FIGMA_FILE_KEY}")


def get_file_components() -> dict | None:
    """Fetch components from the file."""
    return figma_request(f"files/{FIGMA_FILE_KEY}/components")


def extract_pages_and_frames(document: dict) -> list:
    """Extract pages and their top-level frames from document tree."""
    pages = []

    def traverse(node, path=""):
        node_type = node.get("type", "")
        name = node.get("name", "")

        if node_type == "CANVAS":
            # This is a page
            frames = []
            for child in node.get("children", []):
                if child.get("type") == "FRAME":
                    frames.append({
                        "id": child.get("id", ""),
                        "name": child.get("name", ""),
                    })
            pages.append({
                "name": name,
                "frames": frames,
            })
        else:
            for child in node.get("children", []):
                traverse(child, f"{path}/{name}")

    # Document has pages as children
    for child in document.get("children", []):
        traverse(child)

    return pages


def sync_figma(output_folder: Path, force: bool = False) -> bool:
    """
    Sync Figma file to Obsidian.

    Args:
        output_folder: Path to output folder in Obsidian
        force: Force update even if cache is fresh

    Returns:
        True if successful, False otherwise
    """
    token = get_figma_token()
    if not token:
        print("   ⚠️  FIGMA_ACCESS_TOKEN not set")
        print("   To set up Figma sync:")
        print("   1. Go to Figma Settings → Account → Personal access tokens")
        print("   2. Generate a new token")
        print("   3. Add FIGMA_ACCESS_TOKEN=figd_xxx to .env file")

        # Create placeholder file
        output_folder.mkdir(parents=True, exist_ok=True)
        create_figma_placeholder(output_folder)
        return True

    if requests is None:
        print("   ❌ requests library not installed")
        print("   Run: pip install requests")
        create_figma_placeholder(output_folder)
        return True

    print("   Fetching file info...")

    file_data = get_file()
    if not file_data:
        print("   ⚠️  Could not fetch file, creating placeholder")
        output_folder.mkdir(parents=True, exist_ok=True)
        create_figma_placeholder(output_folder)
        return True

    # Get file details
    file_name = file_data.get("name", "Sharity Design")
    last_modified = file_data.get("lastModified", "")
    version = file_data.get("version", "")
    document = file_data.get("document", {})

    # Extract pages and frames
    pages = extract_pages_and_frames(document)

    # Build pages content
    pages_md = ""
    if pages:
        pages_md = "\n## Pages & Frames\n\n"
        for page in pages:
            pages_md += f"### {page['name']}\n\n"
            if page['frames']:
                for frame in page['frames']:
                    # Create direct link to frame
                    frame_url = f"{FIGMA_FILE_URL}?node-id={frame['id'].replace(':', '-')}"
                    pages_md += f"- [{frame['name']}]({frame_url})\n"
            else:
                pages_md += "_No frames_\n"
            pages_md += "\n"

    # Get components info
    components_data = get_file_components()
    components_md = ""
    if components_data and components_data.get("meta", {}).get("components"):
        components = components_data["meta"]["components"]
        if components:
            components_md = "\n## Components\n\n"
            for comp_id, comp in list(components.items())[:20]:  # Limit to 20
                comp_name = comp.get("name", "Unnamed")
                components_md += f"- {comp_name}\n"
            if len(components) > 20:
                components_md += f"- _...and {len(components) - 20} more_\n"

    # Create markdown content
    now = datetime.now().isoformat(timespec="seconds")
    output_folder.mkdir(parents=True, exist_ok=True)

    md_content = f"""---
source: figma
source_url: {FIGMA_FILE_URL}
source_id: "{FIGMA_FILE_KEY}"
title: "{file_name}"
synced_at: {now}
tags:
  - sharity
  - figma
  - design
---

# {file_name}

## Quick Links

- **[Open in Figma]({FIGMA_FILE_URL})** - View and edit the design
- **[Main frame]({FIGMA_FILE_URL}?node-id={FIGMA_NODE_ID})** - Primary design frame
- Last modified: {last_modified[:10] if last_modified else "Unknown"}
- Version: {version}

{pages_md}
{components_md}

## Usage

This Figma file contains the UI/UX design for the Sharity project.

To view or edit:
1. Click the link above to open in Figma
2. Or use the Figma app on your device

### Design System

The design includes:
- Component library for consistent UI
- Color palette and typography
- Mobile and desktop layouts
- Interactive prototypes

---
_Synced: {now}_
_Source: [Figma]({FIGMA_FILE_URL})_
"""

    file_path = output_folder / "index.md"
    file_path.write_text(md_content, encoding="utf-8")
    print(f"   ✅ Saved: {file_path.name}")
    print(f"   📁 Synced to: {output_folder}")

    return True


def create_figma_placeholder(output_folder: Path):
    """Create a placeholder file when API is not available."""
    now = datetime.now().isoformat(timespec="seconds")

    md_content = f"""---
source: figma
source_url: {FIGMA_FILE_URL}
source_id: "{FIGMA_FILE_KEY}"
title: "Sharity Design"
synced_at: {now}
tags:
  - sharity
  - figma
  - design
---

# Sharity Design

## Quick Links

- **[Open in Figma]({FIGMA_FILE_URL})** - View the design
- **[Main frame]({FIGMA_FILE_URL}?node-id={FIGMA_NODE_ID})** - Primary design frame

## About

This Figma file contains:
- UI/UX design for the Sharity app
- Component library
- Mobile and desktop layouts
- Color palette and typography
- Interactive prototypes

## API Setup (Optional)

To enable full sync with file metadata:

1. Go to Figma Settings → Account → Personal access tokens
2. Generate a new token
3. Add to `.env` file:
   ```
   FIGMA_ACCESS_TOKEN=figd_your_token_here
   ```
4. Run sync again: `python scripts/sync_docs.py --figma --force`

---
_Synced: {now}_
_Source: [Figma]({FIGMA_FILE_URL})_
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

    output = Path.home() / "Library/Mobile Documents/iCloud~md~obsidian/Documents/Main/02-Projects/Sharity/Design"
    success = sync_figma(output, force=True)
    sys.exit(0 if success else 1)
