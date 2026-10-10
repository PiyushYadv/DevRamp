import base64
import hashlib
from cryptography.fernet import Fernet, InvalidToken
from app.config import settings

# Derived from the JWT secret so no extra key needs managing; rotating that secret
# invalidates stored third-party tokens, and users simply reconnect GitHub.
_fernet = Fernet(base64.urlsafe_b64encode(hashlib.sha256(f"devramp-token-encryption:{settings.JWT_SECRET_KEY}".encode()).digest()))


def encrypt_secret(value: str) -> str:
    return _fernet.encrypt(value.encode()).decode()


def decrypt_secret(value: str) -> str | None:
    try:
        return _fernet.decrypt(value.encode()).decode()
    except InvalidToken:
        return None
