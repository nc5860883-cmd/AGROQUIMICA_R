// ============================================================
// LAYOUT: ESTRUCTURA DE LAS PANTALLAS INTERNAS
// Envuelve todas las páginas que requieren sesión. Se encarga de:
//  - comprobar la sesión (si no hay, vuelve al login),
//  - dibujar la barra lateral (menú) y la barra superior,
//  - mostrar los mensajes emergentes (éxito, error, aviso),
//  - pasar a cada página: sesión, permisos, notificar() y ejecutar().
// ============================================================

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

// Quita la "/" final para comparar rutas (/productos/ == /productos)
function sinBarraFinal(ruta) {
  return ruta.length > 1 ? ruta.replace(/\/+$/, '') : ruta
}

// Estructura de las pantallas internas (igual que base.html):
// barra lateral + barra superior + contenido de la ruta actual (<Outlet />).
function Layout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
    // Estado: datos de sesión, menú lateral oculto o visible, mensajes en pantalla
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

    // Quita un mensaje emergente (al cerrarlo o cuando se vence)
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

    // Cerrar sesión: avisa a Django y vuelve al login
  const salir = async () => {
    try {
      await cerrarSesion()
    } finally {
      navigate('/login', { replace: true })
    }
  }

    // Mientras llegan los datos de la sesión se muestra "Cargando…"
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
            {/* Íconos SVG que usa el menú lateral */}
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

            {/* Mensajes emergentes (esquina de la pantalla) */}
      <Mensajes lista={mensajes} onCerrar={cerrarMensaje} />
    </div>
  )
}

export default Layout
