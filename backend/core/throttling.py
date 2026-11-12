from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class BurstAnonRateThrottle(AnonRateThrottle):
    """Proteção contra disparos rápidos/rajadas de requisições de clientes anônimos."""
    scope = 'anon_burst'


class BurstUserRateThrottle(UserRateThrottle):
    """Proteção contra disparos rápidos/rajadas de requisições de usuários autenticados."""
    scope = 'user_burst'


class SustainedAnonRateThrottle(AnonRateThrottle):
    """Limite sustentado por minuto para tráfego anônimo."""
    scope = 'anon_sustained'


class SustainedUserRateThrottle(UserRateThrottle):
    """Limite sustentado por minuto para tráfego autenticado."""
    scope = 'user_sustained'

