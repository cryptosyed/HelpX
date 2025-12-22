from typing import Optional
from pydantic import BaseModel, field_validator


class ProviderServiceCreate(BaseModel):
    service_id: int
    price: Optional[float] = None
    service_radius_km: Optional[float] = None
    experience_years: Optional[float] = None
    is_active: Optional[bool] = True


class ProviderServiceOut(BaseModel):
    id: int
    provider_id: int
    service_id: int
    price: Optional[float] = None
    service_radius_km: Optional[float] = None
    experience_years: Optional[float] = None
    is_active: bool

    class Config:
        from_attributes = True


class ProviderServiceUpdate(BaseModel):
    price: Optional[float] = None
    service_radius_km: Optional[float] = None
    experience_years: Optional[float] = None
    is_active: Optional[bool] = None


