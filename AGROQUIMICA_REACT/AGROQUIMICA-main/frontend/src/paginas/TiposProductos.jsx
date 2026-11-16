// ============================================================
// TIPOS DE PRODUCTOS
// Alta, edición y baja de los tipos de productos (ej. herbicidas, fertilizantes).
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
  CeldaPrincipal, BarraFiltros, Buscador, Encabezado, ErrorCampo, Estado, EstadoPantalla, Icono,
} from '../componentes/Comunes'
import { reglaNombre } from '../servicios/validaciones'

/* ------------------------------------------------------------
   Formulario de alta / edición con useForm (React Hook Form)
   ------------------------------------------------------------ */
function FormTipo({ tipo, abierto, onCerrar, onGuardar }) {
  const {
    register, handleSubmit, reset, formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { Nombre_tipo_producto: '', Estado_tipo_producto: 'True' } })

  // Cada vez que se abre el modal se cargan los datos (como el ejemplo de reset del apunte).
  useEffect(() => {
    if (abierto) {
      reset({
        Nombre_tipo_producto: tipo?.Nombre_tipo_producto || '',
        Estado_tipo_producto: tipo && !tipo.Estado_tipo_producto ? 'False' : 'True',
      })
    }
  }, [abierto, tipo, reset])

  return (
    <Modal
      abierto={abierto}
      titulo={tipo ? 'Editar tipo de producto' : 'Nuevo tipo de producto'} icono="capas"
      onCerrar={onCerrar}
      pie={(
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>Cancelar</button>
          <button type="submit" form="formTipo" className="btn btn-success" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : (tipo ? 'Guardar cambios' : 'Registrar')}
          </button>
        </>
      )}
    >
      <form id="formTipo" onSubmit={handleSubmit(onGuardar)} noValidate>
        <div className="mb-3">
          <label className="form-label" htmlFor="nombreTipo">Nombre del tipo de producto</label>
          <input
            id="nombreTipo"
            className={'form-control' + (errors.Nombre_tipo_producto ? ' is-invalid' : '')}
            placeholder="Ingrese el tipo de producto"
            maxLength={50}
            {...register('Nombre_tipo_producto', reglaNombre('El nombre del tipo de producto'))}
          />
          <ErrorCampo error={errors.Nombre_tipo_producto} />
        </div>

        {/* El estado solo se elige al editar; los nuevos tipos se crean activos. */}
        {tipo && (
          <div className="mb-1">
            <label className="form-label" htmlFor="estadoTipo">Estado</label>
            <select id="estadoTipo" className="form-select" {...register('Estado_tipo_producto')}>
              <option value="True">Activo</option>
              <option value="False">Inactivo</option>
            </select>
          </div>
        )}
      </form>
    </Modal>
  )
}

/* ------------------------------------------------------------
   Pantalla
   ------------------------------------------------------------ */
function TiposProductos() {
  // Permisos, datos de Django, búsqueda, ventana abierta y confirmación
  const { perm, ejecutar } = useOutletContext()
  const { datos, cargando, error, recargar } = usePantalla('tipos-productos/')

  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState({ abierto: false, tipo: null })
  const [confirmar, setConfirmar] = useState(null)

  // Filtrado en el navegador (igual que la búsqueda en vivo del original).
  const filtrados = useMemo(() => {
    const lista = datos?.tipos_productos || []
    const texto = normalizar(busqueda.trim())
    return texto ? lista.filter((t) => normalizar(t.Nombre_tipo_producto).includes(texto)) : lista
  }, [datos, busqueda])

  const { items, pagina, irAPagina, cambiarPorPagina } = usePaginacionLocal(filtrados)

  // Guarda el tipo (crear o editar) y recarga la lista
  const guardar = async (valores) => {
    const ruta = modal.tipo
      ? `tipos-productos/editar/${modal.tipo.ID_Tipo_producto}/`
      : 'tipos-productos/crear/'
    const r = await ejecutar(ruta, valores)
    if (r.ok) {
      setModal({ abierto: false, tipo: null })
      recargar()
    }
  }

  // Pide confirmación antes de eliminar un tipo
  const pedirEliminar = (tipo) => {
    setConfirmar({
      titulo: 'Eliminar tipo de producto',
      mensaje: `¿Deseas eliminar "${tipo.Nombre_tipo_producto}" definitivamente?`,
      detalle: tipo.cantidad_subtipos > 0
        ? `También se eliminarán sus ${tipo.cantidad_subtipos} subtipo(s).`
        : null,
      textoBoton: 'Sí, eliminar',
      alConfirmar: async () => {
        const r = await ejecutar(`tipos-productos/eliminar/${tipo.ID_Tipo_producto}/`)
        if (r.ok) recargar()
      },
    })
  }

  const estado = <EstadoPantalla cargando={cargando} error={error} datos={datos} />
  // Mientras cargan los datos (o si hay error) se muestra el estado de carga
  if (!datos) return estado

  return (
    <div className="pr-page">
      <Encabezado
        icono="capas"
        titulo="Gestión de tipos de producto"
        subtitulo="Clasificación principal de los productos del catálogo."
      >
        {perm.tipos_gestionar && (
          <button type="button" className="btn btn-success d-inline-flex align-items-center gap-2"
            onClick={() => setModal({ abierto: true, tipo: null })}>
            <Icono nombre="mas" /> Nuevo tipo
          </button>
        )}
      </Encabezado>

      {/* Tarjetas de resumen */}
      <Resumen items={datos.resumen} />

      {/* Buscador */}
      <BarraFiltros total={`${pagina.total} registro${pagina.total === 1 ? '' : 's'}`}>
        <Buscador valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar por nombre..." />
      </BarraFiltros>

      {/* Tabla de tipos de productos */}
      <section className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle av-filas mb-0">
            <thead>
              <tr>
                <th>Tipo de producto</th>
                <th>Productos asociados</th>
                <th>Subtipos</th>
                <th>Estado</th>
                {perm.tipos_gestionar && <th className="text-end">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((tipo) => (
                <tr key={tipo.ID_Tipo_producto} className={tipo.Estado_tipo_producto ? '' : 'opacity-75'}>
                  <td><CeldaPrincipal icono="capas" titulo={tipo.Nombre_tipo_producto} subtitulo={`${tipo.cantidad_subtipos} subtipo(s)`} /></td>
                  <td><span className="badge text-bg-light border">{tipo.cantidad_productos}</span></td>
                  <td><span className="badge text-bg-light border">{tipo.cantidad_subtipos}</span></td>
                  <td><Estado activo={tipo.Estado_tipo_producto} /></td>
                  {perm.tipos_gestionar && (
                    <td>
                      <div className="d-flex justify-content-end gap-2">
                        <button type="button" className="btn btn-outline-success av-btn-ico"
                          title="Editar tipo de producto"
                          onClick={() => setModal({ abierto: true, tipo })}>
                          <Icono nombre="editar" />
                        </button>
                        <button type="button" className="btn btn-outline-danger av-btn-ico"
                          title={tipo.cantidad_productos
                            ? 'No se puede eliminar: tiene productos asociados'
                            : 'Eliminar tipo de producto'}
                          disabled={tipo.cantidad_productos > 0}
                          onClick={() => pedirEliminar(tipo)}>
                          <Icono nombre="eliminar" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="av-vacio">
                    {busqueda ? 'No hay tipos que coincidan con la búsqueda.' : 'No hay tipos de productos registrados.'}
                  </td>
                </tr>
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
      <FormTipo
        abierto={modal.abierto}
        tipo={modal.tipo}
        onCerrar={() => setModal({ abierto: false, tipo: null })}
        onGuardar={guardar}
      />
      <Confirmar pedido={confirmar} onCerrar={() => setConfirmar(null)} />
    </div>
  )
}

export default TiposProductos
