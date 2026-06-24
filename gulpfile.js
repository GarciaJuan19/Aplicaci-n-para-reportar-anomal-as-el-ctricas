const { src, dest, watch, series } = require('gulp');
const sassCompiler = require('sass');
const gulpSass = require('gulp-sass');
const sourcemaps = require('gulp-sourcemaps');
const rename = require('gulp-rename');
const path = require('path');

const sass = gulpSass(sassCompiler);

// Tarea para compilar SASS utilizando la nueva ruta dentro de la carpeta /scss
function compileSass() {
    
    const entrada = path.resolve(__dirname, 'scss', 'main.scss');
    const salida = path.resolve(__dirname, 'css');

    return src(entrada)
        .pipe(sourcemaps.init())
        .pipe(sass({ outputStyle: 'expanded' }).on('error', sass.logError))
        .pipe(rename('style.css'))
        .pipe(sourcemaps.write('.'))
        .pipe(dest(salida));
}


function watchFiles(done) {
    
    const rutaAObservar = path.resolve(__dirname, 'scss', '**/*.scss');
    
    
    const watcher = watch(rutaAObservar, { usePolling: true, interval: 500 }, compileSass);

    // Manejo de eventos para ver en consola qué parcial se modificó
    watcher.on('change', function(filePath) {
        console.log(`Archivo modificado: ${path.basename(filePath)} -> Recompilando...`);
    });

    done(); 
}

exports.compileSass = compileSass;
exports.default = series(compileSass, watchFiles);