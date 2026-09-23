import os
import subprocess
import sys
from pathlib import Path

data_dir = Path(os.environ.get("DATA_DIR", "/data")) 
media_dir = data_dir / "media"
media_dir.mkdir(parents=True, exist_ok=True)

subprocess.check_call([sys.executable, "manage.py", "migrate", "--noinput"])
subprocess.check_call([
    sys.executable,
    "manage.py",
    "shell",
    "-c",
    "from blog.api.helpers import coalesce_all_game_media; coalesce_all_game_media()",
])
os.execvp(sys.argv[1], sys.argv[1:])
