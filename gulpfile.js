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

gulp.task('lint', () => gulp.src(['app/**/*.js', '.eslintrc.js', 'gulpfile.js', '!node_modules/**'])
  .pipe($.plumber())
  .pipe($.eslint({
    ignore: false,
  }))
  .pipe($.eslint.format())
  .pipe($.if(!browserSync.active, $.eslint.failAfterError())));

gulp.task('styles', () => gulp.src('app/scss/*.scss')
  .pipe($.plumber())
  .pipe($.if(dev, $.sourcemaps.init()))
  .pipe($.sass({
    outputStyle: dev ? 'expanded' : 'compressed',
  }).on('error', $.sass.logError))
  .pipe($.autoprefixer({
    browsers: ['last 2 versions'],
  }))
  .pipe($.rename({
    suffix: '.min',
  }))
  .pipe($.if(dev, $.sourcemaps.write('.')))
  .pipe(gulp.dest('dist/css'))
  .pipe(bs.stream({
    match: '**/*.css',
  })));

gulp.task('scripts', ['lint'], () => gulp.src('app/js/*.js')
  .pipe($.plumber())
  .pipe($.if(!dev, $.uglifyEs.default()))
  .pipe($.rename({
    suffix: '.min',
  }))
  .pipe(gulp.dest('dist/js'))
  .pipe(bs.stream()));

gulp.task('json', () => gulp.src('app/js/*.json')
  .pipe($.plumber())
  .pipe($.if(!dev, $.jsonminify()))
  .pipe(gulp.dest('dist/js')));

gulp.task('images', () => gulp.src('app/img/**/*')
  .pipe($.plumber())
  .pipe($.if(!dev, $.cache($.imagemin())))
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

  gulp.watch('app/scss/*.scss', ['styles']);
  gulp.watch('app/js/*.js', ['scripts']);
  gulp.watch('app/js/*.json', ['json']).on('change', bs.reload);
  gulp.watch('app/img/**/*', ['images']).on('change', bs.reload);
  gulp.watch('app/*.html', ['html']).on('change', bs.reload);
});

gulp.task('deploy', (callback) => {
  dev = false;

  runSequence('build', () => {
    const now = new Date();

    ghPages.publish('dist', {
      message: `Build at ${now.toISOString()}`,
    }, (err) => {
      if (err) throw err;

      callback();
    });
  });
});

gulp.task('default', ['serve']);
