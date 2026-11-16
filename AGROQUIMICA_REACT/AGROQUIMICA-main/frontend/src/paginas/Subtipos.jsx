// ============================================================
// SUBTIPOS DE PRODUCTOS
// Alta, edición y baja de subtipos. Cada subtipo pertenece a un tipo de producto.
// ============================================================

import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { usePantalla } from '../hooks/usePantalla'
import { usePaginacionLocal, normalizar } from '../hooks/usePaginacionLocal'
import Resumen from '../componentes/Resumen'
import Paginacion from '../componentes/Paginacion'
import Modal from '../componentes/Modal'
import Confirmar from '../componentes/Confirmar'
import {
  CeldaPrincipal, BarraFiltros, Buscador, Encabezado, ErrorCampo, EstadoPantalla, Icono,
} from '../componentes/Comunes'
import { reglaNombre, reglaTexto } from '../servicios/validaciones'

// ---------- Ventana para registrar o editar un subtipo ----------
function FormSubtipo({ subtipo, tipos, abierto, onCerrar, onGuardar }) {
  const {
    register, handleSubmit, reset, formState: { errors, isSubmitting },
  } = useForm()

  // Al abrir la ventana se cargan los datos del subtipo (o se deja vacío)
  useEffect(() => {
    if (abierto) {
      reset({
        Nombre_subtipo: subtipo?.Nombre_subtipo || '',
        ID_Tipo_producto: subtipo?.ID_Tipo_producto_id ? String(subtipo.ID_Tipo_producto_id) : '',
        Descripcion_subtipo: subtipo?.Descripcion_subtipo || '',
      })
    }
  }, [abierto, subtipo, reset])

  // Al registrar solo se ofrecen tipos activos; al editar se conserva el que ya tenía.
  const opciones = tipos.filter(
    (t) => t.Estado_tipo_producto || t.ID_Tipo_producto === subtipo?.ID_Tipo_producto_id,
  )

  return (
    <Modal
      abierto={abierto}
      titulo={subtipo ? 'Modificar subtipo' : 'Registrar subtipo'} icono="etiqueta"
      onCerrar={onCerrar}
      pie={(
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>Cancelar</button>
          <button type="submit" form="formSubtipo" className="btn btn-success" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      )}
    >
      <form id="formSubtipo" onSubmit={handleSubmit(onGuardar)} noValidate>
        <div className="mb-3">
          <label className="form-label" htmlFor="nombreSubtipo">Nombre del subtipo</label>
          <input id="nombreSubtipo" maxLength={50}
            className={'form-control' + (errors.Nombre_subtipo ? ' is-invalid' : '')}
            {...register('Nombre_subtipo', reglaNombre('El nombre del subtipo'))} />
          <ErrorCampo error={errors.Nombre_subtipo} />
        </div>

        <div className="mb-3">
          <label className="form-label" htmlFor="tipoSubtipo">Tipo de producto</label>
          <select id="tipoSubtipo"
            className={'form-select' + (errors.ID_Tipo_producto ? ' is-invalid' : '')}
            {...register('ID_Tipo_producto', { required: 'Seleccione un tipo de producto.' })}>
            <option value="">Seleccione un tipo…</option>
            {opciones.map((t) => (
              <option key={t.ID_Tipo_producto} value={t.ID_Tipo_producto}>
                {t.Nombre_tipo_producto}{t.Estado_tipo_producto ? '' : ' (inactivo)'}
              </option>
            ))}
          </select>
          <ErrorCampo error={errors.ID_Tipo_producto} />
        </div>

        <div className="mb-1">
          <label className="form-label" htmlFor="descSubtipo">Descripción (opcional)</label>
          <input id="descSubtipo" maxLength={200}
            className={'form-control' + (errors.Descripcion_subtipo ? ' is-invalid' : '')}
            {...register('Descripcion_subtipo', reglaTexto('La descripción', 200))} />
          <ErrorCampo error={errors.Descripcion_subtipo} />
        </div>
      </form>
    </Modal>
  )
}

// ---------- Pantalla principal de subtipos ----------
function Subtipos() {
  // Permisos, datos de Django, búsqueda, ventana abierta y confirmación
  const { perm, ejecutar } = useOutletContext()
  const { datos, cargando, error, recargar } = usePantalla('subtipos/')
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState({ abierto: false, subtipo: null })
  const [confirmar, setConfirmar] = useState(null)

  // Filtrado en el navegador según el texto del buscador
  const filtrados = useMemo(() => {
    const lista = datos?.subtipos || []
    const texto = normalizar(busqueda.trim())
    if (!texto) return lista
    return lista.filter((s) => normalizar(
      `${s.Nombre_subtipo} ${s.ID_Tipo_producto?.Nombre_tipo_producto} ${s.Descripcion_subtipo || ''}`,
    ).includes(texto))
  }, [datos, busqueda])

  const { items, pagina, irAPagina, cambiarPorPagina } = usePaginacionLocal(filtrados)

  // Guarda el subtipo (crear o editar) y recarga la lista
  const guardar = async (valores) => {
    const ruta = modal.subtipo ? `subtipos/editar/${modal.subtipo.ID_Subtipo}/` : 'subtipos/crear/'
    const r = await ejecutar(ruta, valores)
    if (r.ok) {
      setModal({ abierto: false, subtipo: null })
      recargar()
    }
  }

  // Pide confirmación antes de eliminar un subtipo
  const pedirEliminar = (s) => setConfirmar({
    titulo: 'Eliminar subtipo',
    mensaje: `¿Deseas eliminar el subtipo "${s.Nombre_subtipo}"?`,
    textoBoton: 'Sí, eliminar',
    alConfirmar: async () => {
      const r = await ejecutar(`subtipos/eliminar/${s.ID_Subtipo}/`)
      if (r.ok) recargar()
    },
  })

  // Mientras cargan los datos (o si hay error) se muestra el estado de carga
  if (!datos) return <EstadoPantalla cargando={cargando} error={error} datos={datos} />

  return (
    <div>
      <Encabezado icono="etiqueta" titulo="Gestión de subtipos" subtitulo="Subdivisiones de cada tipo de producto.">
        {perm.subtipos_gestionar && (
          <button type="button" className="btn btn-success d-inline-flex align-items-center gap-2"
            onClick={() => setModal({ abierto: true, subtipo: null })}>
            <Icono nombre="mas" /> Nuevo subtipo
          </button>
        )}
      </Encabezado>

      {/* Tarjetas de resumen */}
      <Resumen items={datos.resumen} />

      {/* Buscador */}
      <BarraFiltros total={`${pagina.total} registro${pagina.total === 1 ? '' : 's'}`}>
        <Buscador valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar subtipo..." />
      </BarraFiltros>

      {/* Tabla de subtipos */}
      <section className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle av-filas mb-0">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo de producto</th>
                <th>Descripción</th>
                <th>Productos</th>
                {perm.subtipos_gestionar && <th className="text-end">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.ID_Subtipo}>
                  <td><CeldaPrincipal icono="etiqueta" titulo={s.Nombre_subtipo} subtitulo={s.ID_Tipo_producto?.Nombre_tipo_producto} /></td>
                  <td className="text-body-secondary">{s.ID_Tipo_producto?.Nombre_tipo_producto}</td>
                  <td className="text-body-secondary">{s.Descripcion_subtipo || '—'}</td>
                  <td>{s.cantidad_productos}</td>
                  {perm.subtipos_gestionar && (
                    <td>
                      <div className="d-flex justify-content-end gap-2">
                        <button type="button" className="btn btn-outline-success av-btn-ico" title="Modificar subtipo"
                          onClick={() => setModal({ abierto: true, subtipo: s })}>
                          <Icono nombre="editar" />
                        </button>
                        <button type="button" className="btn btn-outline-danger av-btn-ico"
                          title={s.cantidad_productos ? 'No se puede eliminar: tiene productos asociados' : 'Eliminar subtipo'}
                          disabled={s.cantidad_productos > 0}
                          onClick={() => pedirEliminar(s)}>
                          <Icono nombre="eliminar" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={5} className="av-vacio">No hay subtipos registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card-footer bg-body">
          {/* Paginación */}
          <Paginacion pagina={pagina} onPagina={irAPagina} onPorPagina={cambiarPorPagina} />
        </div>
      </section>

      {/* Ventanas: formulario y confirmación */}
      <FormSubtipo
        abierto={modal.abierto}
        subtipo={modal.subtipo}
        tipos={datos.tipos_productos || []}
        onCerrar={() => setModal({ abierto: false, subtipo: null })}
        onGuardar={guardar}
      />
      <Confirmar pedido={confirmar} onCerrar={() => setConfirmar(null)} />
    </div>
  )
}

export default Subtipos
