// ============================================================
// REMITOS
// Ingreso de mercadería: cada remito de un proveedor trae uno o más lotes.
// Permite registrar, editar, corregir lotes, anular y descargar el PDF.
// ============================================================

import { Fragment, useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { usePantalla } from '../hooks/usePantalla'
import Resumen from '../componentes/Resumen'
import Paginacion from '../componentes/Paginacion'
import Modal from '../componentes/Modal'
import {
  Buscador, Filtro, BarraFiltros, Encabezado, ErrorCampo, EstadoPantalla, Icono,
} from '../componentes/Comunes'
import { fecha } from '../servicios/formato'
import { urlArchivo } from '../servicios/api'
import { reglaEntero, reglaTexto } from '../servicios/validaciones'

// Fila vacía para un lote nuevo dentro del remito
const LOTE_VACIO = { producto: '', numero: '', vencimiento: '', cajas: '', unidades: '' }
// Regla de validación para códigos (número de remito, número de lote)
const reglaCodigo = (etiqueta) => ({
  required: `${etiqueta} es obligatorio.`,
  maxLength: { value: 50, message: `${etiqueta} no puede superar los 50 caracteres.` },
  pattern: { value: /^[A-Za-z0-9][A-Za-z0-9./_-]*$/, message: `${etiqueta}: use letras, números y - . / _` },
})

/* ---------------------- ALTA DE REMITO ---------------------- */
function FormRemito({ abierto, datos, onCerrar, onGuardar }) {
  const {
    register, handleSubmit, reset, control, formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { ID_Proveedor: '', Numero_remito: '', Fecha_remito: '', lotes: [LOTE_VACIO] } })

  // useFieldArray: lista dinámica de lotes (agregar / quitar filas).
  const { fields, append, remove } = useFieldArray({ control, name: 'lotes' })

  // Al abrir la ventana se limpia el formulario y queda una fila de lote
  useEffect(() => {
    if (abierto) reset({ ID_Proveedor: '', Numero_remito: '', Fecha_remito: datos.hoy, lotes: [LOTE_VACIO] })
  }, [abierto, datos.hoy, reset])

  // Valores que se observan en tiempo real mientras se completa el formulario
  const [proveedorId, numeroRemito, lotes] = useWatch({ control, name: ['ID_Proveedor', 'Numero_remito', 'lotes'] })

  // Solo se pueden ingresar productos que suministra el proveedor elegido.
  const productos = (datos.productos_alta || []).filter(
    (p) => (p.proveedores || []).some((x) => String(x.ID_Proveedor) === String(proveedorId)),
  )
  const proveedor = (datos.proveedores_alta || []).find((p) => String(p.ID_Proveedor) === String(proveedorId))
  // Avisa si ese número de remito ya existe para el proveedor
  const repetido = (datos.numeros_remito || []).find(
    (r) => numeroRemito && r.numero.toLowerCase() === numeroRemito.trim().toLowerCase()
      && r.proveedor === proveedor?.nombre_proveedor,
  )
  // Total de unidades que ingresan (cajas x unidades por caja de cada lote)
  const totalUnidades = (lotes || []).reduce((t, l) => t + (Number(l.cajas) || 0) * (Number(l.unidades) || 0), 0)

  // Envía el remito: los lotes van como listas paralelas, como espera Django
  const enviar = (v) => onGuardar({
    accion: 'crear_remito',
    ID_Proveedor: v.ID_Proveedor,
    Numero_remito: v.Numero_remito,
    Fecha_remito: v.Fecha_remito,
    lote_producto: v.lotes.map((l) => l.producto),
    lote_numero: v.lotes.map((l) => l.numero),
    lote_vencimiento: v.lotes.map((l) => l.vencimiento),
    lote_cajas: v.lotes.map((l) => l.cajas),
    lote_unidades_caja: v.lotes.map((l) => l.unidades),
  })

  return (
    <Modal abierto={abierto} titulo="Registrar remito" icono="documento" onCerrar={onCerrar} tamano="modal-xl"
      pie={(
        <>
          <span className="me-auto small text-body-secondary">{fields.length} lote(s) · {totalUnidades} unidades</span>
          <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>Cancelar</button>
          <button type="submit" form="formRemito" className="btn btn-success" disabled={isSubmitting}>
            {isSubmitting ? 'Registrando…' : 'Registrar remito'}
          </button>
        </>
      )}>
      <form id="formRemito" onSubmit={handleSubmit(enviar)} noValidate>
        <div className="row g-3 mb-3">
          <div className="col-md-5">
            <label className="form-label">Proveedor</label>
            <select className={'form-select' + (errors.ID_Proveedor ? ' is-invalid' : '')}
              {...register('ID_Proveedor', { required: 'Seleccione un proveedor.' })}>
              <option value="">Seleccione un proveedor</option>
              {(datos.proveedores_alta || []).map((p) => <option key={p.ID_Proveedor} value={p.ID_Proveedor}>{p.nombre_proveedor}</option>)}
            </select>
            <ErrorCampo error={errors.ID_Proveedor} />
          </div>
          <div className="col-md-4">
            <label className="form-label">Número de remito</label>
            <input className={'form-control' + (errors.Numero_remito || repetido ? ' is-invalid' : '')}
              placeholder="Ej. 0001-00012345" {...register('Numero_remito', reglaCodigo('El número de remito'))} />
            <ErrorCampo error={errors.Numero_remito} />
            {repetido && <div className="invalid-feedback d-block">Ese número ya existe para este proveedor.</div>}
          </div>
          <div className="col-md-3">
            <label className="form-label">Fecha del remito</label>
            <input type="date" max={datos.hoy} className={'form-control' + (errors.Fecha_remito ? ' is-invalid' : '')}
              {...register('Fecha_remito', {
                required: 'Ingrese la fecha del remito.',
                validate: (v) => v <= datos.hoy || 'La fecha no puede ser posterior a hoy.',
              })} />
            <ErrorCampo error={errors.Fecha_remito} />
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center mb-2">
          <h3 className="h6 mb-0">Lotes del remito</h3>
          <button type="button" className="btn btn-sm btn-outline-success" onClick={() => append(LOTE_VACIO)}>
            <Icono nombre="mas" /> Agregar lote
          </button>
        </div>
        {proveedorId && productos.length === 0 && (
          <div className="alert alert-warning py-2">Este proveedor no tiene productos activos asignados.</div>
        )}

        <div className="table-responsive">
          {/* Tabla de lotes del remito (se pueden agregar y quitar filas) */}
          <table className="table align-middle">
            <thead>
              <tr>
                <th style={{ minWidth: 200 }}>Producto</th>
                <th>N.º de lote</th>
                <th>Vencimiento</th>
                <th>Cajas</th>
                <th>Unid. por caja</th>
                <th>Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {fields.map((f, i) => {
                const e = errors.lotes?.[i] || {}
                const total = (Number(lotes?.[i]?.cajas) || 0) * (Number(lotes?.[i]?.unidades) || 0)
                return (
                  <tr key={f.id}>
                    <td>
                      <select className={'form-select form-select-sm' + (e.producto ? ' is-invalid' : '')} disabled={!proveedorId}
                        {...register(`lotes.${i}.producto`, { required: 'Elija el producto.' })}>
                        <option value="">Producto…</option>
                        {productos.map((p) => <option key={p.ID_Producto} value={p.ID_Producto}>{p.Nombre_producto}</option>)}
                      </select>
                      <ErrorCampo error={e.producto} />
                    </td>
                    <td>
                      <input className={'form-control form-control-sm' + (e.numero ? ' is-invalid' : '')}
                        {...register(`lotes.${i}.numero`, reglaCodigo('El número de lote'))} />
                      <ErrorCampo error={e.numero} />
                    </td>
                    <td>
                      <input type="date" min={datos.hoy} className={'form-control form-control-sm' + (e.vencimiento ? ' is-invalid' : '')}
                        {...register(`lotes.${i}.vencimiento`, {
                          required: 'Ingrese el vencimiento.',
                          validate: (v) => v > datos.hoy || 'Debe ser posterior a hoy.',
                        })} />
                      <ErrorCampo error={e.vencimiento} />
                    </td>
                    <td style={{ width: 90 }}>
                      <input inputMode="numeric" className={'form-control form-control-sm' + (e.cajas ? ' is-invalid' : '')}
                        {...register(`lotes.${i}.cajas`, reglaEntero('Las cajas', 1, 99999))} />
                      <ErrorCampo error={e.cajas} />
                    </td>
                    <td style={{ width: 110 }}>
                      <input inputMode="numeric" className={'form-control form-control-sm' + (e.unidades ? ' is-invalid' : '')}
                        {...register(`lotes.${i}.unidades`, reglaEntero('Las unidades', 1, 99999))} />
                      <ErrorCampo error={e.unidades} />
                    </td>
                    <td className="fw-semibold">{total || '—'}</td>
                    <td>
                      <button type="button" className="btn btn-sm btn-outline-danger" disabled={fields.length === 1}
                        onClick={() => remove(i)} title="Quitar lote">
                        <Icono nombre="eliminar" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </form>
    </Modal>
  )
}

/* ------------------ EDITAR REMITO / LOTE / ANULAR ------------------ */
function FormSimple({ pedido, onCerrar, onGuardar }) {
  const {
    register, handleSubmit, reset, formState: { errors, isSubmitting },
  } = useForm()

  useEffect(() => {
    if (pedido) reset(pedido.valores)
  }, [pedido, reset])

  return (
    <Modal abierto={Boolean(pedido)} titulo={pedido?.titulo} icono="editar" onCerrar={onCerrar}
      pie={(
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>Cancelar</button>
          <button type="submit" form="formSimple" className={`btn btn-${pedido?.color || 'success'}`} disabled={isSubmitting}>
            {pedido?.boton || 'Guardar cambios'}
          </button>
        </>
      )}>
      {pedido && (
        <form id="formSimple" onSubmit={handleSubmit((v) => onGuardar({ ...pedido.fijos, ...v }))} noValidate>
          {pedido.aviso && <div className="alert alert-warning py-2">{pedido.aviso}</div>}
          {pedido.campos.map((c) => (
            <div className="mb-3" key={c.nombre}>
              <label className="form-label">{c.etiqueta}</label>
              {c.tipo === 'textarea'
                ? <textarea rows={3} className={'form-control' + (errors[c.nombre] ? ' is-invalid' : '')} {...register(c.nombre, c.reglas)} />
                : <input type={c.tipo || 'text'} className={'form-control' + (errors[c.nombre] ? ' is-invalid' : '')} {...register(c.nombre, c.reglas)} />}
              <ErrorCampo error={errors[c.nombre]} />
            </div>
          ))}
        </form>
      )}
    </Modal>
  )
}

/* ------------------------- PANTALLA ------------------------- */
function Remitos() {
  // Permisos, filtros, datos de Django, remitos desplegados y ventanas abiertas
  const { perm, ejecutar } = useOutletContext()
  const [filtros, setFiltros] = useState({ q: '', proveedor: '', estado: '', desde: '', hasta: '', page: 1, por_pagina: '' })
  const [texto, setTexto] = useState('')
  const { datos, cargando, error, recargar } = usePantalla('remitos/', filtros)
  const [abiertos, setAbiertos] = useState({})
  const [crear, setCrear] = useState(false)
  const [simple, setSimple] = useState(null)

  // Espera a que el usuario deje de escribir para buscar (evita un pedido por tecla)
  useEffect(() => {
    const t = setTimeout(() => setFiltros((f) => (f.q === texto.trim() ? f : { ...f, q: texto.trim(), page: 1 })), 400)
    return () => clearTimeout(t)
  }, [texto])

  // Cambia un filtro y vuelve a la página 1
  const filtrar = (campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor, page: 1 }))

  // Ejecuta una acción en Django; si sale bien, cierra la ventana y recarga la lista
  const accion = async (valores, alTerminar) => {
    const r = await ejecutar('remitos/', valores)
    if (r.ok) {
      alTerminar?.()
      recargar()
    }
    return r
  }

  // Mientras cargan los datos (o si hay error) se muestra el estado de carga
  if (!datos) return <EstadoPantalla cargando={cargando} error={error} datos={datos} />

  const remitos = datos.remitos?.items || []
  const hoy = datos.hoy

  // Abre la ventana para editar los datos del remito
  const editarRemito = (r) => setSimple({
    titulo: `Editar remito ${r.Numero_remito}`,
    fijos: { accion: 'editar_remito', ID_Remito: r.ID_Remito },
    valores: { Numero_remito: r.Numero_remito, Fecha_remito: r.Fecha_remito },
    campos: [
      { nombre: 'Numero_remito', etiqueta: 'Número de remito', reglas: reglaCodigo('El número de remito') },
      { nombre: 'Fecha_remito', etiqueta: 'Fecha del remito', tipo: 'date', reglas: { required: 'Ingrese la fecha.', validate: (v) => v <= hoy || 'No puede ser posterior a hoy.' } },
    ],
  })

  // Abre la ventana para corregir un lote del remito
  const editarLote = (r, l) => setSimple({
    titulo: `Editar lote ${l.Numero_lote}`,
    aviso: l.Cantidad_actual !== l.Cantidad_ingresada
      ? 'Este lote ya tuvo movimientos: Django controlará que la nueva cantidad no quede por debajo de lo ya egresado.'
      : null,
    fijos: { accion: 'editar_lote', ID_Lote: l.ID_Lote },
    valores: {
      Numero_lote: l.Numero_lote,
      Fecha_vencimiento: l.Fecha_vencimiento,
      Cantidad_cajas: l.Cantidad_cajas ?? '',
      Unidades_por_caja: l.Unidades_por_caja ?? '',
    },
    campos: [
      { nombre: 'Numero_lote', etiqueta: 'Número de lote', reglas: reglaCodigo('El número de lote') },
      { nombre: 'Fecha_vencimiento', etiqueta: 'Fecha de vencimiento', tipo: 'date', reglas: { required: 'Ingrese el vencimiento.', validate: (v) => v >= r.Fecha_remito || 'No puede ser anterior al remito.' } },
      { nombre: 'Cantidad_cajas', etiqueta: 'Cantidad de cajas', reglas: reglaEntero('Las cajas', 1, 99999) },
      { nombre: 'Unidades_por_caja', etiqueta: 'Unidades por caja', reglas: reglaEntero('Las unidades por caja', 1, 99999) },
    ],
  })

  // Abre la ventana para anular un remito (pide el motivo)
  const anular = (r) => setSimple({
    titulo: `Anular remito ${r.Numero_remito}`,
    color: 'danger',
    boton: 'Anular remito',
    aviso: `Se descontarán del stock las ${r.total_unidades} unidades de sus ${(r.lotes || []).length} lote(s). Esta acción no se puede deshacer.`,
    fijos: { accion: 'anular_remito', ID_Remito: r.ID_Remito },
    valores: { Motivo_anulacion: '' },
    campos: [
      { nombre: 'Motivo_anulacion', etiqueta: 'Motivo de la anulación', tipo: 'textarea', reglas: reglaTexto('El motivo', 255, true, 5) },
    ],
  })

  return (
    <div>
      <Encabezado icono="documento" titulo="Gestión de remitos" subtitulo="Ingreso de mercadería por remito y los lotes que llegaron con cada uno.">
        {perm.remitos_gestionar && (
          <button type="button" className="btn btn-success d-inline-flex align-items-center gap-2" onClick={() => setCrear(true)}>
            <Icono nombre="mas" /> Nuevo remito
          </button>
        )}
      </Encabezado>

      {/* Tarjetas de resumen */}
      <Resumen items={datos.resumen} />

      {/* Filtros: buscador, proveedor, estado y fechas */}
      <BarraFiltros total={`${datos.remitos?.total || 0} remito(s)`}>
        <Buscador valor={texto} onCambiar={setTexto} placeholder="Buscar por número de remito o proveedor..." />
        <Filtro etiqueta="Proveedor">
          <select className="form-select" value={filtros.proveedor} onChange={(e) => filtrar('proveedor', e.target.value)}>
            <option value="">Todos</option>
            {(datos.proveedores || []).map((p) => <option key={p.ID_Proveedor} value={p.ID_Proveedor}>{p.nombre_proveedor}</option>)}
          </select>
        </Filtro>
        <Filtro etiqueta="Estado" tamano="chico">
          <select className="form-select" value={filtros.estado} onChange={(e) => filtrar('estado', e.target.value)}>
            <option value="">Todos</option>
            <option value="Confirmado">Confirmados</option>
            <option value="Anulado">Anulados</option>
          </select>
        </Filtro>
        <Filtro etiqueta="Desde" tamano="chico">
          <input type="date" className="form-control" value={filtros.desde} onChange={(e) => filtrar('desde', e.target.value)} />
        </Filtro>
        <Filtro etiqueta="Hasta" tamano="chico">
          <input type="date" className="form-control" value={filtros.hasta} onChange={(e) => filtrar('hasta', e.target.value)} />
        </Filtro>
      </BarraFiltros>

      {/* Tabla de remitos (cada uno se despliega para ver sus lotes) */}
      <section className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle av-filas mb-0">
            <thead>
              <tr>
                <th>Número de remito</th>
                <th>Proveedor</th>
                <th>Fecha</th>
                <th>Lotes asociados</th>
                <th>Cantidad ingresada</th>
                <th>Estado</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {remitos.map((r) => (
                <Fragment key={r.ID_Remito}>
                  <tr className={r.Estado_remito === 'Anulado' ? 'opacity-75' : ''}>
                    <td className="fw-semibold">{r.Numero_remito}</td>
                    <td>{r.ID_Proveedor?.nombre_proveedor}</td>
                    <td>{fecha(r.Fecha_remito)}</td>
                    <td>{(r.lotes || []).length} lote(s)</td>
                    <td>{r.total_unidades}</td>
                    <td>
                      <span className={`badge rounded-pill ${r.Estado_remito === 'Anulado' ? 'text-bg-danger' : 'text-bg-success'}`}>
                        {r.Estado_remito}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex justify-content-end gap-2">
                        <button type="button" className="btn btn-outline-secondary av-btn-ico" title="Ver lotes del remito"
                          onClick={() => setAbiertos((a) => ({ ...a, [r.ID_Remito]: !a[r.ID_Remito] }))}>
                          <Icono nombre="ver" />
                        </button>
                        <a className="btn btn-outline-secondary av-btn-ico" title="Descargar remito en PDF"
                          href={urlArchivo(`remitos/${r.ID_Remito}/pdf/`)} target="_blank" rel="noreferrer">
                          <Icono nombre="pdf" />
                        </a>
                        {r.Estado_remito === 'Confirmado' && perm.remitos_gestionar && (
                          <button type="button" className="btn btn-outline-success av-btn-ico" title="Editar remito" onClick={() => editarRemito(r)}>
                            <Icono nombre="editar" />
                          </button>
                        )}
                        {r.Estado_remito === 'Confirmado' && datos.puede_anular && (
                          <button type="button" className="btn btn-outline-danger av-btn-ico" title="Anular remito" onClick={() => anular(r)}>
                            <Icono nombre="anular" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {abiertos[r.ID_Remito] && (
                    <tr className="av-detalle-fila">
                      <td colSpan={7}>
                        <div className="av-detalle">
                        <p className="small mb-2">
                          Lotes del remito <strong>{r.Numero_remito}</strong> · Proveedor: <strong>{r.ID_Proveedor?.nombre_proveedor}</strong>
                        </p>
                        {r.Estado_remito === 'Anulado' && (
                          <div className="alert alert-danger py-2 small">
                            Anulado el {fecha(r.Fecha_anulacion, true)}
                            {r.ID_Usuario_anulacion && ` por ${r.ID_Usuario_anulacion.Nombre_usuario} ${r.ID_Usuario_anulacion.Apellido_usuario}`}.
                            {' '}Motivo: {r.Motivo_anulacion || '—'}
                          </div>
                        )}
                        <table className="table table-sm mb-0">
                          <thead>
                            <tr>
                              <th>Número de lote</th><th>Producto</th><th>Vencimiento</th><th>Cajas</th>
                              <th>Unid. por caja</th><th>Ingresada</th><th>Actual</th>
                              {r.Estado_remito === 'Confirmado' && perm.remitos_gestionar && <th />}
                            </tr>
                          </thead>
                          <tbody>
                            {(r.lotes || []).map((l) => (
                              <tr key={l.ID_Lote}>
                                <td className="fw-semibold">{l.Numero_lote}</td>
                                <td>{l.ID_Producto?.Nombre_producto}</td>
                                <td>{fecha(l.Fecha_vencimiento)}</td>
                                <td>{l.Cantidad_cajas ?? '—'}</td>
                                <td>{l.Unidades_por_caja ?? '—'}</td>
                                <td>{l.Cantidad_ingresada ?? '—'}</td>
                                <td>{l.Cantidad_actual ?? 0}</td>
                                {r.Estado_remito === 'Confirmado' && perm.remitos_gestionar && (
                                  <td className="text-end">
                                    <button type="button" className="btn btn-sm btn-outline-success" onClick={() => editarLote(r, l)}>
                                      Editar
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {remitos.length === 0 && (
                <tr><td colSpan={7} className="av-vacio">No se encontraron remitos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card-footer bg-body">
          {/* Paginación */}
          <Paginacion pagina={datos.remitos}
            onPagina={(n) => setFiltros((f) => ({ ...f, page: n }))}
            onPorPagina={(n) => setFiltros((f) => ({ ...f, por_pagina: n, page: 1 }))} />
        </div>
      </section>

      {/* Ventanas: nuevo remito y formulario simple */}
      <FormRemito abierto={crear} datos={datos} onCerrar={() => setCrear(false)}
        onGuardar={(v) => accion(v, () => setCrear(false))} />
      <FormSimple pedido={simple} onCerrar={() => setSimple(null)}
        onGuardar={(v) => accion(v, () => setSimple(null))} />
    </div>
  )
}

export default Remitos
