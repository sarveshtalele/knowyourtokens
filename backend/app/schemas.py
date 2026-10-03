"""Typed response models -- these define the public, versioned REST contract
(and the generated OpenAPI document at /openapi.json)."""

from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PageMeta(BaseModel):
    total: int
    page: int
    page_size: int


class Envelope(BaseModel, Generic[T]):
    data: T


class PagedEnvelope(BaseModel, Generic[T]):
    data: T
    meta: PageMeta


class TokenCounts(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_tokens: int = 0
    cache_write_tokens: int = 0
    total_tokens: int = 0


class UsageRow(TokenCounts):
    id: int
    event_time: str
    session_id: str
    project: str | None = None
    cwd: str | None = None
    client: str | None = None
    model: str | None = None
    provider: str | None = None
    context_window: int = 0
    max_output_tokens: int = 0
    prompt_preview: str | None = None
    response_preview: str | None = None


class UsageDetail(UsageRow):
    prompt_full: str | None = Field(None, description="Full prompt context; null if full-text storage is off")
    response_full: str | None = None
    transcript_path: str | None = None
    transcript_line: int | None = None


class Summary(BaseModel):
    total_tokens: int
    total_requests: int
    total_projects: int
    total_sessions: int
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_tokens: int = 0
    cache_write_tokens: int = 0
    top_model: str = ""
    top_client: str = ""
    avg_tokens_per_request: float = 0


class TimelinePoint(BaseModel):
    day: str
    tokens: int
    input: int
    output: int
    cache_read: int
    cache_write: int
    requests: int = 0


class ProjectSummary(BaseModel):
    project: str
    project_key: str | None = None
    total_tokens: int
    requests: int
    sessions: int
    client_count: int
    model_count: int = 0
    last_activity: str | None = None


class ProjectDetail(BaseModel):
    project: str
    project_key: str | None = None
    cwd: str | None = None
    total_tokens: int = 0
    requests: int = 0
    sessions: int = 0
    clients: int = 0
    models: int = 0
    first_active: str | None = None
    last_active: str | None = None


class CategoryTokens(BaseModel):
    category: str
    estimated_tokens: float
    reference_count: int


class PathTokens(CategoryTokens):
    path: str


class ProjectCategoryTokens(CategoryTokens):
    project: str | None = None


class NamedCount(BaseModel):
    call_count: int


class TopSkill(NamedCount):
    skill_name: str


class TopMcp(NamedCount):
    server_name: str


class TopHook(NamedCount):
    hook_name: str


class AttributionSummary(BaseModel):
    top_skill: TopSkill | None = None
    top_mcp_server: TopMcp | None = None
    top_hook: TopHook | None = None


class ToolStats(BaseModel):
    tool_name: str
    mcp_server: str | None = None
    call_count: int
    unique_sessions: int
    projects: int = 0
    first_seen: str | None = None
    last_seen: str | None = None


class SkillStats(BaseModel):
    skill_name: str
    plugin_name: str | None = None
    trigger_type: str | None = None
    call_count: int
    last_activated: str | None = None


class SessionRow(BaseModel):
    session_id: str
    project: str | None = None
    client: str | None = None
    model: str | None = None
    total_tokens: int
    interactions: int
    started_at: str | None = None
    last_active: str | None = None


class SessionUsage(BaseModel):
    id: int
    event_time: str
    project: str | None = None
    client: str | None = None
    model: str | None = None
    input_tokens: int
    output_tokens: int
    total_tokens: int


class ToolCount(BaseModel):
    tool_name: str
    calls: int


class SessionDetail(BaseModel):
    usage: list[SessionUsage]
    tools: list[ToolCount]


class EventRow(BaseModel):
    id: int
    event_time: str
    event_type: str
    session_id: str | None = None
    project: str | None = None
    client: str | None = None
    model: str | None = None
    tool_name: str | None = None
    agent_type: str | None = None


class ClientStats(BaseModel):
    client: str
    projects: int
    sessions: int
    total_tokens: int
    requests: int


class McpServer(BaseModel):
    server_name: str
    call_count: int
    sessions: int
    tools: int = 0
    first_seen: str | None = None
    last_seen: str | None = None


class PluginStats(BaseModel):
    plugin_name: str
    call_count: int
    skills: int
    last_used: str | None = None


class HookStats(BaseModel):
    hook_name: str
    call_count: int


class AgentStats(BaseModel):
    agent_type: str
    call_count: int


class PluginsPayload(BaseModel):
    plugins: list[PluginStats]
    hooks: list[HookStats]
    agents: list[AgentStats]


class ExporterStatus(BaseModel):
    name: str
    enabled: bool
    target: str | None = None
    cursor: int | None = None
    pending_rows: int = 0


class SettingsInfo(BaseModel):
    version: str
    schema_version: int
    db_path: str
    db_size: int
    table_counts: dict[str, int]
    last_reconcile: str | None = None
    env: dict[str, str]
    exporters: list[ExporterStatus] = []


# Bounds for pushed records: generous for real agents, small enough that one request can't
# exhaust memory or overflow SQLite's 64-bit integers.
_ID = 512
_PATH = 4096
_TEXT = 2_000_000
_TOKENS = 10**12


class IngestToolCall(BaseModel):
    name: str = Field(..., max_length=_ID)
    id: str | None = Field(None, max_length=_ID)
    input: dict | None = None


class IngestRecord(BaseModel):
    """One model request made by an agent."""

    request_id: str | None = Field(
        None, max_length=_ID, description="Unique per request; re-sending the same id is a no-op"
    )
    session_id: str | None = Field(None, max_length=_ID)
    timestamp: str | None = Field(None, max_length=64, description="ISO-8601; defaults to now")
    cwd: str | None = Field(None, max_length=_PATH, description="Working directory (becomes the project)")
    project: str | None = Field(None, max_length=_PATH, description="Project name, if there is no cwd")
    model: str | None = Field(None, max_length=_ID)
    input_tokens: int = Field(0, ge=0, le=_TOKENS)
    output_tokens: int = Field(0, ge=0, le=_TOKENS)
    cache_read_tokens: int = Field(0, ge=0, le=_TOKENS)
    cache_write_tokens: int = Field(0, ge=0, le=_TOKENS)
    prompt: str | None = Field(None, max_length=_TEXT)
    response: str | None = Field(None, max_length=_TEXT)
    tool_calls: list[IngestToolCall | str] = Field([], max_length=1000)


class IngestRequest(BaseModel):
    agent: str = Field(
        ..., min_length=1, max_length=64, description='Agent name shown as the client, e.g. "Antigravity"'
    )
    records: list[IngestRecord] = Field(..., max_length=1000)


class IngestResult(BaseModel):
    accepted: int
    new: int


class ReconcileResult(BaseModel):
    changed: int
    scanned: int = 0


class ReportPreview(BaseModel):
    row_count: int
    columns: list[str]
    sample: list[dict]


class Health(BaseModel):
    status: str
    version: str
    schema_version: int
    database: str
