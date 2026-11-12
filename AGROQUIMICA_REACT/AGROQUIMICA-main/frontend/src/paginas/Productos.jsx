
import { useEffect, useMemo, useState } from 'react'
import api from '../servicios/api'
import '../estilos/Productos.css'

function Productos() {
  const [productos, setProductos] = useState([])
  const [tipos, setTipos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [tipoSeleccionado, setTipoSeleccionado] = useState('')
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('')
  const [orden, setOrden] = useState('nombre')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const cargarProductos = async () => {
      try {
        setCargando(true)
        setError('')

        const respuesta = await api.get('productos/')

        if (respuesta.data.ok) {
          setProductos(respuesta.data.productos || [])
          setTipos(respuesta.data.tipos || [])
        } else {
          setError(respuesta.data.error || 'No se pudieron cargar los productos.')
        }
      } catch (err) {
        setError(
          err.response?.data?.error ||
          'No se pudo conectar con el servidor.'
        )
      } finally {
        setCargando(false)
      }
    }

    cargarProductos()
  }, [])

  const productosFiltrados = useMemo(() => {
    let resultado = [...productos]

    if (busqueda.trim()) {
      const texto = busqueda.toLowerCase()

      resultado = resultado.filter((producto) =>
        [
          producto.nombre,
          producto.descripcion,
          producto.tipo,
          producto.subtipo,
          ...(producto.proveedores || []),
        ]
          .join(' ')
          .toLowerCase()
          .includes(texto)
      )
    }

    if (tipoSeleccionado) {
      resultado = resultado.filter(
        (producto) => String(producto.tipo_id) === tipoSeleccionado
      )
    }

    if (estadoSeleccionado === 'Activo' || estadoSeleccionado === 'Inactivo') {
      resultado = resultado.filter(
        (producto) => producto.estado === estadoSeleccionado
      )
    }

    if (estadoSeleccionado === 'bajo') {
      resultado = resultado.filter(
        (producto) => producto.stock > 0 &&
          producto.stock <= producto.stock_minimo
      )
    }

    if (estadoSeleccionado === 'sin_stock') {
      resultado = resultado.filter((producto) => producto.stock === 0)
    }

    resultado.sort((a, b) => {
      switch (orden) {
        case 'recientes':
          return b.id - a.id
        case 'precio_asc':
          return Number(a.precio) - Number(b.precio)
        case 'precio_desc':
          return Number(b.precio) - Number(a.precio)
        case 'stock_asc':
          return a.stock - b.stock
        default:
          return a.nombre.localeCompare(b.nombre)
      }
    })

    return resultado
  }, [productos, busqueda, tipoSeleccionado, estadoSeleccionado, orden])

  const activos = productos.filter((p) => p.estado === 'Activo').length
  const inactivos = productos.filter((p) => p.estado === 'Inactivo').length
  const stockBajo = productos.filter(
    (p) => p.stock > 0 && p.stock <= p.stock_minimo
  ).length
  const sinStock = productos.filter((p) => p.stock === 0).length

  const formatoPrecio = (precio) =>
    Number(precio || 0).toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
    })

  if (cargando) {
    return (
      <div className="productos-cargando">
        <div className="spinner-border text-success" role="status" />
        <p>Cargando productos...</p>
      </div>
    )
  }

  return (
    <main className="productos-contenedor">
      <div className="productos-encabezado">
        <div>
          <h1>Gestión de productos</h1>
          <p>Consultá y controlá los productos registrados.</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <section className="productos-resumen">
        <div className="producto-resumen-card">
          <span>Productos activos</span>
          <strong>{activos}</strong>
        </div>

        <div className="producto-resumen-card">
          <span>Stock mínimo</span>
          <strong>{stockBajo}</strong>
        </div>

        <div className="producto-resumen-card">
          <span>Sin stock</span>
          <strong>{sinStock}</strong>
        </div>

        <div className="producto-resumen-card">
          <span>Productos inactivos</span>
          <strong>{inactivos}</strong>
        </div>
      </section>

      <section className="productos-filtros">
        <div className="productos-busqueda">
          <label htmlFor="buscarProducto">Buscar producto</label>
          <input
            id="buscarProducto"
            type="search"
            className="form-control"
            placeholder="Nombre, descripción o proveedor..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="filtroTipo">Tipo de producto</label>
          <select
            id="filtroTipo"
            className="form-select"
            value={tipoSeleccionado}
            onChange={(e) => setTipoSeleccionado(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            {tipos.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filtroEstado">Estado</label>
          <select
            id="filtroEstado"
            className="form-select"
            value={estadoSeleccionado}
            onChange={(e) => setEstadoSeleccionado(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
            <option value="bajo">Stock mínimo</option>
            <option value="sin_stock">Sin stock</option>
          </select>
        </div>

        <div>
          <label htmlFor="ordenProductos">Ordenar por</label>
          <select
            id="ordenProductos"
            className="form-select"
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
          >
            <option value="nombre">Nombre</option>
            <option value="recientes">Más recientes</option>
            <option value="precio_asc">Menor precio</option>
            <option value="precio_desc">Mayor precio</option>
            <option value="stock_asc">Menor stock</option>
          </select>
        </div>
      </section>

      <div className="productos-resultados">
        <strong>{productosFiltrados.length}</strong> productos encontrados
      </div>

      {productosFiltrados.length === 0 ? (
        <div className="productos-vacio">
          <h3>No se encontraron productos</h3>
          <p>Probá modificar los filtros de búsqueda.</p>
        </div>
      ) : (
        <div className="table-responsive productos-tabla-contenedor">
          <table className="table table-hover align-middle productos-tabla">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Precio</th>
                <th>Stock actual</th>
                <th>Stock mínimo</th>
                <th>Proveedores</th>
                <th>Estado</th>
              </tr>
            </thead>

            <tbody>
              {productosFiltrados.map((producto) => (
                <tr key={producto.id}>
                  <td>
                    <div className="producto-dato">
                      {producto.imagen ? (
                        <img
                          src={producto.imagen}
                          alt={producto.nombre}
                          className="producto-imagen"
                        />
                      ) : (
                        <div className="producto-imagen-sin-foto">
                          <i className="bi bi-box-seam" />
                        </div>
                      )}

                      <div>
                        <strong>{producto.nombre}</strong>
                        {producto.descripcion && (
                          <small>{producto.descripcion}</small>
                        )}
                      </div>
                    </div>
                  </td>

                  <td>
                    {producto.tipo}
                    {producto.subtipo && (
                      <small className="d-block text-muted">
                        {producto.subtipo}
                      </small>
                    )}
                  </td>

                  <td>{formatoPrecio(producto.precio)}</td>

                  <td>
                    <strong>{producto.stock}</strong>
                    {producto.stock === 0 && (
                      <small className="d-block text-danger">Sin stock</small>
                    )}
                    {producto.stock > 0 &&
                      producto.stock <= producto.stock_minimo && (
                        <small className="d-block text-warning">
                          Stock mínimo
                        </small>
                      )}
                  </td>

                  <td>{producto.stock_minimo}</td>

                  <td>
                    {producto.proveedores?.length
                      ? producto.proveedores.join(', ')
                      : 'Sin proveedores'}
                  </td>

                  <td>
                    <span
                      className={`producto-estado ${
                        producto.estado === 'Activo'
                          ? 'producto-estado-activo'
                          : 'producto-estado-inactivo'
                      }`}
                    >
                      {producto.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}

export default Productos
