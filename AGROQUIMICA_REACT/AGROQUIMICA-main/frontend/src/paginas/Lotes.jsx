// ============================================================
// LOTES
// Consulta de los lotes ingresados (con vencimiento y stock actual).
// Los lotes se crean desde Remitos; acá solo se consultan y se dan
// de baja los vencidos.
// ============================================================

import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { usePantalla } from '../hooks/usePantalla'
import Resumen from '../componentes/Resumen'
import Paginacion from '../componentes/Paginacion'
import Modal from '../componentes/Modal'
import {
  Buscador, Filtro, BarraFiltros, Encabezado, ErrorCampo, EstadoPantalla, Icono,
} from '../componentes/Comunes'
import { fecha } from '../servicios/formato'
import { reglaTexto } from '../servicios/validaciones'

// Estado del lote según su vencimiento y su stock.
function estadoLote(l, hoy, limite) {
  if (!l.Cantidad_actual) return { texto: 'Agotado', color: 'secondary' }
  if (l.Fecha_vencimiento < hoy) return { texto: 'Vencido', color: 'danger' }
  if (l.Fecha_vencimiento <= limite) return { texto: 'Por vencer', color: 'warning' }
  return { texto: 'Vigente', color: 'success' }
}

// Ventana para dar de baja un lote vencido (pide el motivo)
function FormBaja({ lote, onCerrar, onGuardar }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  // Al abrir la ventana, se limpia el formulario
  useEffect(() => {
    if (lote) reset({ observacion: '' })
  }, [lote, reset])

  return (
    <Modal abierto={Boolean(lote)} titulo="Dar de baja por vencimiento" icono="alerta" variante="peligro" onCerrar={onCerrar}
      pie={(
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>Cancelar</button>
          <button type="submit" form="formBaja" className="btn btn-danger" disabled={isSubmitting}>Dar de baja</button>
        </>
      )}>
      {lote && (
        <form id="formBaja" onSubmit={handleSubmit(onGuardar)} noValidate>
          <div className="av-ficha">
            <div><span>Producto</span><strong>{lote.ID_Producto?.Nombre_producto}</strong></div>
            <div><span>Lote</span><strong>{lote.Numero_lote}</strong></div>
            <div><span>Remito</span><strong>{lote.ID_Remito?.Numero_remito || '—'}</strong></div>
            <div><span>Proveedor</span><strong>{lote.ID_Remito?.ID_Proveedor?.nombre_proveedor || 'Sin atribuir'}</strong></div>
            <div><span>Venció</span><strong>{fecha(lote.Fecha_vencimiento)}</strong></div>
            <div><span>Cantidad</span><strong className="text-danger">{lote.Cantidad_actual} unidades</strong></div>
          </div>
          <p className="small">Se descontarán del stock y quedará registrado como egreso por vencimiento.</p>
          <label className="form-label">Observación (opcional)</label>
          <textarea rows={2} className={'form-control' + (errors.observacion ? ' is-invalid' : '')}
            {...register('observacion', reglaTexto('La observación', 200))} />
          <ErrorCampo error={errors.observacion} />
        </form>
      )}
    </Modal>
  )
}

// Pantalla principal de lotes
function Lotes() {
  const { perm, ejecutar } = useOutletContext()
  // Filtros (búsqueda, proveedor, página), texto del buscador y lote a dar de baja
  const [filtros, setFiltros] = useState({ q: '', proveedor: '', page: 1, por_pagina: '' })
  const [texto, setTexto] = useState('')
  const { datos, cargando, error, recargar } = usePantalla('ingreso-lote/', filtros)
  const [baja, setBaja] = useState(null)

  // Espera a que el usuario deje de escribir para buscar (evita un pedido por tecla)
  useEffect(() => {
    const t = setTimeout(() => setFiltros((f) => (f.q === texto.trim() ? f : { ...f, q: texto.trim(), page: 1 })), 400)
    return () => clearTimeout(t)
  }, [texto])

  // Mientras cargan los datos (o si hay error) se muestra el estado de carga
  if (!datos) return <EstadoPantalla cargando={cargando} error={error} datos={datos} />

  const lotes = datos.pagina?.items || []

  return (
    <div>
      <Encabezado icono="caja" titulo="Lotes" subtitulo="Lotes ingresados con los remitos, con su vencimiento y stock actual. El alta se hace desde Remitos." />

      {/* Tarjetas de resumen */}
      <Resumen items={datos.resumen} />

      {/* Filtros: buscador y proveedor */}
      <BarraFiltros total={`${datos.pagina?.total || 0} lote(s)`}>
        <Buscador valor={texto} onCambiar={setTexto} placeholder="Buscar por lote, producto o remito..." />
        <Filtro etiqueta="Proveedor">
          <select className="form-select" value={filtros.proveedor}
            onChange={(e) => setFiltros((f) => ({ ...f, proveedor: e.target.value, page: 1 }))}>
            <option value="">Todos los proveedores</option>
            {(datos.proveedores || []).map((p) => <option key={p.ID_Proveedor} value={p.ID_Proveedor}>{p.nombre_proveedor}</option>)}
          </select>
        </Filtro>
      </BarraFiltros>

      {/* Tabla de lotes */}
      <section className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle av-filas mb-0">
            <thead>
              <tr>
                <th>Número de lote</th><th>Producto</th><th>Proveedor</th><th>Remito</th>
                <th>Fecha de ingreso</th><th>Fecha de vencimiento</th><th>Cantidad ingresada</th>
                <th>Cantidad actual</th><th>Estado</th>
                {perm.egresos_gestionar && <th />}
              </tr>
            </thead>
            <tbody>
              {lotes.map((l) => {
                const est = estadoLote(l, datos.hoy, datos.limite)
                const vencidoConStock = l.Fecha_vencimiento < datos.hoy && l.Cantidad_actual > 0
                return (
                  <tr key={l.ID_Lote}>
                    <td className="fw-semibold text-nowrap">{l.Numero_lote}</td>
                    <td>{l.ID_Producto?.Nombre_producto}</td>
                    <td>{l.ID_Remito?.ID_Proveedor?.nombre_proveedor || 'Sin atribuir'}</td>
                    <td>{l.ID_Remito?.Numero_remito || '—'}</td>
                    <td className="text-nowrap">{fecha(l.Fecha_ingreso)}</td>
                    <td className="text-nowrap">{fecha(l.Fecha_vencimiento)}</td>
                    <td>{l.Cantidad_ingresada}</td>
                    <td>{l.Cantidad_actual}</td>
                    <td><span className={`badge rounded-pill text-bg-${est.color}`}>{est.texto}</span></td>
                    {perm.egresos_gestionar && (
                      <td className="text-end">
                        {vencidoConStock && (
                          <button type="button" className="btn btn-outline-danger av-btn-ico" title="Dar de baja por vencimiento"
                            onClick={() => setBaja(l)}>
                            <Icono nombre="eliminar" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
              {lotes.length === 0 && (
                <tr><td colSpan={10} className="av-vacio">No se encontraron lotes.</td></tr>
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

      <FormBaja lote={baja} onCerrar={() => setBaja(null)}
        onGuardar={async (v) => {
          const r = await ejecutar(`lote/${baja.ID_Lote}/baja-vencimiento/`, v)
          if (r.ok) {
            setBaja(null)
            recargar()
          }
        }} />
    </div>
  )
}

export default Lotes
