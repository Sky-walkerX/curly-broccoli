"""API request/response schemas."""
from typing import Optional, Any, List
from pydantic import BaseModel


class AuditRequest(BaseModel):
    config: str
    vendor_hint: Optional[str] = None


class Mapping(BaseModel):
    line: str
    field: str
    value: Any = None
    match_keywords: str
    capture_regex: Optional[str] = None


class TeachRequest(BaseModel):
    vendor: str
    mappings: List[Mapping]
