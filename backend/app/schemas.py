from pydantic import BaseModel, EmailStr, field_validator, Field, model_validator
from typing import Optional, List
from datetime import datetime
import re

class UserCreate(BaseModel):
    email: str  # Changed from EmailStr to allow .test domains
    password: str
    name: Optional[str] = None
    role: Optional[str] = "customer"  # customer, provider (admin not allowed via public register)
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        # Basic email validation that allows .test domains
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, v):
            raise ValueError('Invalid email format')
        return v.lower()

class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        return v.lower()

class UserOut(BaseModel):
    id: int
    email: str
    name: Optional[str]
    role: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class ServiceCreate(BaseModel):
    title: str
    description: Optional[str]
    category: str
    price: float
    lat: Optional[float]
    lon: Optional[float]
    image_url: Optional[str] = "/images/service-placeholder.jpg"

    @field_validator("price")
    @classmethod
    def price_positive(cls, v):
        if v is None or v <= 0:
            raise ValueError("price must be greater than 0")
        return v

class ServiceOut(BaseModel):
    id: int
    provider_id: int
    title: str
    description: Optional[str]
    category: Optional[str]
    price: Optional[float]
    lat: Optional[float]
    lon: Optional[float]
    image_url: Optional[str] = "/images/service-placeholder.jpg"
    flagged: Optional[bool] = False
    flag_reason: Optional[str] = None
    approved: Optional[bool] = True
    created_at: Optional[str]

    class Config:
        from_attributes = True


class ServiceListResponse(BaseModel):
    items: List[ServiceOut]
    total: int
    page: int
    page_size: int


class BookingCreate(BaseModel):
    service_id: Optional[int] = Field(default=None, description="Legacy provider-owned service")
    global_service_id: Optional[int] = Field(default=None, description="Global service id (new flow)")
    provider_id: Optional[int] = Field(default=None, description="Optional provider; may be null for unassigned")
    scheduled_at: Optional[datetime] = Field(
        default=None,
        validation_alias="when",
        description="When the booking is requested",
    )
    notes: Optional[str]
    user_address: Optional[str] = None
    user_lat: Optional[float] = None
    user_lon: Optional[float] = None

    @field_validator("scheduled_at")
    @classmethod
    def require_scheduled_at(cls, v):
        if v is None:
            raise ValueError("scheduled_at (or 'when') is required")
        return v

    @model_validator(mode="after")
    def validate_required_fields(self):
        if self.scheduled_at is None:
            raise ValueError("scheduled_at is required")

        if not (self.service_id or self.global_service_id):
            raise ValueError("Either service_id or global_service_id must be provided")

        return self

    class Config:
        populate_by_name = True


class BookingOut(BaseModel):
    id: int
    service_id: Optional[int] = None
    global_service_id: Optional[int] = None
    user_id: int
    provider_id: Optional[int] = None
    scheduled_at: datetime
    notes: Optional[str] = None
    status: str
    created_at: Optional[str] = None

    service: Optional[ServiceOut] = None
    service_title: Optional[str] = None
    user_name: Optional[str] = None
    location: Optional[str] = None

    class Config:
        from_attributes = True


class BookingStatusUpdate(BaseModel):
    status: str


# ========== USER DASHBOARD SCHEMAS ==========

class AddressCreate(BaseModel):
    label: str
    line1: str
    line2: Optional[str] = None
    city: str
    pincode: str
    lat: Optional[float] = None
    lon: Optional[float] = None


class AddressOut(BaseModel):
    id: int
    user_id: int
    label: str
    line1: str
    line2: Optional[str]
    city: str
    pincode: str
    lat: Optional[float]
    lon: Optional[float]
    created_at: Optional[str]

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None


# ========== PROVIDER DASHBOARD SCHEMAS ==========

class ProviderEarningsOut(BaseModel):
    month: str
    total_earnings: float
    booking_count: int


class ProviderCalendarEvent(BaseModel):
    id: int
    service_title: str
    when_at: str
    status: str
    user_name: Optional[str]
    notes: Optional[str]


class PayoutSettingsCreate(BaseModel):
    upi_id: Optional[str] = None
    bank_acc_no: Optional[str] = None
    bank_ifsc: Optional[str] = None


class PayoutSettingsOut(BaseModel):
    id: int
    provider_id: int
    upi_id: Optional[str]
    bank_acc_no: Optional[str]
    bank_ifsc: Optional[str]
    created_at: Optional[str]
    updated_at: Optional[str]

    class Config:
        from_attributes = True


# ========== ADMIN SCHEMAS ==========

class UserUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None
    name: Optional[str] = None


class UserListResponse(BaseModel):
    items: List[UserOut]
    total: int
    page: int
    page_size: int


class ProviderOut(BaseModel):
    id: int
    user_id: int
    business_name: Optional[str]
    bio: Optional[str]
    rating: Optional[float] = 0
    is_verified: bool = False
    is_active: bool = True
    created_at: Optional[str]

    class Config:
        from_attributes = True


class ProviderProfileBase(BaseModel):
    business_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None


class ProviderProfileOut(ProviderProfileBase):
    provider_id: int
    business_name: Optional[str]
    phone: Optional[str]
    bio: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ProviderMatchResult(BaseModel):
    provider_id: int
    service_id: int
    distance_km: float
    rating: float
    score: float
    active_bookings: int
    trust_score: Optional[float] = None
    availability_penalty: Optional[float] = None
    workload_penalty: Optional[float] = None


class MatchDebug(BaseModel):
    elapsed_ms: float
    candidate_count: int
    algorithm: str
    explain_analyze: Optional[List[str]] = None
    components: Optional[List[dict]] = None


class ProviderMatchResponse(BaseModel):
    items: List[ProviderMatchResult]
    total: int
    top_n: int
    radius_km: float
    criteria: dict
    debug: Optional[MatchDebug] = None


class AdminProviderOut(BaseModel):
    id: int
    name: str
    email: str
    approved: Optional[bool] = None
    is_suspended: Optional[bool] = None
    avg_rating: Optional[float] = None
    total_reviews: int


class AdminProviderStatusOut(BaseModel):
    provider_id: int
    approved: Optional[bool]
    is_suspended: Optional[bool] = None
    status: Optional[str] = None


class AdminProviderStatusUpdate(BaseModel):
    status: Optional[str] = None  # approved|suspended|pending
    approved: Optional[bool] = None

    @model_validator(mode="after")
    def validate_status(self):
        if self.status is None and self.approved is None:
            raise ValueError("status or approved is required")
        if self.status and self.status not in {"approved", "suspended", "pending"}:
            raise ValueError("status must be one of approved, suspended, pending")
        return self


class AdminProviderProfile(BaseModel):
    business_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None


class AdminProviderRatingSummary(BaseModel):
    avg_rating: Optional[float] = None
    total_reviews: int = 0


class AdminProviderBookingSummary(BaseModel):
    total: int
    pending: int
    accepted: int
    completed: int
    cancelled: int
    rejected: int


class AdminProviderEarnings(BaseModel):
    total_earnings: float = 0
    accepted_bookings: int = 0


class AdminProviderDetailOut(BaseModel):
    id: int
    user_id: int
    name: str
    email: str
    approved: Optional[bool] = None
    is_suspended: Optional[bool] = None
    profile: Optional[AdminProviderProfile] = None
    rating: AdminProviderRatingSummary
    bookings: AdminProviderBookingSummary
    services_count: int
    active_services: int
    earnings: Optional[AdminProviderEarnings] = None

    class Config:
        from_attributes = True


class AdminProviderServiceOut(BaseModel):
    id: int  # provider_service id
    provider_id: int
    global_service_id: int
    title: str
    category: Optional[str] = None
    price: Optional[float] = None
    service_radius_km: Optional[float] = None
    experience_years: Optional[float] = None
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AdminProviderServiceStatusUpdate(BaseModel):
    is_active: bool


class AdminProviderServicesResponse(BaseModel):
    items: List[AdminProviderServiceOut]
    count: int


class AdminAnalytics(BaseModel):
    total_users: int
    total_providers: int
    total_services: int
    total_bookings: int
    revenue: float
    active_users_24h: int
    bookings_chart: List[dict]


class ReportCreate(BaseModel):
    report_type: str  # legacy field; accepted for compatibility
    target_type: Optional[str] = None  # service|provider|booking
    target_id: int
    reason: str


class ReportOut(BaseModel):
    id: int
    reporter_id: int
    report_type: str
    target_type: Optional[str]
    target_id: int
    reason: str
    status: str
    admin_notes: Optional[str]
    created_at: Optional[str]
    resolved_at: Optional[str]

    class Config:
        from_attributes = True


class ReportResolution(BaseModel):
    status: str  # resolved, reviewed, open
    admin_notes: Optional[str] = None


class TrustScoreOut(BaseModel):
    provider_id: int
    trust_score: float
    accepted_ratio: float
    cancel_ratio: float
    rating_norm: float
    reports_penalty: float
    total_bookings: int
    reports_count: int


class ProviderRatingSummary(BaseModel):
    provider_id: int
    avg_rating: Optional[float] = None
    total_reviews: int


