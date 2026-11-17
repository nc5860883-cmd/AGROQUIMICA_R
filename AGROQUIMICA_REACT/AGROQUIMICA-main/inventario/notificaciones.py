"""
Notificaciones y configuración de reglas · Agroquímica del Valle

  - CONFIGURACIÓN: los umbrales de las reglas de alertas se guardan en la
    tabla CONFIGURACION (no están fijos en el código). Si falta una clave,
    se crea con su valor por defecto la primera vez que se lee.

  - NOTIFICACIONES: cada regla que se cumple deja una notificación en la
    tabla NOTIFICACION para cada perfil destinatario. El usuario las ve en
    la bandeja del header (con el número de no leídas) y en la pantalla
    "Notificaciones".

  - SIN DUPLICADOS: cada notificación lleva una "Clave" que identifica el
    evento que la disparó (ej. 'stock:15' = alerta de stock Nº 15). La base
    tiene una restricción única (Clave, Destino_perfil), así que aunque la
    regla se evalúe dos veces (dos pestañas, el job diario y la revisión en
    línea a la vez) el mismo evento se notifica una sola vez.
"""

import logging

from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import Configuracion, Notificacion, Perfiles
from .permissions import MODULOS, PERFILES_ADMIN

logger = logging.getLogger(__name__)


# ------------------------------------------------------------
# CONFIGURACIÓN
# clave -> (valor por defecto, mínimo, máximo, título, descripción)
# ------------------------------------------------------------

PARAMETROS = {
    'dias_aviso_vencimiento': (
        30, 1, 365,
        'Días de aviso de vencimiento',
        'Se avisa cuando a un lote con stock le faltan estos días o menos para vencer.',
    ),
    'egreso_inusual_desvios': (
        3, 1, 10,
        'Egreso inusual: desvíos estándar',
        'Un egreso es inusual si supera la media de egresos del producto '
        'en esta cantidad de desvíos estándar (regla de 3σ).',
    ),
    'egreso_inusual_min_muestras': (
        5, 2, 1000,
        'Egreso inusual: egresos previos mínimos',
        'Cantidad mínima de egresos anteriores del producto para poder '
        'calcular la media y el desvío.',
    ),
    'dias_revision_vencimientos': (
        1, 1, 30,
        'Revisión automática de vencimientos (días)',
        'Cada cuántos días se revisan los vencimientos mientras alguien '
        'usa el sistema (además del job diario).',
    ),
    'correo_alertas_activo': (
        1, 0, 1,
        'Enviar correos de alertas (1 = sí, 0 = no)',
        'Si está en 1, las alertas también se envían por correo electrónico.',
    ),
}


def asegurar_configuracion():
    """Crea las claves que falten con su valor por defecto."""
    existentes = set(Configuracion.objects.values_list('Clave', flat=True))

    for clave, (defecto, _mn, _mx, titulo, descripcion) in PARAMETROS.items():
        if clave not in existentes:
            try:
                Configuracion.objects.create(
                    Clave=clave,
                    Valor=str(defecto),
                    Descripcion=f'{titulo}. {descripcion}'[:255],
                )
            except IntegrityError:
                pass   # otra petición la creó al mismo tiempo


def config(clave):
    """Valor entero de un parámetro (el de la tabla, o el por defecto)."""
    defecto, minimo, maximo = PARAMETROS[clave][:3]

    valor = Configuracion.objects.filter(Clave=clave).values_list(
        'Valor', flat=True
    ).first()

    if valor is None:
        asegurar_configuracion()
        return defecto

    try:
        return min(max(int(valor), minimo), maximo)
    except (TypeError, ValueError):
        return defecto


# ------------------------------------------------------------
# DESTINATARIOS
# ------------------------------------------------------------

def perfiles_con_permiso(modulo):
    """Perfiles activos que pueden ver un módulo (el Administrador siempre)."""
    consultar, gestionar = MODULOS[modulo]
    nombres = {n.lower() for n in (consultar, gestionar) if n}

    perfiles = []

    for perfil in Perfiles.objects.filter(Estado_perfil=True).prefetch_related('permisos'):
        if perfil.Nombre_perfil in PERFILES_ADMIN:
            perfiles.append(perfil)
            continue

        asignados = {p.Nombre_permiso.strip().lower() for p in perfil.permisos.all()}

        if asignados & nombres:
            perfiles.append(perfil)

    return perfiles


def perfiles_admin():
    return list(Perfiles.objects.filter(
        Estado_perfil=True, Nombre_perfil__in=PERFILES_ADMIN
    ))


# ------------------------------------------------------------
# CREAR NOTIFICACIONES
# ------------------------------------------------------------

def notificar(tipo, mensaje, clave, perfiles):
    """Deja una notificación por perfil. Devuelve cuántas se crearon.

    Si ya existe una notificación con esa clave para el perfil, no se
    repite (ver la restricción única del modelo).
    """
    creadas = 0

    for perfil in perfiles:
        try:
            with transaction.atomic():
                _, nueva = Notificacion.objects.get_or_create(
                    Clave=clave[:100],
                    Destino_perfil=perfil,
                    defaults={'Tipo': tipo[:50], 'Mensaje': mensaje[:255]},
                )
            creadas += int(nueva)
        except IntegrityError:
            pass   # se creó al mismo tiempo desde otra petición

    return creadas


# ------------------------------------------------------------
# BANDEJA
# ------------------------------------------------------------

# Tipo de notificación -> clase del ícono en la bandeja
CLASES_TIPO = {
    'Stock mínimo': 'stock',
    'Vencimiento': 'vencimiento',
    'Egreso inusual': 'inusual',
}


def notificaciones_de(usuario):
    """Notificaciones dirigidas al perfil del usuario."""
    if not usuario or not usuario.ID_Perfil_id:
        return Notificacion.objects.none()

    return Notificacion.objects.filter(Destino_perfil_id=usuario.ID_Perfil_id)


def no_leidas(usuario):
    return notificaciones_de(usuario).filter(Leida=False).count()


def _hace(fecha):
    """'recién', 'hace 5 min', 'hace 3 h', 'ayer', 'hace 4 días'."""
    if not fecha:
        return ''

    segundos = int((timezone.now() - fecha).total_seconds())

    if segundos < 60:
        return 'recién'
    if segundos < 3600:
        return f'hace {segundos // 60} min'
    if segundos < 86400:
        return f'hace {segundos // 3600} h'

    dias = segundos // 86400
    return 'ayer' if dias == 1 else f'hace {dias} días'


def datos_bandeja(usuario, limite=15):
    """JSON para la bandeja del header: primero las no leídas."""
    lista = notificaciones_de(usuario).order_by('Leida', '-Fecha')[:limite]

    return {
        'no_leidas': no_leidas(usuario),
        'notificaciones': [
            {
                'id': n.ID_Notificacion,
                'tipo': CLASES_TIPO.get(n.Tipo, 'stock'),
                'etiqueta': n.Tipo,
                'mensaje': n.Mensaje,
                'hace': _hace(n.Fecha),
                'leida': n.Leida,
            }
            for n in lista
        ],
    }


def _auditar_atencion(usuario, notificacion):
    """Deja en auditoría que el usuario atendió (marcó como leída) la
    notificación, por ejemplo desde la campanita del header."""
    from .auditoria import registrar_auditoria   # import diferido

    lectura = timezone.localtime(notificacion.Fecha_lectura)

    registrar_auditoria(
        usuario,
        'Notificaciones',
        notificacion,
        'ATENCION_NOTIFICACION',
        {'Estado': 'Sin leer'},
        {
            'Nombre': notificacion.Tipo,
            'Tipo': notificacion.Tipo,
            'Mensaje': notificacion.Mensaje,
            'Estado': 'Leída',
            'Fecha_lectura': lectura.strftime('%d/%m/%Y %H:%M'),
        },
    )


def marcar_leida(usuario, notificacion):
    """Marca una notificación como leída y sincroniza el resto del sistema.

    Una notificación y una alerta del historial son el MISMO aviso visto
    desde dos pantallas, así que atenderlo en un lugar lo cierra en todos:
      - Si el aviso tiene una alerta pendiente y el usuario puede atender
        alertas: se atiende la alerta (queda en el historial quién la
        atendió) y se cierran las copias de la notificación de todos los
        perfiles.
      - Si no hay alerta pendiente (egreso inusual, o la alerta ya se
        atendió): se cierran las copias de todos los perfiles.
      - Si hay alerta pendiente pero el usuario NO puede atenderla: solo
        se marca como leída su propia notificación.
    Devuelve True si cambió algo.
    """
    from .permissions import puede_accion   # import diferido

    if notificacion.Leida:
        return False

    ahora = timezone.now()

    with transaction.atomic():
        alerta = alerta_pendiente_de_clave(notificacion.Clave)

        if alerta is not None and puede_accion(usuario, 'atender_alertas'):
            # Atiende la alerta: esto también cierra todas las notificaciones.
            atender_alerta_sincronizada(usuario, alerta, ahora)
            return True

        if alerta is None:
            # Nadie más tiene que atender este aviso.
            cerrar_notificaciones(notificacion.Clave, ahora)
        else:
            notificacion.Leida = True
            notificacion.Fecha_lectura = ahora
            notificacion.save(update_fields=['Leida', 'Fecha_lectura'])

        notificacion.refresh_from_db()
        _auditar_atencion(usuario, notificacion)

    return True


def marcar_todas_leidas(usuario):
    """Marca todas las del usuario como leídas (con la misma sincronización
    que marcar_leida). Devuelve cuántas se marcaron."""
    marcadas = 0

    for notificacion in list(notificaciones_de(usuario).filter(Leida=False)):
        # Puede haberse cerrado al atender otra del mismo aviso.
        notificacion.refresh_from_db()
        if marcar_leida(usuario, notificacion):
            marcadas += 1

    return marcadas


# ------------------------------------------------------------
# SINCRONIZACIÓN ALERTA <-> NOTIFICACIONES
# Cada alerta del historial genera notificaciones con una clave:
#   'stock:<ID de la alerta>'          -> alerta de stock mínimo
#   'vencimiento:lote:<ID del lote>'   -> alerta de vencimiento del lote
#   'egreso:<ID del movimiento>'       -> egreso inusual (sin alerta)
# ------------------------------------------------------------

def _lote_de_mensaje(mensaje):
    """ID del lote guardado en el mensaje de una alerta de vencimiento."""
    try:
        return int(str(mensaje).rsplit('[LOTE_ID:', 1)[1].split(']', 1)[0])
    except (IndexError, ValueError):
        return None


def clave_de_alerta(alerta):
    """Clave de las notificaciones que generó una alerta (o None)."""
    from .alertas import TIPO_VENCIMIENTO, TIPOS_STOCK   # import diferido

    if alerta.Tipo_alerta in TIPOS_STOCK:
        return f'stock:{alerta.pk}'

    if alerta.Tipo_alerta == TIPO_VENCIMIENTO:
        lote = _lote_de_mensaje(alerta.Mensaje)
        return f'vencimiento:lote:{lote}' if lote else None

    return None


def alerta_pendiente_de_clave(clave):
    """Alerta sin atender que corresponde a una notificación (o None)."""
    from .alertas import TIPO_VENCIMIENTO, TIPOS_STOCK   # import diferido
    from .models import Alertas

    partes = str(clave or '').split(':')

    if len(partes) == 2 and partes[0] == 'stock' and partes[1].isdigit():
        return Alertas.objects.filter(
            pk=int(partes[1]), Tipo_alerta__in=TIPOS_STOCK, Atendida=False,
        ).first()

    if len(partes) == 3 and partes[:2] == ['vencimiento', 'lote'] and partes[2].isdigit():
        return Alertas.objects.filter(
            Tipo_alerta=TIPO_VENCIMIENTO,
            Mensaje__contains=f'[LOTE_ID:{partes[2]}]',
            Atendida=False,
        ).order_by('-ID_Historial_alerta').first()

    return None


def cerrar_notificaciones(clave, momento=None):
    """Marca como leídas las notificaciones de un aviso en TODOS los perfiles."""
    if not clave:
        return 0

    return Notificacion.objects.filter(Clave=clave, Leida=False).update(
        Leida=True, Fecha_lectura=momento or timezone.now(),
    )


def atender_alerta_sincronizada(usuario, alerta, momento=None):
    """Atiende una alerta (con auditoría) y cierra sus notificaciones.

    Es lo que hace "Marcar atendida" en el historial y también lo que pasa
    al leer su notificación desde la campanita o la pantalla Notificaciones.
    Devuelve True si la alerta estaba pendiente.
    """
    from .auditoria import registrar_auditoria, snapshot   # import diferido

    momento = momento or timezone.now()
    estaba_pendiente = not alerta.Atendida

    with transaction.atomic():
        if estaba_pendiente:
            antes = snapshot(alerta)
            alerta.Atendida = True
            alerta.ID_Usuario = usuario
            alerta.Fecha_hora_atencion = momento
            alerta.save(update_fields=['Atendida', 'ID_Usuario', 'Fecha_hora_atencion'])
            registrar_auditoria(
                usuario, 'Historial de alertas', alerta, 'ATENCION_ALERTA',
                antes, snapshot(alerta),
            )

        # Aunque ya estuviera atendida, se cierran las notificaciones que
        # hubieran quedado abiertas (por ejemplo, de antes de este cambio).
        cerrar_notificaciones(clave_de_alerta(alerta), momento)

    return estaba_pendiente


def sincronizar_atendidas():
    """Cierra las notificaciones de alertas que ya están atendidas.

    Arregla los datos de antes de la sincronización; se puede ejecutar
    las veces que haga falta (no cambia nada si ya está todo al día).
    """
    from .models import Alertas

    cerradas = 0
    for alerta in Alertas.objects.filter(Atendida=True):
        cerradas += cerrar_notificaciones(clave_de_alerta(alerta), alerta.Fecha_hora_atencion)
    return cerradas
