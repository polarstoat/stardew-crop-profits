/**
 * @see https://github.com/yeoman/generator-webapp/blob/v3.0.1/app/templates/gulpfile.js
 * @see https://browsersync.io/docs/gulp#gulp-sass-css
 */

// Modules
const gulp = require('gulp');
const gulpLoadPlugins = require('gulp-load-plugins');
const browserSync = require('browser-sync');
const del = require('del');
const runSequence = require('run-sequence');
const ghPages = require('gh-pages');

// Instances of modules
const $ = gulpLoadPlugins();
const uglify = $.uglifyEs.default;
const server = browserSync.create();

// Set 'dev' to correspond to the NODE_ENV environment variable, defaulting to true
let dev = process.env.NODE_ENV !== 'production';

/**
 * Compile Sass, autoprefix, generate sourcemaps if in dev mode, and reload Browsersync server
 * Gulp plumber used to handle errors
 * @see https://www.npmjs.com/package/gulp-plumber
 * @see https://www.npmjs.com/package/gulp-sass
 * @see https://www.npmjs.com/package/gulp-autoprefixer
 * @see https://www.npmjs.com/package/gulp-sourcemaps
 */
gulp.task('styles', () => gulp.src('app/scss/*.scss')
  .pipe($.plumber())
  .pipe($.if(dev, $.sourcemaps.init()))
  .pipe($.sass({
    outputStyle: 'expanded',
  }).on('error', $.sass.logError))
  .pipe($.autoprefixer({
    browsers: ['last 2 versions'],
    cascade: false,
  }))
  .pipe($.if(dev, $.sourcemaps.write('.')))
  .pipe(gulp.dest('.tmp/css'))
  .pipe(server.stream({
    match: '**/*.css',
  })));

/**
 * Currently only copies JS to .tmp/ but will make adding Babel easy
 * @see https://www.npmjs.com/package/gulp-plumber
 */
gulp.task('scripts', () => gulp.src('app/js/*.js')
  .pipe($.plumber())
  .pipe(gulp.dest('.tmp/js'))
  .pipe(server.stream()));

/**
 * Clean generated folders .tmp/ and dist/
 * @see https://www.npmjs.com/package/del
 */
gulp.task('clean', () => del(['.tmp', 'dist']));

/**
 * Main development task, serves the site using Browsersync and watches for changes
 * @see https://browsersync.io/docs/api#api-init
 * @see https://browsersync.io/docs/options
 */
gulp.task('serve', () => {
  runSequence('clean', ['styles', 'scripts'], () => {
    server.init({
      server: ['.tmp', 'app'],
    });

    gulp.watch(['app/*.html', 'app/img/**/*', 'app/js/*.json']).on('change', server.reload);

    gulp.watch('app/scss/*.scss', ['styles']);
    gulp.watch('app/js/*.js', ['scripts']);
  });
});

/**
 * Currently only an alias for lint:js, but will make adding Sass linting easy
 */
gulp.task('lint', ['lint:js']);

/**
 * Lint JavaScript using ESLint
 * @see https://www.npmjs.com/package/gulp-eslint
 * @see https://eslint.org
 */
gulp.task('lint:js', () => gulp.src(['app/**/*.js', '.eslintrc.js', 'gulpfile.js', '!node_modules/**'])
  .pipe($.eslint({
    ignore: false,
  }))
  .pipe($.eslint.format())
  .pipe($.eslint.failAfterError()));

/**
 * Minify JSON
 * @todo Use minified JSON in the source files so this task can be deleted
 * @see https://www.npmjs.com/package/gulp-jsonminify
 */
gulp.task('json', () => gulp.src('app/js/*.json')
  .pipe($.jsonminify())
  .pipe(gulp.dest('dist/js')));

/**
 * Losslessly compress images
 * @see https://www.npmjs.com/package/gulp-imagemin
 * @see https://www.npmjs.com/package/imagemin
 */
gulp.task('images', () => gulp.src('app/img/**/*')
  .pipe($.cache($.imagemin()))
  .pipe(gulp.dest('dist/img')));

/**
 * Parse HTML build blocks
 * @see https://www.npmjs.com/package/gulp-useref
 */
gulp.task('html', ['styles', 'scripts'], () => gulp.src('app/*.html')
  .pipe($.useref({
    searchPath: ['.tmp', 'app', '.'],
  }))
  .pipe($.if(/\.js$/, uglify()))
  .pipe($.if(/\.css$/, $.cssnano({
    safe: true,
    autoprefixer: false,
  })))
  .pipe($.if(/\.html$/, $.htmlmin({
    collapseWhitespace: true,
  })))
  .pipe(gulp.dest('dist')));

/**
 * Build dist/ and display the total project file size after GZIP compression
 * @see https://www.npmjs.com/package/gulp-size
 */
gulp.task('build', ['lint', 'html', 'images', 'json'], () => gulp.src('dist/**/*')
  .pipe($.size({
    title: 'build',
    gzip: true,
  })));

/**
 * Serve distribution site, for previewing before deploy
 * @see https://browsersync.io/docs/api#api-init
 * @see https://browsersync.io/docs/options
 */
gulp.task('serve:dist', ['clean'], () => {
  dev = false;

  runSequence('build', () => {
    server.init({
      server: 'dist',
      notify: false,
    });
  });
});

/**
 * Deploy to GitHub Pages, note that gh-pages is used in favour of gulp-gh-pages as the latter
 * is unmaintained and less elegant
 * @see https://www.npmjs.com/package/gh-pages
 */
gulp.task('deploy', ['clean'], (callback) => {
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
