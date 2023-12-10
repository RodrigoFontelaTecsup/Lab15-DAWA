const mysql = require('mysql');
const express = require('express');
const app = express();
const port = 3000;

// Configurar Pug como motor de plantillas
app.set('view engine', 'pug');
app.set('views', './views');

// Configurar Express.js para servir archivos estáticos desde la carpeta "public"
app.use(express.static('public'));

// Middleware para procesar datos enviados en formularios
app.use(express.urlencoded({ extended: true }));

// Configuración de la conexión a MySQL
const connection = mysql.createConnection({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'laboratorio15'
});

// Conexión a la base de datos
connection.connect((error) => {
  if (error) {
    console.error('Error al conectar a MySQL: ', error);
    return;
  }
  console.log('Conexión exitosa a MySQL');
});

// Ruta prinicipal de nuestra aplicacion
app.get('/', (req, res) => {
    const query = `
      SELECT alumnos.id, alumnos.nombre, notas.materia, notas.nota
      FROM alumnos
      LEFT JOIN notas ON alumnos.id = notas.alumno_id
    `;
  
    connection.query(query, (error, resultados) => {
      if (error) {
        console.error('Error al obtener los datos: ', error);
        return;
      }
      res.render('index', { datos: resultados });
    });
  });
  

// Ruta formulario de crear alumno
app.get('/crear', (req, res) => {
  res.render('crear');
});

// Manejar la solicitud POST para agregar datos
app.post('/crear', (req, res) => {
    const nuevoDato = req.body.nuevoDato;
    const nota = req.body.nota; // Obtener la nota del formulario
    const materia = req.body.materia; // Obtener la materia del formulario

    // VALIDACIONES

    // Validar que el nombre del alumno no esté vacío y contenga solo letras y espacios
    if (!/^[a-zA-Z\s]+$/.test(nuevoDato)) {
        console.error('Error: Nombre del alumno inválido');
        return res.status(400).send('Nombre del alumno inválido');
    }

    // Validar que la nota sea un número entre 0 y 20
    if (isNaN(nota) || nota < 0 || nota > 20) {
        console.error('Error: Nota inválida');
        return res.status(400).send('Nota inválida');
    }

    // Consulta SQL de inserción en la tabla de alumnos
    const consultaAlumnos = 'INSERT INTO alumnos (nombre) VALUES (?)';
    
    // Ejecutar la consulta de inserción en la tabla de alumnos
    connection.query(consultaAlumnos, [nuevoDato], (error, resultsAlumnos) => {
        if (error) {
            console.error('Error al insertar datos en la tabla de alumnos: ', error);
            return;
        }

        const alumnoId = resultsAlumnos.insertId;

        // Consulta SQL de inserción en la tabla de notas
        const consultaNotas = 'INSERT INTO notas (alumno_id, materia, nota) VALUES (?, ?, ?)';

        // Ejecutar la consulta de inserción en la tabla de notas
        connection.query(consultaNotas, [alumnoId, materia, nota], (error, resultsNotas) => {
            if (error) {
                console.error('Error al insertar datos en la tabla de notas: ', error);
                return;
            }

            console.log('Alumno y nota insertados exitosamente');
            res.redirect('/');
        });
    });
});

// Ruta para obtener los detalles del alumno (nombre, materia, nota)
app.get('/alumno/:id', (req, res) => {
    const alumnoId = req.params.id;
    const query = `
      SELECT alumnos.id, alumnos.nombre, notas.materia, notas.nota
      FROM alumnos
      LEFT JOIN notas ON alumnos.id = notas.alumno_id
      WHERE alumnos.id = ?
    `;
  
    connection.query(query, [alumnoId], (error, resultado) => {
      if (error) {
        console.error('Error al obtener detalles del alumno: ', error);
        return;
      }
      res.render('detalles', { alumno: resultado[0] });
    });
  });
  
// Ruta para mostrar el formulario de actualización
app.get('/editar/:id', (req, res) => {
  const alumnoId = req.params.id;
  const query = `
    SELECT alumnos.id, alumnos.nombre, notas.materia, notas.nota
    FROM alumnos
    LEFT JOIN notas ON alumnos.id = notas.alumno_id
    WHERE alumnos.id = ?
  `;

  connection.query(query, [alumnoId], (error, resultado) => {
    if (error) {
      console.error('Error al obtener detalles del alumno: ', error);
      return;
    }
    res.render('editar', { alumno: resultado[0] });
  });
});

// Manejar solicitud POST para actualizar un alumno
app.post('/editar/:id', (req, res) => {
  const alumnoId = req.params.id;
  const nuevoNombre = req.body.nuevoNombre;
  const nuevaMateria = req.body.nuevaMateria; 
  const nuevaNota = req.body.nuevaNota;

  // Validar que el nombre del alumno no esté vacío y contenga solo letras y espacios
    if (!/^[a-zA-Z\s]+$/.test(nuevoNombre)) {
        console.error('Error: Nombre del alumno inválido');
        return res.status(400).send('Nombre del alumno inválido');
    }

    // Validar que la materia no esté vacía
    if (!nuevaMateria.trim()) {
        console.error('Error: Materia inválida');
        return res.status(400).send('Materia inválida');
    }

    // Validar que la nota sea un número entre 0 y 20
    if (isNaN(nuevaNota) || nuevaNota < 0 || nuevaNota > 20) {
        console.error('Error: Nota inválida');
        return res.status(400).send('Nota inválida');
    }

  const consulta = 'UPDATE alumnos SET nombre = ? WHERE id = ?';
  connection.query(consulta, [nuevoNombre, alumnoId], (error, results) => {
    if (error) {
      console.error('Error al actualizar el alumno: ', error);
      return;
    }
    
    // Actualiza la materia y la nota en la tabla de notas
    const queryNotas = 'UPDATE notas SET materia = ?, nota = ? WHERE alumno_id = ?';
    connection.query(queryNotas, [nuevaMateria, nuevaNota, alumnoId], (error, resultsNotas) => {
      if (error) {
        console.error('Error al actualizar la materia y la nota: ', error);
        return;
      }

      console.log('Alumno y notas actualizados exitosamente');
      res.redirect('/');
    });
  });
});

// Ruta para manejar la eliminación de un alumno
app.get('/eliminar/:id', (req, res) => {
  const alumnoId = req.params.id;

  // Eliminar primero notas relacionadas con el alumno 
  const consultaEliminarNotas = 'DELETE FROM notas WHERE alumno_id = ?';
  connection.query(consultaEliminarNotas, [alumnoId], (error, resultsEliminarNotas) => {
    if (error) {
      console.error('Error al eliminar las notas: ', error);
      return;
    }

    // Luego pasamos a eliminar al alumno
    const consultaEliminarAlumno = 'DELETE FROM alumnos WHERE id = ?';
    connection.query(consultaEliminarAlumno, [alumnoId], (error, resultsEliminarAlumno) => {
      if (error) {
        console.error('Error al eliminar el alumno: ', error);
        return;
      }
      console.log('Alumno eliminado exitosamente');
      res.redirect('/');
    });
  });
});

// Ruta para manejar la eliminación de un alumno
app.get('/eliminar/:id', (req, res) => {
  const alumnoId = req.params.id;
  const consulta = 'DELETE FROM alumnos WHERE id = ?';
  connection.query(consulta, [alumnoId], (error, results) => {
    if (error) {
      console.error('Error al eliminar el alumno: ', error);
      return;
    }
    console.log('Alumno eliminado exitosamente');
    res.redirect('/');
  });
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor en ejecución en http://localhost:${port}`);
});
