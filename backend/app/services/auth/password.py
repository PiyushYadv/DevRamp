import bcrypt

# Verified against when the email doesn't exist so login timing doesn't reveal registered accounts
_DUMMY_HASH = bcrypt.hashpw(b"devramp-dummy-password", bcrypt.gensalt()).decode()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str | None) -> bool:
    try:
        matches = bcrypt.checkpw(password.encode("utf-8"), (password_hash or _DUMMY_HASH).encode())
        return matches and password_hash is not None
    except ValueError:
        # Over-long password or malformed hash
        return False
