"""Where the database lives: the rules telemetry/config.py and cli/src/paths.js both follow."""

from telemetry import config


def _clear(monkeypatch, tmp_path):
    for name in (
        "KNOWYOURTOKENS_DB",
        "TOKENTELEMETRY_DB",
        "CLAUDE_TELEMETRY_DB",
        "KNOWYOURTOKENS_HOME",
        "TOKENTELEMETRY_HOME",
    ):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setenv("USERPROFILE", str(tmp_path))
    monkeypatch.setenv("CLAUDE_CONFIG_DIR", str(tmp_path / ".claude"))


def test_new_installs_keep_data_in_the_app_folder(monkeypatch, tmp_path):
    _clear(monkeypatch, tmp_path)
    assert config.db_path() == tmp_path / ".knowyourtokens" / "data" / "knowyourtokens.db"


def test_an_unmigrated_database_keeps_being_used(monkeypatch, tmp_path):
    _clear(monkeypatch, tmp_path)
    legacy = tmp_path / ".claude" / "telemetry" / "telemetry.db"
    legacy.parent.mkdir(parents=True)
    legacy.write_bytes(b"")
    assert config.db_path() == legacy
    new = tmp_path / ".knowyourtokens" / "data" / "knowyourtokens.db"
    new.parent.mkdir(parents=True)
    new.write_bytes(b"")
    assert config.db_path() == new, "once moved, the new location wins"


def test_env_vars_pin_the_path_new_name_first(monkeypatch, tmp_path):
    _clear(monkeypatch, tmp_path)
    monkeypatch.setenv("CLAUDE_TELEMETRY_DB", str(tmp_path / "old.db"))
    assert config.db_path() == tmp_path / "old.db"
    monkeypatch.setenv("KNOWYOURTOKENS_DB", str(tmp_path / "new.db"))
    assert config.db_path() == tmp_path / "new.db"


def test_home_override_moves_the_default(monkeypatch, tmp_path):
    _clear(monkeypatch, tmp_path)
    monkeypatch.setenv("KNOWYOURTOKENS_HOME", str(tmp_path / "custom"))
    assert config.db_path() == tmp_path / "custom" / "data" / "knowyourtokens.db"
