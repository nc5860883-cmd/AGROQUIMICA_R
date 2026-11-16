import { useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { usePantalla } from '../hooks/usePantalla'
import Paginacion from '../componentes/Paginacion'
import {
  BarraFiltros, Filtro, Encabezado, EstadoPantalla, Icono,
} from '../componentes/Comunes'
import { urlArchivo } from '../servicios/api'

const FILTROS_VACIOS = { desde: '', hasta: '', tipo: '', proveedor: '', page: 1, por_pagina: '' }

// Alineación de cada columna según su formato.
const alinear = (formato) => (formato === 'texto' ? '' : 'text-end')

function ReportesConsolidados() {
  // Ruta dinámica: /reportes/consolidados/:clave  (ej. compras-ventas)
  const { clave } = useParams()
  const ruta = clave ? `reportes/consolidados/${clave}/` : 'reportes/consolidados/'
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const { datos, cargando, error } = usePantalla(ruta, filtros)

  const filtrar = (campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor, page: 1 }))

  if (!datos) return <EstadoPantalla cargando={cargando} error={error} datos={datos} />

  const { reporte } = datos
  const filas = datos.pagina?.items || []
  const actual = datos.clave || clave
  const pdf = { ...filtros, page: '', por_pagina: '', formato: 'pdf' }

  return (
    <div>
      <Encabezado icono="tabla" titulo="Reportes consolidados" subtitulo="Información cruzada de compras, ventas, vencimientos y proveedores.">
        <a className="btn btn-success d-inline-flex align-items-center gap-2" target="_blank" rel="noreferrer"
          href={urlArchivo(`reportes/consolidados/${actual}/`, pdf)}>
          <Icono nombre="pdf" /> Descargar PDF
        </a>
      </Encabezado>

      {/* Un enlace por reporte visible (NavLink marca el activo). */}
      <nav className="av-pestanas">
        {(datos.visibles || []).map(([c, info]) => (
          <NavLink key={c} to={`/reportes/consolidados/${c}`}
            className={({ isActive }) => (isActive || (!clave && c === actual) ? 'active' : '')}
            onClick={() => setFiltros(FILTROS_VACIOS)}>
            {info.titulo}
          </NavLink>
        ))}
      </nav>

      <section className="card mb-3">
        <div className="card-body">
          <h2 className="h5 mb-1">{reporte.titulo}</h2>
          <p className="text-body-secondary small mb-1">{reporte.descripcion}</p>
          <p className="small mb-0"><strong>Procesos:</strong> {reporte.procesos}</p>
        </div>
      </section>

      <BarraFiltros>
        <Filtro etiqueta="Desde" tamano="chico">
          <input type="date" className="form-control" value={filtros.desde || datos.filtros?.desde || ''}
            onChange={(e) => filtrar('desde', e.target.value)} />
        </Filtro>
        <Filtro etiqueta="Hasta" tamano="chico">
          <input type="date" className="form-control" value={filtros.hasta || datos.filtros?.hasta || ''}
            onChange={(e) => filtrar('hasta', e.target.value)} />
        </Filtro>
        <Filtro etiqueta="Tipo de producto">
          <select className="form-select" value={filtros.tipo} onChange={(e) => filtrar('tipo', e.target.value)}>
            <option value="">Todos</option>
            {(datos.tipos || []).map((t) => <option key={t.ID_Tipo_producto} value={t.ID_Tipo_producto}>{t.Nombre_tipo_producto}</option>)}
          </select>
        </Filtro>
        <Filtro etiqueta="Proveedor">
          <select className="form-select" value={filtros.proveedor} onChange={(e) => filtrar('proveedor', e.target.value)}>
            <option value="">Todos</option>
            {(datos.proveedores || []).map((p) => <option key={p.ID_Proveedor} value={p.ID_Proveedor}>{p.nombre_proveedor}</option>)}
          </select>
        </Filtro>
        <div className="av-filtro-boton">
          <button type="button" className="btn btn-outline-secondary" onClick={() => setFiltros(FILTROS_VACIOS)}>
            <Icono nombre="limpiar" /> Limpiar
          </button>
        </div>
      </BarraFiltros>
      <p className="small text-body-secondary mt-n2 mb-3">{datos.texto_filtros}</p>

      <section className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle av-filas mb-0">
            <thead>
              <tr>{(datos.columnas || []).map(([c, titulo, formato]) => <th key={c} className={alinear(formato)}>{titulo}</th>)}</tr>
            </thead>
            <tbody>
              {filas.map((fila, i) => (
                <tr key={`${datos.pagina.pagina}-${i}`}>
                  {fila.map(([valor, formato], j) => <td key={j} className={alinear(formato)}>{valor}</td>)}
                </tr>
              ))}
              {filas.length === 0 && (
                <tr><td colSpan={(datos.columnas || []).length || 1} className="av-vacio">Sin datos para el período elegido.</td></tr>
              )}
            </tbody>
            {filas.length > 0 && datos.totales && (
              <tfoot>
                <tr className="fw-bold">
                  {datos.totales.map(([valor, formato], j) => <td key={j} className={alinear(formato)}>{valor}</td>)}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="card-footer bg-body">
          <Paginacion pagina={datos.pagina}
            onPagina={(n) => setFiltros((f) => ({ ...f, page: n }))}
            onPorPagina={(n) => setFiltros((f) => ({ ...f, por_pagina: n, page: 1 }))} />
        </div>
      </section>
    </div>
  )
}

export default ReportesConsolidados
