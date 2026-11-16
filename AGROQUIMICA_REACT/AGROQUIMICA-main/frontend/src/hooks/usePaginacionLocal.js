import { useMemo, useState } from 'react'

/*
  Paginación en el navegador (para listas que llegan completas).
  Devuelve los elementos de la página actual y un objeto "pagina"
  con el mismo formato que la paginación del servidor.
*/
export function usePaginacionLocal(lista, porPaginaInicial = 10) {
  const [numero, setNumero] = useState(1)
  const [porPagina, setPorPagina] = useState(porPaginaInicial)

  const total = lista.length
  const paginas = Math.max(1, Math.ceil(total / porPagina))
  // Si la lista se achica (por un filtro), no quedamos en una página vacía.
  const actual = Math.min(numero, paginas)

  const items = useMemo(
    () => lista.slice((actual - 1) * porPagina, actual * porPagina),
    [lista, actual, porPagina],
  )

  return {
    items,
    pagina: {
      pagina: actual,
      paginas,
      total,
      por_pagina: porPagina,
      opciones: [10, 25, 50],
      desde: total ? (actual - 1) * porPagina + 1 : 0,
      hasta: Math.min(actual * porPagina, total),
    },
    irAPagina: setNumero,
    cambiarPorPagina: (valor) => {
      setPorPagina(Number(valor))
      setNumero(1)
    },
  }
}

// Quita acentos y pasa a minúsculas para buscar sin importar cómo se escriba.
export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}
