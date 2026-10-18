"""Package only extension runtime files; public ZIPs never read credentials."""
import argparse
import json
import os
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parent
FILES = ["manifest.json", "config.js", "background.js", "llm-helper.js", "llm-client.js",
         "autopilot.js", "highlight.js", "index.html", "logo.png", "favicon.ico",
         "settings.html", "settings.js", "settings.css"]


def build(local=False):
    key = ""
    if local:
        key = os.environ.get("OPENAI_API_KEY", "").strip()
        if not key and (ROOT / ".env").exists():
            for line in (ROOT / ".env").read_text(encoding="utf-8-sig").splitlines():
                name, sep, value = line.strip().partition("=")
                if sep and name.strip() == "OPENAI_API_KEY":
                    key = value.strip().strip("\"'")
        if not key:
            raise SystemExit("Set OPENAI_API_KEY in your environment or .env first.")
    files = {name: (ROOT / name).read_bytes() for name in FILES}
    for path in (ROOT / "static").rglob("*"):
        if path.is_file() and path.suffix != ".map":
            files[path.relative_to(ROOT).as_posix()] = path.read_bytes()
    files["config.js"] = ("const LOCAL_CONFIG = " + json.dumps({"OPENAI_API_KEY": key}) + ";\n").encode()
    dest = ROOT / "dist"
    dest.mkdir(exist_ok=True)
    if local:
        dest = dest / "BetterBook-local"
        for name, content in files.items():
            path = dest / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
        print("Local extension ready in dist/BetterBook-local. Keep this folder private.")
    else:
        version = json.loads(files["manifest.json"])["version"]
        dest = dest / ("BetterBook-" + version + ".zip")
        with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED) as archive:
            for name, content in files.items():
                archive.writestr(name, content)
        print("Key-free installation ZIP: " + str(dest))
    return dest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--local", action="store_true", help="Make a private local build using OPENAI_API_KEY")
    build(parser.parse_args().local)
