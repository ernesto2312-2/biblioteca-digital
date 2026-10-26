// =====================================================================
// main.js — Conecta todo: guarda el ESTADO y reacciona a los EVENTOS.
// El ciclo de siempre es:  el usuario hace algo -> cambian los datos
//                          -> se guardan -> se vuelve a dibujar.
// =====================================================================

// ---------- Estado de la aplicación ----------
let datos = cargarDatos(); // { libros: [...], prestamos: [...] }  <- fuentes de verdad
let preferencias = cargarPreferencias(); // { tema, usuario, orden: { criterio, direccion } }

// Estado temporal de la pantalla (no se guarda al recargar).
const filtros = { texto: '', estado: 'todos', genero: '' };
let vistaActual = 'catalogo';
let idEditando = null; // id del libro que se edita, o null si se está agregando
let idLibroAPrestar = null; // libro para el que está abierto el modal de prestar
let confirmacionPendiente = null; // { tipo: 'eliminar', idLibro } | { tipo: 'restablecer' }
let elementoAnterior = null; // botón que abrió el modal (para devolverle el foco)

// ---------- Dibujar todo a partir de los datos ----------

function actualizarCatalogo(hoy) {
  const generos = obtenerGeneros(datos.libros);
  if (!generos.includes(filtros.genero)) filtros.genero = ''; // el género ya no existe
  dibujarFiltroGenero(generos, filtros.genero);

  const filtrados = filtrarLibros(datos, filtros);
  const visibles = ordenarLibros(filtrados, preferencias.orden.criterio, preferencias.orden.direccion);
  dibujarCatalogo(visibles, datos, hoy);
}

function actualizarInterfaz() {
  const hoy = hoyISO();
  const activos = obtenerActivosOrdenados(datos.prestamos);
  actualizarCatalogo(hoy);
  dibujarPrestamos(activos, obtenerHistorial(datos.prestamos), datos, hoy);
  dibujarResumen(calcularResumen(datos, hoy));
  dibujarMenu(activos.length, preferencias.usuario);
}

// Después de CADA cambio en los datos: guardar y volver a dibujar.
function aplicarCambio() {
  guardarDatos(datos);
  actualizarInterfaz();
}

function irAVista(nombre) {
  vistaActual = nombre;
  mostrarVista(nombre);
}

// ---------- Modales ----------

function cerrarModal() {
  cerrarModales();
  idLibroAPrestar = null;
  confirmacionPendiente = null;
  if (elementoAnterior !== null && document.body.contains(elementoAnterior)) {
    elementoAnterior.focus();
  }
  elementoAnterior = null;
}

// ---------- Catálogo: botones de las tarjetas ----------

function iniciarPrestamo(idLibro, boton) {
  const permiso = puedePrestar(datos, idLibro);
  if (!permiso.ok) {
    mostrarMensaje(permiso.mensaje, 'error'); // por ejemplo: ya hay 3 préstamos activos
    return;
  }
  idLibroAPrestar = idLibro;
  elementoAnterior = boton;
  abrirModalPrestar(buscarLibro(datos.libros, idLibro), preferencias.usuario);
}

function alEnviarPrestamo(evento) {
  evento.preventDefault(); // que el formulario no recargue la página
  const nombre = porId('campo-persona').value;
  const resultado = prestarLibro(datos, idLibroAPrestar, nombre, hoyISO());

  if (!resultado.ok && resultado.campo === 'persona') {
    mostrarErrorPersona(resultado.mensaje); // el error se escribe dentro del modal
    return;
  }
  cerrarModal();
  if (!resultado.ok) {
    mostrarMensaje(resultado.mensaje, 'error');
    return;
  }
  aplicarCambio();
  mostrarMensaje(resultado.mensaje, 'exito');
}

function devolver(idLibro) {
  const resultado = devolverLibro(datos, idLibro, hoyISO());
  if (!resultado.ok) {
    mostrarMensaje(resultado.mensaje, 'error');
    return;
  }
  aplicarCambio();
  mostrarMensaje(resultado.mensaje, resultado.aTiempo ? 'exito' : 'aviso');
}

function iniciarEdicion(idLibro) {
  const libro = buscarLibro(datos.libros, idLibro);
  if (libro === undefined) return;
  idEditando = idLibro;
  llenarFormulario(libro);
  ponerModoFormulario(true);
  limpiarMensaje();
  irAVista('formulario');
  porId('campo-titulo').focus();
}

function iniciarEliminacion(idLibro, boton) {
  const permiso = puedeEliminar(datos, idLibro);
  if (!permiso.ok) {
    mostrarMensaje(permiso.mensaje, 'error');
    return;
  }
  const libro = buscarLibro(datos.libros, idLibro);
  confirmacionPendiente = { tipo: 'eliminar', idLibro: idLibro };
  elementoAnterior = boton;
  abrirModalConfirmar(
    `¿Eliminar «${libro.titulo}»?`,
    'También se borrará su historial de préstamos devueltos. Esta acción no se puede deshacer.',
    'Eliminar'
  );
}

function ejecutarEliminacion(idLibro) {
  const resultado = eliminarLibro(datos, idLibro);
  if (!resultado.ok) {
    mostrarMensaje(resultado.mensaje, 'error');
    return;
  }
  if (idEditando === idLibro) cancelarEdicion(); // si se estaba editando ese libro
  aplicarCambio();
  mostrarMensaje(resultado.mensaje, 'exito');
}

// Un solo "oyente" para todos los botones de todas las tarjetas (delegación de eventos).
function alPulsarEnCatalogo(evento) {
  const boton = evento.target.closest('button[data-accion]');
  if (boton === null || boton.disabled) return;
  const idLibro = Number(boton.dataset.id);
  const accion = boton.dataset.accion;

  if (accion === 'prestar') iniciarPrestamo(idLibro, boton);
  if (accion === 'devolver') devolver(idLibro);
  if (accion === 'editar') iniciarEdicion(idLibro);
  if (accion === 'eliminar') iniciarEliminacion(idLibro, boton);
}

function alPulsarEnPrestamos(evento) {
  const boton = evento.target.closest('button[data-accion="devolver"]');
  if (boton === null) return;
  devolver(Number(boton.dataset.id));
}

// ---------- Catálogo: búsqueda, filtros y orden ----------

function alEscribirBusqueda(evento) {
  filtros.texto = evento.target.value;
  actualizarCatalogo(hoyISO());
}

function alPulsarFiltroEstado(evento) {
  const boton = evento.target.closest('button[data-estado]');
  if (boton === null) return;
  filtros.estado = boton.dataset.estado;
  sincronizarControlesCatalogo(filtros, preferencias.orden);
  actualizarCatalogo(hoyISO());
}

function alCambiarGenero(evento) {
  filtros.genero = evento.target.value;
  actualizarCatalogo(hoyISO());
}

function alCambiarOrden() {
  preferencias.orden = {
    criterio: porId('orden-criterio').value,
    direccion: porId('orden-direccion').value
  };
  guardarOrden(preferencias.orden); // se conserva al recargar
  actualizarCatalogo(hoyISO());
}

// ---------- Formulario de agregar / editar ----------

function cancelarEdicion() {
  idEditando = null;
  vaciarFormulario();
  ponerModoFormulario(false);
}

function alEnviarFormulario(evento) {
  evento.preventDefault();
  const campos = leerFormulario();
  let resultado;
  if (idEditando === null) {
    resultado = agregarLibro(datos, campos);
  } else {
    resultado = editarLibro(datos, idEditando, campos);
  }

  if (!resultado.ok) {
    mostrarErroresFormulario(resultado.errores); // un error debajo de cada campo
    if (resultado.mensaje) {
      mostrarMensaje(resultado.mensaje, 'error');
      cancelarEdicion();
    }
    return;
  }
  cancelarEdicion(); // el formulario vuelve al modo "agregar"
  aplicarCambio();
  mostrarMensaje(resultado.mensaje, 'exito');
}

// ---------- Resumen y ajustes ----------

function alCambiarTema() {
  preferencias.tema = preferencias.tema === 'oscuro' ? 'claro' : 'oscuro';
  guardarTema(preferencias.tema);
  aplicarTema(preferencias.tema);
}

function alEnviarUsuario(evento) {
  evento.preventDefault();
  const nombre = porId('campo-usuario').value.trim();
  if (nombre !== '') {
    const error = validarPersona(nombre);
    if (error !== '') {
      mostrarErrorUsuario(error);
      return;
    }
  }
  mostrarErrorUsuario('');
  preferencias.usuario = nombre;
  guardarUsuario(nombre);
  dibujarMenu(obtenerPrestamosActivos(datos.prestamos).length, nombre);
  mostrarMensaje(nombre === '' ? 'Se borró tu nombre.' : `Nombre guardado: ${nombre}.`, 'exito');
}

function iniciarRestablecer(evento) {
  confirmacionPendiente = { tipo: 'restablecer' };
  elementoAnterior = evento.currentTarget;
  abrirModalConfirmar(
    '¿Restablecer la biblioteca?',
    'Se borrará todo lo guardado (libros, préstamos, tema, nombre y orden) y se volverá a los datos iniciales.',
    'Restablecer'
  );
}

function ejecutarRestablecer() {
  borrarGuardado();
  datos = cargarDatos(); // sin nada guardado, vuelve a crear los datos iniciales
  preferencias = cargarPreferencias();
  filtros.texto = '';
  filtros.estado = 'todos';
  filtros.genero = '';
  cancelarEdicion();
  aplicarTema(preferencias.tema);
  ponerNombreEnCampo(preferencias.usuario);
  sincronizarControlesCatalogo(filtros, preferencias.orden);
  actualizarInterfaz();
  mostrarMensaje('La biblioteca volvió a su estado inicial.', 'exito');
}

function alConfirmar() {
  const pendiente = confirmacionPendiente;
  cerrarModal();
  if (pendiente === null) return;
  if (pendiente.tipo === 'eliminar') ejecutarEliminacion(pendiente.idLibro);
  if (pendiente.tipo === 'restablecer') ejecutarRestablecer();
}

// ---------- Teclado y navegación ----------

function alPulsarTecla(evento) {
  if (evento.key !== 'Escape') return;
  if (hayModalAbierto()) {
    cerrarModal(); // con un modal abierto, Escape solo cierra el modal
    return;
  }
  if (vistaActual === 'formulario') cancelarEdicion();
}

function alPulsarMenu(evento) {
  const enlace = evento.target.closest('a[data-vista]');
  if (enlace === null) return;
  evento.preventDefault(); // no seguir el enlace: no se recarga la página
  limpiarMensaje();
  irAVista(enlace.dataset.vista);
}

// Un clic en el fondo oscuro (fuera de la ventana) también cierra el modal.
function alPulsarFondoDeModal(evento) {
  if (evento.target === evento.currentTarget) cerrarModal();
}

// ---------- Conectar los eventos ----------

function conectarEventos() {
  porId('menu').addEventListener('click', alPulsarMenu);

  porId('buscar').addEventListener('input', alEscribirBusqueda);
  porId('filtros-estado').addEventListener('click', alPulsarFiltroEstado);
  porId('filtro-genero').addEventListener('change', alCambiarGenero);
  porId('orden-criterio').addEventListener('change', alCambiarOrden);
  porId('orden-direccion').addEventListener('change', alCambiarOrden);
  porId('lista-libros').addEventListener('click', alPulsarEnCatalogo);

  porId('lista-activos').addEventListener('click', alPulsarEnPrestamos);

  porId('form-libro').addEventListener('submit', alEnviarFormulario);
  porId('campo-comentario').addEventListener('input', actualizarContadorComentario);
  porId('boton-cancelar-edicion').addEventListener('click', cancelarEdicion);

  porId('boton-tema').addEventListener('click', alCambiarTema);
  porId('form-usuario').addEventListener('submit', alEnviarUsuario);
  porId('boton-restablecer').addEventListener('click', iniciarRestablecer);

  porId('form-prestar').addEventListener('submit', alEnviarPrestamo);
  porId('prestar-cancelar').addEventListener('click', cerrarModal);
  porId('modal-prestar').addEventListener('click', alPulsarFondoDeModal);
  porId('confirmar-cancelar').addEventListener('click', cerrarModal);
  porId('confirmar-aceptar').addEventListener('click', alConfirmar);
  porId('modal-confirmar').addEventListener('click', alPulsarFondoDeModal);

  document.addEventListener('keydown', alPulsarTecla);
}

// ---------- Arranque ----------

function iniciar() {
  llenarGeneroFormulario();
  aplicarTema(preferencias.tema);
  ponerNombreEnCampo(preferencias.usuario);
  sincronizarControlesCatalogo(filtros, preferencias.orden);
  ponerModoFormulario(false);
  actualizarContadorComentario();
  actualizarInterfaz();
  irAVista('catalogo');
  conectarEventos();
}

iniciar();
