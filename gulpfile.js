/*
 * This gulpfile.js was based upon:
 * https://browsersync.io/docs/gulp#gulp-sass-css
 * https://github.com/yeoman/generator-webapp/blob/v3.0.1/app/templates/gulpfile.js
 */

const gulp = require('gulp');
const gulpLoadPlugins = require('gulp-load-plugins');
const browserSync = require('browser-sync');
const del = require('del');
const runSequence = require('run-sequence');
const ghPages = require('gh-pages');

const $ = gulpLoadPlugins();
const bs = browserSync.create();

let dev = true;

gulp.task('styles', () => gulp.src('app/scss/*.scss')
  .pipe($.plumber())
  .pipe($.if(dev, $.sourcemaps.init()))
  .pipe($.sass({
    outputStyle: dev ? 'expanded' : 'compressed',
  }).on('error', $.sass.logError))
  .pipe($.autoprefixer({
    browsers: ['last 2 versions'],
  }))
  .pipe($.if(dev, $.sourcemaps.write('.')))
  .pipe(gulp.dest('dist/css'))
  .pipe(bs.stream()));

gulp.task('scripts', () => gulp.src('app/js/*.js')
  .pipe($.plumber())
  .pipe($.if(!dev, $.uglifyEs.default()))
  .pipe(gulp.dest('dist/js'))
  .pipe(bs.stream()));

gulp.task('json', () => gulp.src('app/js/*.json')
  .pipe($.plumber())
  .pipe($.if(!dev, $.jsonminify()))
  .pipe(gulp.dest('dist/js')));

gulp.task('images', () => gulp.src('app/img/**/*')
  .pipe($.plumber())
  .pipe($.if(!dev, $.imagemin()))
  .pipe(gulp.dest('dist/img')));

gulp.task('html', () => gulp.src('app/*.html')
  .pipe($.plumber())
  .pipe($.if(!dev, $.htmlmin({
    collapseWhitespace: true,
  })))
  .pipe(gulp.dest('dist')));

gulp.task('clean', () => del('dist'));

gulp.task('build', (cb) => {
  runSequence('clean', ['styles', 'scripts', 'json', 'images', 'html'], () => {
    cb();
  });
});

gulp.task('serve', ['build'], () => {
  bs.init({
    server: 'dist',
  });

  gulp.watch([
    'app/*.html',
    'app/img/**/*',
    'app/js/*.json',
  ]).on('change', bs.reload);

  gulp.watch('app/scss/*.scss', ['styles']);
  gulp.watch('app/js/*.js', ['scripts']);
});

gulp.task('deploy', (callback) => {
  dev = false;

  runSequence('build', () => {
    ghPages.publish('dist', (err) => {
      if (err) throw console.error(err);

      callback();
    });
  });
});

gulp.task('default', ['serve']);
