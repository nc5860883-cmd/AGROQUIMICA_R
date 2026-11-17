// ============================================================
// CONFIRMAR CIERRE DE SESIÓN
// Se abre al presionar "Cerrar sesión" en el menú lateral.
//  - "Sí, cerrar sesión": cierra la sesión.
//  - "No, continuar trabajando" / Esc / clic afuera: cierra el cartel.
// Usa los estilos de originales/cerrar_sesion.css (clases cs-*).
// ============================================================

import { useEffect, useRef, useState } from 'react'

function ConfirmarSalida({ abierto, onCancelar, onConfirmar }) {
  const [saliendo, setSaliendo] = useState(false)
  const btnQuedarse = useRef(null)
  const btnSalir = useRef(null)
  const focoAnterior = useRef(null)

  // Al abrir: guarda el foco anterior y lo pone en "continuar trabajando".
  // Al cerrar: devuelve el foco a donde estaba.
  useEffect(() => {
    if (abierto) {
      focoAnterior.current = document.activeElement
      btnQuedarse.current?.focus()
    } else if (focoAnterior.current?.focus) {
      focoAnterior.current.focus()
      focoAnterior.current = null
    }
  }, [abierto])

  // Confirma la salida (deshabilita el botón mientras se cierra la sesión)
  const salir = async () => {
    if (saliendo) return
    setSaliendo(true)
    try {
      await onConfirmar()
    } finally {
      setSaliendo(false)
    }
  }

  // Esc cierra; Tab mantiene el foco dentro del cartel
  const alPresionarTecla = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (!saliendo) onCancelar()
      return
    }
    if (e.key === 'Tab') {
      const primero = btnQuedarse.current
      const ultimo = btnSalir.current
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault()
        ultimo?.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primero?.focus()
      }
    }
  }

  return (
    <div
      className={`cs-overlay${abierto ? ' cs-visible' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget && !saliendo) onCancelar() }}
      onKeyDown={alPresionarTecla}
      aria-hidden={!abierto}
    >
      <div className="cs-caja" role="alertdialog" aria-modal="true"
           aria-labelledby="csTitulo" aria-describedby="csMensaje">
        <div className="cs-icono" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
               strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="m16 17 5-5-5-5" /><path d="M21 12H9" />
          </svg>
        </div>

        <h3 className="cs-titulo" id="csTitulo">¿Desea cerrar la sesión?</h3>
        <p className="cs-mensaje" id="csMensaje">
          Está a punto de salir del sistema. Para volver a ingresar deberá
          introducir nuevamente su <strong>usuario y contraseña</strong>.
        </p>

        <div className="cs-acciones">
          <button type="button" ref={btnQuedarse} className="cs-btn cs-quedarse"
                  onClick={onCancelar} disabled={saliendo} tabIndex={abierto ? 0 : -1}>
            No, continuar trabajando
          </button>
          <button type="button" ref={btnSalir}
                  className={`cs-btn cs-salir${saliendo ? ' cs-cargando' : ''}`}
                  onClick={salir} disabled={saliendo} tabIndex={abierto ? 0 : -1}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                 strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m16 17 5-5-5-5" /><path d="M21 12H9" />
            </svg>
            <span>{saliendo ? 'Cerrando sesión…' : 'Sí, cerrar sesión'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmarSalida
