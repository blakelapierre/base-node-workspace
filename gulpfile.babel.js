import child_process from 'child_process';
import events from 'events';

const browserify = require('browserify'),
      gulp = require('gulp'),
      minimist = require('minimist'),
      source = require('vinyl-source-stream');

const {
  babel,
  cached,
  clean,
  concat,
  jshint,
  pipe,
  print,
  run,
  sequence,
  sourcemaps,
  tasks,
  traceur,
  uglify
} = require('gulp-load-plugins')();

const args = minimist(process.argv.slice(2));

const result = tasks(gulp, require);
if (typeof result === 'string') console.log(result);

const p = name => print(file => console.log(name, file));

gulp.task('default', ['build']);

gulp.task('build', sequence('clean', 'runtime'));
gulp.task('package', ['uglify'], () => console.log(`App written to ${paths.package}/app.js !`));

gulp.task('run', () => run(`node ${paths.dist}/index.js ${args.args || ''}`).exec());
gulp.task('test', () => run(`node ${paths.dist}/tests/index.js ${args.args || ''}`).exec());

gulp.task('watch', ['runtime'], () => gulp.watch(paths.script, ['runtime']));
gulp.task('dev', ['start_dev'], project => gulp.watch(paths.scripts, ['start_dev']));
gulp.task('dev:test', ['start_dev:test'], project => gulp.watch(paths.scripts, ['start_dev:test']));

gulp.task('transpile', ['jshint'],
  () => pipe([
    gulp.src(paths.scripts)
    ,cached('transpile')
    ,p('transpile')
    ,sourcemaps.init()
    // ,babel()
    ,traceur({modules: 'commonjs', asyncGenerators: true, forOn: true, asyncFunctions: true})
    ,sourcemaps.write('.')
    ,gulp.dest(paths.dist)
  ])
  .on('error', function(e) { console.log(e); }));

gulp.task('runtime', ['transpile'],
  () => pipe([
    gulp.src([traceur.RUNTIME_PATH])
    ,p('runtime')
    ,concat('traceur-runtime.js')
    ,gulp.dest(paths.dist)
  ])
  .on('error', function(e) { console.log(e); }));

gulp.task('start_dev', ['runtime', 'copy', 'terminate'], launchAndWatch('index.js'));
gulp.task('start_dev:test', ['runtime', 'copy', 'terminate'], launchAndWatch('tests/index.js'));

let devChild = {process: undefined};
function launchAndWatch(file) {
  return () => {
    const p = devChild.process = child_process.fork(`${file}`, {cwd: `${process.cwd()}/${paths.dist}`});

    devChild.doneFn = () => {
      const {emitter} = devChild;
      if (emitter) emitter.emit('end');
    };

    p.on('exit', (code, signal) => {
      devChild.process = undefined;
      if (devChild.terminateFn) devChild.terminateFn();
    });

    devChild.emitter = new events.EventEmitter();

    return devChild.emitter;
  };
}

gulp.task('terminate',
  done => {
    const {process, doneFn} = devChild;

    if (process) {
      devChild.terminateFn = () => {
        console.log('terminated');
        done();
      };
      doneFn();
      process.kill();
    }
    else done();
  });

gulp.task('copy',
  () => pipe([
    gulp.src(paths.others)
    ,p('copy')
    ,gulp.dest(paths.dist)
  ]));

gulp.task('uglify', ['bundle'],
  () => pipe([
    gulp.src([`./${paths.package}/app.js`])
    ,p('uglify')
    ,uglify()
    ,gulp.dest(paths.package)
  ]));

gulp.task('bundle', ['runtime'],
  () => pipe([
    browserify({
      entries: [`./${paths.dist}/index.js`],
      builtins: false,
      detectGlobals: false
    }).bundle()
    ,source('app.js')
    ,p('bundle')
    ,gulp.dest(paths.package)
  ]));

gulp.task('jshint',
  () => pipe([
    gulp.src(paths.scripts)
    ,cached('jshint')
    ,p('jshint')
    ,jshint()
    ,jshint.reporter('jshint-stylish')
    ,jshint.reporter('fail')
  ]));

gulp.task('clean',
  () => pipe([
    gulp.src(paths.dist, {read: false})
    ,clean()
  ]));

console.log(process.argv);

const paths = (function(base) {
  return {
    scripts: [`${base}/src/**/*.js`],
    others: [`${base}/src/**/*`, `!${base}/src/**/*.js`],
    dist: `${base}/.dist`,
    package: `${base}/.package`,
    project: base
  };
})(`./projects/${process.argv[4]}` || '.');
