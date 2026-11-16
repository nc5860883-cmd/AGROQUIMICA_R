// ============================================================
// TARJETAS DE RESUMEN
// Fila de indicadores (totales, activos, etc.) arriba de cada listado.
// ============================================================

// Indicadores de resumen (mismo diseño que _resumen.html).
// El ícono es un SVG fijo que arma Django (resumen.py), por eso se inserta como HTML.
function Resumen({ items }) {
  if (!items || items.length === 0) return null

  const columna = items.length === 3 ? 'col-lg-4' : 'col-lg-3'

  return (
    <div className="row g-3 mb-4 av-resumen">
      {items.map((s) => (
        <div className={`col-6 ${columna}`} key={s.etiqueta}>
          <div className={`av-stat av-stat-${s.color}`}>
            <span className="av-stat-icono">
              <svg
                className="av-stat-svg"
                viewBox="0 0 24 24"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: s.icono }}
              />
            </span>
            <div>
              <strong>{s.valor}</strong>
              <span>{s.etiqueta}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default Resumen
