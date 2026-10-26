// =====================================================================
// datos.js — Los datos iniciales y cómo se guardan en localStorage.
// =====================================================================

const CLAVES = {
  libros: 'biblioteca.libros',
  prestamos: 'biblioteca.prestamos',
  tema: 'biblioteca.tema',
  usuario: 'biblioteca.usuario',
  orden: 'biblioteca.orden'
};

const GENEROS = ['novela', 'cuento', 'poesía', 'ciencia', 'historia', 'ensayo'];

const ORDEN_INICIAL = { criterio: 'titulo', direccion: 'asc' };

// ---------- Leer y escribir en localStorage ----------
// localStorage solo guarda texto, por eso JSON.stringify / JSON.parse.
// El try/catch evita que la página se rompa si el navegador no deja guardar
// o si lo guardado está dañado: en ese caso se usa el valor por defecto.

function leerGuardado(clave, valorPorDefecto) {
  try {
    const texto = localStorage.getItem(clave);
    if (texto === null) return valorPorDefecto;
    return JSON.parse(texto);
  } catch (error) {
    return valorPorDefecto;
  }
}

function escribirGuardado(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch (error) {
    // Si no se puede guardar, la app sigue funcionando (pero sin persistencia).
  }
}

// ---------- Datos iniciales ----------

function crearLibrosIniciales() {
  return [
    { id: 1, titulo: 'Cien años de soledad', autor: 'Gabriel García Márquez', anio: 1967, genero: 'novela', comentario: 'La saga de los Buendía en Macondo.', coleccion: false },
    { id: 2, titulo: 'El Aleph', autor: 'Jorge Luis Borges', anio: 1949, genero: 'cuento', comentario: '', coleccion: false },
    { id: 3, titulo: 'Breve historia del tiempo', autor: 'Stephen Hawking', anio: 1988, genero: 'ciencia', comentario: 'Del big bang a los agujeros negros.', coleccion: false },
    { id: 4, titulo: 'Los pasos perdidos', autor: 'Alejo Carpentier', anio: 1953, genero: 'novela', comentario: '', coleccion: false },
    { id: 5, titulo: 'Paradiso', autor: 'José Lezama Lima', anio: 1966, genero: 'novela', comentario: '', coleccion: false },
    { id: 6, titulo: 'Cosmos', autor: 'Carl Sagan', anio: 1980, genero: 'ciencia', comentario: '', coleccion: false },
    { id: 7, titulo: 'La nieve del almirante', autor: 'Álvaro Mutis', anio: 1986, genero: 'novela', comentario: '', coleccion: false },
    { id: 8, titulo: 'El origen de las especies', autor: 'Charles Darwin', anio: 1859, genero: 'ciencia', comentario: '', coleccion: false },
    { id: 9, titulo: 'Versos sencillos', autor: 'José Martí', anio: 1891, genero: 'poesía', comentario: 'Primera edición.', coleccion: true },
    { id: 10, titulo: 'Don Quijote de la Mancha', autor: 'Miguel de Cervantes', anio: 1605, genero: 'novela', comentario: 'Ejemplar antiguo.', coleccion: true },
    { id: 11, titulo: 'Sapiens', autor: 'Yuval Noah Harari', anio: 2011, genero: 'historia', comentario: '', coleccion: false }
  ];
}

// Las fechas se calculan a partir de HOY, así nunca quedan desfasadas.
// Hay 2 activos (uno vencido) y 2 devueltos (uno a tiempo y otro con retraso).
function crearPrestamosIniciales(hoy) {
  const p1 = sumarDias(hoy, -20); // activo y VENCIDO (límite: hace 6 días)
  const p2 = sumarDias(hoy, -4); // activo y vigente
  const p3 = sumarDias(hoy, -30); // devuelto A TIEMPO
  const p4 = sumarDias(hoy, -25); // devuelto CON RETRASO
  return [
    { id: 1, idLibro: 1, persona: 'Ana', fechaPrestamo: p1, fechaLimite: sumarDias(p1, DIAS_PRESTAMO), fechaDevolucion: null },
    { id: 2, idLibro: 3, persona: 'Luis Martínez', fechaPrestamo: p2, fechaLimite: sumarDias(p2, DIAS_PRESTAMO), fechaDevolucion: null },
    { id: 3, idLibro: 6, persona: 'Marta Díaz', fechaPrestamo: p3, fechaLimite: sumarDias(p3, DIAS_PRESTAMO), fechaDevolucion: sumarDias(hoy, -20) },
    { id: 4, idLibro: 2, persona: 'Carlos Ruiz', fechaPrestamo: p4, fechaLimite: sumarDias(p4, DIAS_PRESTAMO), fechaDevolucion: sumarDias(hoy, -5) }
  ];
}

// ---------- Cargar y guardar ----------

// Comprueba que lo guardado tenga sentido: dos arreglos y todo préstamo
// apuntando a un libro que existe.
function datosValidos(libros, prestamos) {
  if (!Array.isArray(libros) || !Array.isArray(prestamos)) return false;
  return prestamos.every(function (prestamo) {
    return libros.some(function (libro) {
      return libro.id === prestamo.idLibro;
    });
  });
}

function guardarDatos(datos) {
  escribirGuardado(CLAVES.libros, datos.libros);
  escribirGuardado(CLAVES.prestamos, datos.prestamos);
}

// Si no hay nada guardado (o está dañado), se arranca con los datos iniciales.
function cargarDatos() {
  const libros = leerGuardado(CLAVES.libros, null);
  const prestamos = leerGuardado(CLAVES.prestamos, null);
  if (datosValidos(libros, prestamos)) {
    return { libros: libros, prestamos: prestamos };
  }
  const iniciales = {
    libros: crearLibrosIniciales(),
    prestamos: crearPrestamosIniciales(hoyISO())
  };
  guardarDatos(iniciales);
  return iniciales;
}

// Tema, nombre de usuario y orden del catálogo.
function cargarPreferencias() {
  let tema = leerGuardado(CLAVES.tema, 'claro');
  if (tema !== 'claro' && tema !== 'oscuro') tema = 'claro';

  let usuario = leerGuardado(CLAVES.usuario, '');
  if (typeof usuario !== 'string') usuario = '';

  const orden = leerGuardado(CLAVES.orden, ORDEN_INICIAL);
  const criterioValido = ['titulo', 'autor', 'anio'].includes(orden.criterio);
  const direccionValida = ['asc', 'desc'].includes(orden.direccion);

  return {
    tema: tema,
    usuario: usuario,
    orden: {
      criterio: criterioValido ? orden.criterio : ORDEN_INICIAL.criterio,
      direccion: direccionValida ? orden.direccion : ORDEN_INICIAL.direccion
    }
  };
}

function guardarTema(tema) {
  escribirGuardado(CLAVES.tema, tema);
}

function guardarUsuario(usuario) {
  escribirGuardado(CLAVES.usuario, usuario);
}

function guardarOrden(orden) {
  escribirGuardado(CLAVES.orden, orden);
}

// Restablecer: borra todo lo guardado por la aplicación.
function borrarGuardado() {
  try {
    for (const clave of Object.values(CLAVES)) {
      localStorage.removeItem(clave);
    }
  } catch (error) {
    // Nada que borrar si localStorage no está disponible.
  }
}
