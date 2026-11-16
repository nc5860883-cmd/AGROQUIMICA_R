// ============================================================
// VENTANA MODAL
// Ventana emergente que usan los formularios de crear/editar y las
// confirmaciones. Se cierra con Escape, con la X o haciendo clic afuera.
// ============================================================

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Icono } from './Comunes'

/*
  Modal de Bootstrap controlado con estado de React.
  Se dibuja con createPortal directamente en <body>, así ninguna animación
  ni contenedor de la pantalla lo deforma o lo recorta.

  <Modal abierto={abierto} titulo="Nuevo tipo" icono="mas" onCerrar={...} pie={...}>
    ...contenido...
  </Modal>

  variante: '' (verde) | 'peligro' (rojo) | 'aviso' (ámbar)
*/
function Modal({ abierto, titulo, subtitulo, icono, variante = '', onCerrar, children, pie, tamano = '' }) {
  // Mientras está abierto: Escape cierra y la página de atrás no se desplaza.
  useEffect(() => {
    if (!abierto) return undefined

    const alPresionar = (e) => {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alPresionar)
    document.body.classList.add('modal-open')

    return () => {
      document.removeEventListener('keydown', alPresionar)
      document.body.classList.remove('modal-open')
    }
  }, [abierto, onCerrar])

    // Cerrada: no se dibuja nada
  if (!abierto) return null

  return createPortal(
    <div
      className={`modal d-block av-modal av-modal-fondo${variante ? ` av-modal-${variante}` : ''}`}
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${tamano}`}>
        <div className="modal-content">
                    {/* Cabecera: ícono, título, subtítulo y botón de cerrar */}
          <div className="modal-header">
            {icono && <span className="av-modal-icono"><Icono nombre={icono} /></span>}
            <div>
              <h2 className="modal-title">{titulo}</h2>
              {subtitulo && <span className="modal-subtitulo">{subtitulo}</span>}
            </div>
            <button type="button" className="btn-close" aria-label="Cerrar" onClick={onCerrar} />
          </div>
                    {/* Contenido y pie (botones) que manda cada pantalla */}
          <div className="modal-body">{children}</div>
          {pie && <div className="modal-footer">{pie}</div>}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default Modal
