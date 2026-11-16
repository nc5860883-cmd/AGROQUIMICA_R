// ============================================================
// GRÁFICOS (ApexCharts)
// Envoltorio para dibujar gráficos que se adaptan al tema claro/oscuro.
// Lo usan el panel principal y los reportes.
// ============================================================

import { useEffect, useRef, useState } from 'react'
import ApexCharts from 'apexcharts'

// true si el sistema está en modo oscuro (se actualiza al cambiar el tema).
function useOscuro() {
  const [oscuro, setOscuro] = useState(() => document.documentElement.classList.contains('modo-oscuro'))
  useEffect(() => {
    const alCambiar = () => setOscuro(document.documentElement.classList.contains('modo-oscuro'))
    window.addEventListener('av:tema', alCambiar)
    return () => window.removeEventListener('av:tema', alCambiar)
  }, [])
  return oscuro
}

/*
  Gráfico de ApexCharts.
  - useRef guarda el <div> donde se dibuja y la instancia del gráfico.
  - useEffect lo crea al montar y lo destruye en la función de limpieza
    (al desmontar o antes de volver a crearlo), evitando pérdidas de memoria.
*/
function Grafico({ opciones, alto = 320 }) {
  const contenedor = useRef(null)
  const oscuro = useOscuro()

  useEffect(() => {
    if (!contenedor.current) return undefined

        // Colores según el tema; las opciones de cada gráfico se suman encima
    const texto = oscuro ? '#e3ece6' : '#1c2a23'
    const grafico = new ApexCharts(contenedor.current, {
      ...opciones,
      chart: {
        fontFamily: 'Inter, sans-serif',
        toolbar: { show: false },
        background: 'transparent',
        foreColor: texto,
        height: alto,
        ...opciones.chart,
      },
      theme: { mode: oscuro ? 'dark' : 'light' },
      grid: { borderColor: oscuro ? '#263830' : '#e3eae6', ...opciones.grid },
    })
    grafico.render()

    return () => grafico.destroy()
  }, [opciones, oscuro, alto])

  return <div ref={contenedor} />
}

export default Grafico
