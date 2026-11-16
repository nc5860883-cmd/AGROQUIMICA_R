// ============================================================
// PERMISOS DEL SISTEMA
// Lista (solo lectura) de los permisos que se pueden asignar a los perfiles,
// agrupados por módulo, con un buscador.
// ============================================================

import { useMemo, useState } from 'react'
import { usePantalla } from '../hooks/usePantalla'
import { normalizar } from '../hooks/usePaginacionLocal'
import Resumen from '../componentes/Resumen'
import {
  BarraFiltros, Buscador, Encabezado, EstadoPantalla, Icono,
} from '../componentes/Comunes'

// Catálogo de permisos del sistema, agrupado por módulo (solo consulta).
function Permisos() {
  // Datos de Django y texto del buscador
  const { datos, cargando, error } = usePantalla('permisos/')
  const [busqueda, setBusqueda] = useState('')

  // Renderizado condicional + filtrado de listas anidadas.
  const modulos = useMemo(() => {
    const texto = normalizar(busqueda.trim())
    const lista = datos?.modulos || []
    if (!texto) return lista
    return lista
      .map((m) => ({
        ...m,
        permisos: m.permisos.filter((p) => normalizar(`${m.nombre} ${p.nombre} ${p.descripcion}`).includes(texto)),
      }))
      .filter((m) => m.permisos.length > 0)
  }, [datos, busqueda])

  // Mientras cargan los datos (o si hay error) se muestra el estado de carga
  if (!datos) return <EstadoPantalla cargando={cargando} error={error} datos={datos} />

  return (
    <div>
      <Encabezado icono="llave" titulo="Permisos del sistema"
        subtitulo="Acciones que se pueden asignar a cada perfil, agrupadas por módulo." />

      {/* Tarjetas de resumen */}
      <Resumen items={datos.resumen} />

      {/* Buscador de permisos */}
      <BarraFiltros total={`${modulos.reduce((t, m) => t + m.permisos.length, 0)} permiso(s) en ${modulos.length} módulo(s)`}>
        <Buscador valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar permiso por nombre, módulo o descripción..." />
      </BarraFiltros>

      {modulos.length === 0 && (
        <div className="card"><p className="av-vacio mb-0">No hay permisos que coincidan con la búsqueda.</p></div>
      )}

      {/* Una tarjeta por módulo con sus permisos */}
      <div className="av-permisos-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
        {modulos.map((m) => (
          <section className="av-modulo" key={m.nombre} style={{ boxShadow: 'var(--m-sombra)' }}>
            <div className="av-modulo-cab">
              <span className="av-modulo-icono"><svg><use href={`#${m.icono}`} /></svg></span>
              <strong>{m.nombre}</strong>
              <span className="av-modulo-cuenta" title="Perfiles con acceso a este módulo">
                {m.cantidad_perfiles} perfil(es)
              </span>
            </div>
            {m.permisos.map((p) => (
              <div className="av-permiso" key={p.nombre} style={{ cursor: 'default' }}>
                <span className="av-permiso-texto flex-fill">
                  <strong>{p.nombre}</strong>
                  <small className="mb-2">{p.descripcion}</small>
                  <span className="d-flex flex-wrap gap-1">
                    {p.perfiles.length === 0
                      ? <span className="av-perfil-chip inactivo">Sin perfiles asignados</span>
                      : p.perfiles.map((pf) => (
                        <span key={pf.ID_Perfil} className={'av-perfil-chip' + (pf.Estado_perfil ? '' : ' inactivo')}>
                          <Icono nombre="escudo" /> {pf.Nombre_perfil}
                        </span>
                      ))}
                  </span>
                </span>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}

export default Permisos
