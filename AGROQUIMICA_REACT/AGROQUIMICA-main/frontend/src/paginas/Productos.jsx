// ============================================================
// PRODUCTOS
// Catálogo de productos en tarjetas (foto, presentación, precio y stock).
// Permite crear, modificar y eliminar productos, ver sus lotes y
// registrar egresos por venta.
// ============================================================

import { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { usePantalla } from '../hooks/usePantalla'
import { useVistaPrevia } from '../hooks/useVistaPrevia'
import { usePaginacionLocal, normalizar } from '../hooks/usePaginacionLocal'
import Paginacion from '../componentes/Paginacion'
import Modal from '../componentes/Modal'
import Confirmar from '../componentes/Confirmar'
import {
  Filtro, BarraFiltros, Buscador, Encabezado, ErrorCampo, EstadoPantalla, Icono,
} from '../componentes/Comunes'
import { fecha, numero } from '../servicios/formato'
import { reglaDecimal, reglaEntero, reglaNombre, reglaTexto } from '../servicios/validaciones'
import '../estilos/Productos.css'

// Unidades de medida disponibles para la presentación
const UNIDADES = [
  { valor: 'kg', texto: 'Kilogramos (kg)' },
  { valor: 'g', texto: 'Gramos (g)' },
  { valor: 'litros', texto: 'Litros (L)' },
]

// Formatea un número como precio en pesos ($ 1.234,50)
const pesos = (v) => Number(v || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 })

// Texto de la presentación (ej. "20 litros")
function presentacion(p) {
  if (!p.Cantidad_presentacion) return '—'
  const cant = Number(p.Cantidad_presentacion).toLocaleString('es-AR')
  if (p.Unidad_medida_producto === 'litros') return `${cant} ${Number(p.Cantidad_presentacion) === 1 ? 'litro' : 'litros'}`
  return `${cant} ${p.Unidad_medida_producto || ''}`
}

/* ---------------------- ALTA / EDICIÓN ---------------------- */
function FormProducto({ abierto, producto, datos, onCerrar, onGuardar }) {
  const {
    register, handleSubmit, reset, control, setValue, setError, formState: { errors, isSubmitting },
  } = useForm()

  // Al abrir la ventana se cargan los datos del producto (o se deja vacío)
  useEffect(() => {
    if (!abierto) return
    reset({
      Nombre_producto: producto?.Nombre_producto || '',
      Descripcion_producto: producto?.Descripcion_producto || '',
      ID_Tipo_producto: producto ? String(producto.ID_Tipo_producto_id) : '',
      ID_Subtipo: producto?.ID_Subtipo_id ? String(producto.ID_Subtipo_id) : '',
      Precio: producto ? String(producto.Precio) : '',
      Stock_minimo: producto?.stock ? String(producto.stock.Stock_minimo) : '',
      // Number() quita los decimales vacíos que manda Django ("20.00" → "20")
      Cantidad_presentacion: producto?.Cantidad_presentacion ? String(Number(producto.Cantidad_presentacion)) : '',
      Unidad_medida_producto: producto?.Unidad_medida_producto || '',
      Estado_producto: producto?.Estado_producto || 'Activo',
      proveedores: (producto?.proveedores || []).map((p) => String(p.ID_Proveedor)),
      Imagen_producto: null,
      quitar_imagen: '0',
    })
  }, [abierto, producto, reset])

  // Valores que se observan en tiempo real (tipo elegido, foto nueva, quitar foto)
  const [tipoElegido, archivo, quitar] = useWatch({
    control, name: ['ID_Tipo_producto', 'Imagen_producto', 'quitar_imagen'],
  })

  const vistaPrevia = useVistaPrevia(archivo)

  // Listas de opciones: tipos activos, subtipos del tipo elegido y proveedores
  const tipos = (datos.tipos_productos || []).filter(
    (t) => t.Estado_tipo_producto || String(t.ID_Tipo_producto) === String(producto?.ID_Tipo_producto_id),
  )
  const subtipos = (datos.subtipos || []).filter((s) => String(s.ID_Tipo_producto_id) === String(tipoElegido))
  const proveedores = (datos.proveedores_todos || datos.proveedores_activos || []).filter(
    (p) => p.estado_proveedor || (producto?.proveedores || []).some((x) => x.ID_Proveedor === p.ID_Proveedor),
  )

  const fotoActual = quitar === '1' ? null : (vistaPrevia || producto?.Imagen_producto)

  // Envía el producto a Django
  const enviar = async (valores) => {
    const r = await onGuardar(valores)
    Object.entries(r?.errores || {}).forEach(([c, m]) => setError(c, { type: 'servidor', message: m }))
  }

  return (
    <Modal abierto={abierto} titulo={producto ? 'Modificar producto' : 'Registrar producto'} icono="caja" onCerrar={onCerrar} tamano="modal-xl"
      pie={(
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>Cancelar</button>
          <button type="submit" form="formProducto" className="btn btn-success" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : (producto ? 'Guardar cambios' : 'Registrar producto')}
          </button>
        </>
      )}>
      <form id="formProducto" onSubmit={handleSubmit(enviar)} noValidate className="row g-4">
        {/* FOTO */}
        <div className="col-lg-4">
          <label className="form-label">Foto (opcional)</label>
          <div className="border rounded-3 d-flex align-items-center justify-content-center bg-body-tertiary mb-2 overflow-hidden"
            style={{ height: 220 }}>
            {fotoActual
              ? <img src={fotoActual} alt="Vista previa" className="w-100 h-100 object-fit-cover" />
              : <span className="text-body-secondary">Sin foto</span>}
          </div>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="form-control"
            {...register('Imagen_producto', {
              onChange: () => setValue('quitar_imagen', '0'),
              validate: (f) => !f || !f[0] || f[0].size <= 5 * 1024 * 1024 || 'La imagen no puede superar los 5 MB.',
            })} />
          <ErrorCampo error={errors.Imagen_producto} />
          {producto?.Imagen_producto && quitar !== '1' && (
            <button type="button" className="btn btn-link btn-sm text-danger px-0"
              onClick={() => { setValue('quitar_imagen', '1'); setValue('Imagen_producto', null) }}>
              Quitar foto
            </button>
          )}
          <input type="hidden" {...register('quitar_imagen')} />
        </div>

        {/* DATOS */}
        <div className="col-lg-8">
          <div className="row g-3">
            <div className={producto ? 'col-md-8' : 'col-12'}>
              <label className="form-label">Nombre</label>
              <input className={'form-control' + (errors.Nombre_producto ? ' is-invalid' : '')} maxLength={100}
                {...register('Nombre_producto', reglaNombre('El nombre del producto', 2, 100))} />
              <ErrorCampo error={errors.Nombre_producto} />
            </div>
            {producto && (
              <div className="col-md-4">
                <label className="form-label">Estado</label>
                <select className="form-select" {...register('Estado_producto')}>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
            )}
            {!producto && <input type="hidden" {...register('Estado_producto')} />}

            <div className="col-12">
              <label className="form-label">Descripción (opcional)</label>
              <input className={'form-control' + (errors.Descripcion_producto ? ' is-invalid' : '')} maxLength={200}
                {...register('Descripcion_producto', reglaTexto('La descripción', 200))} />
              <ErrorCampo error={errors.Descripcion_producto} />
            </div>

            <div className="col-md-6">
              <label className="form-label">Tipo de producto</label>
              <select className={'form-select' + (errors.ID_Tipo_producto ? ' is-invalid' : '')}
                {...register('ID_Tipo_producto', {
                  required: 'Seleccione un tipo de producto.',
                  onChange: () => setValue('ID_Subtipo', ''),
                })}>
                <option value="">Seleccione un tipo</option>
                {tipos.map((t) => <option key={t.ID_Tipo_producto} value={t.ID_Tipo_producto}>{t.Nombre_tipo_producto}</option>)}
              </select>
              <ErrorCampo error={errors.ID_Tipo_producto} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Subtipo (opcional)</label>
              <select className="form-select" disabled={!tipoElegido || subtipos.length === 0} {...register('ID_Subtipo')}>
                <option value="">{tipoElegido && subtipos.length === 0 ? 'Este tipo no tiene subtipos' : 'Sin subtipo'}</option>
                {subtipos.map((s) => <option key={s.ID_Subtipo} value={s.ID_Subtipo}>{s.Nombre_subtipo}</option>)}
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label">Precio ($)</label>
              <input inputMode="decimal" className={'form-control' + (errors.Precio ? ' is-invalid' : '')}
                {...register('Precio', reglaDecimal('El precio'))} />
              <ErrorCampo error={errors.Precio} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Stock mínimo</label>
              <input inputMode="numeric" className={'form-control' + (errors.Stock_minimo ? ' is-invalid' : '')}
                {...register('Stock_minimo', reglaEntero('El stock mínimo', 0, 999999))} />
              <ErrorCampo error={errors.Stock_minimo} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Presentación</label>
              <div className="input-group">
                <input inputMode="numeric" className={'form-control' + (errors.Cantidad_presentacion ? ' is-invalid' : '')}
                  placeholder="Cantidad" {...register('Cantidad_presentacion', reglaEntero('La cantidad de la presentación', 1, 99999))} />
                <select className={'form-select' + (errors.Unidad_medida_producto ? ' is-invalid' : '')} style={{ maxWidth: 140 }}
                  {...register('Unidad_medida_producto', { required: 'Seleccione una unidad.' })}>
                  <option value="">Unidad</option>
                  {UNIDADES.map((u) => <option key={u.valor} value={u.valor}>{u.texto}</option>)}
                </select>
              </div>
              <ErrorCampo error={errors.Cantidad_presentacion || errors.Unidad_medida_producto} />
            </div>

            <div className="col-12">
              <label className="form-label">Proveedores que lo suministran</label>
              <div className="d-flex flex-wrap gap-2">
                {proveedores.length === 0 && (
                  <span className="small text-body-secondary">No hay proveedores activos. Registre uno primero.</span>
                )}
                {proveedores.map((p) => (
                  <div key={p.ID_Proveedor}>
                    <input type="checkbox" className="btn-check" id={`prov-${p.ID_Proveedor}`} value={String(p.ID_Proveedor)}
                      autoComplete="off"
                      {...register('proveedores', { validate: (v) => (v && v.length > 0) || 'Seleccione al menos un proveedor.' })} />
                    <label className="btn btn-outline-success btn-sm rounded-pill" htmlFor={`prov-${p.ID_Proveedor}`}>
                      {p.nombre_proveedor}
                    </label>
                  </div>
                ))}
              </div>
              <ErrorCampo error={errors.proveedores} />
              <div className="form-text">Puede elegir más de uno. Solo estos proveedores podrán ingresar el producto en un remito.</div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  )
}

/* ------------------------- EGRESO ------------------------- */
function FormEgreso({ abierto, productos, onCerrar, onGuardar }) {
  const {
    register, handleSubmit, reset, control, setValue, formState: { errors, isSubmitting },
  } = useForm()

  // Al abrir la ventana se limpia el formulario
  useEffect(() => {
    if (abierto) reset({ producto: '', lote: '', cantidad: '', descripcion: '' })
  }, [abierto, reset])

  // Producto, lote y cantidad elegidos (para mostrar el stock disponible)
  const [productoId, loteId, cantidad] = useWatch({ control, name: ['producto', 'lote', 'cantidad'] })
  const producto = productos.find((p) => String(p.id) === String(productoId))
  const lote = producto?.lotes.find((l) => String(l.id) === String(loteId))
  const cant = Number(cantidad) || 0

  return (
    <Modal abierto={abierto} titulo="Registrar egreso por venta" icono="venta" onCerrar={onCerrar} tamano="modal-lg"
      pie={(
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>Cancelar</button>
          <button type="submit" form="formEgreso" className="btn av-btn-egreso" disabled={isSubmitting || productos.length === 0}>
            Registrar egreso
          </button>
        </>
      )}>
      {productos.length === 0 ? (
        <p className="text-body-secondary mb-0">No hay productos activos con lotes vigentes para vender.</p>
      ) : (
        <form id="formEgreso" onSubmit={handleSubmit(onGuardar)} noValidate className="row g-3">
          <p className="small text-body-secondary mb-0">
            Los lotes se ofrecen por vencimiento: primero el que vence antes (FEFO).
          </p>
          <div className="col-md-6">
            <label className="form-label">Producto</label>
            <select className={'form-select' + (errors.producto ? ' is-invalid' : '')}
              {...register('producto', {
                required: 'Seleccione un producto.',
                onChange: (e) => {
                  const p = productos.find((x) => String(x.id) === e.target.value)
                  setValue('lote', p?.lotes[0] ? String(p.lotes[0].id) : '')
                },
              })}>
              <option value="">Seleccione un producto</option>
              {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre} (stock {p.stock})</option>)}
            </select>
            <ErrorCampo error={errors.producto} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Lote</label>
            <select className={'form-select' + (errors.lote ? ' is-invalid' : '')} disabled={!producto}
              {...register('lote', { required: 'Seleccione un lote válido.' })}>
              <option value="">Seleccione un lote</option>
              {(producto?.lotes || []).map((l) => (
                <option key={l.id} value={l.id}>Lote {l.numero} · vence {l.vence} · {l.cantidad} un.</option>
              ))}
            </select>
            <ErrorCampo error={errors.lote} />
          </div>
          {lote && (
            <div className="col-12">
              <div className="bg-body-tertiary rounded-3 p-2 small">
                Remito {lote.remito} · {lote.proveedor} · Disponible en el lote: <strong>{lote.cantidad}</strong> un.
              </div>
            </div>
          )}
          <div className="col-md-6">
            <label className="form-label">Cantidad a vender</label>
            <input inputMode="numeric" className={'form-control' + (errors.cantidad ? ' is-invalid' : '')}
              {...register('cantidad', {
                ...reglaEntero('La cantidad', 1, 999999),
                validate: (v) => !lote || Number(v) <= lote.cantidad || `El lote solo tiene ${lote.cantidad} unidades.`,
              })} />
            <ErrorCampo error={errors.cantidad} />
          </div>
          {lote && cant > 0 && (
            <div className="col-md-6 d-flex gap-2 align-items-end">
              <div className="flex-fill border rounded-3 p-2 text-center">
                <div className="small text-body-secondary">Queda en el lote</div>
                <strong>{Math.max(lote.cantidad - cant, 0)}</strong>
              </div>
              <div className="flex-fill border rounded-3 p-2 text-center">
                <div className="small text-body-secondary">Stock del producto</div>
                <strong className={producto.stock - cant <= producto.stock_minimo ? 'text-danger' : ''}>
                  {Math.max(producto.stock - cant, 0)}
                </strong>
              </div>
            </div>
          )}
          {producto && lote && producto.stock - cant <= producto.stock_minimo && cant > 0 && (
            <div className="col-12"><div className="alert alert-warning py-2 mb-0">El stock quedará en o por debajo del mínimo ({producto.stock_minimo}).</div></div>
          )}
          <div className="col-12">
            <label className="form-label">Descripción (opcional)</label>
            <textarea rows={2} className={'form-control' + (errors.descripcion ? ' is-invalid' : '')} maxLength={200}
              {...register('descripcion', reglaTexto('La descripción', 200))} />
            <ErrorCampo error={errors.descripcion} />
          </div>
        </form>
      )}
    </Modal>
  )
}

/* ------------------------- PANTALLA ------------------------- */
function Productos() {
  // Permisos, parámetros de la URL y datos de Django
  const { perm, ejecutar } = useOutletContext()
  const [parametros, setParametros] = useSearchParams()
  const { datos, cargando, error, recargar } = usePantalla('productos/')

  // Filtros, orden y ventanas abiertas
  const [busqueda, setBusqueda] = useState('')
  const [tipo, setTipo] = useState('')
  const [estado, setEstado] = useState('')
  const [orden, setOrden] = useState('recientes')
  const [modal, setModal] = useState({ abierto: false, producto: null })
  const [lotes, setLotes] = useState(null)
  const [foto, setFoto] = useState(null)
  const [confirmar, setConfirmar] = useState(null)
  // ?egreso=1 en la URL abre directamente el modal de egreso (como en el original).
  const [egreso, setEgreso] = useState(parametros.get('egreso') === '1')

  const productos = useMemo(() => datos?.productos || [], [datos])

  // Aplica búsqueda, tipo, estado y orden en el navegador
  const filtrados = useMemo(() => {
    const texto = normalizar(busqueda.trim())
    const lista = productos.filter((p) => {
      const stock = p.stock?.Cantidad_stock || 0
      const minimo = p.stock?.Stock_minimo || 0
      if (texto && !normalizar([
        p.Nombre_producto, p.ID_Subtipo?.Nombre_subtipo, p.ID_Tipo_producto?.Nombre_tipo_producto,
        ...(p.proveedores || []).map((x) => x.nombre_proveedor),
      ].join(' ')).includes(texto)) return false
      if (tipo && String(p.ID_Tipo_producto_id) !== tipo) return false
      if ((estado === 'Activo' || estado === 'Inactivo') && p.Estado_producto !== estado) return false
      if (estado === 'bajo' && !(p.num_lotes > 0 && stock <= minimo)) return false
      return true
    })
    const comparar = {
      recientes: (a, b) => b.ID_Producto - a.ID_Producto,
      nombre: (a, b) => a.Nombre_producto.localeCompare(b.Nombre_producto),
      'precio-asc': (a, b) => a.Precio - b.Precio,
      'precio-desc': (a, b) => b.Precio - a.Precio,
      'stock-asc': (a, b) => (a.stock?.Cantidad_stock || 0) - (b.stock?.Cantidad_stock || 0),
    }
    return [...lista].sort(comparar[orden])
  }, [productos, busqueda, tipo, estado, orden])

  const { items, pagina, irAPagina, cambiarPorPagina } = usePaginacionLocal(filtrados, 12)

  // Indicadores de resumen calculados con los datos recibidos.
  const resumen = useMemo(() => ({
    total: productos.length,
    activos: productos.filter((p) => p.Estado_producto === 'Activo').length,
    bajo: productos.filter((p) => p.num_lotes > 0 && (p.stock?.Cantidad_stock || 0) <= (p.stock?.Stock_minimo || 0)).length,
    tipos: datos?.total_tipos || 0,
  }), [productos, datos])

  // Ejecuta una acción en Django; si sale bien, cierra la ventana y recarga la lista
  const accion = async (ruta, valores, alTerminar) => {
    const r = await ejecutar(ruta, valores)
    if (r.ok) {
      alTerminar?.()
      recargar()
    }
    return r
  }

  // Cierra el egreso y quita ?egreso=1 de la dirección
  const cerrarEgreso = () => {
    setEgreso(false)
    if (parametros.get('egreso')) setParametros({}, { replace: true })
  }

  // Mientras cargan los datos (o si hay error) se muestra el estado de carga
  if (!datos) return <EstadoPantalla cargando={cargando} error={error} datos={datos} />

  return (
    <div>
      <Encabezado icono="caja" titulo="Gestión de productos" subtitulo="Catálogo, presentación, stock y lotes de cada producto.">
        {datos.puede_egresar && (
          <button type="button" className="btn av-btn-egreso d-inline-flex align-items-center gap-2" onClick={() => setEgreso(true)}>
            <Icono nombre="anular" /> Registrar egreso
          </button>
        )}
        {perm.productos_gestionar && (
          <button type="button" className="btn btn-success d-inline-flex align-items-center gap-2"
            onClick={() => setModal({ abierto: true, producto: null })}>
            <Icono nombre="mas" /> Nuevo producto
          </button>
        )}
      </Encabezado>

      <div className="row g-3 mb-4 av-resumen">
        {[
          ['Productos', resumen.total, 'verde', 'caja'],
          ['Activos', resumen.activos, 'azul', 'check'],
          ['En stock mínimo', resumen.bajo, 'rojo', 'alerta'],
          ['Tipos de producto', resumen.tipos, 'ambar', 'capas'],
        ].map(([etiqueta, valor, color, icono]) => (
          <div className="col-6 col-lg-3" key={etiqueta}>
            <div className={`av-stat av-stat-${color}`}>
              <span className="av-stat-icono"><Icono nombre={icono} className="av-stat-svg" /></span>
              <div><strong>{valor}</strong><span>{etiqueta}</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros: buscador, tipo, estado y orden */}
      <BarraFiltros total={`${filtrados.length} de ${productos.length} productos`}>
        <Buscador valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar por nombre, tipo, subtipo o proveedor..." />
        <Filtro etiqueta="Tipo">
          <select className="form-select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {(datos.tipos_productos || []).map((t) => <option key={t.ID_Tipo_producto} value={t.ID_Tipo_producto}>{t.Nombre_tipo_producto}</option>)}
          </select>
        </Filtro>
        <Filtro etiqueta="Estado">
          <select className="form-select" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="Activo">Activos</option>
            <option value="Inactivo">Inactivos</option>
            <option value="bajo">En stock mínimo</option>
          </select>
        </Filtro>
        <Filtro etiqueta="Ordenar por">
          <select className="form-select" value={orden} onChange={(e) => setOrden(e.target.value)}>
            <option value="recientes">Más recientes primero</option>
            <option value="nombre">Nombre (A-Z)</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
            <option value="stock-asc">Stock: menor a mayor</option>
          </select>
        </Filtro>
      </BarraFiltros>

      {items.length === 0 ? (
        <div className="card"><p className="av-vacio mb-0">{productos.length ? 'No hay productos con esos filtros' : 'Todavía no hay productos'}</p></div>
      ) : (
        <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xxl-4 g-4">
          {items.map((p) => {
            const stock = p.stock?.Cantidad_stock || 0
            const minimo = p.stock?.Stock_minimo || 0
            const bajo = p.num_lotes > 0 && stock <= minimo
            const porcentaje = Math.min(100, minimo ? (stock / (minimo * 2)) * 100 : (stock ? 100 : 0))
            return (
              <div className="col" key={p.ID_Producto}>
                <article className={'card av-producto' + (p.Estado_producto !== 'Activo' ? ' opacity-75' : '')}>
                  <div className="av-producto-foto">
                    {p.Imagen_producto ? (
                      <button type="button" className="border-0 p-0 w-100 h-100 bg-transparent"
                        onClick={() => setFoto(p)} aria-label={`Ver la foto de ${p.Nombre_producto}`}>
                        <img src={p.Imagen_producto} alt={`Foto de ${p.Nombre_producto}`} loading="lazy"
                          />
                      </button>
                    ) : (
                      <div className="av-producto-sinfoto"><span><Icono nombre="foto" />Sin foto</span></div>
                    )}
                    <span style={{ left: 12 }} className={`badge rounded-pill ${p.Estado_producto === 'Activo' ? 'text-bg-success' : 'text-bg-secondary'}`}>
                      {p.Estado_producto}
                    </span>
                    {bajo && <span style={{ right: 12 }} className="badge rounded-pill text-bg-danger">Stock mínimo</span>}
                    {p.num_lotes === 0 && <span style={{ right: 12 }} className="badge rounded-pill text-bg-warning">Sin ingresos</span>}
                  </div>
                  <div className="card-body">
                    <p className="small text-success fw-semibold mb-1 text-uppercase" style={{ letterSpacing: '.05em', fontSize: '.72rem' }}>
                      {p.ID_Tipo_producto?.Nombre_tipo_producto}
                      {p.ID_Subtipo && <> · {p.ID_Subtipo.Nombre_subtipo}</>}
                    </p>
                    <h2 className="h5 fw-bold mb-1">{p.Nombre_producto}</h2>
                    <p className="small text-body-secondary mb-3">{p.Descripcion_producto || 'Sin descripción'}</p>
                    <div className="av-producto-datos">
                      <div><span>Precio</span><strong>{pesos(p.Precio)}</strong></div>
                      <div><span>Presentación</span><strong>{presentacion(p)}</strong></div>
                    </div>
                    <div className="d-flex justify-content-between small">
                      <span>Stock disponible</span><strong>{numero(stock)} un.</strong>
                    </div>
                    <div className="progress my-2" style={{ height: 8 }} role="progressbar" aria-label="Nivel de stock">
                      <div className={`progress-bar ${bajo ? 'bg-danger' : 'bg-success'}`} style={{ width: `${porcentaje}%` }} />
                    </div>
                    <small className="text-body-secondary">Mínimo: {minimo} un.</small>
                  </div>
                  <div className="card-footer d-flex justify-content-between align-items-center">
                    {p.num_lotes > 0
                      ? <button type="button" className="btn btn-sm btn-outline-success" onClick={() => setLotes(p)}><Icono nombre="caja" /> Lotes <span className="badge text-bg-success">{p.num_lotes}</span></button>
                      : <span className="small text-body-secondary">Sin lotes</span>}
                    {perm.productos_gestionar && (
                      <div className="d-flex gap-2">
                        <button type="button" className="btn btn-outline-success av-btn-ico" title="Editar producto"
                          onClick={() => setModal({ abierto: true, producto: p })}>
                          <Icono nombre="editar" />
                        </button>
                        <button type="button" className="btn btn-outline-danger av-btn-ico" title="Eliminar producto"
                          onClick={() => setConfirmar({
                            titulo: 'Eliminar producto',
                            mensaje: `¿Eliminar "${p.Nombre_producto}"?`,
                            detalle: p.num_lotes > 0
                              ? `Tiene ${p.num_lotes} lote(s). Si tiene movimientos, Django no permitirá eliminarlo.`
                              : 'Se eliminará junto con su stock.',
                            textoBoton: 'Sí, eliminar',
                            alConfirmar: () => accion(`productos/eliminar/${p.ID_Producto}/`),
                          })}>
                          <Icono nombre="eliminar" />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-3">
        {/* Paginación */}
        <Paginacion pagina={pagina} onPagina={irAPagina} onPorPagina={cambiarPorPagina} />
      </div>

      {/* Ventanas: producto, egreso, lotes del producto, foto ampliada y confirmación */}
      <FormProducto abierto={modal.abierto} producto={modal.producto} datos={datos}
        onCerrar={() => setModal({ abierto: false, producto: null })}
        onGuardar={(v) => accion(
          modal.producto ? `productos/editar/${modal.producto.ID_Producto}/` : 'productos/crear/',
          v,
          () => setModal({ abierto: false, producto: null }),
        )} />

      <FormEgreso abierto={egreso} productos={datos.datos_egreso || []} onCerrar={cerrarEgreso}
        onGuardar={(v) => accion('egreso-productos/registrar/', { lote: v.lote, cantidad: v.cantidad, descripcion: v.descripcion }, cerrarEgreso)} />

      <Modal abierto={Boolean(lotes)} titulo={`Lotes · ${lotes?.Nombre_producto || ''}`} icono="caja" onCerrar={() => setLotes(null)} tamano="modal-xl">
        {lotes && (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  <th>Lote</th><th>Remito</th><th>Proveedor</th><th>Vencimiento</th>
                  <th className="text-end">Ingresada</th><th className="text-end">Actual</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {(lotes.lotes_ordenados || []).map((l) => (
                  <tr key={l.ID_Lote}>
                    <td className="fw-semibold">{l.Numero_lote}</td>
                    <td>{l.ID_Remito?.Numero_remito}</td>
                    <td>{l.ID_Remito?.ID_Proveedor?.nombre_proveedor || '—'}</td>
                    <td>{fecha(l.Fecha_vencimiento)}</td>
                    <td className="text-end">{l.Cantidad_ingresada}</td>
                    <td className="text-end">{l.Cantidad_actual}</td>
                    <td><span className="badge text-bg-light border">{l.estado_actual}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <Modal abierto={Boolean(foto)} titulo={foto?.Nombre_producto || 'Foto'} icono="foto" onCerrar={() => setFoto(null)} tamano="modal-lg">
        {foto && <img src={foto.Imagen_producto} alt={`Foto de ${foto.Nombre_producto}`} className="img-fluid rounded-3 w-100" />}
      </Modal>

      <Confirmar pedido={confirmar} onCerrar={() => setConfirmar(null)} />
    </div>
  )
}

export default Productos
