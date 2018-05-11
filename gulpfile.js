const gulp = require('gulp');
const browserSync = require('browser-sync').create();

gulp.task('watch', () => {
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
