import { Link, NavLink } from 'react-router-dom'

// Barra lateral con las mismas clases que _sidebar.html (estilos en sidebar.css).
// La clase "active" la decide el Layout (la ruta del menú más específica que coincide).
function Sidebar({ usuario, menu, oculto, rutaActiva, onCerrarSesion }) {
  return (
    <aside className={'sidebar' + (oculto ? ' sidebar-hidden' : '')} id="sidebar">
      <Link to="/panel-principal" className="sidebar-logo" title="Ir al panel principal">
        <img
          src="/images/logo_agroquimica.png"
          alt="Agroquímica del Valle"
          className="sidebar-logo-img"
        />
      </Link>

      <nav className="sidebar-nav">
        <div className="nav-item">
          <NavLink to="/panel-principal" className="nav-link">
            <svg className="nav-icon"><use href="#i-panel" /></svg>
            <span>Panel Principal</span>
          </NavLink>
        </div>

        {menu.map((seccion) => (
          <div key={seccion.titulo}>
            <div className="nav-section">
              <span className="nav-section-title">{seccion.titulo}</span>
            </div>

            {seccion.items.map((item) => (
              <div className="nav-item" key={item.modulo}>
                <NavLink to={item.url}
                  className={() => 'nav-link' + (item.url === rutaActiva ? ' active' : '')}>
                  <svg className="nav-icon"><use href={'#' + item.icono} /></svg>
                  <span>{item.texto}</span>
                </NavLink>
              </div>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        {usuario && (
          <NavLink to="/mi-perfil/" className="sidebar-user" title="Ver y editar mi perfil">
            <div className={'sidebar-user-avatar' + (usuario.foto ? ' con-foto' : '')}>
              {usuario.foto
                ? <img src={usuario.foto} alt="" />
                : (usuario.nombre || '?').charAt(0).toUpperCase()}
            </div>

            <div className="sidebar-user-info">
              <span className="sidebar-user-name">
                {usuario.nombre} {usuario.apellido}
              </span>
              <span className="sidebar-user-role">{usuario.perfil}</span>
            </div>

            <svg className="sidebar-user-flecha" viewBox="0 0 24 24" aria-hidden="true"
              width="15" height="15" fill="none" stroke="currentColor"
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </NavLink>
        )}

        <button type="button" className="logout-link" onClick={onCerrarSesion}
          style={{ background: 'none', border: 0, width: '100%', textAlign: 'left' }}>
          <svg className="nav-icon"><use href="#i-logout" /></svg>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
