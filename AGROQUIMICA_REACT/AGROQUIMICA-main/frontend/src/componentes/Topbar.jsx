import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CampanaNotificaciones from './CampanaNotificaciones'

const CLAVE_TEMA = 'av:tema'

function esOscuro() {
  return document.documentElement.classList.contains('modo-oscuro')
}

// Aplica el tema igual que tema.js del sistema original.
function aplicarTema(oscuro) {
  document.documentElement.classList.toggle('modo-oscuro', oscuro)
  document.documentElement.setAttribute('data-bs-theme', oscuro ? 'dark' : 'light')
  try {
    localStorage.setItem(CLAVE_TEMA, oscuro ? 'oscuro' : 'claro')
  } catch {
    // Sin almacenamiento: el tema vale solo para esta visita.
  }
  // Avisa a los gráficos del panel que cambió el tema.
  window.dispatchEvent(new CustomEvent('av:tema', { detail: { oscuro } }))
}

function fechaDeHoy() {
  return new Date().toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

// Barra superior con las clases de topbar.css.
function Topbar({ ubicacion, menuOculto, onAlternarMenu }) {
  const [oscuro, setOscuro] = useState(esOscuro)
  const [conScroll, setConScroll] = useState(false)

  // Sombra de la barra al bajar la página (con limpieza al desmontar).
  useEffect(() => {
    const marcar = () => setConScroll(window.scrollY > 4)
    window.addEventListener('scroll', marcar, { passive: true })
    return () => window.removeEventListener('scroll', marcar)
  }, [])

  const alternarTema = () => {
    aplicarTema(!oscuro)
    setOscuro(!oscuro)
  }

  return (
    <header className={'topbar' + (conScroll ? ' topbar-con-scroll' : '')} id="topbar">
      <div className="topbar-left">
        <button
          className={'topbar-icon-btn topbar-menu-btn' + (menuOculto ? ' menu-cerrado' : '')}
          type="button"
          aria-label="Mostrar u ocultar el menú"
          aria-controls="sidebar"
          aria-expanded={!menuOculto}
          onClick={onAlternarMenu}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line className="tb-linea tb-linea-1" x1="4" y1="7" x2="20" y2="7" />
            <line className="tb-linea tb-linea-2" x1="4" y1="12" x2="14" y2="12" />
            <line className="tb-linea tb-linea-3" x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>

        <nav aria-label="Ubicación actual">
          <ol className="topbar-crumbs">
            <li className="topbar-crumb topbar-crumb-inicio">
              <Link to="/panel-principal" title="Panel principal" aria-label="Panel principal">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m3 10 9-7 9 7" />
                  <path d="M5 9v11h14V9" />
                  <path d="M10 20v-6h4v6" />
                </svg>
              </Link>
            </li>
            <li className="topbar-crumb topbar-crumb-actual" aria-current="page">
              {ubicacion}
            </li>
          </ol>
        </nav>
      </div>

      <div className="topbar-right">
        <div className="topbar-date">
          <span className="topbar-date-ico" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </span>
          <span>{fechaDeHoy()}</span>
        </div>

        <span className="topbar-sep" aria-hidden="true" />

        <CampanaNotificaciones />

        <button
          className="topbar-icon-btn topbar-tema"
          type="button"
          onClick={alternarTema}
          aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          title={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {oscuro ? (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          ) : (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  )
}

export default Topbar
