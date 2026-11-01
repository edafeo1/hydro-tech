"""Check recognisable credential formats without printing their values.

This complements account-level secret protection; it cannot identify every secret.
Use --history only in the real repository checkout (CI), not a copied worktree.
"""
import argparse
from pathlib import Path
import re
import subprocess
import sys

PATTERNS = {
    "private key": rb"-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----",
    "AWS access key ID": rb"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b",
    "GitHub access token": rb"\bgh[pousr]_[A-Za-z0-9]{36,255}\b|\bgithub_pat_[A-Za-z0-9_]{60,255}\b",
    "Slack token": rb"\bxox[baprs]-[A-Za-z0-9-]{20,255}\b",
    "configured AWS secret": rb"(?i)aws_secret_access_key\s*[:=]\s*[\"']?[A-Za-z0-9/+=]{40}\b",
}
RULES = {name: re.compile(pattern) for name, pattern in PATTERNS.items()}
ROOT = Path(__file__).resolve().parents[1]


def findings(data):
    if b"\0" in data[:8192]:
        return []
    return [name for name, rule in RULES.items() if rule.search(data)]


def current_files():
    files = [ROOT / ".env.example", ROOT / "README.md"]
    for folder in ("src", "scripts", "backend", "tests", "infrastructure", "tools", "docs", ".github"):
        files.extend(p for p in (ROOT / folder).rglob("*") if p.is_file() and "__pycache__" not in p.parts)
    for file in files:
        if file.is_file() and file.stat().st_size <= 4 * 1024 * 1024:
            yield file.relative_to(ROOT).as_posix(), file.read_bytes()


def history_files():
    objects = subprocess.run(["git", "rev-list", "--objects", "--all"], cwd=ROOT, check=True, capture_output=True).stdout.splitlines()
    with subprocess.Popen(["git", "cat-file", "--batch"], cwd=ROOT, stdin=subprocess.PIPE, stdout=subprocess.PIPE) as process:
        try:
            for item in objects:
                sha, _, name = item.partition(b" ")
                process.stdin.write(sha + b"\n")
                process.stdin.flush()
                header = process.stdout.readline().split()
                if len(header) != 3:
                    raise RuntimeError("Could not inspect a Git object")
                size = int(header[2])
                data = process.stdout.read(size)
                process.stdout.read(1)
                if header[1] == b"blob" and size <= 4 * 1024 * 1024:
                    path = name.decode("utf-8", "replace") or "unnamed blob"
                    yield f"{path} (history {sha[:12].decode()})", data
        finally:
            process.stdin.close()
            process.wait()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--history", action="store_true")
    args = parser.parse_args()
    failures = []
    checked = 0
    for name, data in history_files() if args.history else current_files():
        checked += 1
        failures.extend((name, kind) for kind in findings(data))
    if failures:
        for name, kind in failures:
            print(f"Potential {kind} in {name}; value withheld.", file=sys.stderr)
        return 1
    print(f"Credential pattern check passed: {checked} {'history blobs' if args.history else 'current files'}. Values are never printed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
