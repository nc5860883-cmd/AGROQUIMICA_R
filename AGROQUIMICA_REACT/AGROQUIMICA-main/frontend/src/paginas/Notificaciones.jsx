// ============================================================
// NOTIFICACIONES
// Bandeja completa de notificaciones del perfil del usuario (vencimientos,
// stock mínimo, egresos inusuales), con filtros y paginación.
// ============================================================

import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { usePantalla } from '../hooks/usePantalla'
import Paginacion from '../componentes/Paginacion'
import {
  Filtro, BarraFiltros, Encabezado, EstadoPantalla, Icono,
} from '../componentes/Comunes'
import { fecha } from '../servicios/formato'

function Notificaciones() {
  const { ejecutar } = useOutletContext()
  // Filtros de la lista (estado, tipo, página) y datos que devuelve Django
  const [filtros, setFiltros] = useState({ estado: '', tipo: '', page: 1, por_pagina: '' })
  const { datos, cargando, error, recargar } = usePantalla('notificaciones/', filtros)

  // Marca una notificación como leída
  const leer = async (n) => {
    const r = await ejecutar(`notificaciones/${n.ID_Notificacion}/leer/`)
    if (r.ok) {
      recargar()
      window.dispatchEvent(new CustomEvent('av:notificaciones'))
    }
  }

  // Marca todas las notificaciones como leídas
  const leerTodas = async () => {
    const r = await ejecutar('notificaciones/leer-todas/')
    if (r.ok) {
      recargar()
      window.dispatchEvent(new CustomEvent('av:notificaciones'))
    }
  }

  // Mientras cargan los datos (o si hay error) se muestra el estado de carga
  if (!datos) return <EstadoPantalla cargando={cargando} error={error} datos={datos} />

  const lista = datos.pagina?.items || []

  return (
    <div>
      <Encabezado icono="campana" titulo="Notificaciones" subtitulo={datos.no_leidas ? `${datos.no_leidas} sin leer` : 'Todo al día'}>
        {datos.no_leidas > 0 && (
          <button type="button" className="btn btn-outline-success" onClick={leerTodas}>Marcar todas como leídas</button>
        )}
      </Encabezado>

      {/* Filtros: leídas / no leídas y tipo de notificación */}
      <BarraFiltros total={`${datos.pagina?.total || 0} notificación(es)`}>
        <Filtro etiqueta="Estado" tamano="chico">
          <select className="form-select" value={filtros.estado}
            onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value, page: 1 }))}>
            <option value="">Todas</option>
            <option value="no_leidas">Sin leer</option>
            <option value="leidas">Leídas</option>
          </select>
        </Filtro>
        <Filtro etiqueta="Tipo" tamano="chico">
          <select className="form-select" value={filtros.tipo}
            onChange={(e) => setFiltros((f) => ({ ...f, tipo: e.target.value, page: 1 }))}>
            <option value="">Todos</option>
            {(datos.tipos || []).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Filtro>
      </BarraFiltros>

      {/* Lista de notificaciones */}
      <section className="card border-0 shadow-sm">
        <ul className="list-group list-group-flush">
          {lista.map((n) => (
            <li key={n.ID_Notificacion} className={'list-group-item d-flex gap-3 align-items-start' + (n.Leida ? '' : ' bg-success-subtle')}>
              <span className={`badge rounded-pill mt-1 ${n.Tipo === 'Vencimiento' ? 'text-bg-warning' : 'text-bg-danger'}`}>{n.Tipo}</span>
              <div className="flex-fill">
                <div className={n.Leida ? '' : 'fw-semibold'}>{n.Mensaje}</div>
                <small className="text-body-secondary">
                  {fecha(n.Fecha, true)}
                  {n.Leida && n.Fecha_lectura && <> · Leída {fecha(n.Fecha_lectura, true)}</>}
                </small>
              </div>
              {!n.Leida && (
                <button type="button" className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1" onClick={() => leer(n)}>
                  <Icono nombre="check" /> Leída
                </button>
              )}
            </li>
          ))}
          {lista.length === 0 && <li className="list-group-item av-vacio">No hay notificaciones.</li>}
        </ul>
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

export default Notificaciones
