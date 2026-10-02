from fastapi import APIRouter

from .routes import (
    attributions,
    clients,
    events,
    mcp,
    plugins,
    projects,
    reports,
    sessions,
    settings,
    skills,
    tools,
    usage,
)

api_router = APIRouter()

for module, prefix in (
    (usage, "usage"),
    (projects, "projects"),
    (tools, "tools"),
    (skills, "skills"),
    (sessions, "sessions"),
    (events, "events"),
    (clients, "clients"),
    (attributions, "attributions"),
    (mcp, "mcp"),
    (plugins, "plugins"),
    (settings, "settings"),
    (reports, "reports"),
):
    api_router.include_router(module.router, prefix=f"/{prefix}", tags=[prefix])
