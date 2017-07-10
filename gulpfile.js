/*cnpm install --save-dev gulp gulp-util bower gulp-concat gulp-sass gulp-minify-css gulp-rename shelljs gulp-autoprefixer gulp-uglify gulp-useref gulp-if del gulp-imagemin gulp-cache*/
var gulp = require('gulp');
var gutil = require('gulp-util');
var bower = require('bower');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var sh = require('shelljs');
var autoprefixer = require('gulp-autoprefixer');
var uglify = require('gulp-uglify');
var useref = require('gulp-useref');
var gulpIf = require('gulp-if');
var del = require('del');
var imagemin = require('gulp-imagemin');
var cache = require('gulp-cache');

var paths = {
  sass: ['./scss/**/*.scss']
};

gulp.task('default', ['mergeMiniJsCss','minifyCss','minifyJs','minImages','copyHtml','copyFonts','copyLib']);

/* 自动添加css兼容前缀任务*/
gulp.task('autoprefixer', function () {
  gulp.src(['./www/css/**/*.css','!./www/css/ionic.app.css','!./www/css/ionic.app.min.css'])
    .pipe(autoprefixer({
      browsers: ['last 2 versions', 'Android >= 4.0'],//last 2 versions: 主流浏览器的最新两个版本   Android for Android WebView.
      cascade: true, //是否美化属性值 默认：true 像这样：
      //-webkit-transform: rotate(45deg);
      //        transform: rotate(45deg);
      remove: false //是否去掉不必要的前缀 默认：true
    }))
    .pipe(gulp.dest('./www/css'));
});

/*  拼接合并压缩html中的js css减少http请求和大小
 css link前后添加   <!-- build:css css/all.css -->     <!-- endbuild -->
 js script  前后添加  <!-- build:js js/all.js -->  <!-- endbuild -->*/
gulp.task('mergeMiniJsCss', function () {
  return gulp.src(['./www/index.html','./www/manifest.json','./www/service-worker.js'])
    .pipe(useref())
    // 当是css文件时候压缩
    .pipe(gulpIf('*.css', minifyCss()))
    // 当是Javascript文件时候压缩
    .pipe(gulpIf('*.js', uglify({
        mangle: false //不混淆变量名
      }
    )))
    .pipe(gulp.dest('./borecycle/'));
});

/*压缩css*/
gulp.task('minifyCss', function () {
  return gulp.src('./www/css/**/*.css')      //压缩的文件
    .pipe(minifyCss())    //执行压缩
    .pipe(gulp.dest('./borecycle/css/'));  //输出文件夹
});

/*压缩js*/
gulp.task('minifyJs', function () {
  return gulp.src('./www/js/**/*.js/')
    .pipe(uglify())    //压缩
    .pipe(gulp.dest('./borecycle/js/'));  //输出
});

/*压缩图片*/
gulp.task('minImages', function(){
  return gulp.src('./www/img/**/*.+(png|jpg|gif|svg)')
    .pipe(cache(imagemin({ optimizationLevel: 3, progressive: true, interlaced: true })))
    .pipe(gulp.dest('./borecycle/img/'));
});

/*复制html*/
gulp.task('copyHtml', function () {
  return gulp.src('./www/templates/**')      //复制的文件
    .pipe(gulp.dest('./borecycle/templates/'));  //输出文件夹
});

/*复制fonts*/
gulp.task('copyFonts', function () {
  return gulp.src('./www/fonts/**')      //复制的文件
    .pipe(minifyCss())    //执行压缩
    .pipe(gulp.dest('./borecycle/fonts/'));  //输出文件夹
});

/*复制Lib*/
gulp.task('copyLib', function () {
  return gulp.src('./www/lib/**')      //复制的文件
    .pipe(gulp.dest('./borecycle/lib/'));  //输出文件夹
});

/*执行压缩前，先删除文件夹里的内容*/
gulp.task('clean', function (cb) {
  del(['./borecycle/css', './borecycle/js'], cb);
});

gulp.task('sass', function(done) {
  gulp.src('./scss/ionic.app.scss')
    .pipe(sass())
    .on('error', sass.logError)
    .pipe(gulp.dest('./www/css/'))
    .pipe(minifyCss({
      keepSpecialComments: 0
    }))
    .pipe(rename({ extname: '.min.css' }))
    .pipe(gulp.dest('./www/css/'))
    .on('end', done);
});

gulp.task('watch', function() {
  gulp.watch(paths.sass, ['sass']);
});

gulp.task('install', ['git-check'], function() {
  return bower.commands.install()
    .on('log', function(data) {
      gutil.log('bower', gutil.colors.cyan(data.id), data.message);
    });
});

gulp.task('git-check', function(done) {
  if (!sh.which('git')) {
    console.log(
      '  ' + gutil.colors.red('Git is not installed.'),
      '\n  Git, the version control system, is required to download Ionic.',
      '\n  Download git here:', gutil.colors.cyan('http://git-scm.com/downloads') + '.',
      '\n  Once git is installed, run \'' + gutil.colors.cyan('gulp install') + '\' again.'
    );
    process.exit(1);
  }
  done();
});
