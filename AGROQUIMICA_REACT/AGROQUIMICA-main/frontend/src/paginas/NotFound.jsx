// ============================================================
// PÁGINA 404
// Se muestra cuando la dirección no coincide con ninguna ruta de App.jsx.
// ============================================================

import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <main style={{ padding: '40px', textAlign: 'center' }}>
      <h2>Error 404: Página no encontrada</h2>
      <p>Lo sentimos, la página que estás buscando no existe.</p>
      <Link to="/">Volver al inicio</Link>
    </main>
  )
}

export default NotFound
