"""
Student Feedback Analyzer - Application Entry Point
Forwards execution to backend/app.py to ensure identical seamless execution
from both root and backend directory structures.
"""

import sys
import os
import importlib.util

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")

for p in [PROJECT_ROOT, BACKEND_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Load backend/app.py without circular naming collision
backend_app_path = os.path.join(BACKEND_DIR, "app.py")
spec = importlib.util.spec_from_file_location("backend_server", backend_app_path)
backend_server = importlib.util.module_from_spec(spec)
sys.modules["backend_server"] = backend_server
spec.loader.exec_module(backend_server)

app = backend_server.app

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    print(f"\n=======================================================")
    print(f" Student Feedback Analyzer - Enterprise NLP Portal")
    print(f" Server active on: http://127.0.0.1:{port}")
    print(f"=======================================================\n")
    app.run(host='0.0.0.0', port=port, debug=True)
