const gulp = require('gulp');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');

const browserSync = require('browser-sync').create();

gulp.task('sass', () => {
  gulp.src('scss/*.scss')
    .pipe(sass({ outputStyle: 'compressed' }))
    .pipe(autoprefixer({ browsers: ['last 2 versions'] }))
    .pipe(gulp.dest('css'));
});

gulp.task('browser-sync', () => {
  browserSync.init({
    server: {
      baseDir: './',
      routes: {
        '/node_modules': 'node_modules',
      },
    },
    watch: true,
  });
});

gulp.task('default', ['sass', 'browser-sync'], () => {
  gulp.watch('scss/*.scss', ['sass']);
});
