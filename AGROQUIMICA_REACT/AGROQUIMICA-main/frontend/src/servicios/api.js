import axios from 'axios'

const api = axios.create({
  baseURL: '/api/',
  withCredentials: true,
  // Pedimos JSON: si la sesión se bloqueó, Django responde 401 en vez de redirigir.
  headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
})

// Si la sesión venció, avisamos a la app para que vuelva al login de React.
api.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    const url = error.config?.url || ''
    if (error.response?.status === 401 && !url.startsWith('login')) {
      window.dispatchEvent(new CustomEvent('av:sin-sesion'))
    }
    return Promise.reject(error)
  },
)

/* ------------------------------------------------------------
   API GENÉRICA DE PANTALLAS (inventario/api_react.py)
   Usa las mismas vistas de Django que el sistema original.
   ------------------------------------------------------------ */

// Datos de una pantalla. Ej.: obtenerPantalla('tipos-productos/', { q: 'sem' })
export async function obtenerPantalla(ruta, params = {}) {
  const limpios = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined),
  )
  const respuesta = await api.get(`pantalla/${ruta}`, { params: limpios })
  return respuesta.data
}

// Convierte un objeto { campo: valor } en datos de formulario (como un <form> de HTML).
function aFormulario(datos) {
  if (datos instanceof FormData) return datos

  const tieneArchivo = Object.values(datos || {}).some(
    (v) => v instanceof File || v instanceof FileList,
  )
  const cuerpo = tieneArchivo ? new FormData() : new URLSearchParams()

  Object.entries(datos || {}).forEach(([campo, valor]) => {
    if (valor === undefined || valor === null) return
    if (valor instanceof FileList) {
      if (valor[0]) cuerpo.append(campo, valor[0])
    } else if (Array.isArray(valor)) {
      valor.forEach((v) => cuerpo.append(campo, v))
    } else if (typeof valor === 'boolean') {
      if (valor) cuerpo.append(campo, 'on')
    } else {
      cuerpo.append(campo, valor)
    }
  })
  return cuerpo
}

// Ejecuta una acción (crear, editar, eliminar...). Devuelve { ok, mensajes, datos }.
export async function ejecutarAccion(ruta, datos = {}) {
  try {
    const respuesta = await api.post(`accion/${ruta}`, aFormulario(datos), {
      headers: { 'X-CSRFToken': obtenerCookie('csrftoken') },
    })
    return respuesta.data
  } catch (error) {
    return error.response?.data || {
      ok: false,
      mensajes: [{ nivel: 'error', texto: 'No se pudo conectar con el servidor.' }],
    }
  }
}

// Dirección para descargar/abrir un archivo (PDF) generado por Django.
export function urlArchivo(ruta, params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined),
  ).toString()
  return `/api/archivo/${ruta}${qs ? `?${qs}` : ''}`
}

export function obtenerCookie(nombre) {
  const cookies = document.cookie.split(';')

  for (const cookie of cookies) {
    const [clave, ...valor] = cookie.trim().split('=')

    if (clave === nombre) {
      return decodeURIComponent(valor.join('='))
    }
  }

  return null
}

export async function prepararCSRF() {
  await api.get('csrf/')
}

export async function iniciarSesion(usuario, contrasena) {
  const datos = new URLSearchParams()
  datos.append('usuario', usuario)
  datos.append('contrasena', contrasena)

  return api.post('login/', datos, {
    headers: {
      'X-CSRFToken': obtenerCookie('csrftoken'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
}

export async function obtenerDatosPanel() {
  return api.get('panel-principal/')
}

// Usuario logueado + menú lateral según sus permisos
export async function obtenerSesion() {
  return api.get('sesion/')
}

export async function cerrarSesion() {
  return api.post('cerrar-sesion/', null, {
    headers: { 'X-CSRFToken': obtenerCookie('csrftoken') },
  })
}

export default api