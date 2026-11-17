// ============================================================
// DETALLE DE UN REGISTRO DE AUDITORÍA
// Ventana que muestra quién hizo qué, cuándo y qué datos cambiaron.
//  - Cabecera: acción (con su color), registro afectado y sección.
//  - Tarjetas: fecha y hora, usuario y perfil, sección.
//  - Contenido según el tipo de acción:
//      cambios -> valor anterior → valor nuevo, campo por campo
//      datos   -> datos guardados (y variaciones "antes / después")
//      ninguno -> inicio / cierre de sesión: solo un mensaje
// Estilos: clases ad-* en Moderno.css (modo claro y oscuro).
// ============================================================

import Modal from './Modal'
import { Icono } from './Comunes'
import { fecha } from '../servicios/formato'

// Nombres legibles de los campos que guarda la auditoría.
const ETIQUETAS = {
  Agregados: 'Permisos agregados',
  Apellido_usuario: 'Apellido',
  Cambiar_contrasena: 'Debe cambiar la contraseña',
  Cantidad: 'Cantidad',
  Cantidad_actual: 'Cantidad actual',
  Cantidad_cajas: 'Cantidad de cajas',
  Cantidad_ingresada: 'Cantidad ingresada',
  Cantidad_lotes: 'Cantidad de lotes',
  Cantidad_presentacion: 'Cantidad por presentación',
  DNI: 'DNI',
  Descripcion_producto: 'Descripción',
  Descripcion_subtipo: 'Descripción',
  Email_usuario: 'Email',
  Estado_perfil: 'Estado',
  Estado_producto: 'Estado',
  Estado_remito: 'Estado',
  Estado_tipo_producto: 'Estado',
  Estado_usuario: 'Estado',
  Fecha_Baja: 'Fecha de baja',
  Fecha_anulacion: 'Fecha de anulación',
  Fecha_ingreso: 'Fecha de ingreso',
  Fecha_remito: 'Fecha del remito',
  Fecha_vencimiento: 'Fecha de vencimiento',
  Foto_usuario: 'Foto',
  ID_Perfil: 'Perfil',
  ID_Producto: 'Producto',
  ID_Proveedor: 'Proveedor',
  ID_Remito: 'Remito',
  ID_Subtipo: 'Subtipo',
  ID_Tipo_producto: 'Tipo de producto',
  ID_Usuario: 'Usuario',
  ID_Usuario_anulacion: 'Anulado por',
  ID_Stock: 'Producto',
  Imagen_producto: 'Imagen',
  Lote: 'Lote',
  Motivo: 'Motivo',
  Motivo_anulacion: 'Motivo de anulación',
  Nombre_perfil: 'Nombre del perfil',
  Nombre_producto: 'Nombre del producto',
  Nombre_subtipo: 'Nombre del subtipo',
  Nombre_tipo_producto: 'Nombre del tipo',
  Nombre_usuario: 'Nombre',
  Numero_lote: 'Número de lote',
  Numero_remito: 'Número de remito',
  Observaciones: 'Observaciones',
  Pantalla: 'Pantalla',
  Perfil: 'Perfil',
  Permisos: 'Permisos',
  Precio: 'Precio',
  Quitados: 'Permisos quitados',
  Stock: 'Stock',
  Stock_minimo: 'Stock mínimo',
  Unidad_medida_producto: 'Unidad de medida',
  Unidades_por_caja: 'Unidades por caja',
  Unidades_por_presentacion: 'Unidades por presentación',
  Usuario: 'Usuario',
  accion: 'Acción',
  direccion_proveedor: 'Dirección',
  email_proveedor: 'Email',
  estado_proveedor: 'Estado',
  nombre_proveedor: 'Nombre del proveedor',
  telefono_proveedor: 'Teléfono',
}

// Campos cuyo valor es una lista separada por comas (se muestran como chips)
const CAMPOS_LISTA = ['Permisos', 'Agregados', 'Quitados']

// Mensaje para las acciones que no guardan datos
const SIN_DATOS = {
  INICIO_SESION: 'El usuario ingresó al sistema con su usuario y contraseña.',
  CIERRE_SESION: 'El usuario salió del sistema cerrando su sesión.',
}

// Campo de la base -> texto legible (ID_Tipo_producto -> "Tipo producto")
function etiqueta(campo = '') {
  if (ETIQUETAS[campo]) return ETIQUETAS[campo]
  const texto = campo.replace(/^ID_/, '').replaceAll('_', ' ').toLowerCase()
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// Valor guardado -> texto legible (Sí/No, Activo/Inactivo, fechas, vacíos)
function valorVisible(campo, valor) {
  if (valor === null || valor === undefined || valor === '') return null
  if (typeof valor === 'boolean') {
    if (/^estado/i.test(campo)) return valor ? 'Activo' : 'Inactivo'
    return valor ? 'Sí' : 'No'
  }
  if (typeof valor === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return fecha(valor)
    if (/^\d{4}-\d{2}-\d{2}T/.test(valor)) return fecha(valor, true)
    return valor
  }
  if (typeof valor === 'object') return JSON.stringify(valor)
  return String(valor)
}

// Muestra un valor: chips para listas, "—" para vacíos
function Valor({ campo, valor }) {
  const texto = valorVisible(campo, valor)
  if (texto === null) return <span className="ad-vacio">Sin dato</span>

  if (CAMPOS_LISTA.includes(campo) && texto.includes(',')) {
    return (
      <span className="ad-chips">
        {texto.split(',').map((t) => t.trim()).filter(Boolean).map((t) => <span key={t} className="ad-chip">{t}</span>)}
      </span>
    )
  }
  return <span className="ad-texto">{texto}</span>
}

// Separa los pares "X_antes" / "X_despues" (ej. Stock_antes, Stock_despues)
// del resto de los datos, para mostrarlos como variación.
function separarVariaciones(datos = []) {
  const porCampo = Object.fromEntries(datos.map((d) => [d.campo, d.valor]))
  const variaciones = []
  const usados = new Set()

  datos.forEach(({ campo }) => {
    const m = campo.match(/^(.+)_antes$/)
    if (m && `${m[1]}_despues` in porCampo) {
      variaciones.push({ campo: m[1], antes: porCampo[campo], despues: porCampo[`${m[1]}_despues`] })
      usados.add(campo)
      usados.add(`${m[1]}_despues`)
    }
  })

  return { variaciones, resto: datos.filter((d) => !usados.has(d.campo)) }
}

// Diferencia numérica entre antes y después (ej. -10), o null
function diferencia(antes, despues) {
  const a = Number(antes)
  const d = Number(despues)
  if (antes === '' || despues === '' || Number.isNaN(a) || Number.isNaN(d)) return null
  return d - a
}

// Fila "antes → después"
function FilaCambio({ campo, antes, despues }) {
  const dif = diferencia(antes, despues)
  return (
    <li className="ad-cambio">
      <div className="ad-cambio-campo">
        {etiqueta(campo)}
        {dif !== null && dif !== 0 && (
          <span className={`ad-dif ${dif > 0 ? 'sube' : 'baja'}`}>{dif > 0 ? `+${dif}` : dif}</span>
        )}
      </div>
      <div className="ad-cambio-valores">
        <div className="ad-valor ad-antes">
          <span className="ad-valor-rotulo">Antes</span>
          <Valor campo={campo} valor={antes} />
        </div>
        <span className="ad-flecha" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
        </span>
        <div className="ad-valor ad-despues">
          <span className="ad-valor-rotulo">Después</span>
          <Valor campo={campo} valor={despues} />
        </div>
      </div>
    </li>
  )
}

// Contenido principal según el tipo de acción
function Contenido({ detalle }) {
  const cambios = detalle.cambios || []
  const { variaciones, resto } = separarVariaciones(detalle.datos || [])

  if (cambios.length > 0) {
    return (
      <section className="ad-seccion">
        <h3 className="ad-seccion-titulo">
          Cambios realizados <span className="ad-contador">{cambios.length}</span>
        </h3>
        <ul className="ad-cambios">
          {cambios.map((c) => <FilaCambio key={c.campo} campo={c.campo} antes={c.antes} despues={c.despues} />)}
        </ul>
      </section>
    )
  }

  if (variaciones.length > 0 || resto.length > 0) {
    return (
      <>
        {variaciones.length > 0 && (
          <section className="ad-seccion">
            <h3 className="ad-seccion-titulo">Variaciones</h3>
            <ul className="ad-cambios">
              {variaciones.map((v) => <FilaCambio key={v.campo} {...v} />)}
            </ul>
          </section>
        )}
        {resto.length > 0 && (
          <section className="ad-seccion">
            <h3 className="ad-seccion-titulo">Datos registrados</h3>
            <dl className="ad-datos">
              {resto.map((d) => (
                <div key={d.campo} className={`ad-dato${CAMPOS_LISTA.includes(d.campo) || String(d.valor ?? '').length > 40 ? ' ancho' : ''}`}>
                  <dt>{etiqueta(d.campo)}</dt>
                  <dd><Valor campo={d.campo} valor={d.valor} /></dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </>
    )
  }

  return (
    <div className="ad-sin-datos">
      <span className="ad-sin-datos-icono"><Icono nombre={detalle.accion === 'CIERRE_SESION' ? 'baja' : 'llave'} /></span>
      <p>{SIN_DATOS[detalle.accion] || 'Esta acción no guarda datos adicionales.'}</p>
    </div>
  )
}

function DetalleAuditoria({ detalle, textoAccion, onCerrar }) {
  const listo = detalle && !detalle.cargando && !detalle.error
  const clase = listo ? (detalle.accion || '').toLowerCase() : ''

  return (
    <Modal
      abierto={Boolean(detalle)}
      titulo="Detalle del registro"
      subtitulo={listo ? `Registro de auditoría N.º ${detalle.id}` : undefined}
      icono="auditoria"
      onCerrar={onCerrar}
      tamano="modal-lg"
      pie={<button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>Cerrar</button>}
    >
      {detalle?.cargando && (
        <div className="ad-cargando"><span className="spinner-border spinner-border-sm" /> Cargando detalle…</div>
      )}
      {detalle?.error && <div className="alert alert-danger mb-0">{detalle.error}</div>}

      {listo && (
        <div className="ad">
          {/* Cabecera: acción con su color y registro afectado */}
          <header className={`ad-hero av-accion av-accion-${clase}`}>
            <span className={`badge rounded-pill av-accion av-accion-${clase}`}>{textoAccion(detalle.accion)}</span>
            <h3 className="ad-hero-titulo">{detalle.nombre_registro || `Registro #${detalle.registro}`}</h3>
            <span className="ad-hero-sub">{detalle.entidad}</span>
          </header>

          {/* Quién, cuándo y dónde */}
          <div className="ad-meta">
            <div className="ad-meta-item">
              <span className="ad-meta-icono"><Icono nombre="calendario" /></span>
              <div>
                <span className="ad-meta-rotulo">Fecha y hora</span>
                <strong>{detalle.fecha}</strong>
                <span className="ad-meta-extra">{detalle.hora} h</span>
              </div>
            </div>
            <div className="ad-meta-item">
              <span className="ad-meta-icono"><Icono nombre="usuario" /></span>
              <div>
                <span className="ad-meta-rotulo">Usuario</span>
                <strong>{detalle.usuario}</strong>
                <span className="ad-meta-extra">{detalle.perfil}</span>
              </div>
            </div>
            <div className="ad-meta-item">
              <span className="ad-meta-icono"><Icono nombre="etiqueta" /></span>
              <div>
                <span className="ad-meta-rotulo">Registro afectado</span>
                <strong>ID {detalle.registro}</strong>
                <span className="ad-meta-extra">{detalle.entidad}</span>
              </div>
            </div>
          </div>

          <Contenido detalle={detalle} />
        </div>
      )}
    </Modal>
  )
}

export default DetalleAuditoria
