"""
API genérica para el frontend de React · Agroquímica del Valle

En lugar de reescribir toda la lógica del sistema, React usa las MISMAS
vistas de Django (mismas validaciones, permisos, auditoría y mensajes):

    GET  /api/pantalla/<ruta>   -> datos de una pantalla en JSON
                                   (ej. /api/pantalla/tipos-productos/?q=semilla)
    POST /api/accion/<ruta>     -> ejecuta una acción (crear, editar, eliminar...)
                                   y devuelve los mensajes en JSON
    GET  /api/archivo/<ruta>    -> descarga un archivo (PDF de remitos,
                                   comprobantes, reportes)

Cómo funciona:
    1. Se busca la vista de Django que corresponde a <ruta>.
    2. Mientras se ejecuta, la función render() de las vistas guarda el
       "contexto" (los datos que iban al template) en vez de dibujar HTML.
    3. Ese contexto se convierte a JSON.
"""

import json
import threading
from datetime import date, datetime, time
from decimal import Decimal

from django.contrib import messages
from django.core.exceptions import ObjectDoesNotExist
from django.core.paginator import Page
from django.db.models import Model, QuerySet
from django.db.models.fields.files import FieldFile
from django.forms import BaseForm
from django.http import HttpResponse, JsonResponse
from django.urls import Resolver404, resolve
from django.views.decorators.http import require_GET, require_POST

from . import perfil, views, vistas_parcial2


# ------------------------------------------------------------
# 1. CAPTURA DEL CONTEXTO DE render ( )
# ------------------------------------------------------------

_captura = threading.local()


def _render_con_captura(render_original):
    """Si una petición de la API está activa, guarda el contexto en lugar
    de dibujar el template. Si no, funciona como el render() de siempre."""

    def render(request, template_name, context=None, *args, **kwargs):
        if getattr(_captura, 'activa', False):
            respuesta = HttpResponse(status=200)
            respuesta.contexto_api = context or {}
            respuesta.template_api = template_name
            return respuesta
        return render_original(request, template_name, context, *args, **kwargs)

    render.es_captura = True
    return render


for _modulo in (views, perfil, vistas_parcial2):
    if not getattr(_modulo.render, 'es_captura', False):
        _modulo.render = _render_con_captura(_modulo.render)


# ------------------------------------------------------------
# 2. CONVERSIÓN A JSON
# ------------------------------------------------------------

# Nunca se envían al navegador.
CAMPOS_PRIVADOS = {'contrasena', 'password', 'token'}

# Claves del contexto que no le sirven a React.
CLAVES_IGNORADAS = {'request', 'csrf_token', 'messages', 'view', 'perms', 'usuario'}


def _es_privado(nombre):
    nombre = nombre.lower()
    return any(p in nombre for p in CAMPOS_PRIVADOS)


def _modelo_a_dict(obj, profundidad):
    datos = {'pk': obj.pk, 'texto': str(obj)}

    for campo in obj._meta.concrete_fields:
        if _es_privado(campo.name):
            continue

        if campo.is_relation:
            datos[campo.attname] = getattr(obj, campo.attname)
            # La relación (ej. el tipo de un producto) se envía anidada.
            if profundidad < 5:
                relacionado = getattr(obj, campo.name, None)
                datos[campo.name] = a_json(relacionado, profundidad + 1)
            continue

        datos[campo.name] = a_json(getattr(obj, campo.attname), profundidad + 1)

    # Datos agregados por la vista (anotaciones, atributos calculados).
    nombres = {c.attname for c in obj._meta.concrete_fields}
    for clave, valor in vars(obj).items():
        if clave.startswith('_') or clave in nombres or _es_privado(clave):
            continue
        if profundidad < 5:
            datos[clave] = a_json(valor, profundidad + 1)

    # Relaciones uno a uno inversas (ej. producto.stock).
    if profundidad < 2:
        for relacion in obj._meta.related_objects:
            if relacion.one_to_one:
                nombre = relacion.get_accessor_name()
                if nombre in datos:
                    continue
                try:
                    datos[nombre] = a_json(getattr(obj, nombre), profundidad + 1)
                except ObjectDoesNotExist:
                    datos[nombre] = None

    # Relaciones precargadas con prefetch_related.
    for clave, valor in getattr(obj, '_prefetched_objects_cache', {}).items():
        if profundidad < 4:
            datos[clave] = a_json(valor, profundidad + 1)

    return datos


def a_json(valor, profundidad=0):
    """Convierte cualquier dato del contexto en algo que JSON entiende."""

    if profundidad > 8:
        return None

    if valor is None or isinstance(valor, (bool, int, float, str)):
        return valor

    if isinstance(valor, Decimal):
        return float(valor)

    if isinstance(valor, (datetime, date, time)):
        return valor.isoformat()

    if isinstance(valor, FieldFile):
        return valor.url if valor else None

    if isinstance(valor, Model):
        return _modelo_a_dict(valor, profundidad)

    if isinstance(valor, Page):
        return {
            'items': [a_json(x, profundidad + 1) for x in valor.object_list],
            'pagina': valor.number,
            'paginas': valor.paginator.num_pages,
            'total': valor.paginator.count,
            'por_pagina': getattr(valor, 'por_pagina', valor.paginator.per_page),
            'opciones': list(getattr(valor, 'opciones', [])),
            'desde': valor.start_index(),
            'hasta': valor.end_index(),
        }

    if isinstance(valor, QuerySet):
        return [a_json(x, profundidad + 1) for x in valor]

    if isinstance(valor, dict):
        return {
            str(k): a_json(v, profundidad + 1)
            for k, v in valor.items()
            if not _es_privado(str(k))
        }

    if isinstance(valor, (list, tuple, set)):
        return [a_json(x, profundidad + 1) for x in valor]

    if isinstance(valor, BaseForm):
        return {
            'errores': {k: [str(e) for e in v] for k, v in valor.errors.items()},
            'datos': {k: v for k, v in valor.data.items() if not _es_privado(k)},
        }

    # Otras colecciones (dict.items(), generadores, mapas...) se envían como lista.
    if hasattr(valor, '__iter__'):
        try:
            return [a_json(x, profundidad + 1) for x in valor]
        except TypeError:
            pass

    return str(valor)


def _contexto_a_json(contexto):
    return {
        str(k): a_json(v)
        for k, v in contexto.items()
        if k not in CLAVES_IGNORADAS and not _es_privado(str(k))
    }


def _mensajes(request):
    return [
        {'nivel': m.level_tag or 'info', 'texto': str(m.message)}
        for m in messages.get_messages(request)
    ]


# ------------------------------------------------------------
# 3. EJECUTAR LA VISTA ORIGINAL
# ------------------------------------------------------------

def _ejecutar(request, ruta):
    try:
        coincidencia = resolve('/' + ruta.lstrip('/'))
    except Resolver404:
        return None

    # No se permite llamar a la propia API desde la API.
    if (coincidencia.url_name or '').endswith('_api'):
        return None

    request.resolver_match = coincidencia
    _captura.activa = True
    try:
        return coincidencia.func(request, *coincidencia.args, **coincidencia.kwargs)
    finally:
        _captura.activa = False


def _respuesta_json(request, respuesta, accion):
    mensajes = _mensajes(request)
    hubo_error = any(m['nivel'] == 'error' for m in mensajes)

    if isinstance(respuesta, JsonResponse):
        try:
            contenido = json.loads(respuesta.content.decode('utf-8'))
        except ValueError:
            contenido = {}

        ok = respuesta.status_code < 400 and not hubo_error
        errores = {}
        if isinstance(contenido, dict):
            if contenido.get('ok') is False:
                ok = False
            # Las vistas que responden JSON avisan con "error" / "mensaje".
            if contenido.get('error'):
                mensajes = mensajes + [{'nivel': 'error', 'texto': str(contenido['error'])}]
                ok = False
            elif accion and contenido.get('mensaje'):
                mensajes = mensajes + [{'nivel': 'success', 'texto': str(contenido['mensaje'])}]
            if isinstance(contenido.get('errores'), dict):
                errores = {k: str(v) for k, v in contenido['errores'].items() if v}

        return JsonResponse(
            {'ok': ok, 'mensajes': mensajes, 'errores': errores, 'datos': contenido},
            status=200 if respuesta.status_code < 500 else respuesta.status_code,
        )

    contexto = getattr(respuesta, 'contexto_api', None)

    if contexto is not None:
        # Si la vista volvió a mostrar la pantalla con un formulario
        # inválido, se juntan los errores de cada campo.
        errores = {}
        for valor in contexto.values():
            if isinstance(valor, BaseForm) and valor.is_bound and valor.errors:
                for campo, lista in valor.errors.items():
                    errores[campo] = ' '.join(str(e) for e in lista)
        if isinstance(contexto.get('errores'), dict):
            errores.update({k: str(v) for k, v in contexto['errores'].items() if v})

        # Algunas vistas avisan el error con contexto['error'] (texto).
        if accion and contexto.get('error'):
            mensajes = mensajes + [{'nivel': 'error', 'texto': str(contexto['error'])}]
            hubo_error = True

        if accion and errores and not mensajes:
            mensajes = [{'nivel': 'error', 'texto': 'Revise los datos ingresados.'}]

        return JsonResponse({
            'ok': not hubo_error and not (accion and errores),
            'mensajes': mensajes,
            'errores': errores,
            'datos': _contexto_a_json(contexto),
        })

    if respuesta.status_code in (301, 302):
        # En una pantalla, una redirección significa "no se puede ver"
        # (sin permiso o sin sesión). En una acción es lo normal.
        return JsonResponse({
            'ok': accion and not hubo_error,
            'mensajes': mensajes,
            'redireccion': respuesta.get('Location'),
        })

    return JsonResponse(
        {'ok': False, 'mensajes': mensajes or [
            {'nivel': 'error', 'texto': 'Respuesta inesperada del servidor.'}
        ]},
        status=respuesta.status_code if respuesta.status_code >= 400 else 500,
    )


# Pantallas que se usan sin haber iniciado sesión.
RUTAS_PUBLICAS = ('recuperar/',)


def _sin_sesion(request, ruta=''):
    if ruta.lstrip('/').startswith(RUTAS_PUBLICAS):
        return None
    if not views.usuario_autenticado(request):
        return JsonResponse(
            {'ok': False, 'mensajes': [
                {'nivel': 'error', 'texto': 'La sesión no está activa.'}
            ]},
            status=401,
        )
    return None


@require_GET
def pantalla_api(request, ruta):
    """Datos de una pantalla (los mismos que recibía su template)."""

    error = _sin_sesion(request, ruta)
    if error:
        return error

    respuesta = _ejecutar(request, ruta)
    if respuesta is None:
        return JsonResponse({'ok': False, 'mensajes': [
            {'nivel': 'error', 'texto': 'La pantalla no existe.'}
        ]}, status=404)

    return _respuesta_json(request, respuesta, accion=False)


@require_POST
def accion_api(request, ruta):
    """Ejecuta una acción (crear, editar, eliminar, etc.) con la vista original."""

    error = _sin_sesion(request, ruta)
    if error:
        return error

    respuesta = _ejecutar(request, ruta)
    if respuesta is None:
        return JsonResponse({'ok': False, 'mensajes': [
            {'nivel': 'error', 'texto': 'La acción no existe.'}
        ]}, status=404)

    return _respuesta_json(request, respuesta, accion=True)


@require_GET
def archivo_api(request, ruta):
    """Devuelve tal cual la respuesta de la vista (PDF, Excel, etc.)."""

    error = _sin_sesion(request)
    if error:
        return error

    respuesta = _ejecutar(request, ruta)
    if respuesta is None or getattr(respuesta, 'contexto_api', None) is not None:
        return JsonResponse({'ok': False}, status=404)

    if respuesta.status_code in (301, 302):
        return _respuesta_json(request, respuesta, accion=False)

    return respuesta
