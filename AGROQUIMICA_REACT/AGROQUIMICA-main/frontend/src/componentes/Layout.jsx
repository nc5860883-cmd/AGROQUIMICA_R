import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { cerrarSesion, ejecutarAccion, obtenerSesion } from '../servicios/api'
import Iconos from './Iconos'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import Mensajes from './Mensajes'
import '../estilos/Sistema.css'
import '../estilos/Mensajes.css'
import '../estilos/Moderno.css'

// Nombres de las pantallas que no están en el menú lateral.
const OTRAS_PANTALLAS = {
  '/panel-principal': 'Panel principal',
  '/mi-perfil': 'Mi perfil',
  '/cambiar-contrasena': 'Cambiar contraseña',
  '/notificaciones': 'Notificaciones',
}

function sinBarraFinal(ruta) {
  return ruta.length > 1 ? ruta.replace(/\/+$/, '') : ruta
}

// Estructura de las pantallas internas (igual que base.html):
// barra lateral + barra superior + contenido de la ruta actual (<Outlet />).
function Layout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [sesion, setSesion] = useState(null)
  const [menuOculto, setMenuOculto] = useState(false)
  const [mensajes, setMensajes] = useState([])
  const contador = useRef(0)

  // Al montar: pide el usuario, el menú y los permisos.
  useEffect(() => {
    obtenerSesion()
      .then((respuesta) => setSesion(respuesta.data))
      .catch(() => navigate('/login', { replace: true }))
  }, [navigate])

  // Si cualquier pedido a la API responde "sin sesión", volvemos al login.
  useEffect(() => {
    const alPerderSesion = () => navigate('/login', { replace: true })
    window.addEventListener('av:sin-sesion', alPerderSesion)
    return () => window.removeEventListener('av:sin-sesion', alPerderSesion)
  }, [navigate])

  // Muestra mensajes emergentes: notificar([{ nivel: 'success', texto: '...' }])
  const notificar = useCallback((lista) => {
    const nuevos = (lista || []).map((m) => {
      contador.current += 1
      return { ...m, nivel: m.nivel === 'debug' ? 'info' : m.nivel, id: contador.current }
    })
    setMensajes((actuales) => [...actuales, ...nuevos])
  }, [])

  const cerrarMensaje = useCallback((id) => {
    setMensajes((actuales) => actuales.filter((m) => m.id !== id))
  }, [])

  // Ejecuta una acción en Django y muestra sus mensajes. Devuelve true si salió bien.
  const ejecutar = useCallback(async (ruta, datos) => {
    const r = await ejecutarAccion(ruta, datos)
    if (r.mensajes?.length) {
      notificar(r.mensajes)
    } else if (!r.ok) {
      notificar([{ nivel: 'error', texto: 'No se pudo completar la acción.' }])
    }
    return r
  }, [notificar])

  const salir = async () => {
    try {
      await cerrarSesion()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  if (!sesion) {
    return <p style={{ padding: '40px', textAlign: 'center' }}>Cargando…</p>
  }

  // Texto de la barra superior según la ruta actual.
  const actual = sinBarraFinal(pathname)
  // Se elige la ruta del menú más larga que coincide (ej. /reportes/consolidados antes que /reportes).
  const itemMenu = sesion.menu
    .flatMap((seccion) => seccion.items)
    .filter((item) => actual === sinBarraFinal(item.url) || actual.startsWith(`${sinBarraFinal(item.url)}/`))
    .sort((a, b) => b.url.length - a.url.length)[0]
  const ubicacion = itemMenu?.texto || OTRAS_PANTALLAS[actual] || 'Panel principal'

  return (
    <div className="layout">
      <Iconos />

      <Sidebar
        usuario={sesion.usuario}
        menu={sesion.menu}
        oculto={menuOculto}
        rutaActiva={itemMenu?.url}
        onCerrarSesion={salir}
      />

      <div className="page-area">
        <Topbar
          ubicacion={ubicacion}
          menuOculto={menuOculto}
          onAlternarMenu={() => setMenuOculto(!menuOculto)}
        />

        <main className="main-content bs-pantalla">
          {/* Cada página recibe esto con useOutletContext() */}
          <Outlet context={{ sesion, perm: sesion.perm || {}, notificar, ejecutar }} />
        </main>
      </div>

      <Mensajes lista={mensajes} onCerrar={cerrarMensaje} />
    </div>
  )
}

export default Layout
