var gulp = require('gulp'),
    path = require('path'),
    fse = require('fs-extra');

var root = __dirname;
var dir = {
    root: root,
    resource: path.join(root, 'resources'),
    docker: path.join(root, 'resources/docker'),
    gulp: path.join(root, 'resources/gulp'),
    typescriptLibrary: path.join('resources/tsd'),
    src: path.join(root, 'src'),
    build: path.join(root, 'build'),
    buildServer: path.join(root, 'build/app/api')
};

var modules = ['ts'],
    tasks = [],
    watches = [],
    setting = {
        production: false
    };

for (var i = 0, il = modules.length; i < il; ++i) {
    var result = require(path.join(dir.gulp, modules[i]))(dir, setting);
    if (result.tasks) {
        tasks = tasks.concat(result.tasks);
    }
    if (result.watch) {
        watches = watches.concat(result.watch);
    }
}

gulp.task('init', function () {
    try {
        fse.removeSync(dir.build);
    } catch (e) {
        console.log('Unable to delete build directory');
    }
});

gulp.task('production', function () {
    setting.production = true;
});

gulp.task('default', ['init'].concat(tasks.concat(watches)));
gulp.task('deploy', ['init', 'production'].concat(tasks));