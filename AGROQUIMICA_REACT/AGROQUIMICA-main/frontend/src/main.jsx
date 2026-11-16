// ============================================================
// PUNTO DE ENTRADA DE REACT
// Es lo primero que se ejecuta: carga los estilos globales
// (Bootstrap + index.css) y dibuja <App /> dentro del <div id="root">
// de index.html.
// ============================================================

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import App from './App.jsx'

// Opción 1 (recomendada): BrowserRouter envuelve toda la aplicación,
// así App y todos sus hijos pueden usar useNavigate, useParams, etc.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
