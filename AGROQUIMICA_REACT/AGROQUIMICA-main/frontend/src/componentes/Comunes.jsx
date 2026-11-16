// ============================================================
// COMPONENTES COMUNES
// Íconos, encabezado de pantalla, filtros, buscador, etiquetas de estado,
// celdas de tabla, carga/errores y errores de formulario.
// Son piezas pequeñas que se repiten en todas las pantallas.
// ============================================================

// Íconos de línea (mismo estilo que el menú lateral).
const TRAZOS = {
  mas: ['M12 5v14', 'M5 12h14'],
  editar: ['M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z', 'm15 5 4 4'],
  eliminar: ['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M10 11v6', 'M14 11v6'],
  buscar: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'm21 21-4.3-4.3'],
  ver: ['M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  pdf: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M12 18v-6', 'm9 15 3 3 3-3'],
  activar: ['M20 6 9 17l-5-5'],
  check: ['M20 6 9 17l-5-5'],
  baja: ['M18.36 6.64A9 9 0 1 1 5.64 6.64', 'M12 2v10'],
  llave: ['M7.5 10a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z', 'm12 12 9-9', 'm17 7 3 3', 'm14 10 3 3'],
  correo: ['M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'm22 6-10 7L2 6'],
  anular: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'm4.9 4.9 14.2 14.2'],
  alerta: ['M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z', 'M12 9v4', 'M12 17h.01'],
  usuarios: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  usuario: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'],
  caja: ['m21 16-9 5-9-5V8l9-5 9 5v8Z', 'm3.3 7.8 8.7 5 8.7-5', 'M12 22V12.8'],
  capas: ['M12 2 2 7l10 5 10-5-10-5z', 'm2 12 10 5 10-5', 'm2 17 10 5 10-5'],
  etiqueta: ['M20.59 13.41 11 3.83V3H4v7h.83l9.58 9.59a2 2 0 0 0 2.83 0l3.35-3.35a2 2 0 0 0 0-2.83Z', 'M7.5 6.5h.01'],
  camion: ['M1 3h15v13H1z', 'M16 8h4l3 3v5h-7V8Z', 'M5.5 16a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z', 'M18.5 16a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z'],
  documento: ['M3 4h18v16H3z', 'M3 14h5l2 3h4l2-3h5'],
  cambio: ['M7 7h13l-3-3', 'm20 7-3 3', 'M17 17H4l3 3', 'm4 17 3-3'],
  campana: ['M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9', 'M10 21h4'],
  ajustes: ['M4 6h10', 'M18 6h2', 'M16 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z', 'M4 12h4', 'M12 12h8', 'M10 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z', 'M4 18h12', 'M18 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4z'],
  grafico: ['M4 20h16', 'M6 11h3v9H6z', 'M11 6h3v14h-3z', 'M16 14h3v6h-3z'],
  tabla: ['M3 4h18v16H3z', 'M3 10h18', 'M3 15h18', 'M9 10v10'],
  escudo: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z', 'm9 12 2 2 4-4'],
  auditoria: ['M8 2h8v4H8z', 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2', 'M12 11h4', 'M12 16h4', 'M8 11h.01', 'M8 16h.01'],
  calendario: ['M3 5h18v16H3z', 'M16 3v4', 'M8 3v4', 'M3 10h18'],
  foto: ['M3 5h18v14H3z', 'M8.5 8a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z', 'm21 15-5-5L5 19'],
  limpiar: ['M3 6h18', 'M8 6V4h8v2', 'm19 6-1 14H6L5 6'],
  filtro: ['M22 3H2l8 9.46V19l4 2v-8.54L22 3z'],
  venta: ['M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z', 'M3 6h18', 'M16 10a4 4 0 0 1-8 0'],
}

// Dibuja un ícono por su nombre. Ej.: <Icono nombre="editar" />
export function Icono({ nombre, className = 'av-ico' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      {(TRAZOS[nombre] || []).map((d, i) => <path key={i} d={d} />)}
    </svg>
  )
}

// Encabezado de pantalla: ícono, título, subtítulo y botones a la derecha.
export function Encabezado({ titulo, subtitulo, icono = 'caja', children }) {
  return (
    <header className="av-encabezado">
      <div className="av-encabezado-texto">
        <span className="av-encabezado-icono"><Icono nombre={icono} className="" /></span>
        <div>
          <h1>{titulo}</h1>
          {subtitulo && <p>{subtitulo}</p>}
        </div>
      </div>
      {children && <div className="av-encabezado-acciones">{children}</div>}
    </header>
  )
}

// Contenedor de filtros (buscador + desplegables), con el total a la derecha.
export function BarraFiltros({ children, total }) {
  return (
    <section className="av-filtros" aria-label="Filtros">
      {children}
      {total !== undefined && <span className="av-filtros-total">{total}</span>}
    </section>
  )
}

// Un filtro con su etiqueta. tamano: '' | 'chico' | 'ancho'
export function Filtro({ etiqueta, tamano = '', children }) {
  return (
    <div className={`av-filtro${tamano ? ` av-filtro-${tamano}` : ''}`}>
      {etiqueta && <label>{etiqueta}</label>}
      {children}
    </div>
  )
}

// Buscador de ancho completo con ícono y botón para borrar.
export function Buscador({ valor, onCambiar, placeholder = 'Buscar…' }) {
  return (
    <div className="av-buscador-campo">
      <Icono nombre="buscar" />
      <input
        type="text"
        className="form-control"
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {valor && (
        <button type="button" className="av-buscador-limpiar" onClick={() => onCambiar('')} aria-label="Borrar búsqueda">
          ✕
        </button>
      )}
    </div>
  )
}

// Etiqueta de estado Activo / Inactivo.
export function Estado({ activo, si = 'Activo', no = 'Inactivo' }) {
  return activo
    ? <span className="badge rounded-pill text-bg-success">{si}</span>
    : <span className="badge rounded-pill text-bg-secondary">{no}</span>
}

// Celda con avatar (inicial o ícono) + título y subtítulo.
export function CeldaPrincipal({ titulo, subtitulo, icono, inicial, foto }) {
  return (
    <div className="av-celda-principal">
      <span className="av-avatar">
        {foto ? <img src={foto} alt="" /> : (inicial || <Icono nombre={icono || 'caja'} />)}
      </span>
      <div>
        <strong>{titulo}</strong>
        {subtitulo && <small>{subtitulo}</small>}
      </div>
    </div>
  )
}

// Fila vacía de una tabla.
export function FilaVacia({ columnas, texto }) {
  return (
    <tr>
      <td colSpan={columnas} className="av-vacio">{texto}</td>
    </tr>
  )
}

// Estado de carga / error de una pantalla.
export function EstadoPantalla({ cargando, error, datos }) {
  if (error) return <div className="alert alert-danger">{error}</div>
  if (cargando && !datos) {
    return (
      <div className="av-cargando">
        <div className="spinner-border text-success" role="status" />
        <p className="mt-2 mb-0">Cargando…</p>
      </div>
    )
  }
  return null
}

// Mensaje de error debajo de un campo (react-hook-form).
export function ErrorCampo({ error }) {
  if (!error) return null
  return <div className="invalid-feedback d-block">{error.message}</div>
}
