// ============================================================
// USUARIOS
// Alta, edición, baja/activación y eliminación de usuarios, y
// restablecimiento de contraseñas (por correo o con una temporal).
// ============================================================

import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { usePantalla } from '../hooks/usePantalla'
import { usePaginacionLocal } from '../hooks/usePaginacionLocal'
import Resumen from '../componentes/Resumen'
import Paginacion from '../componentes/Paginacion'
import Modal from '../componentes/Modal'
import Confirmar from '../componentes/Confirmar'
import {
  CeldaPrincipal, BarraFiltros, Buscador, Encabezado, ErrorCampo, Estado, EstadoPantalla, Icono,
} from '../componentes/Comunes'
import { fecha } from '../servicios/formato'
import { reglaContrasena, reglaDni, reglaEmail, reglaPersona } from '../servicios/validaciones'

// Usuario = apellido + primera letra del nombre (igual que el sistema original).
function generarUsuario(apellido, nombre) {
  const limpiar = (t) => (t || '').trim().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const a = limpiar(apellido)
  const n = limpiar(nombre)
  if (!a || !n) return ''
  return (a + n.charAt(0)).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50)
}

/* ------------------------- ALTA ------------------------- */
function FormCrear({ abierto, perfiles, onCerrar, onGuardar }) {
  const {
    register, handleSubmit, reset, control, formState: { errors, isSubmitting },
  } = useForm()

  // Al abrir la ventana se limpia el formulario
  useEffect(() => {
    if (abierto) reset({ Nombre_usuario: '', Apellido_usuario: '', DNI: '', ID_Perfil: '', Contrasena: '', Email_usuario: '' })
  }, [abierto, reset])

  // useWatch: observa en tiempo real nombre y apellido para mostrar el usuario que se generará.
  const [apellido, nombre] = useWatch({ control, name: ['Apellido_usuario', 'Nombre_usuario'] })
  const usuarioGenerado = generarUsuario(apellido, nombre)

  return (
    <Modal abierto={abierto} titulo="Registrar usuario" icono="usuario" onCerrar={onCerrar} tamano="modal-lg"
      pie={(
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>Cancelar</button>
          <button type="submit" form="formCrearUsuario" className="btn btn-success" disabled={isSubmitting}>
            {isSubmitting ? 'Registrando…' : 'Registrar'}
          </button>
        </>
      )}>
      <form id="formCrearUsuario" onSubmit={handleSubmit(onGuardar)} noValidate className="row g-3">
        <div className="col-md-6">
          <label className="form-label">Nombre</label>
          <input className={'form-control' + (errors.Nombre_usuario ? ' is-invalid' : '')}
            {...register('Nombre_usuario', reglaPersona('El nombre'))} />
          <ErrorCampo error={errors.Nombre_usuario} />
        </div>
        <div className="col-md-6">
          <label className="form-label">Apellido</label>
          <input className={'form-control' + (errors.Apellido_usuario ? ' is-invalid' : '')}
            {...register('Apellido_usuario', reglaPersona('El apellido'))} />
          <ErrorCampo error={errors.Apellido_usuario} />
        </div>
        <div className="col-md-6">
          <label className="form-label">DNI</label>
          <input inputMode="numeric" className={'form-control' + (errors.DNI ? ' is-invalid' : '')}
            {...register('DNI', reglaDni())} />
          <ErrorCampo error={errors.DNI} />
        </div>
        <div className="col-md-6">
          <label className="form-label">Perfil</label>
          <select className={'form-select' + (errors.ID_Perfil ? ' is-invalid' : '')}
            {...register('ID_Perfil', { required: 'Debe seleccionar un perfil.' })}>
            <option value="">Seleccione un perfil…</option>
            {perfiles.filter((p) => p.Estado_perfil).map((p) => (
              <option key={p.ID_Perfil} value={p.ID_Perfil}>{p.Nombre_perfil}</option>
            ))}
          </select>
          <ErrorCampo error={errors.ID_Perfil} />
        </div>
        <div className="col-md-6">
          <label className="form-label">Usuario (se genera solo)</label>
          <input className="form-control" value={usuarioGenerado} readOnly placeholder="apellido + inicial del nombre" />
        </div>
        <div className="col-md-6">
          <label className="form-label">Contraseña inicial</label>
          <input type="password" autoComplete="new-password"
            className={'form-control' + (errors.Contrasena ? ' is-invalid' : '')}
            {...register('Contrasena', {
              ...reglaContrasena(),
              validate: {
                ...reglaContrasena().validate,
                sinUsuario: (v) => !usuarioGenerado || !v.toLowerCase().includes(usuarioGenerado)
                  || 'No se puede usar el nombre de usuario.',
              },
            })} />
          <ErrorCampo error={errors.Contrasena} />
          <div className="form-text">Mínimo 8 caracteres, con mayúscula, minúscula y número. Sin espacios.</div>
        </div>
        <div className="col-12">
          <label className="form-label">Email</label>
          <input type="email" placeholder="usuario@agrovalle.com"
            className={'form-control' + (errors.Email_usuario ? ' is-invalid' : '')}
            {...register('Email_usuario', reglaEmail())} />
          <ErrorCampo error={errors.Email_usuario} />
        </div>
      </form>
    </Modal>
  )
}

/* ------------------------- EDICIÓN ------------------------- */
function FormEditar({ usuario, perfiles, onCerrar, onGuardar }) {
  const {
    register, handleSubmit, reset, formState: { errors, isSubmitting },
  } = useForm()

  // Al abrir la ventana se cargan los datos del usuario
  useEffect(() => {
    if (usuario) {
      reset({ Email_usuario: usuario.Email_usuario, ID_Perfil: String(usuario.ID_Perfil_id) })
    }
  }, [usuario, reset])

  return (
    <Modal abierto={Boolean(usuario)} titulo="Modificar usuario" icono="usuario" onCerrar={onCerrar} tamano="modal-lg"
      pie={(
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>Cancelar</button>
          <button type="submit" form="formEditarUsuario" className="btn btn-success" disabled={isSubmitting}>
            Guardar cambios
          </button>
        </>
      )}>
      {usuario && (
        <form id="formEditarUsuario" onSubmit={handleSubmit(onGuardar)} noValidate className="row g-3">
          {[
            ['Usuario', usuario.Usuario],
            ['DNI', usuario.DNI],
            ['Apellido', usuario.Apellido_usuario],
            ['Nombre', usuario.Nombre_usuario],
            ['Estado', usuario.Estado_usuario ? 'Activo' : 'Inactivo'],
            ['Última modificación', fecha(usuario.Fecha_ultima_modificacion)],
          ].map(([etiqueta, valor]) => (
            <div className="col-md-4 col-6" key={etiqueta}>
              <div className="av-ficha mb-0" style={{ display: 'block' }}>
                <div><span>{etiqueta}</span><strong>{valor ?? '—'}</strong></div>
              </div>
            </div>
          ))}
          <div className="col-md-6">
            <label className="form-label">Perfil</label>
            <select className="form-select" {...register('ID_Perfil', { required: 'Debe seleccionar un perfil.' })}>
              {perfiles
                .filter((p) => p.Estado_perfil || p.ID_Perfil === usuario.ID_Perfil_id)
                .map((p) => <option key={p.ID_Perfil} value={p.ID_Perfil}>{p.Nombre_perfil}</option>)}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Email</label>
            <input type="email" className={'form-control' + (errors.Email_usuario ? ' is-invalid' : '')}
              {...register('Email_usuario', reglaEmail())} />
            <ErrorCampo error={errors.Email_usuario} />
          </div>
        </form>
      )}
    </Modal>
  )
}

/* ------------------- RESTABLECER CONTRASEÑA ------------------- */
function FormRestablecer({ usuario, onCerrar, onEnlace, onGuardar }) {
  const {
    register, handleSubmit, reset, control, formState: { errors, isSubmitting },
  } = useForm()

  // Al abrir la ventana se limpia el formulario
  useEffect(() => {
    if (usuario) reset({ nueva_contrasena: '', confirmar_contrasena: '' })
  }, [usuario, reset])

  const nueva = useWatch({ control, name: 'nueva_contrasena' })

  return (
    <Modal abierto={Boolean(usuario)} titulo="Restablecer contraseña" icono="llave" onCerrar={onCerrar}>
      {usuario && (
        <>
          <div className="av-seccion">
            <div className="av-seccion-titulo"><Icono nombre="correo" /> Enviar enlace por correo</div>
            <p className="small text-body-secondary mb-2">
              Se enviará un enlace a <strong>{usuario.Email_usuario}</strong> para que el usuario elija una nueva contraseña.
            </p>
            {!usuario.Estado_usuario && (
              <p className="small text-danger mb-2">El usuario está inactivo: actívelo antes de enviar el enlace.</p>
            )}
            <button type="button" className="btn btn-outline-success btn-sm"
              disabled={!usuario.Estado_usuario} onClick={onEnlace}>
              Enviar enlace
            </button>
          </div>

          <form onSubmit={handleSubmit(onGuardar)} noValidate className="av-seccion">
            <div className="av-seccion-titulo"><Icono nombre="llave" /> Asignar una contraseña temporal</div>
            <p className="small text-body-secondary">
              Úsela si el usuario no tiene acceso a su correo. Deberá cambiarla en su próximo ingreso.
            </p>
            <div className="mb-2">
              <label className="form-label">Nueva contraseña</label>
              <input type="password" autoComplete="new-password"
                className={'form-control' + (errors.nueva_contrasena ? ' is-invalid' : '')}
                {...register('nueva_contrasena', reglaContrasena())} />
              <ErrorCampo error={errors.nueva_contrasena} />
            </div>
            <div className="mb-3">
              <label className="form-label">Confirmar contraseña</label>
              <input type="password" autoComplete="new-password"
                className={'form-control' + (errors.confirmar_contrasena ? ' is-invalid' : '')}
                {...register('confirmar_contrasena', {
                  required: 'Repita la nueva contraseña.',
                  validate: (v) => v === nueva || 'Las contraseñas no coinciden.',
                })} />
              <ErrorCampo error={errors.confirmar_contrasena} />
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>Cancelar</button>
              <button type="submit" className="btn btn-success" disabled={isSubmitting}>Asignar contraseña</button>
            </div>
          </form>
        </>
      )}
    </Modal>
  )
}

/* ------------------------- PANTALLA ------------------------- */
function Usuarios() {
  // Permisos, búsqueda, datos de Django, ventanas abiertas y confirmación
  const { perm, ejecutar } = useOutletContext()
  const [busqueda, setBusqueda] = useState('')
  const [buscar, setBuscar] = useState('')
  const { datos, cargando, error, recargar } = usePantalla('usuarios/', { q: buscar })

  const [crear, setCrear] = useState(false)
  const [editar, setEditar] = useState(null)
  const [restablecer, setRestablecer] = useState(null)
  const [confirmar, setConfirmar] = useState(null)

  // Búsqueda en el servidor: espera 400 ms desde la última tecla (debounce con useEffect).
  useEffect(() => {
    const t = setTimeout(() => setBuscar(busqueda.trim()), 400)
    return () => clearTimeout(t)
  }, [busqueda])

  const { items, pagina, irAPagina, cambiarPorPagina } = usePaginacionLocal(datos?.usuarios || [])

  // Ejecuta una acción en Django; si sale bien, cierra la ventana y recarga la lista
  const accion = async (ruta, valores, alTerminar) => {
    const r = await ejecutar(ruta, valores)
    if (r.ok) {
      alTerminar?.()
      recargar()
    }
    return r
  }

  // Mientras cargan los datos (o si hay error) se muestra el estado de carga
  if (!datos) return <EstadoPantalla cargando={cargando} error={error} datos={datos} />

  const actualId = datos.usuario_actual?.ID_Usuario

  return (
    <div>
      <Encabezado icono="usuarios" titulo="Gestión de usuarios" subtitulo="Cuentas de acceso al sistema, con su perfil y su estado.">
        {perm.usuarios_gestionar && (
          <button type="button" className="btn btn-success d-inline-flex align-items-center gap-2" onClick={() => setCrear(true)}>
            <Icono nombre="mas" /> Nuevo usuario
          </button>
        )}
      </Encabezado>

      {/* Tarjetas de resumen */}
      <Resumen items={datos.resumen} />

      {/* Buscador */}
      <BarraFiltros total={`${pagina.total} registro${pagina.total === 1 ? '' : 's'}`}>
        <Buscador valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar por usuario, nombre, apellido, DNI o email..." />
      </BarraFiltros>

      {/* Tabla de usuarios */}
      <section className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle av-filas mb-0">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre y apellido</th>
                <th>DNI</th>
                <th>Email</th>
                <th>Perfil</th>
                <th>Estado</th>
                <th>Última modificación</th>
                <th>Fecha de baja</th>
                {perm.usuarios_gestionar && <th className="text-end">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.ID_Usuario}>
                  <td>
                    <CeldaPrincipal titulo={u.Usuario} subtitulo={u.ID_Perfil?.Nombre_perfil}
                      inicial={(u.Nombre_usuario || '?').charAt(0).toUpperCase()}
                      foto={datos.ver_fotos ? u.Foto_usuario : null} />
                  </td>
                  <td>{u.Nombre_usuario} {u.Apellido_usuario}</td>
                  <td>{u.DNI}</td>
                  <td className="text-body-secondary">{u.Email_usuario}</td>
                  <td>{u.ID_Perfil?.Nombre_perfil}</td>
                  <td><Estado activo={u.Estado_usuario} /></td>
                  <td>{fecha(u.Fecha_ultima_modificacion)}</td>
                  <td>{u.Fecha_Baja ? fecha(u.Fecha_Baja) : '—'}</td>
                  {perm.usuarios_gestionar && (
                    <td>
                      <div className="d-flex justify-content-end gap-2">
                        <button type="button" className="btn btn-outline-success av-btn-ico" title="Editar usuario" onClick={() => setEditar(u)}>
                          <Icono nombre="editar" />
                        </button>
                        <button type="button" className="btn btn-outline-secondary av-btn-ico" title="Restablecer contraseña" onClick={() => setRestablecer(u)}>
                          <Icono nombre="llave" />
                        </button>
                        {u.Estado_usuario && u.ID_Usuario !== actualId && (
                          <button type="button" className="btn btn-outline-danger av-btn-ico" title="Dar de baja"
                            onClick={() => setConfirmar({
                              titulo: 'Dar de baja usuario',
                              mensaje: `¿Dar de baja al usuario "${u.Usuario}"?`,
                              detalle: 'No podrá ingresar al sistema hasta que se lo vuelva a activar.',
                              irreversible: false,
                              textoBoton: 'Sí, dar de baja',
                              alConfirmar: () => accion(`usuarios/baja/${u.ID_Usuario}/`),
                            })}>
                            <Icono nombre="baja" />
                          </button>
                        )}
                        {!u.Estado_usuario && (
                          <button type="button" className="btn btn-outline-success av-btn-ico" title="Activar usuario"
                            onClick={() => accion(`usuarios/activar/${u.ID_Usuario}/`)}>
                            <Icono nombre="activar" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={9} className="av-vacio">No se encontraron usuarios.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card-footer bg-body">
          {/* Paginación */}
          <Paginacion pagina={pagina} onPagina={irAPagina} onPorPagina={cambiarPorPagina} />
        </div>
      </section>

      {/* Ventanas: crear, editar, restablecer contraseña y confirmación */}
      <FormCrear abierto={crear} perfiles={datos.perfiles || []} onCerrar={() => setCrear(false)}
        onGuardar={(v) => accion('usuarios/crear/', v, () => setCrear(false))} />
      <FormEditar usuario={editar} perfiles={datos.perfiles || []} onCerrar={() => setEditar(null)}
        onGuardar={(v) => accion(`usuarios/editar/${editar.ID_Usuario}/`, v, () => setEditar(null))} />
      <FormRestablecer usuario={restablecer} onCerrar={() => setRestablecer(null)}
        onEnlace={() => accion(`usuarios/enviar-enlace/${restablecer.ID_Usuario}/`, {}, () => setRestablecer(null))}
        onGuardar={(v) => accion(`usuarios/restablecer/${restablecer.ID_Usuario}/`, v, () => setRestablecer(null))} />
      <Confirmar pedido={confirmar} onCerrar={() => setConfirmar(null)} />
    </div>
  )
}

export default Usuarios
