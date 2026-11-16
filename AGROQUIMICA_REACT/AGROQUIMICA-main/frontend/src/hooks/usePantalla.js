// ============================================================
// HOOK: DATOS DE UNA PANTALLA
// Lo usan casi todas las páginas para traer su información de Django.
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import { obtenerPantalla } from '../servicios/api'

/*
  Hook personalizado: pide a Django los datos de una pantalla.

  const { datos, cargando, error, recargar } = usePantalla('tipos-productos/', { q: busqueda })

  - useState guarda la respuesta.
  - useEffect vuelve a pedir los datos cada vez que cambian la ruta o los
    filtros (array de dependencias), y la función de limpieza descarta
    respuestas viejas si el usuario cambió el filtro antes de que llegaran.
*/
export function usePantalla(ruta, params = {}) {
  const [respuesta, setRespuesta] = useState({ pedido: null, datos: null, error: '' })
  const [version, setVersion] = useState(0)

    // "pedido" identifica la consulta actual (ruta + filtros + versión).
    // Cambiar "version" con recargar() fuerza a pedir los datos de nuevo.
  const filtros = JSON.stringify(params)
  const pedido = `${ruta}|${filtros}|${version}`

  useEffect(() => {
    let vigente = true

    obtenerPantalla(ruta, JSON.parse(filtros))
      .then((r) => {
        if (!vigente) return
        setRespuesta({
          pedido,
          datos: r.ok ? r.datos : null,
          error: r.ok ? '' : (r.mensajes?.[0]?.texto || 'No tiene permiso para ver esta pantalla.'),
        })
      })
      .catch((e) => {
        if (!vigente) return
        setRespuesta({
          pedido,
          datos: null,
          error: e.response?.data?.mensajes?.[0]?.texto || 'No se pudo conectar con el servidor.',
        })
      })

    return () => {
      vigente = false
    }
  }, [ruta, filtros, pedido])

    // Vuelve a pedir los datos (por ejemplo, después de guardar algo)
  const recargar = useCallback(() => setVersion((v) => v + 1), [])

  return {
    datos: respuesta.datos,
    error: respuesta.error,
    // Mientras llega la nueva respuesta se siguen mostrando los datos anteriores.
    cargando: respuesta.pedido !== pedido,
    recargar,
  }
}
