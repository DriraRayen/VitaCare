"""Launch standalone VitaCare with python server.py."""
import os
from vitacare import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=int(os.getenv("VITA_PORT","8000")), proxy_headers=False)
