"""Outbound integrations driven by the daemon. Every exporter is opt-in via
environment variables (see telemetry/config.py and docs/INTEGRATIONS.md)."""

from telemetry import config


def enabled_exporters():
    exporters = []
    if config.otlp_endpoint():
        from telemetry.integrations.otlp import OtlpExporter

        exporters.append(OtlpExporter())
    if config.webhook_url():
        from telemetry.integrations.webhook import WebhookExporter

        exporters.append(WebhookExporter())
    return exporters
