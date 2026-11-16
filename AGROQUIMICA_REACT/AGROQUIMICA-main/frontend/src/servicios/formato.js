// Formato de fechas y números para mostrar en pantalla.

// Formatea una fecha ISO (2026-11-15) como 15/11/2026.
export function fecha(valor, conHora = false) {
  if (!valor) return '—'
  const d = new Date(valor.length === 10 ? `${valor}T00:00:00` : valor)
  if (Number.isNaN(d.getTime())) return valor
  return conHora
    ? d.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
    : d.toLocaleDateString('es-AR')
}

// Formatea un número con separador de miles argentino (1.234)
export function numero(valor) {
  return Number(valor || 0).toLocaleString('es-AR')
}
