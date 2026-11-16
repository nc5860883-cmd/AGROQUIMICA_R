// ============================================================
// VALIDACIONES DE FORMULARIOS
// Cada función devuelve las reglas para un tipo de campo (nombre,
// persona, email, DNI, teléfono, números, contraseña...).
// ============================================================

/*
  Reglas de validación para register() de React Hook Form.
  Son las mismas reglas que inventario/validaciones.py, así el usuario ve
  el error antes de enviar. Django vuelve a validar al recibir los datos.

  Uso:  <input {...register('Nombre', reglaNombre('El nombre'))} />
*/

// Símbolos permitidos según el tipo de campo
const SIMBOLOS_NOMBRE = " .,-/&()%+'°"
const SIMBOLOS_PERSONA = " '-."
const SIMBOLOS_TEXTO = " .,;:-/&()%+'\"°#¿?¡!@_\n\r"

// Funciones auxiliares para revisar cada carácter
const esLetra = (c) => /\p{L}/u.test(c)
const esDigito = (c) => /\p{N}/u.test(c)
const esSimbolo = (c, simbolos) => simbolos.includes(c) && c !== ' '

// Quita espacios repetidos y los de los extremos
const limpiar = (v) => String(v ?? '').replace(/\s+/g, ' ').trim()

// true si hay dos símbolos pegados (ej. "--" o "..")
function simbolosSeguidos(valor, simbolos) {
  for (let i = 1; i < valor.length; i += 1) {
    if (esSimbolo(valor[i - 1], simbolos) && esSimbolo(valor[i], simbolos)) return true
  }
  return false
}

// Nombre de producto, tipo, subtipo, perfil, proveedor.
export function reglaNombre(etiqueta, minimo = 2, maximo = 50, obligatorio = true) {
  return {
    required: obligatorio ? `${etiqueta} es obligatorio.` : false,
    maxLength: { value: maximo, message: `${etiqueta} no puede superar los ${maximo} caracteres.` },
    validate: {
      largo: (v) => !limpiar(v) || limpiar(v).length >= minimo
        || `${etiqueta} debe tener al menos ${minimo} caracteres.`,
      caracteres: (v) => {
        const malo = [...limpiar(v)].find((c) => !(esLetra(c) || esDigito(c) || SIMBOLOS_NOMBRE.includes(c)))
        return !malo || `${etiqueta}: no se permite el carácter «${malo}».`
      },
      inicio: (v) => !limpiar(v) || esLetra(limpiar(v)[0]) || esDigito(limpiar(v)[0])
        || `${etiqueta} tiene que empezar con una letra o un número.`,
      letras: (v) => !limpiar(v) || [...limpiar(v)].some(esLetra)
        || `${etiqueta} tiene que incluir al menos una letra.`,
      simbolos: (v) => !simbolosSeguidos(limpiar(v), SIMBOLOS_NOMBRE)
        || `${etiqueta} no puede tener símbolos seguidos.`,
    },
  }
}

// Nombre o apellido de una persona.
export function reglaPersona(etiqueta, minimo = 2, maximo = 50, obligatorio = true) {
  return {
    required: obligatorio ? `${etiqueta} es obligatorio.` : false,
    maxLength: { value: maximo, message: `${etiqueta} no puede superar los ${maximo} caracteres.` },
    pattern: {
      value: /^[\p{L}\s'.-]*$/u,
      message: `${etiqueta} solo admite letras, espacios y ' - .`,
    },
    validate: {
      largo: (v) => !limpiar(v) || limpiar(v).length >= minimo
        || `${etiqueta} debe tener al menos ${minimo} caracteres.`,
      inicio: (v) => !limpiar(v) || esLetra(limpiar(v)[0]) || `${etiqueta} tiene que empezar con una letra.`,
      simbolos: (v) => !simbolosSeguidos(limpiar(v), SIMBOLOS_PERSONA)
        || `${etiqueta} no puede tener símbolos seguidos.`,
    },
  }
}

// Texto libre (descripciones, observaciones, direcciones).
export function reglaTexto(etiqueta, maximo = 200, obligatorio = false, minimo = 0) {
  return {
    required: obligatorio ? `${etiqueta} es obligatorio.` : false,
    maxLength: { value: maximo, message: `${etiqueta} no puede superar los ${maximo} caracteres.` },
    validate: {
      largo: (v) => !limpiar(v) || limpiar(v).length >= minimo
        || `${etiqueta} debe tener al menos ${minimo} caracteres.`,
      caracteres: (v) => {
        const malo = [...String(v ?? '')].find((c) => !(esLetra(c) || esDigito(c) || SIMBOLOS_TEXTO.includes(c)))
        return !malo || `${etiqueta}: no se permite el carácter «${malo}».`
      },
    },
  }
}

// Correo electrónico con formato nombre@dominio.com
export function reglaEmail(etiqueta = 'El correo electrónico', obligatorio = true) {
  return {
    required: obligatorio ? `${etiqueta} es obligatorio.` : false,
    maxLength: { value: 100, message: `${etiqueta} no puede superar los 100 caracteres.` },
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: 'Formato de correo inválido (ej. nombre@dominio.com).',
    },
  }
}

// DNI: solo números, 7 u 8 dígitos
export function reglaDni(etiqueta = 'El DNI') {
  return {
    required: `${etiqueta} es obligatorio.`,
    pattern: { value: /^\d{7,8}$/, message: `${etiqueta} debe tener 7 u 8 dígitos, sin puntos.` },
  }
}

// Teléfono: números, espacios y + - ( ), entre 6 y 15 dígitos
export function reglaTelefono(etiqueta = 'El teléfono', obligatorio = false) {
  return {
    required: obligatorio ? `${etiqueta} es obligatorio.` : false,
    maxLength: { value: 25, message: `${etiqueta} no puede superar los 25 caracteres.` },
    pattern: { value: /^\+?[\d\s()-]*$/, message: `${etiqueta} solo admite números, espacios, + - ( ).` },
    validate: (v) => {
      if (!v) return true
      const digitos = v.replace(/\D/g, '').length
      if (digitos < 6) return `${etiqueta} tiene que tener al menos 6 dígitos.`
      if (digitos > 15) return `${etiqueta} no puede tener más de 15 dígitos.`
      return true
    },
  }
}

// Número entero dentro de un rango (cantidades, stock, días)
export function reglaEntero(etiqueta, minimo = 0, maximo = 999999, obligatorio = true) {
  return {
    required: obligatorio ? `${etiqueta} es obligatorio.` : false,
    pattern: { value: /^\d*$/, message: `${etiqueta} debe ser un número entero.` },
    validate: (v) => {
      if (v === '' || v === undefined || v === null) return true
      const n = Number(v)
      if (n < minimo) return `${etiqueta} debe ser como mínimo ${minimo}.`
      if (n > maximo) return `${etiqueta} no puede superar ${maximo}.`
      return true
    },
  }
}

// Número con hasta 2 decimales, acepta coma o punto (precios)
export function reglaDecimal(etiqueta, minimo = 0.01, maximo = 99999999, obligatorio = true) {
  return {
    required: obligatorio ? `${etiqueta} es obligatorio.` : false,
    pattern: { value: /^\d+([.,]\d{1,2})?$/, message: `${etiqueta} debe ser un número (hasta 2 decimales).` },
    validate: (v) => {
      if (!v) return true
      const n = Number(String(v).replace(',', '.'))
      if (n < minimo) return `${etiqueta} debe ser como mínimo ${minimo}.`
      if (n > maximo) return `${etiqueta} no puede superar ${maximo}.`
      return true
    },
  }
}

// Contraseña con las mismas reglas que validar_contrasena() de views.py.
export function reglaContrasena(etiqueta = 'La contraseña') {
  return {
    required: `${etiqueta} es obligatoria.`,
    minLength: { value: 8, message: `${etiqueta} debe tener al menos 8 caracteres.` },
    maxLength: { value: 64, message: `${etiqueta} no puede superar los 64 caracteres.` },
    validate: {
      espacios: (v) => !/\s/.test(v) || `${etiqueta} no puede tener espacios.`,
      mayuscula: (v) => /[A-ZÁÉÍÓÚÑ]/.test(v) || `${etiqueta} debe tener al menos una mayúscula.`,
      minuscula: (v) => /[a-záéíóúñ]/.test(v) || `${etiqueta} debe tener al menos una minúscula.`,
      numero: (v) => /\d/.test(v) || `${etiqueta} debe tener al menos un número.`,
    },
  }
}
