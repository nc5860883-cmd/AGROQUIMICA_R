import { useEffect, useState } from 'react'
import { iniciarSesion, prepararCSRF } from '../servicios/api'
import '../estilos/Login.css'

function Login() {
  const [usuario, setUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [mostrarContrasena, setMostrarContrasena] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [errores, setErrores] = useState({})

  useEffect(() => {
    prepararCSRF().catch(() => {
      console.warn('No se pudo preparar la conexión con Django.')
    })
  }, [])

  const validarFormulario = () => {
    const nuevosErrores = {}

    if (!usuario.trim()) {
      nuevosErrores.usuario = 'Ingresá tu nombre de usuario.'
    } else if (!/^[a-zA-Z]{3,50}$/.test(usuario.trim())) {
      nuevosErrores.usuario = 'Ingresá un usuario válido.'
    }

    if (!contrasena) {
      nuevosErrores.contrasena = 'Ingresá tu contraseña.'
    } else if (contrasena.length < 8 || contrasena.length > 64 || /\s/.test(contrasena)) {
      nuevosErrores.contrasena = 'La contraseña debe tener entre 8 y 64 caracteres y no contener espacios.'
    }

    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const manejarEnvio = async (e) => {
    e.preventDefault()
    setError('')

    if (!validarFormulario()) return

    setCargando(true)

    try {
      const respuesta = await iniciarSesion(usuario.trim(), contrasena)

    if (respuesta.data.redirect) {
        window.location.href = `http://localhost:8001${respuesta.data.redirect}`
    } else {
      setError('No se recibió una dirección de destino.')
    }
    } catch (err) {
      if (err.response?.data?.errores) {
        setErrores(err.response.data.errores)
      }

      setError(
        err.response?.data?.error ||
        'No se pudo iniciar sesión. Verificá tus datos e intentá nuevamente.'
      )
    } finally {
      setCargando(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel-izquierdo">
        <div className="login-overlay"></div>

        <div className="login-presentacion">
          <span className="login-ubicacion">CERRILLOS · SALTA</span>

          <h1>Agroquímica<br />del Valle</h1>

          <div className="login-linea"></div>

          <p>
            Sistema de gestión interno de stock,
            lotes y movimientos.
          </p>
        </div>
      </section>

      <section className="login-panel-derecho">
        <div className="login-contenido">
          <img
            src="/images/logo_av.png"
            alt="Agroquímica del Valle"
            className="login-logo"
          />

          <div className="login-encabezado">
            <span className="login-bienvenida">BIENVENIDO DE NUEVO</span>
            <h2>Iniciar sesión</h2>
            <p>Ingresá tus datos para acceder al sistema.</p>
          </div>

          <form onSubmit={manejarEnvio} noValidate>
            <div className="login-campo">
              <label htmlFor="usuario">Usuario</label>
              <input
                id="usuario"
                type="text"
                value={usuario}
                onChange={(e) => {
                  setUsuario(e.target.value)
                  setErrores((prev) => ({ ...prev, usuario: '' }))
                  setError('')
                }}
                placeholder="Ingresá tu usuario"
                maxLength={50}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck="false"
                disabled={cargando}
              />
              {errores.usuario && (
                <span className="login-error-campo">{errores.usuario}</span>
              )}
            </div>

            <div className="login-campo">
              <label htmlFor="contrasena">Contraseña</label>

              <div className="login-password-contenedor">
                <input
                  id="contrasena"
                  type={mostrarContrasena ? 'text' : 'password'}
                  value={contrasena}
                  onChange={(e) => {
                    setContrasena(e.target.value)
                    setErrores((prev) => ({ ...prev, contrasena: '' }))
                    setError('')
                  }}
                  placeholder="Ingresá tu contraseña"
                  maxLength={64}
                  autoComplete="current-password"
                  disabled={cargando}
                />

                <button
                  type="button"
                  className="login-mostrar"
                  onClick={() => setMostrarContrasena(!mostrarContrasena)}
                  aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {mostrarContrasena ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>

              {errores.contrasena && (
                <span className="login-error-campo">{errores.contrasena}</span>
              )}
            </div>

            {error && (
              <div className="login-mensaje-error" role="alert">
                {error}
              </div>
            )}

            <a href="/recuperar/" className="login-recuperar">
              ¿Olvidaste tu contraseña?
            </a>

            <button
              type="submit"
              className="login-boton"
              disabled={cargando}
            >
              {cargando ? 'Ingresando...' : 'Ingresar al sistema'}
            </button>
          </form>

          <p className="login-pie-formulario">
            Acceso exclusivo para personal autorizado
          </p>
        </div>

        <footer className="login-footer">
          © {new Date().getFullYear()} Agroquímica del Valle · Cerrillos, Salta
        </footer>
      </section>
    </main>
  )
}

export default Login
