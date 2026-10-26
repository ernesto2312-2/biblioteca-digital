# Biblioteca Digital

Primer parcial de Programación Web. Aplicación de una sola página para gestionar una biblioteca: catálogo, préstamos y devoluciones, formulario para agregar y editar libros, y resumen con ajustes. Hecha solo con HTML, CSS y JavaScript, sin librerías.

## Cómo abrirla

Abre `index.html` en el navegador. No necesita servidor ni instalación.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Estructura: las 4 vistas y los 2 modales (sin tarjetas ni listas escritas a mano) |
| `styles.css` | Estilos, tema claro/oscuro, Grid, Flexbox, transiciones, animaciones y diseño responsivo |
| `datos.js` | Datos iniciales y lectura/escritura en `localStorage` |
| `logica.js` | Las reglas de negocio. No usa `document`: recibe datos y devuelve resultados |
| `ui.js` | Dibuja la pantalla a partir de los datos (`createElement` + `textContent`) |
| `main.js` | Estado, eventos y el ciclo: cambio → guardar → volver a dibujar |
| `logo.svg` | Logotipo |

## Modelo de datos

- `libros`: `id`, `titulo`, `autor`, `anio`, `genero`, `comentario`, `coleccion`.
- `prestamos`: `id`, `idLibro`, `persona`, `fechaPrestamo`, `fechaLimite`, `fechaDevolucion` (`null` si sigue activo).
- Disponible, prestado, vencido y días de retraso **se calculan**, no se guardan.
- Las fechas se guardan como texto `AAAA-MM-DD`.
