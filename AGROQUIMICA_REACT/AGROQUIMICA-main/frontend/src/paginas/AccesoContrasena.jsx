import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { ejecutarAccion, obtenerPantalla, prepararCSRF } from '../servicios/api'
import { reglaContrasena, reglaEmail } from '../servicios/validaciones'
import '../estilos/Login.css'

/* Marco común (mismo diseño que el Login): foto a la izquierda y formulario a la derecha. */
function MarcoAcceso({ titulo, subtitulo, children }) {
  return (
    <main className="login-page">
      <section className="login-panel-izquierdo">
        <div className="login-overlay" />
        <div className="login-presentacion">
          <span className="login-ubicacion">CERRILLOS · SALTA</span>
          <h1>Agroquímica<br />del Valle</h1>
          <div className="login-linea" />
          <p>Sistema de gestión interno de stock, lotes y movimientos.</p>
        </div>
      </section>
      <section className="login-panel-derecho">
        <div className="login-contenido">
          <img src="/images/logo_av.png" alt="Agroquímica del Valle" className="login-logo" />
          <div className="login-encabezado">
            <span className="login-bienvenida">ACCESO AL SISTEMA</span>
            <h2>{titulo}</h2>
            {subtitulo && <p>{subtitulo}</p>}
          </div>
          {children}
        </div>
        <footer className="login-footer">
          © {new Date().getFullYear()} Agroquímica del Valle · Cerrillos, Salta
        </footer>
      </section>
    </main>
  )
}

function CampoClave({ id, etiqueta, registro, error }) {
  const [ver, setVer] = useState(false)
  return (
    <div className="login-campo">
      <label htmlFor={id}>{etiqueta}</label>
      <div className="login-password-contenedor">
        <input id={id} type={ver ? 'text' : 'password'} autoComplete="new-password" maxLength={64} {...registro} />
        <button type="button" className="login-mostrar" onClick={() => setVer(!ver)}>{ver ? 'Ocultar' : 'Mostrar'}</button>
      </div>
      {error && <span className="login-error-campo">{error.message}</span>}
    </div>
  )
}

function textoError(r) {
  return r.mensajes?.find((m) => m.nivel === 'error')?.texto || 'No se pudo completar la operación.'
}

/* ------------------ 1. PEDIR EL ENLACE POR CORREO ------------------ */
export function RecuperarContrasena() {
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm()
  const [enviado, setEnviado] = useState('')
  const [error, setErrorGeneral] = useState('')

  useEffect(() => {
    prepararCSRF().catch(() => {})
  }, [])

  const enviar = async (v) => {
    setErrorGeneral('')
    const r = await ejecutarAccion('recuperar/', v)
    if (r.ok && r.datos?.enviado) {
      setEnviado(v.email)
    } else if (r.errores?.email) {
      setError('email', { type: 'servidor', message: r.errores.email })
    } else {
      setErrorGeneral(textoError(r))
    }
  }

  return (
    <MarcoAcceso titulo="Recuperar contraseña" subtitulo="Le enviaremos un enlace a su correo para elegir una nueva contraseña.">
      {enviado ? (
        <div className="alert alert-success">
          Si <strong>{enviado}</strong> corresponde a un usuario activo, recibirá un correo con el enlace.
          El enlace vence en una hora.
        </div>
      ) : (
        <form onSubmit={handleSubmit(enviar)} noValidate>
          <div className="login-campo">
            <label htmlFor="email">Correo electrónico</label>
            <input id="email" type="email" placeholder="usuario@agrovalle.com" autoComplete="email" {...register('email', reglaEmail())} />
            {errors.email && <span className="login-error-campo">{errors.email.message}</span>}
          </div>
          {error && <div className="login-mensaje-error" role="alert">{error}</div>}
          <button type="submit" className="login-boton" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando…' : 'Enviar enlace'}
          </button>
        </form>
      )}
      <p className="login-pie-formulario"><Link to="/login">Volver a iniciar sesión</Link></p>
    </MarcoAcceso>
  )
}

/* ------------------ 2. ELEGIR LA NUEVA CONTRASEÑA (enlace del correo) ------------------ */
export function RecuperarConfirmar() {
  // Ruta dinámica /recuperar/:uid/:token  → useParams lee los dos valores de la URL.
  const { uid, token } = useParams()
  const navigate = useNavigate()
  const [estado, setEstado] = useState({ cargando: true, invalido: false, usuario: '' })
  const [error, setErrorGeneral] = useState('')
  const { register, handleSubmit, control, setError, formState: { errors, isSubmitting } } = useForm()
  const nueva = useWatch({ control, name: 'nueva_contrasena' })

  // Al montar (y si cambia el enlace) se verifica con Django que siga siendo válido.
  useEffect(() => {
    prepararCSRF().catch(() => {})
    obtenerPantalla(`recuperar/${uid}/${token}/`)
      .then((r) => setEstado({ cargando: false, invalido: Boolean(r.datos?.invalido), usuario: r.datos?.usuario_nombre || '' }))
      .catch(() => setEstado({ cargando: false, invalido: true, usuario: '' }))
  }, [uid, token])

  const enviar = async (v) => {
    setErrorGeneral('')
    const r = await ejecutarAccion(`recuperar/${uid}/${token}/`, v)
    if (r.ok) {
      navigate('/login', { replace: true, state: { mensaje: 'Su contraseña se cambió correctamente. Ya puede ingresar.' } })
    } else {
      Object.entries(r.errores || {}).forEach(([c, m]) => setError(c, { type: 'servidor', message: m }))
      if (!Object.keys(r.errores || {}).length) setErrorGeneral(textoError(r))
    }
  }

  return (
    <MarcoAcceso titulo="Elegir nueva contraseña"
      subtitulo={estado.usuario ? `Usuario: ${estado.usuario}` : null}>
      {estado.cargando && <p>Verificando el enlace…</p>}
      {!estado.cargando && estado.invalido && (
        <div className="alert alert-danger">
          El enlace no es válido o ya venció. <Link to="/recuperar">Pida uno nuevo</Link>.
        </div>
      )}
      {!estado.cargando && !estado.invalido && (
        <form onSubmit={handleSubmit(enviar)} noValidate>
          <CampoClave id="nueva" etiqueta="Nueva contraseña" error={errors.nueva_contrasena}
            registro={register('nueva_contrasena', {
              ...reglaContrasena(),
              validate: {
                ...reglaContrasena().validate,
                usuario: (v) => !estado.usuario || !v.toLowerCase().includes(estado.usuario.toLowerCase())
                  || 'No se puede usar el nombre de usuario.',
              },
            })} />
          <CampoClave id="confirmar" etiqueta="Confirmar contraseña" error={errors.confirmar_contrasena}
            registro={register('confirmar_contrasena', {
              required: 'Repita la nueva contraseña.',
              validate: (v) => v === nueva || 'Las contraseñas no coinciden.',
            })} />
          <p className="small text-body-secondary">Mínimo 8 caracteres, con mayúscula, minúscula y número. Sin espacios.</p>
          {error && <div className="login-mensaje-error" role="alert">{error}</div>}
          <button type="submit" className="login-boton" disabled={isSubmitting}>Guardar contraseña</button>
        </form>
      )}
      <p className="login-pie-formulario"><Link to="/login">Volver a iniciar sesión</Link></p>
    </MarcoAcceso>
  )
}

/* ------------------ 3. CAMBIO OBLIGATORIO (después de una contraseña temporal) ------------------ */
export function CambiarContrasena() {
  const navigate = useNavigate()
  const [error, setErrorGeneral] = useState('')
  const { register, handleSubmit, control, setError, formState: { errors, isSubmitting } } = useForm()
  const nueva = useWatch({ control, name: 'nueva_contrasena' })

  const enviar = async (v) => {
    setErrorGeneral('')
    const r = await ejecutarAccion('usuarios/cambiar-contrasena/', v)
    if (r.ok && r.redireccion !== '/login/') {
      navigate('/panel-principal', { replace: true })
    } else if (r.redireccion === '/login/') {
      navigate('/login', { replace: true })
    } else {
      Object.entries(r.errores || {}).forEach(([c, m]) => setError(c, { type: 'servidor', message: m }))
      if (!Object.keys(r.errores || {}).length) setErrorGeneral(textoError(r))
    }
  }

  return (
    <MarcoAcceso titulo="Debe cambiar su contraseña"
      subtitulo="Ingresó con una contraseña temporal. Elija una nueva para continuar.">
      <form onSubmit={handleSubmit(enviar)} noValidate>
        <CampoClave id="nueva" etiqueta="Nueva contraseña" error={errors.nueva_contrasena}
          registro={register('nueva_contrasena', reglaContrasena())} />
        <CampoClave id="confirmar" etiqueta="Confirmar contraseña" error={errors.confirmar_contrasena}
          registro={register('confirmar_contrasena', {
            required: 'Repita la nueva contraseña.',
            validate: (v) => v === nueva || 'Las contraseñas no coinciden.',
          })} />
        {error && <div className="login-mensaje-error" role="alert">{error}</div>}
        <button type="submit" className="login-boton" disabled={isSubmitting}>Guardar y continuar</button>
      </form>
    </MarcoAcceso>
  )
}
