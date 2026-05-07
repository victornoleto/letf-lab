"""DTOs for the AI on-demand chat endpoint."""
from __future__ import annotations

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    include_portfolio: bool = True


class ChatResponse(BaseModel):
    answer: str
