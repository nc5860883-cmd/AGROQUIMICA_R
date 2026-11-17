// ============================================================
// CAMPANA DE NOTIFICACIONES
// Muestra cuántas notificaciones sin leer hay y, al hacer clic, una
// bandeja con las últimas (stock mínimo, vencimiento, egreso inusual).
//  - Se puede marcar una como leída (✓) o todas juntas.
//  - Se cierra con un clic afuera, con Escape o al ir a otra pantalla.
//  - El número se actualiza solo cada minuto.
// Usa las clases tb-notif-* de originales/topbar.css (igual que
// notificaciones.js del sistema original).
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ejecutarAccion, obtenerPantalla } from '../servicios/api'

// Cada cuánto se vuelve a consultar la bandeja (como el original).
const INTERVALO_MS = 60 * 1000

// Duración de la animación de cierre (topbar.css usa .18s)
const CIERRE_MS = 200

// Ícono de cada tipo de notificación
const ICONOS = {
  stock: (
    <><path d="M22 17 13.5 8.5 8.5 13.5 2 7" /><path d="M16 17h6v-6" /></>
  ),
  vencimiento: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" /><path d="M12 14v3l2 1" />
    </>
  ),
  inusual: (
    <>
      <path d="M12 9v4" /><path d="M12 17h.01" />
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </>
  ),
}

// Texto del botón según la cantidad sin leer
function textoContador(n) {
  if (!n) return 'Sin notificaciones nuevas'
  return n === 1 ? '1 notificación sin leer' : `${n} notificaciones sin leer`
}

// Una notificación de la bandeja
function ItemNotificacion({ n, indice, onLeer }) {
  const [enviando, setEnviando] = useState(false)

  const leer = async () => {
    setEnviando(true)
    const ok = await onLeer(n.id)
    if (!ok) setEnviando(false)
  }

  return (
    <li className={`tb-notif-item tb-notif-${n.tipo} ${n.leida ? 'tb-notif-leida' : 'tb-notif-noleida'}`}
      style={{ animationDelay: `${indice * 40}ms` }}>
      <span className="tb-notif-icono">
        <svg viewBox="0 0 24 24" aria-hidden="true">{ICONOS[n.tipo] || ICONOS.stock}</svg>
      </span>

      <div className="tb-notif-cuerpo">
        <div className="tb-notif-linea">
          <span className="tb-notif-etiqueta">{n.etiqueta}</span>
          <span className="tb-notif-hace">{n.hace}</span>
        </div>
        <p className="tb-notif-mensaje">{n.mensaje}</p>
      </div>

      {!n.leida && (
        <button type="button" className="tb-notif-atender" onClick={leer} disabled={enviando}
          title="Marcar como leída" aria-label="Marcar como leída">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
        </button>
      )}
    </li>
  )
}

function CampanaNotificaciones() {
  const [bandeja, setBandeja] = useState({ no_leidas: 0, notificaciones: [] })
  const [estado, setEstado] = useState('cargando') // cargando | listo | error
  const [abierta, setAbierta] = useState(false)    // lo que eligió el usuario
  const [montada, setMontada] = useState(false)    // el panel está en pantalla
  const [visible, setVisible] = useState(false)    // clase .abierto (animación)
  const [marcandoTodas, setMarcandoTodas] = useState(false)
  const caja = useRef(null)
  const boton = useRef(null)
  const { pathname } = useLocation()

  // Pide a Django la bandeja de notificaciones del usuario
  const cargar = useCallback(async () => {
    try {
      const r = await obtenerPantalla('notificaciones/datos/')
      if (r.ok && r.datos) {
        setBandeja({ no_leidas: r.datos.no_leidas || 0, notificaciones: r.datos.notificaciones || [] })
        setEstado('listo')
      } else {
        setEstado('error')
      }
    } catch {
      setEstado('error')
    }
  }, [])

  // Al montar: carga la bandeja y la actualiza cada minuto
  // (si la pestaña está oculta no consulta). Otras pantallas pueden
  // pedir una actualización con el evento "av:notificaciones".
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar()
    const id = setInterval(() => { if (!document.hidden) cargar() }, INTERVALO_MS)
    window.addEventListener('av:notificaciones', cargar)
    return () => {
      clearInterval(id)
      window.removeEventListener('av:notificaciones', cargar)
    }
  }, [cargar])

  // Abrir: se monta el panel y, un cuadro después, se agrega .abierto
  // para que se vea la animación. Cerrar: se quita .abierto y se
  // desmonta cuando termina la animación.
  useEffect(() => {
    if (abierta) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMontada(true)
      const cuadro = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(cuadro)
    }
    setVisible(false)
    const espera = setTimeout(() => setMontada(false), CIERRE_MS)
    return () => clearTimeout(espera)
  }, [abierta])

  // Mientras está abierta: clic afuera o Escape la cierran
  useEffect(() => {
    if (!abierta) return undefined
    const alHacerClic = (e) => {
      if (caja.current && !caja.current.contains(e.target)) setAbierta(false)
    }
    const alPresionar = (e) => {
      if (e.key === 'Escape') {
        setAbierta(false)
        boton.current?.focus()
      }
    }
    document.addEventListener('mousedown', alHacerClic)
    document.addEventListener('keydown', alPresionar)
    return () => {
      document.removeEventListener('mousedown', alHacerClic)
      document.removeEventListener('keydown', alPresionar)
    }
  }, [abierta])

  // Al cambiar de pantalla se cierra
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAbierta(false)
  }, [pathname])

  // Abre (y trae lo último) o cierra la bandeja
  const alternar = () => {
    if (!abierta) cargar()
    setAbierta(!abierta)
  }

  // Marca una notificación como leída. Devuelve true si salió bien.
  const leer = async (id) => {
    const r = await ejecutarAccion(`notificaciones/${id}/leer/`)
    if (!r.ok) return false
    window.dispatchEvent(new CustomEvent('av:bandeja-cambio'))
    setBandeja((b) => ({
      no_leidas: r.datos?.no_leidas ?? Math.max(b.no_leidas - 1, 0),
      notificaciones: b.notificaciones.map((x) => (x.id === id ? { ...x, leida: true } : x)),
    }))
    return true
  }

  // Marca todas como leídas
  const leerTodas = async () => {
    setMarcandoTodas(true)
    const r = await ejecutarAccion('notificaciones/leer-todas/')
    if (r.ok) {
      await cargar()
      window.dispatchEvent(new CustomEvent('av:bandeja-cambio'))
    }
    setMarcandoTodas(false)
  }

  const n = bandeja.no_leidas

  return (
    <div className="topbar-notif" ref={caja}>
      <button type="button" ref={boton}
        className={'topbar-icon-btn topbar-alertas' + (n ? ' tiene-alertas' : '')}
        aria-haspopup="dialog" aria-expanded={abierta} aria-controls="panelNotif"
        title={textoContador(n)} aria-label={`Notificaciones: ${textoContador(n)}`}
        onClick={alternar}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
        {n > 0 && <span className="topbar-badge">{n > 99 ? '99+' : n}</span>}
      </button>

      {/* Bandeja desplegable */}
      {montada && (
        <div id="panelNotif" className={'tb-notif-panel' + (visible ? ' abierto' : '')} role="dialog" aria-label="Notificaciones">
          <div className="tb-notif-cab">
            <div>
              <strong>Notificaciones</strong>
              <span>{n ? `${n} sin leer` : 'Todo al día'}</span>
            </div>
            {n > 0 && (
              <button type="button" className="tb-notif-todas" onClick={leerTodas} disabled={marcandoTodas}>
                {marcandoTodas ? 'Marcando…' : 'Marcar todas como leídas'}
              </button>
            )}
          </div>

          <ul className="tb-notif-lista" aria-live="polite">
            {estado === 'cargando' && bandeja.notificaciones.length === 0 && (
              <li className="tb-notif-vacio">Cargando…</li>
            )}
            {estado === 'error' && bandeja.notificaciones.length === 0 && (
              <li className="tb-notif-vacio">No se pudieron cargar las notificaciones.</li>
            )}
            {estado === 'listo' && bandeja.notificaciones.length === 0 && (
              <li className="tb-notif-vacio">No tiene notificaciones. ¡Todo al día!</li>
            )}
            {bandeja.notificaciones.map((x, i) => (
              <ItemNotificacion key={x.id} n={x} indice={i} onLeer={leer} />
            ))}
          </ul>

          <Link className="tb-notif-pie" to="/notificaciones" onClick={() => setAbierta(false)}>
            Ver todas las notificaciones
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  )
}

export default CampanaNotificaciones
