#!/usr/bin/env python3
"""
Notion to Obsidian sync module.

Fetches pages from Notion API and saves them as Markdown files.
"""
import os
import re
from datetime import datetime
from pathlib import Path

try:
    import requests
except ImportError:
    requests = None

# Notion configuration
NOTION_PAGE_ID = "2e60a5be7bbe80e68b23f1f5f158aaee"  # Sharity Dalat Build Week
NOTION_API_VERSION = "2022-06-28"
NOTION_API_BASE = "https://api.notion.com/v1"


def get_notion_token() -> str | None:
    """Get Notion API token from environment."""
    return os.environ.get("NOTION_TOKEN")


def notion_request(endpoint: str, method: str = "GET", data: dict = None) -> dict | None:
    """Make a request to Notion API."""
    if requests is None:
        print("   ❌ requests library not installed. Run: pip install requests")
        return None

    token = get_notion_token()
    if not token:
        print("   ❌ NOTION_TOKEN not set in environment")
        print("   Create .env file with NOTION_TOKEN=secret_xxx...")
        return None

    headers = {
        "Authorization": f"Bearer {token}",
        "Notion-Version": NOTION_API_VERSION,
        "Content-Type": "application/json",
    }

    url = f"{NOTION_API_BASE}/{endpoint}"

    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=30)
        else:
            response = requests.post(url, headers=headers, json=data, timeout=30)

        if response.status_code == 200:
            return response.json()
        else:
            print(f"   ❌ Notion API error: {response.status_code}")
            print(f"      {response.text[:200]}")
            return None
    except requests.RequestException as e:
        print(f"   ❌ Request error: {e}")
        return None


def get_page(page_id: str) -> dict | None:
    """Fetch a page from Notion."""
    return notion_request(f"pages/{page_id}")


def get_page_blocks(page_id: str) -> list:
    """Fetch all blocks from a page."""
    blocks = []
    cursor = None

    while True:
        endpoint = f"blocks/{page_id}/children"
        if cursor:
            endpoint += f"?start_cursor={cursor}"

        result = notion_request(endpoint)
        if not result:
            break

        blocks.extend(result.get("results", []))

        if result.get("has_more"):
            cursor = result.get("next_cursor")
        else:
            break

    return blocks


def get_child_pages(page_id: str) -> list:
    """Get child pages of a page."""
    blocks = get_page_blocks(page_id)
    child_pages = []

    for block in blocks:
        if block.get("type") == "child_page":
            child_pages.append({
                "id": block["id"],
                "title": block["child_page"].get("title", "Untitled"),
            })

    return child_pages


def blocks_to_markdown(blocks: list) -> str:
    """Convert Notion blocks to Markdown."""
    md_lines = []

    for block in blocks:
        block_type = block.get("type", "")
        content = block.get(block_type, {})

        if block_type == "paragraph":
            text = rich_text_to_md(content.get("rich_text", []))
            md_lines.append(text)
            md_lines.append("")

        elif block_type.startswith("heading_"):
            level = int(block_type[-1])
            text = rich_text_to_md(content.get("rich_text", []))
            md_lines.append(f"{'#' * level} {text}")
            md_lines.append("")

        elif block_type == "bulleted_list_item":
            text = rich_text_to_md(content.get("rich_text", []))
            md_lines.append(f"- {text}")

        elif block_type == "numbered_list_item":
            text = rich_text_to_md(content.get("rich_text", []))
            md_lines.append(f"1. {text}")

        elif block_type == "to_do":
            text = rich_text_to_md(content.get("rich_text", []))
            checked = "x" if content.get("checked") else " "
            md_lines.append(f"- [{checked}] {text}")

        elif block_type == "toggle":
            text = rich_text_to_md(content.get("rich_text", []))
            md_lines.append(f"<details><summary>{text}</summary>")
            md_lines.append("")
            # Recursively get children if has_children
            if block.get("has_children"):
                child_blocks = get_page_blocks(block["id"])
                md_lines.append(blocks_to_markdown(child_blocks))
            md_lines.append("</details>")
            md_lines.append("")

        elif block_type == "code":
            language = content.get("language", "")
            code = rich_text_to_md(content.get("rich_text", []))
            md_lines.append(f"```{language}")
            md_lines.append(code)
            md_lines.append("```")
            md_lines.append("")

        elif block_type == "quote":
            text = rich_text_to_md(content.get("rich_text", []))
            md_lines.append(f"> {text}")
            md_lines.append("")

        elif block_type == "divider":
            md_lines.append("---")
            md_lines.append("")

        elif block_type == "callout":
            text = rich_text_to_md(content.get("rich_text", []))
            icon = content.get("icon", {})
            emoji = icon.get("emoji", "")
            md_lines.append(f"> {emoji} {text}")
            md_lines.append("")

        elif block_type == "image":
            image = content.get("file", {}) or content.get("external", {})
            url = image.get("url", "")
            caption = rich_text_to_md(content.get("caption", []))
            md_lines.append(f"![{caption}]({url})")
            md_lines.append("")

        elif block_type == "bookmark":
            url = content.get("url", "")
            caption = rich_text_to_md(content.get("caption", []))
            md_lines.append(f"[{caption or url}]({url})")
            md_lines.append("")

        elif block_type == "child_page":
            title = content.get("title", "Untitled")
            md_lines.append(f"- [[{sanitize_filename(title)}|{title}]]")

        elif block_type == "child_database":
            title = content.get("title", "Database")
            md_lines.append(f"📊 **Database:** {title}")
            md_lines.append("")

        elif block_type == "table":
            # Tables are complex, just note them
            md_lines.append("_[Table content - see Notion]_")
            md_lines.append("")

    return "\n".join(md_lines)


def rich_text_to_md(rich_text: list) -> str:
    """Convert Notion rich text array to Markdown string."""
    parts = []
    for item in rich_text:
        text = item.get("plain_text", "")
        annotations = item.get("annotations", {})

        if annotations.get("bold"):
            text = f"**{text}**"
        if annotations.get("italic"):
            text = f"*{text}*"
        if annotations.get("strikethrough"):
            text = f"~~{text}~~"
        if annotations.get("code"):
            text = f"`{text}`"

        href = item.get("href")
        if href:
            text = f"[{text}]({href})"

        parts.append(text)

    return "".join(parts)


def sanitize_filename(name: str) -> str:
    """Sanitize a string for use as filename."""
    # Remove or replace invalid characters
    name = re.sub(r'[<>:"/\\|?*]', "", name)
    name = name.strip()
    return name[:100]  # Limit length


def save_page_to_obsidian(
    page_id: str,
    title: str,
    content: str,
    output_folder: Path,
    source_url: str,
) -> Path:
    """Save a page to Obsidian vault."""
    output_folder.mkdir(parents=True, exist_ok=True)

    now = datetime.now().isoformat(timespec="seconds")
    filename = sanitize_filename(title) + ".md"
    file_path = output_folder / filename

    md_content = f"""---
source: notion
source_url: {source_url}
source_id: "{page_id}"
title: "{title}"
synced_at: {now}
tags:
  - sharity
  - notion
---

# {title}

{content}

---
_Synced: {now}_
_Source: [Notion]({source_url})_
"""

    file_path.write_text(md_content, encoding="utf-8")
    return file_path


def create_notion_placeholder(output_folder: Path):
    """Create a placeholder file when API is not available."""
    now = datetime.now().isoformat(timespec="seconds")
    source_url = f"https://www.notion.so/{NOTION_PAGE_ID.replace('-', '')}"

    md_content = f"""---
source: notion
source_url: {source_url}
source_id: "{NOTION_PAGE_ID}"
title: "Sharity Documentation"
synced_at: {now}
tags:
  - sharity
  - notion
---

# Sharity Documentation

## Quick Links

- **[Open in Notion]({source_url})** - View the documentation

## About

This Notion workspace contains:
- Project documentation
- Requirements and specs
- Meeting notes
- Task tracking

## API Setup (Required for full sync)

To enable full sync with page content:

1. Create integration at https://www.notion.so/my-integrations
2. Copy the Internal Integration Token
3. In Notion, open the page → Share → Invite the integration
4. Add to `.env` file:
   ```
   NOTION_TOKEN=secret_your_token_here
   ```
5. Run sync again: `python scripts/sync_docs.py --notion --force`

---
_Synced: {now}_
_Source: [Notion]({source_url})_
"""

    file_path = output_folder / "index.md"
    file_path.write_text(md_content, encoding="utf-8")
    print(f"   ✅ Created placeholder: {file_path.name}")


def sync_notion(output_folder: Path, force: bool = False) -> bool:
    """
    Sync Notion pages to Obsidian.

    Args:
        output_folder: Path to output folder in Obsidian
        force: Force update even if cache is fresh

    Returns:
        True if successful, False otherwise
    """
    token = get_notion_token()
    if not token:
        print("   ⚠️  NOTION_TOKEN not set")
        print("   To set up Notion sync:")
        print("   1. Create integration at https://www.notion.so/my-integrations")
        print("   2. Add NOTION_TOKEN=secret_xxx to .env file")
        print("   3. Share the page with the integration in Notion")

        # Create placeholder file
        output_folder.mkdir(parents=True, exist_ok=True)
        create_notion_placeholder(output_folder)
        return True

    if requests is None:
        print("   ❌ requests library not installed")
        print("   Run: pip install requests")
        return False

    print(f"   Fetching main page...")

    # Fetch main page
    page = get_page(NOTION_PAGE_ID)
    if not page:
        return False

    # Get page title
    title_prop = page.get("properties", {}).get("title", {})
    title_array = title_prop.get("title", [])
    main_title = "".join([t.get("plain_text", "") for t in title_array]) or "Sharity Documentation"

    # Fetch blocks
    blocks = get_page_blocks(NOTION_PAGE_ID)
    content = blocks_to_markdown(blocks)

    # Save main page as index
    source_url = f"https://www.notion.so/{NOTION_PAGE_ID.replace('-', '')}"
    index_path = save_page_to_obsidian(
        NOTION_PAGE_ID,
        "index",
        f"**{main_title}**\n\n{content}",
        output_folder,
        source_url,
    )
    print(f"   ✅ Saved: {index_path.name}")

    # Get and sync child pages
    child_pages = get_child_pages(NOTION_PAGE_ID)
    for child in child_pages:
        print(f"   Fetching: {child['title']}...")

        child_blocks = get_page_blocks(child["id"])
        child_content = blocks_to_markdown(child_blocks)

        child_url = f"https://www.notion.so/{child['id'].replace('-', '')}"
        child_path = save_page_to_obsidian(
            child["id"],
            child["title"],
            child_content,
            output_folder,
            child_url,
        )
        print(f"   ✅ Saved: {child_path.name}")

    print(f"   📁 Synced to: {output_folder}")
    return True


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

    output = Path.home() / "Library/Mobile Documents/iCloud~md~obsidian/Documents/Main/02-Projects/Sharity/Notion"
    success = sync_notion(output, force=True)
    sys.exit(0 if success else 1)
