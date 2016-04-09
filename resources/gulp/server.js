var gulp = require('gulp'),
    path = require('path'),
    fse = require('fs-extra'),
    ts = require('gulp-typescript'),
    map = require('gulp-sourcemaps');

module.exports = function (dir, setting) {

        try {
        fse.removeSync(dir.build);
        } catch (e) {
        console.log('Unable to delete build directory');
        }

    gulp.task('server:ts', function () {
        var tsFiles = [dir.src + '/**/*.ts'].concat(setting.production ? [] : [dir.typescriptLibrary + '/**/*.ts']),
            containerPath = dir.build + (setting.production ? '/src' : ''),
            genSourceMap = !setting.production,
            stream = gulp.src(tsFiles);
        if (genSourceMap) stream = stream.pipe(map.init());
        var tsResult = stream.pipe(ts({
            target: 'ES5',
            module: 'commonjs',
            removeComments: true
        }));
        return genSourceMap ?
            tsResult.js.pipe(map.write()).pipe(gulp.dest(containerPath)) :
            tsResult.js.pipe(gulp.dest(containerPath));
    });

    gulp.task('docker:compose', ['server:ts'], function (done) {
        if (setting.production) {
            var containerPath = dir.build + '/src';
            fse.copySync('package.json', containerPath + '/package.json');
            fse.copySync('resources/docker', dir.build);
            fse.renameSync(dir.build + '/compose-prod.yml', dir.build + '/docker-compose.yml');
            fse.removeSync(dir.build + '/compose-dev.yml');
            fse.renameSync(containerPath, dir.build + '/api/src');
        } else {
            fse.copySync(dir.docker + '/compose-dev.yml', 'docker-compose.yml');
        }
        done(null);
    });

    gulp.task('server:watch', function () {
        return gulp.watch(dir.src + '/**/*', ['server:ts']);
    });

    return {
        tasks: ['docker:compose'],
        watch: setting.production ? null : ['server:watch']
    };
};