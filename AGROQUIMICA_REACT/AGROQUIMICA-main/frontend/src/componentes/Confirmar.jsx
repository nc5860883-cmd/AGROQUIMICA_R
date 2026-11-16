// ============================================================
// CONFIRMACIÓN DE ACCIONES
// Pregunta "¿Está seguro?" antes de eliminar, dar de baja o anular.
// ============================================================

import { useState } from 'react'
import Modal from './Modal'
import { Icono } from './Comunes'

/*
  Ventana para confirmar una acción (eliminar, dar de baja, anular).
  "pedido" es null (cerrada) o
  { titulo, mensaje, detalle, textoBoton, color: 'danger'|'warning'|'success', irreversible, alConfirmar }.
*/
// Color del modal, ícono y estilo del ícono según el tipo de acción
const VARIANTE = { danger: 'peligro', warning: 'aviso', success: '' }
const ICONO = { danger: 'alerta', warning: 'alerta', success: 'check' }
const CLASE_ICONO = { danger: '', warning: 'aviso', success: 'exito' }

function Confirmar({ pedido, onCerrar }) {
  const [enviando, setEnviando] = useState(false)
  const color = pedido?.color || 'danger'

    // Ejecuta la acción pedida y cierra la ventana (salga bien o mal)
  const confirmar = async () => {
    setEnviando(true)
    try {
      await pedido.alConfirmar()
    } finally {
      setEnviando(false)
      onCerrar()
    }
  }

  return (
    <Modal
      abierto={Boolean(pedido)}
      titulo={pedido?.titulo || 'Confirmar'}
      icono={ICONO[color]}
      variante={VARIANTE[color]}
      onCerrar={onCerrar}
      pie={(
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </button>
          <button type="button" className={`btn btn-${color}`} onClick={confirmar} disabled={enviando}>
            {enviando ? 'Procesando…' : (pedido?.textoBoton || 'Sí, confirmar')}
          </button>
        </>
      )}
    >
      {pedido && (
        <div className="av-confirmar">
          <div className={`av-confirmar-icono ${CLASE_ICONO[color]}`}><Icono nombre={ICONO[color]} /></div>
          <p className="av-confirmar-mensaje">{pedido.mensaje}</p>
          {pedido.detalle && <p className="av-confirmar-detalle">{pedido.detalle}</p>}
          {pedido.irreversible !== false && (
            <span className="av-confirmar-irreversible">Esta acción no se puede deshacer</span>
          )}
        </div>
      )}
    </Modal>
  )
}

export default Confirmar
