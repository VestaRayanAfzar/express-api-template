var gulp = require('gulp'),
    path = require('path'),
    ts = require('gulp-typescript'),
    map = require('gulp-sourcemaps');

module.exports = function (dir, setting) {

    gulp.task('ts:compile', function () {
        var tsFiles = [dir.src + '/**/*.ts', dir.typescriptLibrary + '/**/*.ts'],
            genSourceMap = !setting.production,
            stream = gulp.src(tsFiles);
        if (genSourceMap) stream = stream.pipe(map.init());
        var tsResult = stream.pipe(ts({
            target: 'ES5',
            module: 'commonjs',
            removeComments: true
        }));
        return genSourceMap ?
            tsResult.js.pipe(map.write()).pipe(gulp.dest(dir.buildServer)) :
            tsResult.js.pipe(gulp.dest(dir.buildServer));
    });

    gulp.task('server:watch', function () {
        return gulp.watch(dir.src + '/**/*', ['ts:compile']);
    });

    return {
        tasks: ['ts:compile'],
        watch: setting.production ? null : ['server:watch']
    };
};
