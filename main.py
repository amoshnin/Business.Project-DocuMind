from pathlib import Path
import sys


BACKEND_DIR = Path(__file__).resolve().parent / "backend"
backend_dir_str = str(BACKEND_DIR)
if backend_dir_str not in sys.path:
    sys.path.insert(0, backend_dir_str)

from backend.main import app

