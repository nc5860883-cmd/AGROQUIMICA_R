import { useState } from 'react'
import { usePantalla } from '../hooks/usePantalla'
import { obtenerPantalla } from '../servicios/api'
import Resumen from '../componentes/Resumen'
import Paginacion from '../componentes/Paginacion'
import Modal from '../componentes/Modal'
import { Encabezado, EstadoPantalla, Icono } from '../componentes/Comunes'
import { fecha } from '../servicios/formato'

const FILTROS_VACIOS = { entidad: '', accion: '', usuario: '', fecha_desde: '', fecha_hasta: '', page: 1, por_pagina: '' }

// Mismas acciones (y textos) que el filtro del sistema original.
const ACCIONES = {
  CREACION: 'Creación',
  MODIFICACION: 'Modificación',
  ELIMINACION: 'Eliminación',
  ANULACION: 'Anulación',
  INICIO_SESION: 'Inicio de sesión',
  CIERRE_SESION: 'Cierre de sesión',
  BLOQUEO_INACTIVIDAD: 'Bloqueo por inactividad',
  EGRESO_STOCK: 'Egreso de stock',
  EGRESO_VENCIMIENTO: 'Egreso por vencimiento',
  INGRESO_LOTE: 'Ingreso de lote',
  DESCARGA_PDF: 'Descarga de PDF',
  ASIGNACION_PERFIL: 'Asignación de perfil',
  ASIGNACION_PERMISOS: 'Asignación de permisos',
  ATENCION_ALERTA: 'Atención de alerta',
  ATENCION_NOTIFICACION: 'Atención de notificación',
  BAJA: 'Baja',
  ACTIVACION: 'Activación',
  RESET_CONTRASENA: 'Restablecimiento de contraseña',
  ENVIO_RECUPERACION: 'Envío de enlace de recuperación',
  RECUPERA_CONTRASENA: 'Recuperación de contraseña',
}

const textoAccion = (a = '') => ACCIONES[a]
  || a.replaceAll('_', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())

function colorAccion(a = '') {
  if (a.includes('ELIMIN') || a.includes('BAJA') || a.includes('ANUL')) return 'danger'
  if (a.includes('CREA') || a.includes('ACTIV')) return 'success'
  if (a.includes('MODIF') || a.includes('CAMBIO')) return 'primary'
  return 'secondary'
}

// Valor legible para mostrar en la tabla de cambios.
const mostrar = (v) => (v === null || v === undefined || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v))

function Auditoria() {
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const { datos, cargando, error } = usePantalla('auditoria/', filtros)
  const [detalle, setDetalle] = useState(null)

  const filtrar = (campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor, page: 1 }))

  const verDetalle = async (id) => {
    setDetalle({ cargando: true })
    const r = await obtenerPantalla(`auditoria/detalle/${id}/`)
    setDetalle(r.ok ? r.datos : { error: 'No se pudo cargar el detalle.' })
  }

  if (!datos) return <EstadoPantalla cargando={cargando} error={error} datos={datos} />

  const registros = datos.pagina?.items || []

  return (
    <div>
      <Encabezado icono="auditoria" titulo="Auditoría" subtitulo="Registro de las acciones realizadas por los usuarios en el sistema." />

      <Resumen items={datos.resumen} />

      <section className="av-filtros">
          <div className="av-filtro">
            <label>Sección</label>
            <select className="form-select" value={filtros.entidad} onChange={(e) => filtrar('entidad', e.target.value)}>
              <option value="">Todas</option>
              {(datos.entidades || []).map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div className="av-filtro">
            <label>Acción</label>
            <select className="form-select" value={filtros.accion} onChange={(e) => filtrar('accion', e.target.value)}>
              <option value="">Todas</option>
              {Object.entries(ACCIONES).map(([a, t]) => <option key={a} value={a}>{t}</option>)}
            </select>
          </div>
          <div className="av-filtro">
            <label>Usuario</label>
            <select className="form-select" value={filtros.usuario} onChange={(e) => filtrar('usuario', e.target.value)}>
              <option value="">Todos</option>
              {(datos.usuarios || []).map((u) => <option key={u.ID_Usuario} value={u.ID_Usuario}>{u.Usuario}</option>)}
            </select>
          </div>
          <div className="av-filtro">
            <label>Desde</label>
            <input type="date" className="form-control" value={filtros.fecha_desde} onChange={(e) => filtrar('fecha_desde', e.target.value)} />
          </div>
          <div className="av-filtro">
            <label>Hasta</label>
            <input type="date" className="form-control" value={filtros.fecha_hasta} onChange={(e) => filtrar('fecha_hasta', e.target.value)} />
          </div>
          <div className="av-filtro-boton">
            <button type="button" className="btn btn-outline-secondary w-100" onClick={() => setFiltros(FILTROS_VACIOS)}>Limpiar</button>
          </div>
      </section>

      <section className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle av-filas mb-0">
            <thead>
              <tr><th>Fecha y hora</th><th>Usuario</th><th>Perfil</th><th>Sección</th><th>Registro</th><th>Acción</th><th>Detalle</th></tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.ID_Log}>
                  <td>{fecha(r.Fecha_hora, true)}</td>
                  <td>{r.ID_Usuario ? `${r.ID_Usuario.Apellido_usuario}, ${r.ID_Usuario.Nombre_usuario}` : 'Sistema'}</td>
                  <td>{r.ID_Usuario?.ID_Perfil?.Nombre_perfil || '—'}</td>
                  <td>{r.Seccion}</td>
                  <td>{r.nombre_registro || `#${r.ID_Registro}`}</td>
                  <td><span className={`badge rounded-pill text-bg-${colorAccion(r.Accion)}`}>{textoAccion(r.Accion)}</span></td>
                  <td>
                    <button type="button" className="btn btn-outline-secondary av-btn-ico" title="Ver detalle" onClick={() => verDetalle(r.ID_Log)}>
                      <Icono nombre="ver" />
                    </button>
                  </td>
                </tr>
              ))}
              {registros.length === 0 && (
                <tr><td colSpan={7} className="av-vacio">No hay registros para mostrar.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card-footer bg-body">
          <Paginacion pagina={datos.pagina}
            onPagina={(n) => setFiltros((f) => ({ ...f, page: n }))}
            onPorPagina={(n) => setFiltros((f) => ({ ...f, por_pagina: n, page: 1 }))} />
        </div>
      </section>

      <Modal abierto={Boolean(detalle)} titulo="Detalle del registro" icono="auditoria" onCerrar={() => setDetalle(null)} tamano="modal-lg">
        {detalle?.cargando && <p className="text-center my-3">Cargando…</p>}
        {detalle?.error && <div className="alert alert-danger">{detalle.error}</div>}
        {detalle && !detalle.cargando && !detalle.error && (
          <>
            <dl className="row small">
              <dt className="col-sm-3">Fecha</dt><dd className="col-sm-9">{detalle.fecha} {detalle.hora}</dd>
              <dt className="col-sm-3">Usuario</dt><dd className="col-sm-9">{detalle.usuario} ({detalle.perfil})</dd>
              <dt className="col-sm-3">Sección</dt><dd className="col-sm-9">{detalle.entidad}</dd>
              <dt className="col-sm-3">Registro</dt><dd className="col-sm-9">{detalle.nombre_registro || `#${detalle.registro}`}</dd>
              <dt className="col-sm-3">Acción</dt><dd className="col-sm-9">{textoAccion(detalle.accion)}</dd>
            </dl>

            {(detalle.cambios || []).length > 0 ? (
              <table className="table table-sm">
                <thead><tr><th>Campo</th><th>Antes</th><th>Después</th></tr></thead>
                <tbody>
                  {detalle.cambios.map((c, i) => (
                    <tr key={c.campo || i}>
                      <td className="fw-semibold">{c.campo || c.etiqueta}</td>
                      <td className="text-danger">{mostrar(c.antes)}</td>
                      <td className="text-success">{mostrar(c.despues)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (detalle.datos || []).length > 0 ? (
              <table className="table table-sm">
                <tbody>
                  {detalle.datos.map((d, i) => (
                    <tr key={d.campo || i}><td className="fw-semibold">{d.campo || d.etiqueta}</td><td>{mostrar(d.valor)}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="table table-sm">
                <tbody>
                  {Object.entries({ ...detalle.anteriores, ...detalle.actuales }).map(([k]) => (
                    <tr key={k}>
                      <td className="fw-semibold">{k}</td>
                      <td>{mostrar(detalle.anteriores?.[k])}</td>
                      <td>{mostrar(detalle.actuales?.[k])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}

export default Auditoria
