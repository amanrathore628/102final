"""Tests seed an isolated temporary database; presentation data is never modified."""
import os
import tempfile
from pathlib import Path
import pytest
_test_dir = tempfile.TemporaryDirectory(prefix="nirikshan-tests-")
os.environ["USE_SQLITE_FALLBACK"] = "true"
os.environ["SQLITE_FALLBACK_URL"] = "sqlite:///" + (Path(_test_dir.name) / "test.db").as_posix()
os.environ["UPLOAD_DIR"] = str(Path(_test_dir.name) / "uploads")
from fastapi.testclient import TestClient
from prototype import app
from database import engine

@pytest.fixture(scope="session", autouse=True)
def seeded_database():
    with TestClient(app):
        yield
    engine.dispose()
    _test_dir.cleanup()

@pytest.fixture
def api():
    with TestClient(app) as client:
        yield client
