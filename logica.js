// =====================================================================
// logica.js — Las REGLAS de la biblioteca.
// Aquí NO se usa "document" ni nada de la pantalla: solo datos entran
// y datos (o resultados) salen. Por eso se puede probar sin dibujar nada.
// =====================================================================

// ---------- Constantes de las reglas ----------
const MAX_PRESTAMOS_ACTIVOS = 3;
const DIAS_PRESTAMO = 14;
const ANIO_MINIMO = 1000;
const ANIO_MAXIMO = 2026;
const MAX_COMENTARIO = 120;

// ---------- Fechas ----------
// Las fechas se guardan como texto "AAAA-MM-DD" (por ejemplo "2026-11-04").
// Así se comparan con < y > sin problemas de zona horaria.

function aISO(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function hoyISO() {
  return aISO(new Date());
}

// Suma (o resta, si es negativo) días a una fecha "AAAA-MM-DD".
function sumarDias(iso, dias) {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return aISO(new Date(anio, mes - 1, dia + dias));
}

// Cantidad de días entre dos fechas (hasta - desde). Puede ser negativo.
function diasEntre(desde, hasta) {
  const [a1, m1, d1] = desde.split('-').map(Number);
  const [a2, m2, d2] = hasta.split('-').map(Number);
  const milisegundos = Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1);
  return Math.round(milisegundos / 86400000);
}

// "2026-11-04" -> "04/11/2026"
function formatearFecha(iso) {
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
}

function textoDias(cantidad) {
  return cantidad === 1 ? '1 día' : `${cantidad} días`;
}

// ---------- Texto ----------

// Quita espacios sobrantes y pasa a minúsculas (para comparar duplicados).
function limpiar(texto) {
  return texto.trim().replace(/\s+/g, ' ').toLowerCase();
}

// Además quita las tildes (para que buscar "garcia" encuentre "García").
function sinTildes(texto) {
  return limpiar(texto).normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// ---------- Consultas (leen los datos, no cambian nada) ----------

function buscarLibro(libros, id) {
  return libros.find(function (libro) {
    return libro.id === id;
  });
}

// El préstamo activo de un libro es el que NO tiene fecha de devolución.
function buscarPrestamoActivo(prestamos, idLibro) {
  return prestamos.find(function (prestamo) {
    return prestamo.idLibro === idLibro && prestamo.fechaDevolucion === null;
  });
}

function obtenerPrestamosActivos(prestamos) {
  return prestamos.filter(function (prestamo) {
    return prestamo.fechaDevolucion === null;
  });
}

// Activos ordenados por fecha límite: el que vence primero, arriba.
function obtenerActivosOrdenados(prestamos) {
  const activos = obtenerPrestamosActivos(prestamos); // filter ya crea una copia
  activos.sort(function (a, b) {
    const porFecha = a.fechaLimite.localeCompare(b.fechaLimite);
    return porFecha !== 0 ? porFecha : a.id - b.id;
  });
  return activos;
}

// Devueltos, del más reciente al más antiguo.
function obtenerHistorial(prestamos) {
  const devueltos = prestamos.filter(function (prestamo) {
    return prestamo.fechaDevolucion !== null;
  });
  devueltos.sort(function (a, b) {
    const porFecha = b.fechaDevolucion.localeCompare(a.fechaDevolucion);
    return porFecha !== 0 ? porFecha : b.id - a.id;
  });
  return devueltos;
}

// "disponible" | "prestado" | "coleccion" (se calcula, no se guarda)
function estadoDelLibro(libro, prestamos) {
  if (buscarPrestamoActivo(prestamos, libro.id) !== undefined) return 'prestado';
  if (libro.coleccion) return 'coleccion';
  return 'disponible';
}

function estaVencido(prestamo, hoy) {
  return prestamo.fechaDevolucion === null && prestamo.fechaLimite < hoy;
}

// Días de retraso: para un préstamo activo se cuenta hasta hoy;
// para uno devuelto, hasta el día en que se devolvió.
function diasDeRetraso(prestamo, hoy) {
  const fin = prestamo.fechaDevolucion === null ? hoy : prestamo.fechaDevolucion;
  return Math.max(0, diasEntre(prestamo.fechaLimite, fin));
}

function siguienteId(lista) {
  let mayor = 0;
  for (const elemento of lista) {
    if (elemento.id > mayor) mayor = elemento.id;
  }
  return mayor + 1;
}

function obtenerGeneros(libros) {
  const generos = [];
  for (const libro of libros) {
    if (!generos.includes(libro.genero)) generos.push(libro.genero);
  }
  return generos.sort(function (a, b) {
    return a.localeCompare(b, 'es');
  });
}

// ---------- Filtrar y ordenar ----------

// filtros = { texto: '', estado: 'todos' | 'disponibles' | 'prestados', genero: '' }
// Devuelve un arreglo NUEVO; los datos originales no se tocan.
function filtrarLibros(datos, filtros) {
  const buscado = sinTildes(filtros.texto);
  return datos.libros.filter(function (libro) {
    const coincideTexto =
      sinTildes(libro.titulo).includes(buscado) || sinTildes(libro.autor).includes(buscado);
    const coincideGenero = filtros.genero === '' || libro.genero === filtros.genero;
    const estado = estadoDelLibro(libro, datos.prestamos);
    let coincideEstado = true;
    if (filtros.estado === 'disponibles') coincideEstado = estado === 'disponible';
    if (filtros.estado === 'prestados') coincideEstado = estado === 'prestado';
    return coincideTexto && coincideGenero && coincideEstado;
  });
}

// criterio: 'titulo' | 'autor' | 'anio'   direccion: 'asc' | 'desc'
// Ordena una COPIA ([...libros]), así el orden de los datos originales no cambia.
// localeCompare con 'es' ordena bien las tildes y la ñ.
function ordenarLibros(libros, criterio, direccion) {
  const copia = [...libros];
  const factor = direccion === 'desc' ? -1 : 1;
  copia.sort(function (a, b) {
    let resultado;
    if (criterio === 'anio') {
      resultado = a.anio - b.anio;
    } else {
      resultado = a[criterio].localeCompare(b[criterio], 'es');
    }
    if (resultado === 0) resultado = a.titulo.localeCompare(b.titulo, 'es'); // desempate
    return resultado * factor;
  });
  return copia;
}

// ---------- Resumen (todo calculado desde los datos) ----------

function calcularResumen(datos, hoy) {
  let disponibles = 0;
  let prestados = 0;
  for (const libro of datos.libros) {
    const estado = estadoDelLibro(libro, datos.prestamos);
    if (estado === 'disponible') disponibles++;
    if (estado === 'prestado') prestados++;
  }
  let vencidos = 0;
  for (const prestamo of obtenerPrestamosActivos(datos.prestamos)) {
    if (estaVencido(prestamo, hoy)) vencidos++;
  }
  const porGenero = obtenerGeneros(datos.libros).map(function (genero) {
    const cantidad = datos.libros.filter(function (libro) {
      return libro.genero === genero;
    }).length;
    return { genero: genero, cantidad: cantidad };
  });
  return {
    total: datos.libros.length,
    disponibles: disponibles,
    prestados: prestados,
    vencidos: vencidos,
    porGenero: porGenero
  };
}

// ---------- Préstamos y devoluciones ----------
// Estas funciones reciben "datos" ({ libros, prestamos }), lo modifican
// si la regla lo permite y devuelven { ok, mensaje, ... }.

function validarPersona(nombre) {
  const largo = nombre.trim().length;
  if (largo < 2 || largo > 40) {
    return 'El nombre debe tener entre 2 y 40 caracteres.';
  }
  return '';
}

// Reglas 1, 2 y 3: ¿se puede prestar este libro ahora mismo?
function puedePrestar(datos, idLibro) {
  const libro = buscarLibro(datos.libros, idLibro);
  if (libro === undefined) {
    return { ok: false, mensaje: 'Ese libro ya no existe.' };
  }
  if (libro.coleccion) {
    return { ok: false, mensaje: `«${libro.titulo}» es un ejemplar de colección y no se presta.` };
  }
  if (buscarPrestamoActivo(datos.prestamos, idLibro) !== undefined) {
    return { ok: false, mensaje: `«${libro.titulo}» ya está prestado.` };
  }
  if (obtenerPrestamosActivos(datos.prestamos).length >= MAX_PRESTAMOS_ACTIVOS) {
    return {
      ok: false,
      mensaje: `No se puede prestar «${libro.titulo}»: ya hay ${MAX_PRESTAMOS_ACTIVOS} préstamos activos. Devuelve uno primero.`
    };
  }
  return { ok: true, mensaje: '' };
}

// Crea un préstamo NUEVO. El libro no se modifica.
function prestarLibro(datos, idLibro, persona, hoy) {
  const permiso = puedePrestar(datos, idLibro);
  if (!permiso.ok) {
    return { ok: false, campo: 'general', mensaje: permiso.mensaje };
  }
  const errorNombre = validarPersona(persona);
  if (errorNombre !== '') {
    return { ok: false, campo: 'persona', mensaje: errorNombre };
  }
  const libro = buscarLibro(datos.libros, idLibro);
  const fechaLimite = sumarDias(hoy, DIAS_PRESTAMO);
  datos.prestamos.push({
    id: siguienteId(datos.prestamos),
    idLibro: idLibro,
    persona: persona.trim(),
    fechaPrestamo: hoy,
    fechaLimite: fechaLimite,
    fechaDevolucion: null
  });
  return {
    ok: true,
    mensaje: `«${libro.titulo}» se prestó a ${persona.trim()}. Devolver antes del ${formatearFecha(fechaLimite)}.`
  };
}

// No borra nada: solo anota la fecha de devolución en el préstamo activo.
function devolverLibro(datos, idLibro, hoy) {
  const libro = buscarLibro(datos.libros, idLibro);
  const prestamo = buscarPrestamoActivo(datos.prestamos, idLibro);
  if (libro === undefined || prestamo === undefined) {
    return { ok: false, mensaje: 'Ese libro no tiene un préstamo activo.' };
  }
  prestamo.fechaDevolucion = hoy;
  const retraso = diasDeRetraso(prestamo, hoy);
  if (retraso === 0) {
    return { ok: true, aTiempo: true, mensaje: `«${libro.titulo}» se devolvió a tiempo.` };
  }
  return {
    ok: true,
    aTiempo: false,
    mensaje: `«${libro.titulo}» se devolvió con ${textoDias(retraso)} de retraso.`
  };
}

// ---------- Agregar, editar y eliminar libros ----------

// campos = { titulo, autor, anio, genero, comentario, coleccion }  (anio llega como texto)
// idEditando = id del libro que se edita, o null si se está agregando.
// Devuelve un objeto con un mensaje por campo con error: { titulo: '...', anio: '...' }
function validarLibro(datos, campos, idEditando) {
  const errores = {};
  const titulo = campos.titulo.trim();
  const autor = campos.autor.trim();
  const anioTexto = String(campos.anio).trim();
  const anio = Number(anioTexto);

  if (titulo.length < 3 || titulo.length > 60) {
    errores.titulo = 'El título debe tener entre 3 y 60 caracteres.';
  }
  if (autor.length === 0) {
    errores.autor = 'El autor es obligatorio.';
  }
  if (anioTexto === '') {
    errores.anio = 'El año es obligatorio.';
  } else if (!Number.isInteger(anio) || anio < ANIO_MINIMO || anio > ANIO_MAXIMO) {
    errores.anio = `El año debe ser un número entero entre ${ANIO_MINIMO} y ${ANIO_MAXIMO}.`;
  }
  if (!GENEROS.includes(campos.genero)) {
    errores.genero = 'Elige un género de la lista.';
  }
  if (campos.comentario.length > MAX_COMENTARIO) {
    errores.comentario = `El comentario no puede pasar de ${MAX_COMENTARIO} caracteres.`;
  }

  // Duplicado: mismo título y mismo autor. Al editar, el propio libro no cuenta.
  if (errores.titulo === undefined && errores.autor === undefined) {
    const repetido = datos.libros.some(function (libro) {
      return (
        libro.id !== idEditando &&
        limpiar(libro.titulo) === limpiar(titulo) &&
        limpiar(libro.autor) === limpiar(autor)
      );
    });
    if (repetido) errores.titulo = 'Ya existe un libro con ese título y ese autor.';
  }

  // Regla 6: un libro con préstamo activo no puede pasar a ser de colección.
  if (
    idEditando !== null &&
    campos.coleccion &&
    buscarPrestamoActivo(datos.prestamos, idEditando) !== undefined
  ) {
    errores.coleccion = 'Un libro con préstamo activo no puede ser de colección. Devuélvelo primero.';
  }
  return errores;
}

function hayErrores(errores) {
  return Object.keys(errores).length > 0;
}

function agregarLibro(datos, campos) {
  const errores = validarLibro(datos, campos, null);
  if (hayErrores(errores)) return { ok: false, errores: errores };
  const libro = {
    id: siguienteId(datos.libros),
    titulo: campos.titulo.trim(),
    autor: campos.autor.trim(),
    anio: Number(campos.anio),
    genero: campos.genero,
    comentario: campos.comentario.trim(),
    coleccion: campos.coleccion
  };
  datos.libros.push(libro);
  return { ok: true, errores: {}, mensaje: `Se agregó «${libro.titulo}» al catálogo.` };
}

function editarLibro(datos, idLibro, campos) {
  const libro = buscarLibro(datos.libros, idLibro);
  if (libro === undefined) {
    return { ok: false, errores: {}, mensaje: 'Ese libro ya no existe.' };
  }
  const errores = validarLibro(datos, campos, idLibro);
  if (hayErrores(errores)) return { ok: false, errores: errores };
  libro.titulo = campos.titulo.trim();
  libro.autor = campos.autor.trim();
  libro.anio = Number(campos.anio);
  libro.genero = campos.genero;
  libro.comentario = campos.comentario.trim();
  libro.coleccion = campos.coleccion;
  return { ok: true, errores: {}, mensaje: `Se guardaron los cambios de «${libro.titulo}».` };
}

// Regla 6: con préstamo activo no se puede eliminar.
function puedeEliminar(datos, idLibro) {
  const libro = buscarLibro(datos.libros, idLibro);
  if (libro === undefined) {
    return { ok: false, mensaje: 'Ese libro ya no existe.' };
  }
  if (buscarPrestamoActivo(datos.prestamos, idLibro) !== undefined) {
    return { ok: false, mensaje: `No se puede eliminar «${libro.titulo}»: tiene un préstamo activo.` };
  }
  return { ok: true, mensaje: '' };
}

// Elimina el libro y todo su historial de préstamos.
function eliminarLibro(datos, idLibro) {
  const permiso = puedeEliminar(datos, idLibro);
  if (!permiso.ok) return permiso;
  const libro = buscarLibro(datos.libros, idLibro);
  datos.libros = datos.libros.filter(function (otro) {
    return otro.id !== idLibro;
  });
  datos.prestamos = datos.prestamos.filter(function (prestamo) {
    return prestamo.idLibro !== idLibro;
  });
  return { ok: true, mensaje: `Se eliminó «${libro.titulo}» y su historial de préstamos.` };
}
