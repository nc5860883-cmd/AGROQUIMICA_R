import { useEffect, useMemo, useState } from 'react'
import { usePantalla } from '../hooks/usePantalla'
import { obtenerPantalla } from '../servicios/api'
import Grafico from '../componentes/Grafico'
import { Encabezado, EstadoPantalla } from '../componentes/Comunes'

// ¿El producto cumple los filtros de tipo, subtipo y proveedor?
function cumple(p, f) {
  if (f.tipo && String(p.tipo_id) !== f.tipo) return false
  if (f.subtipo && String(p.subtipo_id) !== f.subtipo) return false
  if (f.proveedor && !(p.proveedores || []).map(String).includes(f.proveedor)) return false
  return true
}

function Tarjeta({ titulo, subtitulo, children }) {
  return (
    <section className="card border-0 shadow-sm h-100">
      <div className="card-header bg-body">
        <h2 className="h6 mb-0">{titulo}</h2>
        {subtitulo && <small className="text-body-secondary">{subtitulo}</small>}
      </div>
      <div className="card-body">{children}</div>
    </section>
  )
}

function Reportes() {
  const { datos, cargando, error } = usePantalla('reportes/')
  const [filtros, setFiltros] = useState({ tipo: '', subtipo: '', proveedor: '' })
  const [rango, setRango] = useState({ desde: '', hasta: '' })
  const [evolucion, setEvolucion] = useState(null)
  const [errorEvolucion, setErrorEvolucion] = useState('')

  const g = datos?.graficos

  // Evolución de ventas e ingresos: se vuelve a pedir cuando cambian los filtros o el rango.
  useEffect(() => {
    if (!g) return undefined
    let vigente = true
    obtenerPantalla('reportes/evolucion/', { ...filtros, ...rango })
      .then((r) => {
        if (!vigente) return
        if (r.ok) {
          setEvolucion(r.datos)
          setErrorEvolucion('')
        } else {
          setErrorEvolucion(r.mensajes?.[0]?.texto || 'No se pudo calcular la evolución.')
        }
      })
    return () => {
      vigente = false
    }
  }, [g, filtros, rango])

  const subtipos = useMemo(
    () => (g?.tipos || []).find((t) => String(t.id) === filtros.tipo)?.subtipos || [],
    [g, filtros.tipo],
  )

  const stock = useMemo(() => (g?.stock || []).filter((p) => cumple(p, filtros)), [g, filtros])

  const opcionesStock = useMemo(() => ({
    chart: { type: 'bar' },
    series: [
      { name: 'Stock actual', data: stock.map((p) => p.stock) },
      { name: 'Stock mínimo', data: stock.map((p) => p.minimo) },
    ],
    xaxis: { categories: stock.map((p) => p.nombre) },
    colors: ['#2e9d66', '#f5c400'],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
    dataLabels: { enabled: false },
    legend: { position: 'top' },
  }), [stock])

  const opcionesTramos = useMemo(() => {
    const tramos = g?.tramos
    if (!tramos) return null
    const valores = tramos.etiquetas.map((_, i) => (tramos.productos || [])
      .filter((p) => cumple(p, filtros))
      .reduce((suma, p) => suma + (p.valores[i] || 0), 0))
    return {
      chart: { type: 'bar' },
      series: [{ name: 'Unidades', data: valores }],
      xaxis: { categories: tramos.etiquetas },
      colors: tramos.colores,
      plotOptions: { bar: { distributed: true, borderRadius: 4 } },
      legend: { show: false },
      dataLabels: { enabled: true },
    }
  }, [g, filtros])

  const opcionesEvolucion = useMemo(() => {
    if (!evolucion) return null
    return {
      chart: { type: 'area' },
      series: [
        { name: 'Ventas', data: evolucion.ventas },
        { name: 'Ingresos', data: evolucion.ingresos },
      ],
      xaxis: { categories: evolucion.meses || evolucion.etiquetas || [] },
      colors: ['#dc3545', '#2e9d66'],
      stroke: { curve: 'smooth', width: 3 },
      fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.05 } },
      dataLabels: { enabled: false },
      legend: { position: 'top' },
    }
  }, [evolucion])

  const vencidos = (g?.vencidos || []).filter((v) => cumple(v, filtros))

  if (!datos) return <EstadoPantalla cargando={cargando} error={error} datos={datos} />

  return (
    <div>
      <Encabezado icono="grafico" titulo="Reportes" subtitulo="Stock, vencimientos y evolución de ventas e ingresos." />

      <section className="av-filtros">
          <div className="av-filtro">
            <label>Tipo de producto</label>
            <select className="form-select" value={filtros.tipo} onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value, subtipo: '' })}>
              <option value="">Todos</option>
              {g.tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>
          <div className="av-filtro">
            <label>Subtipo</label>
            <select className="form-select" value={filtros.subtipo} disabled={!subtipos.length}
              onChange={(e) => setFiltros({ ...filtros, subtipo: e.target.value })}>
              <option value="">Todos</option>
              {subtipos.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div className="av-filtro">
            <label>Proveedor</label>
            <select className="form-select" value={filtros.proveedor} onChange={(e) => setFiltros({ ...filtros, proveedor: e.target.value })}>
              <option value="">Todos</option>
              {g.proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="av-filtro-boton">
            <button type="button" className="btn btn-outline-secondary w-100"
              onClick={() => { setFiltros({ tipo: '', subtipo: '', proveedor: '' }); setRango({ desde: '', hasta: '' }) }}>
              Limpiar filtros
            </button>
          </div>
      </section>

      <div className="row g-4">
        <div className="col-xl-7">
          <Tarjeta titulo="Stock actual vs. stock mínimo" subtitulo={`${stock.length} producto(s)`}>
            {stock.length ? <Grafico opciones={opcionesStock} /> : <p className="text-body-secondary mb-0">No hay productos con esos filtros.</p>}
          </Tarjeta>
        </div>
        <div className="col-xl-5">
          <Tarjeta titulo="Unidades por vencimiento" subtitulo="Lotes con stock según cuánto falta para que venzan">
            {opcionesTramos && <Grafico opciones={opcionesTramos} />}
          </Tarjeta>
        </div>

        <div className="col-12">
          <Tarjeta titulo="Evolución de ventas e ingresos"
            subtitulo={rango.desde || rango.hasta ? 'Rango elegido' : 'Últimos 12 meses'}>
            <div className="row g-2 mb-3">
              <div className="col-6 col-md-3">
                <input type="date" className="form-control" value={rango.desde} onChange={(e) => setRango({ ...rango, desde: e.target.value })} aria-label="Desde" />
              </div>
              <div className="col-6 col-md-3">
                <input type="date" className="form-control" value={rango.hasta} onChange={(e) => setRango({ ...rango, hasta: e.target.value })} aria-label="Hasta" />
              </div>
            </div>
            {errorEvolucion && <div className="alert alert-warning py-2">{errorEvolucion}</div>}
            {opcionesEvolucion && <Grafico opciones={opcionesEvolucion} alto={300} />}
          </Tarjeta>
        </div>

        <div className="col-12">
          <Tarjeta titulo="Productos con lotes vencidos" subtitulo="Unidades vencidas que siguen en stock">
            {vencidos.length === 0 ? (
              <p className="text-body-secondary mb-0">No hay unidades vencidas en stock.</p>
            ) : (
              <table className="table table-sm mb-0">
                <thead><tr><th>Producto</th><th className="text-end">Unidades vencidas</th></tr></thead>
                <tbody>
                  {vencidos.map((v) => (
                    <tr key={v.nombre}><td>{v.nombre}</td><td className="text-end text-danger fw-semibold">{v.unidades}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </Tarjeta>
        </div>
      </div>
    </div>
  )
}

export default Reportes
