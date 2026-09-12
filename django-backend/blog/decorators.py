from .authentication import CookieJWTAuthentication


def cookie_auth(cls):
    cls.authentication_classes = [CookieJWTAuthentication]
    return cls