// ============================================================
// PAGINACIÓN
// Muestra "Mostrando X–Y de Z", los botones de página y el selector
// "Por página". Sirve para listas paginadas en Django o en el navegador.
// ============================================================

// Paginación (mismas clases que _paginacion.html).
// "pagina" es el objeto que manda la API: { pagina, paginas, total, desde, hasta, por_pagina, opciones }.

// Decide qué números mostrar: primera, última y las vecinas a la actual
function numerosVisibles(actual, total) {
  // 1 … 4 5 6 … 20
  const lista = []
  for (let n = 1; n <= total; n += 1) {
    if (n === 1 || n === total || Math.abs(n - actual) <= 1) {
      lista.push(n)
    } else if (lista[lista.length - 1] !== '…') {
      lista.push('…')
    }
  }
  return lista
}

// onPagina: ir a una página · onPorPagina: cambiar cantidad por página (opcional)
function Paginacion({ pagina, onPagina, onPorPagina }) {
  if (!pagina || !pagina.total) return null

  const { pagina: actual, paginas } = pagina

  return (
    <nav className="pg" aria-label="Paginación">
      <p className="pg-info">
        Mostrando <strong>{pagina.desde}–{pagina.hasta}</strong> de <strong>{pagina.total}</strong>
      </p>

            {/* Botones anterior / números / siguiente (solo si hay más de una página) */}
      {paginas > 1 && (
        <div className="pg-botones">
          <button type="button" className={'pg-btn pg-flecha' + (actual === 1 ? ' pg-off' : '')}
            disabled={actual === 1} onClick={() => onPagina(actual - 1)} aria-label="Página anterior">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </button>

          {numerosVisibles(actual, paginas).map((n, i) => (
            n === '…'
              ? <span className="pg-puntos" key={`p${i}`}>…</span>
              : (
                <button type="button" key={n}
                  className={'pg-btn' + (n === actual ? ' pg-actual' : '')}
                  aria-current={n === actual ? 'page' : undefined}
                  onClick={() => onPagina(n)}>
                  {n}
                </button>
              )
          ))}

          <button type="button" className={'pg-btn pg-flecha' + (actual === paginas ? ' pg-off' : '')}
            disabled={actual === paginas} onClick={() => onPagina(actual + 1)} aria-label="Página siguiente">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
      )}

            {/* Selector de registros por página */}
      {onPorPagina && (
        <label className="pg-tamano">
          <span>Por página</span>
          <select value={pagina.por_pagina} onChange={(e) => onPorPagina(e.target.value)}
            aria-label="Registros por página">
            {(pagina.opciones.length ? pagina.opciones : [10, 25, 50]).map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </label>
      )}
    </nav>
  )
}

export default Paginacion
