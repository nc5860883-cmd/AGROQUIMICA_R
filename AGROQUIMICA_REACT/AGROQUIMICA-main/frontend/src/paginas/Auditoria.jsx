// ============================================================
// AUDITORÍA
// Registro de todo lo que hacen los usuarios (altas, cambios, bajas,
// inicios de sesión...). Solo para el administrador.
// ============================================================

import { useState } from 'react'
import { usePantalla } from '../hooks/usePantalla'
import { obtenerPantalla } from '../servicios/api'
import Resumen from '../componentes/Resumen'
import Paginacion from '../componentes/Paginacion'
import DetalleAuditoria from '../componentes/DetalleAuditoria'
import { Encabezado, EstadoPantalla, Icono } from '../componentes/Comunes'
import { fecha } from '../servicios/formato'

// Valores iniciales de los filtros
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

// Etiqueta de la acción: cada acción tiene su propio color
// (clases av-accion-* en Moderno.css, con su versión para modo oscuro).
function EtiquetaAccion({ accion = '' }) {
  return (
    <span className={`badge rounded-pill av-accion av-accion-${accion.toLowerCase()}`}>
      {textoAccion(accion)}
    </span>
  )
}


function Auditoria() {
  // Filtros, datos de Django y registro abierto en el detalle
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const { datos, cargando, error } = usePantalla('auditoria/', filtros)
  const [detalle, setDetalle] = useState(null)

  // Cambia un filtro y vuelve a la página 1
  const filtrar = (campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor, page: 1 }))

  // Pide a Django el detalle (antes / después) de un registro
  const verDetalle = async (id) => {
    setDetalle({ cargando: true })
    const r = await obtenerPantalla(`auditoria/detalle/${id}/`)
    setDetalle(r.ok ? r.datos : { error: 'No se pudo cargar el detalle.' })
  }

  // Mientras cargan los datos (o si hay error) se muestra el estado de carga
  if (!datos) return <EstadoPantalla cargando={cargando} error={error} datos={datos} />

  const registros = datos.pagina?.items || []

  return (
    <div>
      <Encabezado icono="auditoria" titulo="Auditoría" subtitulo="Registro de las acciones realizadas por los usuarios en el sistema." />

      {/* Tarjetas de resumen */}
      <Resumen items={datos.resumen} />

      {/* Filtros: entidad, acción, usuario y rango de fechas */}
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

      {/* Tabla de registros de auditoría */}
      <section className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle av-filas mb-0">
            <thead>
              <tr><th>Fecha y hora</th><th>Usuario</th><th>Perfil</th><th>Sección</th><th>Registro</th><th>Acción</th><th className="text-center">Detalle</th></tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.ID_Log}>
                  <td>{fecha(r.Fecha_hora, true)}</td>
                  <td>{r.ID_Usuario ? `${r.ID_Usuario.Apellido_usuario}, ${r.ID_Usuario.Nombre_usuario}` : 'Sistema'}</td>
                  <td>{r.ID_Usuario?.ID_Perfil?.Nombre_perfil || '—'}</td>
                  <td>{r.Seccion}</td>
                  <td>{r.nombre_registro || `#${r.ID_Registro}`}</td>
                  <td><EtiquetaAccion accion={r.Accion} /></td>
                  <td className="text-center">
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
          {/* Paginación */}
          <Paginacion pagina={datos.pagina}
            onPagina={(n) => setFiltros((f) => ({ ...f, page: n }))}
            onPorPagina={(n) => setFiltros((f) => ({ ...f, por_pagina: n, page: 1 }))} />
        </div>
      </section>

      {/* Ventana con el detalle del registro (datos antes y después del cambio) */}
      <DetalleAuditoria detalle={detalle} textoAccion={textoAccion} onCerrar={() => setDetalle(null)} />
    </div>
  )
}

export default Auditoria
