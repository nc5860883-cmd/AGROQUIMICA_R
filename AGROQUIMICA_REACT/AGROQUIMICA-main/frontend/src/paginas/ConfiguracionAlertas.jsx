import { useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { usePantalla } from '../hooks/usePantalla'
import { Encabezado, ErrorCampo, EstadoPantalla } from '../componentes/Comunes'
import { fecha } from '../servicios/formato'

function ConfiguracionAlertas() {
  const { perm, ejecutar } = useOutletContext()
  const { datos, cargando, error, recargar } = usePantalla('configuracion-alertas/')
  const {
    register, handleSubmit, reset, setError, formState: { errors, isSubmitting, isDirty },
  } = useForm()

  const parametros = datos?.parametros

  // Cuando llegan los datos de Django se cargan en el formulario.
  useEffect(() => {
    if (parametros) reset(Object.fromEntries(parametros.map((p) => [p.clave, p.valor])))
  }, [parametros, reset])

  const guardar = async (valores) => {
    const r = await ejecutar('configuracion-alertas/', valores)
    if (r.ok) {
      recargar()
    } else {
      (r.datos?.parametros || []).forEach((p) => {
        if (p.error) setError(p.clave, { type: 'servidor', message: p.error })
      })
    }
  }

  const revisarAhora = async () => {
    const r = await ejecutar('configuracion-alertas/', { accion: 'revisar' })
    if (r.ok) recargar()
  }

  if (!datos) return <EstadoPantalla cargando={cargando} error={error} datos={datos} />

  const puedeEditar = perm.configuracion_gestionar

  return (
    <div>
      <Encabezado icono="ajustes" titulo="Configuración de alertas" subtitulo="Umbrales que usan las reglas de alertas y notificaciones.">
        {puedeEditar && (
          <button type="button" className="btn btn-outline-success" onClick={revisarAhora}>Revisar vencimientos ahora</button>
        )}
      </Encabezado>

      <form onSubmit={handleSubmit(guardar)} noValidate>
        <div className="row g-3">
          {parametros.map((p) => (
            <div className="col-md-6 col-xl-4" key={p.clave}>
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <label className="form-label fw-semibold" htmlFor={p.clave}>{p.titulo}</label>
                  <p className="small text-body-secondary">{p.descripcion}</p>
                  <input id={p.clave} type="number" min={p.minimo} max={p.maximo} disabled={!puedeEditar}
                    className={'form-control' + (errors[p.clave] ? ' is-invalid' : '')}
                    {...register(p.clave, {
                      required: `"${p.titulo}" es obligatorio.`,
                      pattern: { value: /^-?\d+$/, message: `"${p.titulo}" debe ser un número entero.` },
                      min: { value: p.minimo, message: `"${p.titulo}" debe estar entre ${p.minimo} y ${p.maximo}.` },
                      max: { value: p.maximo, message: `"${p.titulo}" debe estar entre ${p.minimo} y ${p.maximo}.` },
                    })} />
                  <ErrorCampo error={errors[p.clave]} />
                  <div className="form-text">
                    Rango {p.minimo}–{p.maximo} · Por defecto {p.defecto}
                    {p.modificado && <> · Modificado {fecha(p.modificado, true)}</>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {puedeEditar && (
          <div className="d-flex justify-content-end gap-2 mt-3">
            <button type="button" className="btn btn-outline-secondary" disabled={!isDirty}
              onClick={() => reset(Object.fromEntries(parametros.map((p) => [p.clave, p.valor])))}>
              Descartar cambios
            </button>
            <button type="submit" className="btn btn-success" disabled={isSubmitting || !isDirty}>Guardar configuración</button>
          </div>
        )}
      </form>
    </div>
  )
}

export default ConfiguracionAlertas
