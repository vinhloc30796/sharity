#!/usr/bin/env python3
"""
Sharity Documentation Sync Tool.

Syncs documentation from Notion, Miro, and Figma to Obsidian vault
for offline access.

Usage:
    python scripts/sync_docs.py --all           # Sync everything
    python scripts/sync_docs.py --notion        # Sync Notion only
    python scripts/sync_docs.py --miro          # Sync Miro only
    python scripts/sync_docs.py --figma         # Sync Figma only
    python scripts/sync_docs.py --status        # Show cache status
    python scripts/sync_docs.py --all --force   # Force update all
"""
import argparse
import os
import sys
from datetime import datetime
from pathlib import Path

# Add scripts directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from sync_notion import sync_notion
from sync_miro import sync_miro
from sync_figma import sync_figma

# Configuration
OBSIDIAN_VAULT = Path.home() / "Library/Mobile Documents/iCloud~md~obsidian/Documents/Main"
SHARITY_FOLDER = OBSIDIAN_VAULT / "02-Projects/Sharity"

# Cache freshness (days)
CACHE_DAYS = 7


def load_env():
    """Load environment variables from .env file."""
    env_file = Path(__file__).parent.parent / ".env"
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ.setdefault(key.strip(), value.strip())


def get_cache_info(folder: Path) -> dict:
    """Get cache information for a folder."""
    if not folder.exists():
        return {"exists": False, "files": 0, "synced_at": None}

    files = list(folder.glob("*.md"))
    if not files:
        return {"exists": True, "files": 0, "synced_at": None}

    # Find most recent sync time from frontmatter
    latest_sync = None
    for f in files:
        try:
            content = f.read_text(encoding="utf-8")
            if content.startswith("---"):
                parts = content.split("---", 2)
                if len(parts) >= 3:
                    for line in parts[1].strip().split("\n"):
                        if line.startswith("synced_at:"):
                            sync_str = line.split(":", 1)[1].strip()
                            try:
                                sync_date = datetime.fromisoformat(sync_str.replace("Z", "+00:00"))
                                if latest_sync is None or sync_date > latest_sync:
                                    latest_sync = sync_date
                            except ValueError:
                                pass
        except Exception:
            pass

    return {
        "exists": True,
        "files": len(files),
        "synced_at": latest_sync,
    }


def is_cache_fresh(synced_at: datetime | None) -> bool:
    """Check if cache is fresh (less than CACHE_DAYS old)."""
    if synced_at is None:
        return False
    age = datetime.now() - synced_at.replace(tzinfo=None)
    return age.days < CACHE_DAYS


def show_status():
    """Show cache status for all sources."""
    print("\n📚 Sharity Documentation Cache Status\n")
    print(f"Obsidian folder: {SHARITY_FOLDER}\n")
    print("-" * 60)

    sources = [
        ("Notion", SHARITY_FOLDER / "Notion"),
        ("Miro", SHARITY_FOLDER / "Architecture"),
        ("Figma", SHARITY_FOLDER / "Design"),
    ]

    for name, folder in sources:
        info = get_cache_info(folder)
        status = "❌ Not synced"

        if info["exists"] and info["files"] > 0:
            if info["synced_at"]:
                age = (datetime.now() - info["synced_at"].replace(tzinfo=None)).days
                if age < CACHE_DAYS:
                    status = f"✅ Fresh ({age} days ago)"
                else:
                    status = f"⚠️  Stale ({age} days ago)"
            else:
                status = "⚠️  Unknown age"

        print(f"{name:<10} {info['files']:>3} files   {status}")

    print("-" * 60)
    print(f"\nCache freshness: {CACHE_DAYS} days")
    print("Use --force to update regardless of cache age")


def main():
    parser = argparse.ArgumentParser(description="Sync Sharity documentation to Obsidian")
    parser.add_argument("--all", "-a", action="store_true", help="Sync all sources")
    parser.add_argument("--notion", "-n", action="store_true", help="Sync Notion")
    parser.add_argument("--miro", "-m", action="store_true", help="Sync Miro")
    parser.add_argument("--figma", "-f", action="store_true", help="Sync Figma")
    parser.add_argument("--force", action="store_true", help="Force update (ignore cache)")
    parser.add_argument("--status", "-s", action="store_true", help="Show cache status")
    args = parser.parse_args()

    if args.status:
        show_status()
        return 0

    if not any([args.all, args.notion, args.miro, args.figma]):
        parser.print_help()
        return 1

    # Load environment variables
    load_env()

    # Ensure base folder exists
    SHARITY_FOLDER.mkdir(parents=True, exist_ok=True)

    success = True

    if args.all or args.notion:
        print("\n📝 Syncing Notion...")
        notion_folder = SHARITY_FOLDER / "Notion"
        cache = get_cache_info(notion_folder)

        if args.force or not is_cache_fresh(cache.get("synced_at")):
            if not sync_notion(notion_folder, force=args.force):
                success = False
        else:
            print(f"   Using cached version (synced {(datetime.now() - cache['synced_at'].replace(tzinfo=None)).days} days ago)")
            print("   Use --force to update")

    if args.all or args.miro:
        print("\n🎨 Syncing Miro...")
        miro_folder = SHARITY_FOLDER / "Architecture"
        cache = get_cache_info(miro_folder)

        if args.force or not is_cache_fresh(cache.get("synced_at")):
            if not sync_miro(miro_folder, force=args.force):
                success = False
        else:
            print(f"   Using cached version (synced {(datetime.now() - cache['synced_at'].replace(tzinfo=None)).days} days ago)")
            print("   Use --force to update")

    if args.all or args.figma:
        print("\n🎨 Syncing Figma...")
        figma_folder = SHARITY_FOLDER / "Design"
        cache = get_cache_info(figma_folder)

        if args.force or not is_cache_fresh(cache.get("synced_at")):
            if not sync_figma(figma_folder, force=args.force):
                success = False
        else:
            print(f"   Using cached version (synced {(datetime.now() - cache['synced_at'].replace(tzinfo=None)).days} days ago)")
            print("   Use --force to update")

    print("\n" + "=" * 60)
    if success:
        print("✅ Sync completed successfully!")
    else:
        print("⚠️  Sync completed with some errors")

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
