// ============================================================
// HOOK: VISTA PREVIA DE IMÁGENES
// Se usa en los formularios con foto (productos, perfil de usuario).
// ============================================================

import { useEffect, useMemo } from 'react'

/*
  Vista previa de una imagen elegida en un <input type="file">.
  Crea una URL temporal para el archivo y la libera (función de limpieza
  de useEffect) cuando se elige otro archivo o se desmonta el componente.
*/
export function useVistaPrevia(archivos) {
  const archivo = archivos && archivos[0]
  const url = useMemo(() => (archivo ? URL.createObjectURL(archivo) : null), [archivo])

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])

  return url
}
