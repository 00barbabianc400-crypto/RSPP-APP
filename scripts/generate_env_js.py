from pathlib import Path


def parse_env(path: Path) -> dict:
    values = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    env_path = root / ".env"
    out_path = root / "env.js"

    if not env_path.exists():
        raise SystemExit("Missing .env file in project root")

    env = parse_env(env_path)
    supabase_url = env.get("SUPABASE_URL", "")
    supabase_anon_key = env.get("SUPABASE_ANON_KEY", "")

    content = (
        "window.__ENV = {\n"
        f'  SUPABASE_URL: "{supabase_url}",\n'
        f'  SUPABASE_ANON_KEY: "{supabase_anon_key}"\n'
        "};\n"
    )
    out_path.write_text(content, encoding="utf-8")
    print(f"Generated {out_path}")


if __name__ == "__main__":
    main()
