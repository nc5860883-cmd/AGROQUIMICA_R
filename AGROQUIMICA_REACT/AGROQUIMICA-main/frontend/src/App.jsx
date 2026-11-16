import { Routes, Route, Navigate } from 'react-router-dom'

import Layout from './componentes/Layout'
import Login from './paginas/Login'
import { CambiarContrasena, RecuperarConfirmar, RecuperarContrasena } from './paginas/AccesoContrasena'
import PanelPrincipal from './paginas/PanelPrincipal'
import Usuarios from './paginas/Usuarios'
import Productos from './paginas/Productos'
import TiposProductos from './paginas/TiposProductos'
import Subtipos from './paginas/Subtipos'
import Proveedores from './paginas/Proveedores'
import Remitos from './paginas/Remitos'
import Lotes from './paginas/Lotes'
import Movimientos from './paginas/Movimientos'
import Alertas from './paginas/Alertas'
import ConfiguracionAlertas from './paginas/ConfiguracionAlertas'
import Reportes from './paginas/Reportes'
import ReportesConsolidados from './paginas/ReportesConsolidados'
import Perfiles from './paginas/Perfiles'
import Permisos from './paginas/Permisos'
import Auditoria from './paginas/Auditoria'
import MiPerfil from './paginas/MiPerfil'
import Notificaciones from './paginas/Notificaciones'
import NotFound from './paginas/NotFound'

// Las rutas son las mismas que las del sistema original, así los enlaces
// que manda Django (panel, correos de alertas) llevan a la pantalla correcta.
function App() {
  return (
    <Routes>
      {/* -- Rutas públicas (sin barra lateral) -- */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/recuperar" element={<RecuperarContrasena />} />
      {/* Ruta dinámica: el enlace del correo trae el usuario (uid) y el token */}
      <Route path="/recuperar/:uid/:token" element={<RecuperarConfirmar />} />
      <Route path="/cambiar-contrasena" element={<CambiarContrasena />} />
      <Route path="/usuarios/cambiar-contrasena" element={<CambiarContrasena />} />

      {/* -- Rutas internas: comparten barra lateral y superior (Layout) -- */}
      <Route element={<Layout />}>
        <Route path="/panel-principal" element={<PanelPrincipal />} />

        {/* Administración */}
        <Route path="/usuarios" element={<Usuarios />} />

        {/* Inventario */}
        <Route path="/productos" element={<Productos />} />
        <Route path="/egreso-productos" element={<Navigate to="/productos?egreso=1" replace />} />
        <Route path="/tipos-productos" element={<TiposProductos />} />
        <Route path="/subtipos" element={<Subtipos />} />
        <Route path="/proveedores" element={<Proveedores />} />
        <Route path="/remitos" element={<Remitos />} />
        <Route path="/ingreso-lote" element={<Lotes />} />
        <Route path="/movimientos-stock" element={<Movimientos />} />
        <Route path="/historial-alertas" element={<Alertas />} />
        <Route path="/configuracion-alertas" element={<ConfiguracionAlertas />} />

        {/* Análisis */}
        <Route path="/reportes" element={<Reportes />} />
        <Route path="/reportes/consolidados" element={<ReportesConsolidados />} />
        <Route path="/reportes/consolidados/:clave" element={<ReportesConsolidados />} />

        {/* Seguridad */}
        <Route path="/perfiles" element={<Perfiles />} />
        <Route path="/permisos" element={<Permisos />} />
        <Route path="/auditoria" element={<Auditoria />} />

        {/* Usuario */}
        <Route path="/mi-perfil" element={<MiPerfil />} />
        <Route path="/mis-permisos" element={<Navigate to="/mi-perfil" replace />} />
        <Route path="/notificaciones" element={<Notificaciones />} />
      </Route>

      {/* -- Ruta 404 (catch-all) - DEBE SER LA ÚLTIMA -- */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
