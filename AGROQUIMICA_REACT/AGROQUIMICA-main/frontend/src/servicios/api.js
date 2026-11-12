import axios from 'axios'

const api = axios.create({
  baseURL: '/api/',
  withCredentials: true,
})

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

export default api
export async function obtenerDatosPanel() {
  return api.get('panel-principal/')
}