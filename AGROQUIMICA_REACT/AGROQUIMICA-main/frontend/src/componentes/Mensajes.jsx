// ============================================================
// MENSAJES EMERGENTES (TOASTS)
// Avisos que aparecen en la esquina (éxito, aviso, error) y se
// cierran solos. La lista la maneja el Layout.
// ============================================================

import { useEffect } from 'react'
import '../estilos/Mensajes.css'

// Un mensaje emergente: se cierra solo a los 4 segundos.
function Toast({ mensaje, onCerrar }) {
  useEffect(() => {
    const temporizador = setTimeout(onCerrar, 4500)
    // Limpieza: si el mensaje se cierra antes, se cancela el temporizador.
    return () => clearTimeout(temporizador)
  }, [onCerrar])

  return (
    <div className={`av-toast ${mensaje.nivel}`} role={mensaje.nivel === 'error' ? 'alert' : 'status'}>
      <span>{mensaje.texto}</span>
      <button type="button" className="av-toast-x" onClick={onCerrar} aria-label="Cerrar">
        ✕
      </button>
    </div>
  )
}

// Contenedor de mensajes del sistema (éxito, aviso, error).
function Mensajes({ lista, onCerrar }) {
  if (lista.length === 0) return null

  return (
    <div className="av-toasts">
      {lista.map((m) => (
        <Toast key={m.id} mensaje={m} onCerrar={() => onCerrar(m.id)} />
      ))}
    </div>
  )
}

export default Mensajes
