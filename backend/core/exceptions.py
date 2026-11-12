import math
from rest_framework.views import exception_handler
from rest_framework.exceptions import Throttled


def custom_exception_handler(exc, context):
    """
    Padroniza respostas de exceção da API.
    Converte mensagens de rate limiting (Throttled) para mensagens claras em português
    com indicação precisa do tempo de espera em segundos.
    """
    response = exception_handler(exc, context)

    if isinstance(exc, Throttled) and response is not None:
        wait = math.ceil(exc.wait) if exc.wait else 60
        response.data['detail'] = (
            f"Muitas requisições enviadas ao mesmo tempo. "
            f"Por segurança e estabilidade do sistema, aguarde {wait} segundo(s) antes de tentar novamente."
        )

    return response

