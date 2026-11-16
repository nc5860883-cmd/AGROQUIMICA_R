// ============================================================
// CAMPANA DE NOTIFICACIONES
// Muestra cuántas notificaciones sin leer hay y, al hacer clic, un panel
// con las últimas. Permite marcarlas como leídas.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ejecutarAccion, obtenerPantalla } from '../servicios/api'

// Cada cuánto se vuelve a consultar la bandeja (como el original).
const INTERVALO_MS = 60 * 1000

// Campana de la barra superior con el panel de notificaciones del perfil.
function CampanaNotificaciones() {
  const [bandeja, setBandeja] = useState({ no_leidas: 0, notificaciones: [] })
  const [abierta, setAbierta] = useState(false)
  const caja = useRef(null)

    // Pide a Django la bandeja de notificaciones del usuario
  const cargar = useCallback(() => {
    obtenerPantalla('notificaciones/datos/')
      .then((r) => { if (r.ok) setBandeja(r.datos) })
      .catch(() => {})
  }, [])

  // Al montar: carga la bandeja y la actualiza cada minuto (setInterval con limpieza).
  useEffect(() => {
    cargar()
    const id = setInterval(cargar, INTERVALO_MS)
    window.addEventListener('av:notificaciones', cargar)
    return () => {
      clearInterval(id)
      window.removeEventListener('av:notificaciones', cargar)
    }
  }, [cargar])

  // Cerrar el panel al hacer clic afuera.
  useEffect(() => {
    if (!abierta) return undefined
    const alHacerClic = (e) => {
      if (caja.current && !caja.current.contains(e.target)) setAbierta(false)
    }
    document.addEventListener('mousedown', alHacerClic)
    return () => document.removeEventListener('mousedown', alHacerClic)
  }, [abierta])

    // Marca una notificación como leída y actualiza la bandeja
  const leer = async (id) => {
    await ejecutarAccion(`notificaciones/${id}/leer/`)
    cargar()
  }

    // Marca todas como leídas
  const leerTodas = async () => {
    await ejecutarAccion('notificaciones/leer-todas/')
    cargar()
  }

  const n = bandeja.no_leidas

  return (
    <div className="topbar-notif position-relative" ref={caja}>
      <button type="button"
        className={'topbar-icon-btn topbar-alertas' + (n ? ' tiene-alertas' : '')}
        aria-haspopup="dialog" aria-expanded={abierta}
        title={n ? `${n} notificación(es) sin leer` : 'Sin notificaciones nuevas'}
        onClick={() => setAbierta(!abierta)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
        {n > 0 && <span className="topbar-badge">{n > 99 ? '99+' : n}</span>}
      </button>

            {/* Panel desplegable con la lista de notificaciones */}
      {abierta && (
        <div className="tb-notif-panel" role="dialog" aria-label="Notificaciones">
          <div className="tb-notif-cab">
            <div>
              <strong>Notificaciones</strong>
              <span>{n ? `${n} sin leer` : 'Todo al día'}</span>
            </div>
            {n > 0 && (
              <button type="button" className="tb-notif-todas" onClick={leerTodas}>Marcar todas como leídas</button>
            )}
          </div>
          <ul className="tb-notif-lista">
            {bandeja.notificaciones.length === 0 && <li className="tb-notif-vacio">No hay notificaciones.</li>}
            {bandeja.notificaciones.map((x) => (
              <li key={x.id} className={'tb-notif-item' + (x.leida ? '' : ' no-leida')}>
                <button type="button" className="border-0 bg-transparent text-start w-100 p-2" onClick={() => !x.leida && leer(x.id)}>
                  <span className={`badge me-1 ${x.tipo === 'vencimiento' ? 'text-bg-warning' : 'text-bg-danger'}`}>{x.etiqueta}</span>
                  <span className={x.leida ? '' : 'fw-semibold'}>{x.mensaje}</span>
                  <small className="d-block text-body-secondary">{x.hace}</small>
                </button>
              </li>
            ))}
          </ul>
          <Link className="tb-notif-pie" to="/notificaciones" onClick={() => setAbierta(false)}>
            Ver todas las notificaciones →
          </Link>
        </div>
      )}
    </div>
  )
}

export default CampanaNotificaciones
