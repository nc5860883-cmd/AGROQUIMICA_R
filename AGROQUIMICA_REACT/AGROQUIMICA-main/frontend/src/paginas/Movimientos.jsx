// ============================================================
// MOVIMIENTOS DE STOCK
// Historial de entradas, egresos y anulaciones de cada lote.
// Permite descargar el comprobante y anular un egreso.
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
import { urlArchivo } from '../servicios/api'
import { reglaTexto } from '../servicios/validaciones'

// Color según el tipo de movimiento.
function colorTipo(nombre = '') {
  if (nombre.startsWith('Entrada')) return 'success'
  if (nombre.startsWith('Anulación')) return 'secondary'
  if (nombre.includes('venc')) return 'warning'
  return 'danger'
}

// Ventana para anular un egreso (pide el motivo)
function FormAnular({ movimiento, onCerrar, onGuardar }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  // Al abrir la ventana, se limpia el formulario
  useEffect(() => {
    if (movimiento) reset({ Motivo_anulacion: '' })
  }, [movimiento, reset])

  return (
    <Modal abierto={Boolean(movimiento)} titulo="Anular egreso" icono="anular" variante="peligro" onCerrar={onCerrar}
      pie={(
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>Cancelar</button>
          <button type="submit" form="formAnular" className="btn btn-danger" disabled={isSubmitting}>Anular egreso</button>
        </>
      )}>
      {movimiento && (
        <form id="formAnular" onSubmit={handleSubmit(onGuardar)} noValidate>
          <div className="alert alert-warning py-2 small">
            Se devolverán <strong>{movimiento.Cantidad_movimiento_stock}</strong> unidades al lote{' '}
            <strong>{movimiento.ID_Lote?.Numero_lote}</strong> de {movimiento.ID_Lote?.ID_Producto?.Nombre_producto}.
          </div>
          <label className="form-label">Motivo de la anulación</label>
          <textarea rows={3} className={'form-control' + (errors.Motivo_anulacion ? ' is-invalid' : '')}
            {...register('Motivo_anulacion', reglaTexto('El motivo', 255, true, 5))} />
          <ErrorCampo error={errors.Motivo_anulacion} />
        </form>
      )}
    </Modal>
  )
}

// Pantalla principal de movimientos
function Movimientos() {
  const { perm, ejecutar } = useOutletContext()
  // Filtros (búsqueda, tipo, página), texto del buscador y movimiento a anular
  const [filtros, setFiltros] = useState({ q: '', tipo: '', page: 1, por_pagina: '' })
  const [texto, setTexto] = useState('')
  const { datos, cargando, error, recargar } = usePantalla('movimientos-stock/', filtros)
  const [anular, setAnular] = useState(null)

  // Espera a que el usuario deje de escribir para buscar (evita un pedido por tecla)
  useEffect(() => {
    const t = setTimeout(() => setFiltros((f) => (f.q === texto.trim() ? f : { ...f, q: texto.trim(), page: 1 })), 400)
    return () => clearTimeout(t)
  }, [texto])

  // Mientras cargan los datos (o si hay error) se muestra el estado de carga
  if (!datos) return <EstadoPantalla cargando={cargando} error={error} datos={datos} />

  const movimientos = datos.pagina?.items || []

  return (
    <div>
      <Encabezado icono="cambio" titulo="Movimientos de stock" subtitulo="Entradas, egresos y anulaciones de stock de cada lote." />

      {/* Tarjetas de resumen */}
      <Resumen items={datos.resumen} />

      {/* Filtros: buscador y tipo de movimiento */}
      <BarraFiltros total={`${datos.pagina?.total || 0} movimiento(s)`}>
        <Buscador valor={texto} onCambiar={setTexto} placeholder="Buscar por producto, lote u observación..." />
        <Filtro etiqueta="Tipo de movimiento">
          <select className="form-select" value={filtros.tipo}
            onChange={(e) => setFiltros((f) => ({ ...f, tipo: e.target.value, page: 1 }))}>
            <option value="">Todos los tipos</option>
            {(datos.todos_tipos || []).map((t) => (
              <option key={t.ID_Tipo_movimiento} value={t.Nombre_tipo_movimiento}>{t.Nombre_tipo_movimiento}</option>
            ))}
          </select>
        </Filtro>
      </BarraFiltros>

      {/* Tabla de movimientos */}
      <section className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle av-filas mb-0">
            <thead>
              <tr>
                <th>Fecha y hora</th><th>Producto</th><th>Lote</th><th>Tipo</th><th>Cantidad</th>
                <th>Usuario</th><th>Observaciones</th>
                {perm.comprobantes_gestionar && <th className="text-center">Comprobante</th>}
                {datos.puede_anular && <th className="text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m) => {
                const tipo = m.ID_Tipo_movimiento?.Nombre_tipo_movimiento || ''
                return (
                  <tr key={m.ID_Movimiento_stock} className={m.Anulado ? 'opacity-75' : ''}>
                    <td className="text-nowrap">{fecha(m.Fecha_hora_movimiento, true)}</td>
                    <td>{m.ID_Lote?.ID_Producto?.Nombre_producto || '—'}</td>
                    <td className="text-nowrap fw-semibold">{m.ID_Lote?.Numero_lote || '—'}</td>
                    <td>
                      <span className={`badge rounded-pill text-bg-${colorTipo(tipo)}`}>{tipo}</span>
                      {m.Anulado && <span className="badge text-bg-dark ms-1">Anulado</span>}
                    </td>
                    <td className="fw-semibold">{m.Cantidad_movimiento_stock}</td>
                    <td>{m.ID_Usuario ? `${m.ID_Usuario.Nombre_usuario} ${m.ID_Usuario.Apellido_usuario}` : '—'}</td>
                    <td className="small text-body-secondary">
                      {m.Observaciones || '—'}
                      {m.Anulado && (
                        <div className="text-danger">
                          Anulado el {fecha(m.Fecha_anulacion, true)}. Motivo: {m.Motivo_anulacion || '—'}
                        </div>
                      )}
                    </td>
                    {perm.comprobantes_gestionar && (
                      <td className="text-center">
                        <a className="btn btn-outline-secondary av-btn-ico" title="Descargar comprobante"
                          href={urlArchivo(`movimientos-stock/${m.ID_Movimiento_stock}/comprobante/`)} target="_blank" rel="noreferrer">
                          <Icono nombre="pdf" />
                        </a>
                      </td>
                    )}
                    {datos.puede_anular && (
                      <td className="text-center">
                        {tipo === 'Egreso por venta' && !m.Anulado && (
                          <button type="button" className="btn btn-outline-danger av-btn-ico" title="Anular egreso" onClick={() => setAnular(m)}>
                            <Icono nombre="anular" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
              {movimientos.length === 0 && (
                <tr><td colSpan={9} className="av-vacio">No se encontraron movimientos.</td></tr>
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

      <FormAnular movimiento={anular} onCerrar={() => setAnular(null)}
        onGuardar={async (v) => {
          const r = await ejecutar(`movimientos-stock/${anular.ID_Movimiento_stock}/anular/`, v)
          if (r.ok) {
            setAnular(null)
            recargar()
          }
        }} />
    </div>
  )
}

export default Movimientos
