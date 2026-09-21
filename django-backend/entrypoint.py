import os
import shutil
import subprocess
import sys
from pathlib import Path

data_dir = Path(os.environ.get("DATA_DIR", "/data"))
media_dir = data_dir / "media"
media_dir.mkdir(parents=True, exist_ok=True)

seed_db = Path("/app/db.sqlite3")
dest_db = data_dir / "db.sqlite3"
if not dest_db.exists() and seed_db.exists():
    shutil.copy2(seed_db, dest_db)

seed_media = Path("/app/media")
if seed_media.is_dir() and not any(media_dir.iterdir()):
    shutil.copytree(seed_media, media_dir, dirs_exist_ok=True)

subprocess.check_call([sys.executable, "manage.py", "migrate", "--noinput"])
os.execvp(sys.argv[1], sys.argv[1:])
