"""Standalone and mountable ASGI application."""
import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .service import PUBLIC, fail, router

ROOT = Path(__file__).resolve().parent
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=os.getenv("VITA_HOSTS", "127.0.0.1,localhost,[::1]").split(","))
app.include_router(router)
frame_policy = "'self'" if os.getenv("VITA_EMBED") == "1" else "'none'"

@app.middleware("http")
async def headers(request: Request, call_next):
    origin = request.headers.get("origin")
    scheme = "https" if PUBLIC else request.url.scheme
    expected_origin = f"{scheme}://{request.url.netloc}"
    if origin and origin != expected_origin:
        return JSONResponse({"detail":"Origine non autorisée."}, status_code=403)
    response=await call_next(request)
    response.headers.update({"Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","Content-Security-Policy":f"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors {frame_policy}; base-uri 'none'; form-action 'self'"})
    return response

@app.get("/")
def page():
    return FileResponse(ROOT/"web"/"index.html")

@app.get("/parcours")
def journey():
    return FileResponse(ROOT/"web"/"expenses.html")

@app.get("/ui/{name}")
def asset(name:str):
    if name not in ("client.js","ui.js","style.css","expenses.js","expenses.css","brand.png"):
        fail(404,"Introuvable.")
    return FileResponse(ROOT/"web"/name)

