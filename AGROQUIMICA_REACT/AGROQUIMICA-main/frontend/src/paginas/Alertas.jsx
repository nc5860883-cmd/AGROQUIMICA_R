// ============================================================
// HISTORIAL DE ALERTAS
// Lista de alertas de vencimiento de lotes y de stock mínimo.
// Permite filtrarlas y marcarlas como atendidas.
// ============================================================

import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { usePantalla } from '../hooks/usePantalla'
import Resumen from '../componentes/Resumen'
import Paginacion from '../componentes/Paginacion'
import { Encabezado, EstadoPantalla, Icono } from '../componentes/Comunes'
import { fecha } from '../servicios/formato'

// Valores iniciales de los filtros (sin filtrar, página 1)
const FILTROS_VACIOS = { tipo: '', producto: '', usuario: '', fecha_desde: '', fecha_hasta: '', page: 1, por_pagina: '' }

function Alertas() {
  const { perm, ejecutar } = useOutletContext()
  // Filtros elegidos y datos que devuelve Django según esos filtros
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const { datos, cargando, error, recargar } = usePantalla('historial-alertas/', filtros)

  // Cambia un filtro y vuelve a la página 1
  const filtrar = (campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor, page: 1 }))

  // Marca una alerta como atendida
  const atender = async (alerta) => {
    const r = await ejecutar(`alertas/atender/${alerta.id}/`)
    if (r.ok) recargar()
  }

  // Mientras cargan los datos (o si hay error) se muestra el estado de carga
  if (!datos) return <EstadoPantalla cargando={cargando} error={error} datos={datos} />

  const alertas = datos.pagina?.items || []

  return (
    <div>
      <Encabezado icono="campana" titulo="Historial de alertas" subtitulo="Avisos de vencimiento de lotes y de stock mínimo de productos." />

      {/* Tarjetas de resumen */}
      <Resumen items={datos.resumen} />

      {/* Filtros: tipo, producto, usuario y rango de fechas */}
      <section className="av-filtros">
          <div className="av-filtro">
            <label>Tipo</label>
            <select className="form-select" value={filtros.tipo} onChange={(e) => filtrar('tipo', e.target.value)}>
              <option value="">Todas</option>
              <option value="Vencimiento">Vencimiento</option>
              <option value="Stock mínimo">Stock mínimo</option>
            </select>
          </div>
          <div className="av-filtro">
            <label>Producto</label>
            <select className="form-select" value={filtros.producto} onChange={(e) => filtrar('producto', e.target.value)}>
              <option value="">Todos</option>
              {(datos.productos || []).map((p) => <option key={p.ID_Producto} value={p.ID_Producto}>{p.Nombre_producto}</option>)}
            </select>
          </div>
          {datos.es_admin && (
            <div className="av-filtro">
              <label>Atendida por</label>
              <select className="form-select" value={filtros.usuario} onChange={(e) => filtrar('usuario', e.target.value)}>
                <option value="">Todos</option>
                {(datos.usuarios || []).map((u) => <option key={u.ID_Usuario} value={u.ID_Usuario}>{u.Usuario}</option>)}
              </select>
            </div>
          )}
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

      {/* Tabla de alertas */}
      <section className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle av-filas mb-0">
            <thead>
              <tr>
                <th>Tipo</th><th>Producto</th><th>Lote</th><th>Mensaje</th><th>Cantidad</th>
                <th>Stock mínimo</th><th>Estado</th><th>Atendida por</th>
              </tr>
            </thead>
            <tbody>
              {alertas.map((a) => (
                <tr key={`${a.tipo}-${a.id}`}>
                  <td>
                    <span className={`badge rounded-pill ${a.tipo === 'Vencimiento' ? 'text-bg-warning' : 'text-bg-danger'}`}>{a.tipo}</span>
                    <div className="small text-body-secondary">{fecha(a.fecha, true)}</div>
                  </td>
                  <td>{a.producto?.Nombre_producto || '—'}</td>
                  <td>{a.lote?.Numero_lote || '—'}</td>
                  <td className="small">{a.mensaje}</td>
                  <td>{a.cantidad ?? '—'}</td>
                  <td>{a.stock_minimo ?? '—'}</td>
                  <td>
                    {a.atendida ? (
                      <span className="badge rounded-pill text-bg-success">Atendida</span>
                    ) : perm.atender_alertas ? (
                      <button type="button" className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1" onClick={() => atender(a)}>
                        <Icono nombre="check" /> Marcar atendida
                      </button>
                    ) : (
                      <span className="badge rounded-pill text-bg-secondary">Pendiente</span>
                    )}
                  </td>
                  <td className="small">
                    {a.usuario ? `${a.usuario.Nombre_usuario || ''} ${a.usuario.Apellido_usuario || ''}`.trim() || a.usuario.texto : '—'}
                    {a.fecha_atencion && <div className="text-body-secondary">{fecha(a.fecha_atencion, true)}</div>}
                  </td>
                </tr>
              ))}
              {alertas.length === 0 && (
                <tr><td colSpan={8} className="av-vacio">No hay alertas para mostrar.</td></tr>
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
    </div>
  )
}

export default Alertas
