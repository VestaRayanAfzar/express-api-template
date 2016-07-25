var gulp = require('gulp'),
    path = require('path'),
    ts = require('gulp-typescript'),
    map = require('gulp-sourcemaps'),
    fse = require('fs-extra');

module.exports = function (dir, setting) {

    gulp.task('ts:compile', function () {
        var tsFiles = [dir.src + '/**/*.ts', dir.typescriptLibrary + '/**/*.ts'];
        if (setting.production) {
            tsFiles.push('!' + dir.src + '/test/**');
        }
        var genSourceMap = !setting.production,
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

    gulp.task('ts:postCompile', ['ts:compile'], function () {
        if (setting.production) {
            //     findInFileAndReplace(dir.build + '/app/ServerApp.js', "this.app.use('/', routing)", "this.app.use('/vesta/', routing)");
            findInFileAndReplace(dir.build + '/app/ServerApp.js', "this.app.use('/asset',", "this.app.use('/api/asset',");
        }
    });

    gulp.task('server:watch', function () {
        return gulp.watch(dir.src + '/**/*', ['ts:compile']);
    });

    return {
        tasks: ['ts:postCompile'],
        watch: setting.production ? null : ['server:watch']
    };

    function findInFileAndReplace(file, search, replace) {
        try {
            if (!fse.existsSync(file)) return;
            var content = fse.readFileSync(file, {encoding: 'utf8'});
            content = content.replace(search, replace);
            fse.writeFileSync(file, content);
        } catch (e) {
            console.error(e.message);
        }
    }
};
