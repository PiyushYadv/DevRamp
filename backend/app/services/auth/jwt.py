from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from app.config import settings
from app.exceptions.auth import InvalidTokenError


def create_access_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    claims = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access",
    }
    return jwt.encode(claims, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> str:
    """Returns the user id from a valid access token; raises InvalidTokenError otherwise."""
    try:
        # Pin the accepted algorithm so a token can't choose its own (e.g. "none")
        claims = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as e:
        raise InvalidTokenError() from e

    user_id = claims.get("sub")
    if claims.get("type") != "access" or not isinstance(user_id, str):
        raise InvalidTokenError()
    return user_id
