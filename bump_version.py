#!/usr/bin/env python3
"""
bump_version.py — BrainStuffer version bumper

Updates cache-busting query strings (?v=X.Y.Z) and the footer
display label (vX.Y.Z) across all HTML files in docs/.

Usage:
    python bump_version.py 2.1.0        # set explicit version
    python bump_version.py --patch      # 2.0.1 -> 2.0.2
    python bump_version.py --minor      # 2.0.1 -> 2.1.0
    python bump_version.py --major      # 2.0.1 -> 3.0.0
    python bump_version.py --dry-run 2.1.0   # preview without writing
"""

import re
import sys
import pathlib

DOCS = pathlib.Path(__file__).parent / 'docs'
INDEX = DOCS / 'index.html'

# Authoritative display version pattern (footer label in index.html)
DISPLAY_RE = re.compile(r'>v(\d+\.\d+\.\d+)<')
# Cache-busting query string — catches any version, including stale ones
CACHE_RE = re.compile(r'\?v=[\d.]+')


def detect_current_version():
    text = INDEX.read_text(encoding='utf-8')
    m = DISPLAY_RE.search(text)
    if m:
        return m.group(1)
    # Fallback: grab version from ?v= tags
    m = re.search(r'\?v=(\d+\.\d+\.\d+)', text)
    if m:
        return m.group(1)
    return None


def parse_version(v):
    return list(map(int, v.split('.')))


def format_version(parts):
    return '.'.join(map(str, parts))


def bump(current, kind):
    parts = parse_version(current)
    if kind == 'patch':
        parts[2] += 1
    elif kind == 'minor':
        parts[1] += 1
        parts[2] = 0
    elif kind == 'major':
        parts[0] += 1
        parts[1] = 0
        parts[2] = 0
    return format_version(parts)


def process_file(path, current_ver, new_ver, dry_run):
    text = path.read_text(encoding='utf-8')
    new_text = text

    # Replace all cache-busting strings (any version, including stale)
    cache_count = len(CACHE_RE.findall(new_text))
    new_text = CACHE_RE.sub(f'?v={new_ver}', new_text)

    # Replace display version label only (authoritative current version)
    display_old = f'>v{current_ver}<'
    display_new = f'>v{new_ver}<'
    display_count = new_text.count(display_old)
    new_text = new_text.replace(display_old, display_new)

    total = cache_count + display_count

    if new_text == text:
        return 0  # nothing changed

    if not dry_run:
        path.write_text(new_text, encoding='utf-8')

    return total


def main():
    args = sys.argv[1:]
    dry_run = '--dry-run' in args
    args = [a for a in args if a != '--dry-run']

    if not args:
        print(__doc__.strip())
        sys.exit(1)

    current = detect_current_version()
    if not current:
        print('ERROR: Could not detect current version from docs/index.html')
        sys.exit(1)

    arg = args[0]
    if arg in ('--patch', '--minor', '--major'):
        new_ver = bump(current, arg.lstrip('-'))
    elif re.match(r'^\d+\.\d+\.\d+$', arg):
        new_ver = arg
    else:
        print(f'ERROR: Unrecognised argument "{arg}"')
        print('       Use X.Y.Z, --patch, --minor, or --major')
        sys.exit(1)

    if new_ver == current:
        print(f'Version is already {current} — nothing to do.')
        sys.exit(0)

    label = ' [DRY RUN]' if dry_run else ''
    print(f'BrainStuffer version bump{label}: {current} -> {new_ver}')
    print()

    html_files = sorted(DOCS.glob('*.html'))
    total_replacements = 0

    for path in html_files:
        n = process_file(path, current, new_ver, dry_run)
        if n:
            status = 'would update' if dry_run else 'updated'
            print(f'  {status}  {path.name:<32} ({n} replacement{"s" if n != 1 else ""})')
            total_replacements += n
        else:
            print(f'  skipped   {path.name:<32} (no version strings)')

    print()
    action = 'Would make' if dry_run else 'Made'
    print(f'{action} {total_replacements} replacement{"s" if total_replacements != 1 else ""} across {len(html_files)} files.')
    if dry_run:
        print('Run without --dry-run to apply.')


if __name__ == '__main__':
    main()
