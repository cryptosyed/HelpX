from typing import Optional

from pydantic import BaseModel, field_validator


class GlobalServiceBase(BaseModel):
    title: str
    category: str
    description: Optional[str] = None
    base_price: Optional[float] = None
    is_active: Optional[bool] = True

    @field_validator("title", "category")
    @classmethod
    def not_empty(cls, v: str):
        if not v or not v.strip():
            raise ValueError("must not be empty")
        return v


class GlobalServiceCreate(GlobalServiceBase):
    pass


class GlobalServiceUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[float] = None
    is_active: Optional[bool] = None


class GlobalServiceOut(GlobalServiceBase):
    id: int

    class Config:
        from_attributes = True


