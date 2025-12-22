"""
Expose legacy schemas (from ../schemas.py) plus package modules.
This preserves existing imports like `from app import schemas`
while allowing submodules such as `app.schemas.service`.
"""
import importlib.util
import os

# Load legacy schemas.py
_legacy_path = os.path.join(os.path.dirname(__file__), "..", "schemas.py")
_spec = importlib.util.spec_from_file_location("app.schemas_legacy", _legacy_path)
_legacy = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_legacy)  # type: ignore
globals().update({k: v for k, v in vars(_legacy).items() if not k.startswith("_")})

# Export package submodules
from .service import *  # noqa
from .provider_service import *  # noqa

