import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
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
import { iconoModulo } from '../servicios/iconos'

function FormPerfil({ abierto, perfil, grupos, esAdmin, onCerrar, onGuardar }) {
  const {
    register, handleSubmit, reset, setValue, control, formState: { errors, isSubmitting },
  } = useForm()

  useEffect(() => {
    if (abierto) {
      reset({
        Nombre_perfil: perfil?.Nombre_perfil || '',
        permisos: (perfil?.permisos || []).map((p) => String(p.ID_Permiso)),
      })
    }
  }, [abierto, perfil, reset])

  const marcados = useWatch({ control, name: 'permisos' }) || []
  const todosLosIds = grupos.flatMap(([, lista]) => lista.map((p) => String(p.id)))

  // Marca o desmarca todos los permisos de un módulo.
  const alternarGrupo = (lista) => {
    const ids = lista.map((p) => String(p.id))
    const todos = ids.every((id) => marcados.includes(id))
    setValue('permisos', todos
      ? marcados.filter((id) => !ids.includes(id))
      : [...new Set([...marcados, ...ids])])
  }

  return (
    <Modal abierto={abierto} titulo={perfil ? 'Modificar perfil' : 'Registrar perfil'} icono="escudo" onCerrar={onCerrar} tamano="modal-xl"
      subtitulo="Elegí qué puede ver y hacer cada usuario con este perfil"
      pie={(
        <>
          <span className="me-auto badge rounded-pill text-bg-success">
            {esAdmin ? 'Todos los permisos' : `${marcados.length} de ${todosLosIds.length} permisos`}
          </span>
          <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>Cancelar</button>
          <button type="submit" form="formPerfil" className="btn btn-success" disabled={isSubmitting}>
            {perfil ? 'Guardar cambios' : 'Registrar'}
          </button>
        </>
      )}>
      <form id="formPerfil" onSubmit={handleSubmit(onGuardar)} noValidate>
        <div className="mb-3">
          <label className="form-label">Nombre del perfil</label>
          <input className={'form-control' + (errors.Nombre_perfil ? ' is-invalid' : '')} maxLength={50}
            readOnly={esAdmin}
            {...register('Nombre_perfil', reglaNombre('El nombre del perfil'))} />
          <ErrorCampo error={errors.Nombre_perfil} />
          {esAdmin && <div className="form-text">El perfil de administrador tiene siempre todos los permisos.</div>}
        </div>

        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div className="av-seccion-titulo mb-0"><Icono nombre="llave" /> Permisos del perfil</div>
          {!esAdmin && (
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-sm btn-outline-success" onClick={() => setValue('permisos', todosLosIds)}>
                Marcar todos
              </button>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setValue('permisos', [])}>
                Quitar todos
              </button>
            </div>
          )}
        </div>

        {/* Una tarjeta por módulo, con un interruptor por permiso. */}
        <div className="av-permisos-grid">
          {grupos.map(([modulo, lista]) => {
            const cantidad = lista.filter((p) => esAdmin || marcados.includes(String(p.id))).length
            const completo = cantidad === lista.length
            return (
              <div className={'av-modulo' + (completo ? ' completo' : '')} key={modulo}>
                <div className="av-modulo-cab">
                  <span className="av-modulo-icono"><Icono nombre={iconoModulo(modulo)} className="" /></span>
                  <strong>{modulo}</strong>
                  <span className="av-modulo-cuenta">{cantidad}/{lista.length}</span>
                  {!esAdmin && (
                    <div className="form-check form-switch m-0" title="Marcar o desmarcar todo el módulo">
                      <input className="form-check-input" type="checkbox" checked={completo}
                        onChange={() => alternarGrupo(lista)} aria-label={`Todos los permisos de ${modulo}`} />
                    </div>
                  )}
                </div>
                {lista.map((p) => {
                  const activo = esAdmin || marcados.includes(String(p.id))
                  return (
                    <label className={'av-permiso' + (activo ? ' activo' : '')} key={p.id} htmlFor={`perm-${p.id}`}>
                      <span className="form-check form-switch m-0">
                        <input className="form-check-input" type="checkbox" id={`perm-${p.id}`} value={String(p.id)}
                          disabled={esAdmin} {...register('permisos')} />
                      </span>
                      <span className="av-permiso-texto">
                        <strong>{p.nombre}</strong>
                        <small>{p.descripcion}</small>
                      </span>
                    </label>
                  )
                })}
              </div>
            )
          })}
        </div>
      </form>
    </Modal>
  )
}

function Perfiles() {
  const { perm, ejecutar } = useOutletContext()
  const { datos, cargando, error, recargar } = usePantalla('perfiles/')
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState({ abierto: false, perfil: null })
  const [confirmar, setConfirmar] = useState(null)
  const [verPermisos, setVerPermisos] = useState(null)

  const filtrados = useMemo(() => {
    const texto = normalizar(busqueda.trim())
    const lista = datos?.perfiles || []
    return texto ? lista.filter((p) => normalizar(p.Nombre_perfil).includes(texto)) : lista
  }, [datos, busqueda])

  const { items, pagina, irAPagina, cambiarPorPagina } = usePaginacionLocal(filtrados)
  const admins = datos?.perfiles_admin || []
  const esAdminVer = Boolean(verPermisos && admins.includes(verPermisos.Nombre_perfil))

  const accion = async (ruta, valores, alTerminar) => {
    const r = await ejecutar(ruta, valores)
    if (r.ok) {
      alTerminar?.()
      recargar()
    }
  }

  const guardar = (v) => {
    const ruta = modal.perfil ? `perfiles/editar/${modal.perfil.ID_Perfil}/` : 'perfiles/crear/'
    return accion(ruta, v, () => setModal({ abierto: false, perfil: null }))
  }

  if (!datos) return <EstadoPantalla cargando={cargando} error={error} datos={datos} />

  return (
    <div>
      <Encabezado icono="escudo" titulo="Perfiles de acceso" subtitulo="Grupos de permisos que se asignan a cada usuario.">
        {perm.perfiles_gestionar && (
          <button type="button" className="btn btn-success d-inline-flex align-items-center gap-2"
            onClick={() => setModal({ abierto: true, perfil: null })}>
            <Icono nombre="mas" /> Nuevo perfil
          </button>
        )}
      </Encabezado>

      <Resumen items={datos.resumen} />

      <BarraFiltros total={`${pagina.total} registro${pagina.total === 1 ? '' : 's'}`}>
        <Buscador valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar perfil..." />
      </BarraFiltros>

      <section className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle av-filas mb-0">
            <thead>
              <tr>
                <th>Perfil</th>
                <th>Permisos asignados</th>
                <th>Usuarios</th>
                <th>Estado</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => {
                const esAdmin = admins.includes(p.Nombre_perfil)
                return (
                  <tr key={p.ID_Perfil}>
                    <td>
                      <CeldaPrincipal icono="escudo" titulo={p.Nombre_perfil}
                        subtitulo={esAdmin ? 'Perfil del sistema' : `${p.usuarios_activos} usuario(s) activo(s)`} />
                    </td>
                    <td>
                      <button type="button" className="btn btn-link p-0" onClick={() => setVerPermisos(p)}>
                        {esAdmin ? 'Todos los permisos' : `${(p.permisos || []).length} permiso(s)`}
                      </button>
                    </td>
                    <td>{p.usuarios_activos}</td>
                    <td><Estado activo={p.Estado_perfil} /></td>
                    <td>
                      <div className="d-flex justify-content-end gap-2">
                        {perm.perfiles_gestionar && (
                          <>
                            <button type="button" className="btn btn-outline-success av-btn-ico" title="Modificar perfil"
                              onClick={() => setModal({ abierto: true, perfil: p })}>
                              <Icono nombre="editar" />
                            </button>
                            {p.Estado_perfil && !esAdmin && (
                              <button type="button" className="btn btn-outline-danger av-btn-ico" title="Dar de baja perfil"
                                onClick={() => setConfirmar({
                                  titulo: 'Confirmar baja',
                                  mensaje: `¿Dar de baja el perfil "${p.Nombre_perfil}"?`,
                                  detalle: p.usuarios_activos
                                    ? `Tiene ${p.usuarios_activos} usuario(s) activo(s) que no podrán ingresar.`
                                    : null,
                                  irreversible: false,
                                  textoBoton: 'Sí, dar de baja',
                                  alConfirmar: () => accion(`perfiles/cambiar-estado/${p.ID_Perfil}/`),
                                })}>
                                <Icono nombre="baja" />
                              </button>
                            )}
                            {!p.Estado_perfil && (
                              <button type="button" className="btn btn-outline-success av-btn-ico" title="Activar perfil"
                                onClick={() => accion(`perfiles/cambiar-estado/${p.ID_Perfil}/`)}>
                                <Icono nombre="activar" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {items.length === 0 && (
                <tr><td colSpan={5} className="av-vacio">No hay perfiles registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card-footer bg-body">
          <Paginacion pagina={pagina} onPagina={irAPagina} onPorPagina={cambiarPorPagina} />
        </div>
      </section>

      <FormPerfil
        abierto={modal.abierto}
        perfil={modal.perfil}
        grupos={datos.grupos_permisos || []}
        esAdmin={Boolean(modal.perfil && admins.includes(modal.perfil.Nombre_perfil))}
        onCerrar={() => setModal({ abierto: false, perfil: null })}
        onGuardar={guardar}
      />

      <Modal abierto={Boolean(verPermisos)} titulo={`Permisos de ${verPermisos?.Nombre_perfil || ''}`} icono="llave"
        subtitulo={esAdminVer ? 'Perfil del sistema: tiene todos los permisos' : `${(verPermisos?.permisos || []).length} permiso(s) asignado(s)`}
        tamano="modal-xl" onCerrar={() => setVerPermisos(null)}>
        {verPermisos && (() => {
          // Se agrupan los permisos del perfil por módulo, igual que en el formulario.
          const ids = (verPermisos.permisos || []).map((pm) => pm.ID_Permiso)
          const grupos = (datos.grupos_permisos || [])
            .map(([modulo, lista]) => [modulo, lista.filter((x) => esAdminVer || ids.includes(x.id))])
            .filter(([, lista]) => lista.length > 0)
          if (grupos.length === 0) {
            return <p className="text-body-secondary text-center my-4">Este perfil no tiene permisos asignados.</p>
          }
          return (
            <div className="av-permisos-grid">
              {grupos.map(([modulo, lista]) => (
                <div className="av-modulo" key={modulo}>
                  <div className="av-modulo-cab">
                    <span className="av-modulo-icono"><Icono nombre={iconoModulo(modulo)} className="" /></span>
                    <strong>{modulo}</strong>
                    <span className="av-modulo-cuenta">{lista.length}</span>
                  </div>
                  {lista.map((x) => (
                    <div className="av-permiso activo" key={x.id} style={{ cursor: 'default' }}>
                      <Icono nombre="check" className="av-ico text-success mt-1" />
                      <span className="av-permiso-texto"><strong>{x.nombre}</strong><small>{x.descripcion}</small></span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )
        })()}
      </Modal>

      <Confirmar pedido={confirmar} onCerrar={() => setConfirmar(null)} />
    </div>
  )
}

export default Perfiles
