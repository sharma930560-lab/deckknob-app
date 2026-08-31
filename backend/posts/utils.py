import re


def parse_hashtags(caption: str) -> set:
    """Extract hashtags from caption, return normalised lowercase set (no '#')."""
    if not caption:
        return set()
    tokens = re.findall(r'#([a-zA-Z0-9_]+)', caption)
    return {t.lower() for t in tokens}
