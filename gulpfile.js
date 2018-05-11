// Largely taken from https://browsersync.io/docs/gulp#gulp-sass-css

// gulp + plugins
const gulp = require('gulp');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');

// browser-sync
const browserSync = require('browser-sync').create();

gulp.task('sass', () => gulp.src('app/scss/*.scss')
  .pipe(sass({ outputStyle: 'compressed' }))
  .pipe(autoprefixer({ browsers: ['last 2 versions'] }))
  .pipe(gulp.dest('app/css'))
  .pipe(browserSync.stream()));

gulp.task('serve', ['sass'], () => {
  browserSync.init({
    server: 'app',
  });

  gulp.watch('app/scss/*.scss', ['sass']);
  gulp.watch('app/*.html').on('change', browserSync.reload);
});

gulp.task('default', ['serve']);
