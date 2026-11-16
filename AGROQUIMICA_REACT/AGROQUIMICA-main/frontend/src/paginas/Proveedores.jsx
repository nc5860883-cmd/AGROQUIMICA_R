import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { usePantalla } from '../hooks/usePantalla'
import { usePaginacionLocal } from '../hooks/usePaginacionLocal'
import Resumen from '../componentes/Resumen'
import Paginacion from '../componentes/Paginacion'
import Modal from '../componentes/Modal'
import Confirmar from '../componentes/Confirmar'
import {
  CeldaPrincipal, BarraFiltros, Buscador, Encabezado, ErrorCampo, Estado, EstadoPantalla, Icono,
} from '../componentes/Comunes'
import { reglaEmail, reglaNombre, reglaTelefono, reglaTexto } from '../servicios/validaciones'

const VACIO = {
  nombre_proveedor: '', telefono_proveedor: '', email_proveedor: '', direccion_proveedor: '', estado_proveedor: 'True',
}

function FormProveedor({ abierto, proveedor, onCerrar, onGuardar }) {
  const {
    register, handleSubmit, reset, setError, formState: { errors, isSubmitting },
  } = useForm({ defaultValues: VACIO })

  useEffect(() => {
    if (abierto) {
      reset(proveedor
        ? {
          nombre_proveedor: proveedor.nombre_proveedor || '',
          telefono_proveedor: proveedor.telefono_proveedor || '',
          email_proveedor: proveedor.email_proveedor || '',
          direccion_proveedor: proveedor.direccion_proveedor || '',
          estado_proveedor: proveedor.estado_proveedor ? 'True' : 'False',
        }
        : VACIO)
    }
  }, [abierto, proveedor, reset])

  // Si Django rechaza un campo (por ejemplo, nombre duplicado), se marca en el formulario.
  const enviar = async (valores) => {
    const r = await onGuardar(valores)
    Object.entries(r?.errores || {}).forEach(([campo, mensaje]) => {
      setError(campo, { type: 'servidor', message: mensaje })
    })
  }

  const campo = (nombre, etiqueta, reglas, props = {}) => (
    <div className={props.ancho || 'col-md-6'}>
      <label className="form-label" htmlFor={nombre}>{etiqueta}</label>
      <input id={nombre} className={'form-control' + (errors[nombre] ? ' is-invalid' : '')}
        type={props.type || 'text'} placeholder={props.placeholder} maxLength={props.max}
        {...register(nombre, reglas)} />
      <ErrorCampo error={errors[nombre]} />
    </div>
  )

  return (
    <Modal abierto={abierto} titulo={proveedor ? 'Editar proveedor' : 'Registrar proveedor'} icono="camion" onCerrar={onCerrar} tamano="modal-lg"
      pie={(
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>Cancelar</button>
          <button type="submit" form="formProveedor" className="btn btn-success" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : (proveedor ? 'Guardar cambios' : 'Registrar')}
          </button>
        </>
      )}>
      <form id="formProveedor" onSubmit={handleSubmit(enviar)} noValidate className="row g-3">
        {campo('nombre_proveedor', 'Nombre del proveedor', reglaNombre('El nombre del proveedor', 2, 150),
          { ancho: 'col-12', placeholder: 'Ej. Agroinsumos Cuyo S.A.', max: 150 })}
        {campo('telefono_proveedor', 'Teléfono (opcional)', reglaTelefono(), { max: 25 })}
        {campo('email_proveedor', 'Correo electrónico (opcional)', reglaEmail('El correo', false), { type: 'email' })}
        {campo('direccion_proveedor', 'Dirección (opcional)', reglaTexto('La dirección', 255, false, 5),
          { ancho: 'col-12', max: 255 })}
        <input type="hidden" {...register('estado_proveedor')} />
      </form>
    </Modal>
  )
}

function Proveedores() {
  const { perm, ejecutar } = useOutletContext()
  const [busqueda, setBusqueda] = useState('')
  const [buscar, setBuscar] = useState('')
  const { datos, cargando, error, recargar } = usePantalla('proveedores/', { q: buscar })
  const [modal, setModal] = useState({ abierto: false, proveedor: null })
  const [confirmar, setConfirmar] = useState(null)

  // Búsqueda en el servidor con espera (debounce).
  useEffect(() => {
    const t = setTimeout(() => setBuscar(busqueda.trim()), 400)
    return () => clearTimeout(t)
  }, [busqueda])

  const { items, pagina, irAPagina, cambiarPorPagina } = usePaginacionLocal(datos?.proveedores || [])

  const accion = async (ruta, valores, alTerminar) => {
    const r = await ejecutar(ruta, valores)
    if (r.ok) {
      alTerminar?.()
      recargar()
    }
    return r
  }

  const guardar = (v) => accion(
    modal.proveedor ? `proveedores/editar/${modal.proveedor.ID_Proveedor}/` : 'proveedores/crear/',
    v,
    () => setModal({ abierto: false, proveedor: null }),
  )

  if (!datos) return <EstadoPantalla cargando={cargando} error={error} datos={datos} />

  return (
    <div>
      <Encabezado icono="camion" titulo="Gestión de proveedores" subtitulo="Empresas que abastecen de productos a la agroquímica.">
        {perm.proveedores_gestionar && (
          <button type="button" className="btn btn-success d-inline-flex align-items-center gap-2"
            onClick={() => setModal({ abierto: true, proveedor: null })}>
            <Icono nombre="mas" /> Nuevo proveedor
          </button>
        )}
      </Encabezado>

      <Resumen items={datos.resumen} />

      <BarraFiltros total={`${pagina.total} registro${pagina.total === 1 ? '' : 's'}`}>
        <Buscador valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar por nombre, email, dirección o teléfono..." />
      </BarraFiltros>

      <section className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle av-filas mb-0">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Dirección</th>
                <th>Estado</th>
                {perm.proveedores_gestionar && <th className="text-end">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.ID_Proveedor} className={p.estado_proveedor ? '' : 'opacity-75'}>
                  <td><CeldaPrincipal icono="camion" titulo={p.nombre_proveedor} subtitulo={p.email_proveedor || "Sin correo"} /></td>
                  <td>{p.telefono_proveedor || '—'}</td>
                  <td className="text-body-secondary">{p.email_proveedor || '—'}</td>
                  <td className="text-body-secondary">{p.direccion_proveedor || '—'}</td>
                  <td><Estado activo={p.estado_proveedor} /></td>
                  {perm.proveedores_gestionar && (
                    <td>
                      <div className="d-flex justify-content-end gap-2">
                        <button type="button" className="btn btn-outline-success av-btn-ico" title="Editar proveedor"
                          onClick={() => setModal({ abierto: true, proveedor: p })}>
                          <Icono nombre="editar" />
                        </button>
                        {p.estado_proveedor ? (
                          <button type="button" className="btn btn-outline-warning av-btn-ico" title="Dar de baja"
                            onClick={() => setConfirmar({
                              titulo: 'Dar de baja proveedor',
                              mensaje: `¿Dar de baja a "${p.nombre_proveedor}"?`,
                              detalle: 'No se podrá elegir en nuevos remitos hasta que se lo vuelva a activar.',
                              irreversible: false,
                              color: 'warning',
                              textoBoton: 'Sí, dar de baja',
                              alConfirmar: () => accion(`proveedores/estado/${p.ID_Proveedor}/`, { estado: 'inactivo' }),
                            })}>
                            <Icono nombre="baja" />
                          </button>
                        ) : (
                          <button type="button" className="btn btn-outline-success av-btn-ico" title="Activar"
                            onClick={() => accion(`proveedores/estado/${p.ID_Proveedor}/`, { estado: 'activo' })}>
                            <Icono nombre="activar" />
                          </button>
                        )}
                        <button type="button" className="btn btn-outline-danger av-btn-ico"
                          title={p.eliminable ? 'Eliminar proveedor' : p.motivo_no_eliminable}
                          disabled={!p.eliminable}
                          onClick={() => setConfirmar({
                            titulo: 'Eliminar proveedor',
                            mensaje: `¿Eliminar a "${p.nombre_proveedor}" definitivamente?`,
                            textoBoton: 'Sí, eliminar',
                            alConfirmar: () => accion(`proveedores/eliminar/${p.ID_Proveedor}/`),
                          })}>
                          <Icono nombre="eliminar" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} className="av-vacio">No se encontraron proveedores.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card-footer bg-body">
          <Paginacion pagina={pagina} onPagina={irAPagina} onPorPagina={cambiarPorPagina} />
        </div>
      </section>

      <FormProveedor abierto={modal.abierto} proveedor={modal.proveedor}
        onCerrar={() => setModal({ abierto: false, proveedor: null })} onGuardar={guardar} />
      <Confirmar pedido={confirmar} onCerrar={() => setConfirmar(null)} />
    </div>
  )
}

export default Proveedores
