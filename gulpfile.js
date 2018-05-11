const gulp = require('gulp');
const sass = require('gulp-sass');

const browserSync = require('browser-sync').create();

gulp.task('sass', () => {
  gulp.src('scss/main.scss')
    .pipe(sass({ includePaths: ['scss'] }))
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
