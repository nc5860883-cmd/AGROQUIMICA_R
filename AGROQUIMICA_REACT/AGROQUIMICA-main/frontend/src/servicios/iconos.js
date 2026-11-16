// Ícono (de componentes/Comunes.jsx) para cada módulo de permisos.
const ICONO_MODULO = {
  Usuarios: 'usuarios',
  Productos: 'caja',
  'Tipos de productos': 'capas',
  Subtipos: 'etiqueta',
  Proveedores: 'camion',
  Remitos: 'documento',
  Lotes: 'caja',
  'Movimientos de stock': 'cambio',
  Alertas: 'campana',
  Reportes: 'grafico',
  'Reportes consolidados': 'tabla',
  Seguridad: 'escudo',
  Auditoría: 'auditoria',
}

export function iconoModulo(nombre) {
  return ICONO_MODULO[nombre] || 'llave'
}
