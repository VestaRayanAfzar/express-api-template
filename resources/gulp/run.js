var path = require('path'),
    gulp = require('gulp'),
    server = require('gulp-develop-server'),
    root = path.join(__dirname, '..', '..'),
    serverDirectory = path.join(root, 'build');

gulp.task('default', function () {
    server.listen({path: serverDirectory + '/app.js', execArgv: ['--debug']});
    gulp.watch(serverDirectory + '/**/*.js', function () {
        server.restart();
    });
});