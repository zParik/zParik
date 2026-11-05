#!/usr/bin/env python3
"""Scan repos for evidence of each tool and write data/repo-tools.json.

Evidence comes from three places: GitHub's language stats, the contents of
dependency manifests (package.json, requirements.txt, Cargo.toml, ...), and
file types (Dockerfile, .proto). render-plates.mjs reads the result to light
the tools matrix. Run from repo root with `gh` logged in:

    python3 scripts/scan-stack.py
"""
import json, re, subprocess
from concurrent.futures import ThreadPoolExecutor

SINCE = "2023-01-01"

def gh(*args):
    r = subprocess.run(["gh", "api", *args], capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else None

QUERY = """query($endCursor:String){viewer{repositories(first:100, after:$endCursor,
  ownerAffiliations:[OWNER,COLLABORATOR,ORGANIZATION_MEMBER], isFork:false){
  pageInfo{hasNextPage endCursor}
  nodes{nameWithOwner pushedAt languages(first:30){edges{node{name}}}}}}}"""

def repos():
    out = subprocess.run(["gh", "api", "graphql", "--paginate", "-f", f"query={QUERY}"],
                         capture_output=True, text=True, check=True).stdout
    dec, i, nodes = json.JSONDecoder(), 0, []
    while i < len(out):
        rest = out[i:].lstrip()
        if not rest:
            break
        obj, n = dec.raw_decode(rest)
        i = len(out) - len(rest) + n
        nodes += obj["data"]["viewer"]["repositories"]["nodes"]
    return [r for r in nodes if r["pushedAt"] >= SINCE]

LANG = {"C++": "C++", "C": "C", "Python": "Python", "Rust": "Rust", "TypeScript": "TypeScript",
        "Dart": "Dart", "Lua": "Lua", "Shell": "Bash", "PowerShell": "PowerShell",
        "CMake": "CMake", "Dockerfile": "Docker"}

MANIFEST = re.compile(r"(^|/)(package\.json|requirements[^/]*\.txt|pyproject\.toml|Pipfile|"
                      r"environment\.ya?ml|setup\.py|Cargo\.toml|pubspec\.yaml|CMakeLists\.txt|"
                      r"docker-compose[^/]*\.ya?ml|tauri\.conf\.json)$", re.I)

KEYS = {
    "PyTorch": r"\btorch\b|pytorch", "TensorFlow": r"tensorflow|keras", "scikit-learn": r"scikit-learn|sklearn",
    "Stable-Baselines3": r"stable[-_]baselines", "OpenCV": r"opencv|\bcv2\b", "YOLOv8": r"ultralytics|yolov8",
    "MediaPipe": r"mediapipe", "NumPy": r"\bnumpy\b",
    "Tauri": r"tauri", "Flutter": r"flutter:", "React": r"\"react\"", "Next.js": r"\"next\"",
    "Node.js": r"\"express\"|\"ws\"|\"@types/node\"", "FastAPI": r"fastapi", "Django": r"django",
    "Flask": r"\bflask\b", "Tailwind": r"tailwindcss", "Vite": r"\"vite\"",
    "gRPC": r"grpc", "Protobuf": r"protobuf|\bprost\b",
    "Blind RSA": r"blind-signatures|blind[-_ ]?rsa",
    "PostgreSQL": r"postgres|psycopg|asyncpg|\"pg\"", "InfluxDB": r"influx", "MongoDB": r"mongo",
    "Supabase": r"supabase", "SQLite": r"sqlite", "Redis": r"redis",
}

def scan(repo):
    full, found = repo["nameWithOwner"], set()
    found |= {LANG[e["node"]["name"]] for e in repo["languages"]["edges"] if e["node"]["name"] in LANG}
    tree = gh(f"repos/{full}/git/trees/HEAD?recursive=1")
    if tree:
        paths = [x["path"] for x in json.loads(tree).get("tree", []) if x["type"] == "blob"]
        paths = [p for p in paths if not re.search(r"node_modules/|/vendor/|\.venv", p)]
        if any(re.search(r"(^|/)Dockerfile", p) for p in paths):
            found.add("Docker")
        if any(p.endswith(".proto") for p in paths):
            found.add("Protobuf")
        for p in [p for p in paths if MANIFEST.search(p)][:25]:
            raw = gh("-H", "Accept: application/vnd.github.raw", f"repos/{full}/contents/{p}") or ""
            found |= {tool for tool, rx in KEYS.items() if re.search(rx, raw, re.I)}
    return full, sorted(found)

if __name__ == "__main__":
    with ThreadPoolExecutor(8) as ex:
        result = dict(sorted(ex.map(scan, repos())))
    with open("data/repo-tools.json", "w") as f:
        json.dump(result, f, indent=1)
        f.write("\n")
    print(f"wrote data/repo-tools.json ({len(result)} repos)")
