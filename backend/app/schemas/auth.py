from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.schemas.base import CamelModel


class LoginPayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.lower()


class SignupPayload(LoginPayload):
    name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be blank")
        return v

    @field_validator("password")
    @classmethod
    def bcrypt_length_limit(cls, v: str) -> str:
        # bcrypt only accepts the first 72 bytes and bcrypt>=5 raises on longer input
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes")
        return v


class GitHubCodePayload(BaseModel):
    code: str = Field(min_length=1, max_length=256)


class UserResponse(CamelModel):
    id: str
    name: str
    email: str
    github_url: Optional[str] = None
    auth_provider: Literal["password", "github"] = "password"


class AuthResponse(CamelModel):
    user: UserResponse
    access_token: str
