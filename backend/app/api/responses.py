import uuid
from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse

from app.schemas import ApiResponse, ErrorDetail


def request_id(request: Request) -> str:
    return request.headers.get("X-Request-ID", str(uuid.uuid4()))


def success(data: Any, request: Request, meta: dict | None = None) -> JSONResponse:
    body = ApiResponse(
        data=data,
        meta={"request_id": request_id(request), **(meta or {})},
        error=None,
    )
    return JSONResponse(content=body.model_dump(mode="json"))


def error(
    request: Request,
    status_code: int,
    code: str,
    message: str,
    details: dict | None = None,
) -> JSONResponse:
    body = ApiResponse(
        data=None,
        meta={"request_id": request_id(request)},
        error=ErrorDetail(code=code, message=message, details=details or {}),
    )
    return JSONResponse(status_code=status_code, content=body.model_dump(mode="json"))
