// =====================================================================
// ui.js — DIBUJA la pantalla a partir de los datos.
// Todo se crea con createElement + textContent (nunca innerHTML),
// así un título como "<b>hola</b>" se muestra como texto y no como HTML.
// =====================================================================

const VISTAS = ['catalogo', 'prestamos', 'formulario', 'resumen'];
const CAMPOS_FORMULARIO = ['titulo', 'autor', 'anio', 'genero', 'comentario', 'coleccion'];
const TEXTO_ESTADO = {
  disponible: 'Disponible',
  prestado: 'Prestado',
  coleccion: 'De colección'
};

// ---------- Ayudas pequeñas ----------

function porId(id) {
  return document.getElementById(id);
}

// Crea un elemento con una clase y un texto (el texto va con textContent).
function crear(etiqueta, clase, texto) {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function crearBoton(texto, accion, idLibro, clase, etiquetaAria) {
  const boton = crear('button', 'boton ' + clase, texto);
  boton.type = 'button';
  boton.dataset.accion = accion; // queda como data-accion="prestar" en el HTML
  boton.dataset.id = idLibro; // y data-id="3"
  if (etiquetaAria) boton.setAttribute('aria-label', etiquetaAria);
  return boton;
}

function crearOpcion(valor, texto) {
  const opcion = document.createElement('option');
  opcion.value = valor;
  opcion.textContent = texto;
  return opcion;
}

// ---------- Mensajes en la página ----------

let temporizadorMensaje = null;

// tipo: 'exito' | 'aviso' | 'error'
function mostrarMensaje(texto, tipo) {
  const caja = porId('mensaje');
  caja.textContent = texto;
  caja.className = 'mensaje mensaje--' + tipo;
  clearTimeout(temporizadorMensaje);
  temporizadorMensaje = setTimeout(limpiarMensaje, 8000);
}

function limpiarMensaje() {
  const caja = porId('mensaje');
  caja.textContent = '';
  caja.className = 'mensaje';
}

// ---------- Vistas, menú y tema ----------

function mostrarVista(nombre) {
  for (const vista of VISTAS) {
    const activa = vista === nombre;
    porId('vista-' + vista).hidden = !activa;
    const enlace = porId('enlace-' + vista);
    enlace.classList.toggle('activo', activa);
    if (activa) {
      enlace.setAttribute('aria-current', 'page');
    } else {
      enlace.removeAttribute('aria-current');
    }
  }
}

function dibujarMenu(cantidadActivos, usuario) {
  porId('enlace-prestamos').textContent = `Mis préstamos (${cantidadActivos})`;
  porId('saludo').textContent = usuario === '' ? '' : `Hola, ${usuario}`;
}

function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema; // <html data-tema="oscuro">
  porId('tema-actual').textContent = tema === 'oscuro' ? 'Oscuro' : 'Claro';
  porId('boton-tema').textContent =
    tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
}

// ---------- Vista 1: catálogo ----------

function dibujarFiltroGenero(generos, seleccionado) {
  const select = porId('filtro-genero');
  select.replaceChildren(crearOpcion('', 'Todos los géneros'));
  for (const genero of generos) {
    select.appendChild(crearOpcion(genero, capitalizar(genero)));
  }
  select.value = seleccionado;
}

// Pone los controles del catálogo en el estado que dicen los datos.
function sincronizarControlesCatalogo(filtros, orden) {
  porId('buscar').value = filtros.texto;
  porId('orden-criterio').value = orden.criterio;
  porId('orden-direccion').value = orden.direccion;
  for (const boton of document.querySelectorAll('.filtro')) {
    boton.setAttribute('aria-pressed', String(boton.dataset.estado === filtros.estado));
  }
}

function agregarDato(lista, nombre, valor) {
  const grupo = crear('div', 'dato');
  grupo.appendChild(crear('dt', '', nombre));
  grupo.appendChild(crear('dd', '', valor));
  lista.appendChild(grupo);
}

function crearTarjeta(libro, datos, hoy) {
  const prestamo = buscarPrestamoActivo(datos.prestamos, libro.id);
  const estado = estadoDelLibro(libro, datos.prestamos);
  const vencido = prestamo !== undefined && estaVencido(prestamo, hoy);

  let clases = 'tarjeta tarjeta--' + estado;
  if (vencido) clases += ' tarjeta--vencido';
  const tarjeta = crear('article', clases);

  const cabecera = crear('div', 'tarjeta__cabecera');
  cabecera.appendChild(crear('h3', 'tarjeta__titulo', libro.titulo));
  const etiquetas = crear('div', 'etiquetas');
  etiquetas.appendChild(crear('span', 'etiqueta etiqueta--' + estado, TEXTO_ESTADO[estado]));
  if (vencido) etiquetas.appendChild(crear('span', 'etiqueta etiqueta--vencido', 'Vencido'));
  cabecera.appendChild(etiquetas);
  tarjeta.appendChild(cabecera);

  const datosLibro = crear('dl', 'datos');
  agregarDato(datosLibro, 'Autor', libro.autor);
  agregarDato(datosLibro, 'Año', String(libro.anio));
  agregarDato(datosLibro, 'Género', capitalizar(libro.genero));
  tarjeta.appendChild(datosLibro);

  if (libro.comentario) {
    tarjeta.appendChild(crear('p', 'tarjeta__comentario', libro.comentario));
  }

  if (prestamo !== undefined) {
    const detalle = crear('div', 'tarjeta__prestamo');
    detalle.appendChild(crear('p', '', `Prestado a ${prestamo.persona}`));
    detalle.appendChild(crear('p', '', `Devolver antes del ${formatearFecha(prestamo.fechaLimite)}`));
    if (vencido) {
      detalle.appendChild(
        crear('p', 'texto-alerta', `${textoDias(diasDeRetraso(prestamo, hoy))} de retraso`)
      );
    }
    tarjeta.appendChild(detalle);
  }

  const acciones = crear('div', 'acciones tarjeta__acciones');
  if (prestamo !== undefined) {
    acciones.appendChild(
      crearBoton('Devolver', 'devolver', libro.id, '', `Devolver «${libro.titulo}»`)
    );
  } else {
    const botonPrestar = crearBoton('Prestar', 'prestar', libro.id, '', `Prestar «${libro.titulo}»`);
    if (libro.coleccion) {
      botonPrestar.disabled = true;
      botonPrestar.title = 'Los ejemplares de colección no se prestan';
    }
    acciones.appendChild(botonPrestar);
  }
  acciones.appendChild(
    crearBoton('Editar', 'editar', libro.id, 'boton--secundario', `Editar «${libro.titulo}»`)
  );
  acciones.appendChild(
    crearBoton('Eliminar', 'eliminar', libro.id, 'boton--peligro-suave', `Eliminar «${libro.titulo}»`)
  );
  tarjeta.appendChild(acciones);
  return tarjeta;
}

// "visibles" ya viene filtrada y ordenada desde main.js.
function dibujarCatalogo(visibles, datos, hoy) {
  const contenedor = porId('lista-libros');
  contenedor.replaceChildren();
  for (const libro of visibles) {
    contenedor.appendChild(crearTarjeta(libro, datos, hoy));
  }
  porId('sin-resultados').hidden = visibles.length > 0;
  porId('contador').textContent = `Mostrando ${visibles.length} de ${datos.libros.length} libros`;
}

// ---------- Vista 2: préstamos ----------

function nombreDelLibro(datos, idLibro) {
  const libro = buscarLibro(datos.libros, idLibro);
  return libro === undefined ? 'Libro eliminado' : libro.titulo;
}

function crearItemActivo(prestamo, datos, hoy) {
  const vencido = estaVencido(prestamo, hoy);
  const item = crear('li', vencido ? 'item item--vencido' : 'item');
  const info = crear('div', 'item__info');

  const encabezado = crear('div', 'item__encabezado');
  encabezado.appendChild(crear('h4', 'item__titulo', nombreDelLibro(datos, prestamo.idLibro)));
  if (vencido) encabezado.appendChild(crear('span', 'etiqueta etiqueta--vencido', 'Vencido'));
  info.appendChild(encabezado);

  info.appendChild(crear('p', '', `Prestado a ${prestamo.persona}`));
  info.appendChild(crear('p', '', `Fecha límite: ${formatearFecha(prestamo.fechaLimite)}`));
  if (vencido) {
    info.appendChild(
      crear('p', 'texto-alerta', `${textoDias(diasDeRetraso(prestamo, hoy))} de retraso`)
    );
  }
  item.appendChild(info);

  const titulo = nombreDelLibro(datos, prestamo.idLibro);
  item.appendChild(crearBoton('Devolver', 'devolver', prestamo.idLibro, '', `Devolver «${titulo}»`));
  return item;
}

function crearItemHistorial(prestamo, datos, hoy) {
  const retraso = diasDeRetraso(prestamo, hoy);
  const item = crear('li', retraso > 0 ? 'item item--retraso' : 'item');
  const info = crear('div', 'item__info');

  const encabezado = crear('div', 'item__encabezado');
  encabezado.appendChild(crear('h4', 'item__titulo', nombreDelLibro(datos, prestamo.idLibro)));
  if (retraso === 0) {
    encabezado.appendChild(crear('span', 'etiqueta etiqueta--exito', 'A tiempo'));
  } else {
    encabezado.appendChild(
      crear('span', 'etiqueta etiqueta--aviso', `Con retraso: ${textoDias(retraso)}`)
    );
  }
  info.appendChild(encabezado);

  info.appendChild(crear('p', '', `Persona: ${prestamo.persona}`));
  info.appendChild(crear('p', '', `Préstamo: ${formatearFecha(prestamo.fechaPrestamo)}`));
  info.appendChild(crear('p', '', `Devolución: ${formatearFecha(prestamo.fechaDevolucion)}`));
  item.appendChild(info);
  return item;
}

function dibujarPrestamos(activos, historial, datos, hoy) {
  const listaActivos = porId('lista-activos');
  listaActivos.replaceChildren();
  for (const prestamo of activos) {
    listaActivos.appendChild(crearItemActivo(prestamo, datos, hoy));
  }
  porId('sin-activos').hidden = activos.length > 0;

  const listaHistorial = porId('lista-historial');
  listaHistorial.replaceChildren();
  for (const prestamo of historial) {
    listaHistorial.appendChild(crearItemHistorial(prestamo, datos, hoy));
  }
  porId('sin-historial').hidden = historial.length > 0;
}

// ---------- Vista 3: formulario ----------

function leerFormulario() {
  return {
    titulo: porId('campo-titulo').value,
    autor: porId('campo-autor').value,
    anio: porId('campo-anio').value,
    genero: porId('campo-genero').value,
    comentario: porId('campo-comentario').value,
    coleccion: porId('campo-coleccion').checked
  };
}

function llenarGeneroFormulario() {
  const select = porId('campo-genero');
  select.replaceChildren(crearOpcion('', 'Elige un género'));
  for (const genero of GENEROS) {
    select.appendChild(crearOpcion(genero, capitalizar(genero)));
  }
}

function actualizarContadorComentario() {
  const restantes = MAX_COMENTARIO - porId('campo-comentario').value.length;
  porId('contador-comentario').textContent = `${restantes} caracteres restantes`;
}

// errores = { titulo: '...', anio: '...' }; los campos sin error se limpian.
// El foco pasa al primer campo (en orden) que tenga error.
function mostrarErroresFormulario(errores) {
  let primerCampoConError = null;
  for (const campo of CAMPOS_FORMULARIO) {
    const mensaje = errores[campo] || '';
    const control = porId('campo-' + campo);
    porId('error-' + campo).textContent = mensaje;
    if (mensaje !== '') {
      control.setAttribute('aria-invalid', 'true');
      if (primerCampoConError === null) primerCampoConError = control;
    } else {
      control.removeAttribute('aria-invalid');
    }
  }
  if (primerCampoConError !== null) primerCampoConError.focus();
}

function llenarFormulario(libro) {
  porId('campo-titulo').value = libro.titulo;
  porId('campo-autor').value = libro.autor;
  porId('campo-anio').value = libro.anio;
  porId('campo-genero').value = libro.genero;
  porId('campo-comentario').value = libro.comentario || '';
  porId('campo-coleccion').checked = libro.coleccion;
  mostrarErroresFormulario({});
  actualizarContadorComentario();
}

function vaciarFormulario() {
  porId('form-libro').reset();
  mostrarErroresFormulario({});
  actualizarContadorComentario();
}

function ponerModoFormulario(editando) {
  porId('titulo-formulario').textContent = editando ? 'Editar libro' : 'Agregar libro';
  porId('boton-guardar').textContent = editando ? 'Guardar cambios' : 'Agregar libro';
  porId('boton-cancelar-edicion').hidden = !editando;
}

// ---------- Vista 4: resumen y ajustes ----------

function agregarCifra(lista, nombre, valor) {
  const grupo = crear('div', 'cifra');
  grupo.appendChild(crear('dt', '', nombre));
  grupo.appendChild(crear('dd', '', String(valor)));
  lista.appendChild(grupo);
}

function dibujarResumen(resumen) {
  const cifras = porId('resumen-cifras');
  cifras.replaceChildren();
  agregarCifra(cifras, 'Total de libros', resumen.total);
  agregarCifra(cifras, 'Disponibles', resumen.disponibles);
  agregarCifra(cifras, 'Prestados', resumen.prestados);
  agregarCifra(cifras, 'Vencidos', resumen.vencidos);

  const generos = porId('resumen-generos');
  generos.replaceChildren();
  for (const fila of resumen.porGenero) {
    generos.appendChild(crear('li', '', `${capitalizar(fila.genero)}: ${fila.cantidad}`));
  }
}

function mostrarErrorUsuario(texto) {
  const campo = porId('campo-usuario');
  porId('error-usuario').textContent = texto;
  if (texto !== '') {
    campo.setAttribute('aria-invalid', 'true');
    campo.focus();
  } else {
    campo.removeAttribute('aria-invalid');
  }
}

function ponerNombreEnCampo(nombre) {
  porId('campo-usuario').value = nombre;
  mostrarErrorUsuario('');
}

// ---------- Modales ----------

function hayModalAbierto() {
  return !porId('modal-prestar').hidden || !porId('modal-confirmar').hidden;
}

function cerrarModales() {
  porId('modal-prestar').hidden = true;
  porId('modal-confirmar').hidden = true;
}

function mostrarErrorPersona(texto) {
  const campo = porId('campo-persona');
  porId('error-persona').textContent = texto;
  if (texto !== '') {
    campo.setAttribute('aria-invalid', 'true');
    campo.focus();
  } else {
    campo.removeAttribute('aria-invalid');
  }
}

function abrirModalPrestar(libro, nombrePrellenado) {
  porId('modal-prestar-titulo').textContent = `Prestar «${libro.titulo}»`;
  porId('campo-persona').value = nombrePrellenado;
  mostrarErrorPersona('');
  porId('modal-prestar').hidden = false;
  porId('campo-persona').focus();
  porId('campo-persona').select();
}

function abrirModalConfirmar(titulo, texto, textoBoton) {
  porId('confirmar-titulo').textContent = titulo;
  porId('confirmar-texto').textContent = texto;
  porId('confirmar-aceptar').textContent = textoBoton;
  porId('modal-confirmar').hidden = false;
  porId('confirmar-cancelar').focus(); // lo más seguro: el foco empieza en Cancelar
}
