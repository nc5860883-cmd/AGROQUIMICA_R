// ============================================================
// MI PERFIL
// El usuario ve y edita sus datos personales y su foto, cambia su
// contraseña y consulta los permisos de su perfil.
// ============================================================

import { useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { usePantalla } from '../hooks/usePantalla'
import { useVistaPrevia } from '../hooks/useVistaPrevia'
import { Encabezado, ErrorCampo, EstadoPantalla } from '../componentes/Comunes'
import { reglaContrasena, reglaEmail, reglaPersona } from '../servicios/validaciones'

// Pasa los errores que devuelve Django ({ nombre: '...' }) a los campos del formulario.
function marcarErrores(setError, errores, mapa) {
  Object.entries(errores || {}).forEach(([clave, mensaje]) => {
    setError(mapa[clave] || clave, { type: 'servidor', message: mensaje })
  })
}

// ---------- Tarjeta: datos personales y foto ----------
function DatosPersonales({ usuario, limites, onGuardado }) {
  const { ejecutar } = useOutletContext()
  const {
    register, handleSubmit, reset, control, setValue, setError, formState: { errors, isSubmitting, isDirty },
  } = useForm()

  // Carga inicial de los datos (patrón defaultValues + reset del apunte).
  useEffect(() => {
    reset({
      Nombre_usuario: usuario.nombre, Apellido_usuario: usuario.apellido,
      Email_usuario: usuario.email, Foto: null, quitar_foto: '0',
    })
  }, [usuario, reset])

  const [foto, quitar] = useWatch({ control, name: ['Foto', 'quitar_foto'] })

  const vista = useVistaPrevia(foto)

  const imagen = quitar === '1' ? null : (vista || usuario.foto_url)

  // Envía los datos a Django; si hay errores, los marca en cada campo
  const guardar = async (v) => {
    const r = await ejecutar('mi-perfil/guardar/', v)
    if (r.ok) onGuardado()
    else marcarErrores(setError, r.errores, { nombre: 'Nombre_usuario', apellido: 'Apellido_usuario', email: 'Email_usuario', foto: 'Foto' })
  }

  return (
    <form onSubmit={handleSubmit(guardar)} noValidate className="card border-0 shadow-sm h-100">
      <div className="card-header bg-body fw-semibold">Datos personales</div>
      <div className="card-body">
        <div className="d-flex align-items-center gap-3 mb-4">
          <div className="rounded-circle bg-success-subtle text-success-emphasis d-flex align-items-center justify-content-center fw-bold fs-2 overflow-hidden"
            style={{ width: 88, height: 88 }}>
            {imagen ? <img src={imagen} alt="Foto de perfil" className="w-100 h-100 object-fit-cover" /> : usuario.inicial}
          </div>
          <div>
            <label className="btn btn-sm btn-outline-success mb-1">
              Cambiar foto
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden
                {...register('Foto', {
                  onChange: () => setValue('quitar_foto', '0', { shouldDirty: true }),
                  validate: (f) => !f || !f[0] || f[0].size <= limites.foto_mb * 1024 * 1024 || `La foto no puede superar los ${limites.foto_mb} MB.`,
                })} />
            </label>
            {(usuario.foto_url || vista) && quitar !== '1' && (
              <button type="button" className="btn btn-sm btn-link text-danger d-block px-0"
                onClick={() => { setValue('quitar_foto', '1', { shouldDirty: true }); setValue('Foto', null) }}>
                Quitar foto
              </button>
            )}
            <ErrorCampo error={errors.Foto} />
          </div>
          <input type="hidden" {...register('quitar_foto')} />
        </div>

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Nombre</label>
            <input className={'form-control' + (errors.Nombre_usuario ? ' is-invalid' : '')} maxLength={limites.nombre}
              {...register('Nombre_usuario', reglaPersona('El nombre', 2, limites.nombre))} />
            <ErrorCampo error={errors.Nombre_usuario} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Apellido</label>
            <input className={'form-control' + (errors.Apellido_usuario ? ' is-invalid' : '')} maxLength={limites.nombre}
              {...register('Apellido_usuario', reglaPersona('El apellido', 2, limites.nombre))} />
            <ErrorCampo error={errors.Apellido_usuario} />
          </div>
          <div className="col-12">
            <label className="form-label">Correo electrónico</label>
            <input type="email" className={'form-control' + (errors.Email_usuario ? ' is-invalid' : '')}
              {...register('Email_usuario', reglaEmail())} />
            <ErrorCampo error={errors.Email_usuario} />
          </div>
          {/* Datos que el usuario no puede cambiar: bloqueados (no se pueden
              clickear ni seleccionar) y con un candado, en modo claro y oscuro */}
          {[['Usuario', usuario.usuario], ['DNI', usuario.dni], ['Perfil', usuario.perfil], ['Estado', usuario.estado]].map(([e, v]) => (
            <div className="col-md-6" key={e}>
              <label className="form-label">{e}</label>
              <div className="av-campo-fijo" title="Este dato no se puede modificar">
                <input className="form-control" value={v ?? ''} disabled aria-readonly="true" tabIndex={-1} />
                <svg className="av-campo-fijo-candado" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
              </div>
            </div>
          ))}
          <p className="col-12 av-campo-fijo-nota mb-0">
            Usuario, DNI, perfil y estado solo los puede modificar un administrador.
          </p>
        </div>
      </div>
      <div className="card-footer bg-body text-end">
        <button type="submit" className="btn btn-success" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}

// ---------- Tarjeta: cambio de contraseña ----------
function CambioContrasena() {
  const { ejecutar } = useOutletContext()
  const {
    register, handleSubmit, reset, control, setError, formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { actual: '', nueva: '', confirmar: '' } })
  const nueva = useWatch({ control, name: 'nueva' })

  // Envía la contraseña actual y la nueva a Django
  const guardar = async (v) => {
    const r = await ejecutar('mi-perfil/contrasena/', v)
    if (r.ok) reset()
    else marcarErrores(setError, r.errores, {})
  }

  return (
    <form onSubmit={handleSubmit(guardar)} noValidate className="card border-0 shadow-sm mb-3">
      <div className="card-header bg-body fw-semibold">Cambiar contraseña</div>
      <div className="card-body">
        <div className="mb-2">
          <label className="form-label">Contraseña actual</label>
          <input type="password" autoComplete="current-password" className={'form-control' + (errors.actual ? ' is-invalid' : '')}
            {...register('actual', { required: 'Ingrese su contraseña actual.' })} />
          <ErrorCampo error={errors.actual} />
        </div>
        <div className="mb-2">
          <label className="form-label">Nueva contraseña</label>
          <input type="password" autoComplete="new-password" className={'form-control' + (errors.nueva ? ' is-invalid' : '')}
            {...register('nueva', reglaContrasena('La nueva contraseña'))} />
          <ErrorCampo error={errors.nueva} />
        </div>
        <div className="mb-2">
          <label className="form-label">Confirmar contraseña</label>
          <input type="password" autoComplete="new-password" className={'form-control' + (errors.confirmar ? ' is-invalid' : '')}
            {...register('confirmar', {
              required: 'Repita la nueva contraseña.',
              validate: (v) => v === nueva || 'Las contraseñas no coinciden.',
            })} />
          <ErrorCampo error={errors.confirmar} />
        </div>
        <p className="form-text mb-0">Mínimo 8 caracteres, con mayúscula, minúscula y número. Sin espacios.</p>
      </div>
      <div className="card-footer bg-body text-end">
        <button type="submit" className="btn btn-success" disabled={isSubmitting}>Cambiar contraseña</button>
      </div>
    </form>
  )
}

// ---------- Pantalla completa ----------
function MiPerfil() {
  const { datos, cargando, error, recargar } = usePantalla('mi-perfil/')

  // Mientras cargan los datos (o si hay error) se muestra el estado de carga
  if (!datos) return <EstadoPantalla cargando={cargando} error={error} datos={datos} />

  const { usuario, permisos, limites } = datos.datos_perfil

  return (
    <div>
      <Encabezado icono="usuario" titulo="Mi perfil" subtitulo="Sus datos personales, su contraseña y los permisos de su perfil." />

      <div className="row g-4">
        <div className="col-lg-7">
          <DatosPersonales usuario={usuario} limites={limites} onGuardado={recargar} />
        </div>
        <div className="col-lg-5">
          <CambioContrasena />

          {/* Permisos del perfil del usuario */}
          <section className="card border-0 shadow-sm">
            <div className="card-header bg-body fw-semibold d-flex justify-content-between">
              <span>Mis permisos</span>
              <span className="badge text-bg-success">{permisos.es_admin ? 'Todos' : `${permisos.total} de ${permisos.total_catalogo}`}</span>
            </div>
            <div className="card-body" style={{ maxHeight: 360, overflowY: 'auto' }}>
              {(permisos.modulos || []).length === 0 && <p className="text-body-secondary mb-0">Su perfil no tiene permisos asignados.</p>}
              {(permisos.modulos || []).map((m) => (
                <div key={m.nombre} className="mb-3">
                  <strong className="small text-success">{m.nombre}</strong>
                  <ul className="list-unstyled small mb-0">
                    {m.permisos.map((p) => (
                      <li key={p.nombre} className="py-1 border-bottom">
                        {p.nombre}
                        <span className="d-block text-body-secondary">{p.descripcion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default MiPerfil
