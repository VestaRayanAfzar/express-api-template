var path = require('path'),
    gulp = require('gulp'),
    server = require('gulp-develop-server'),
    root = path.join(__dirname, '../..'),
    serverDirectory = path.join(root, 'build/app/api');

/**
 * Serving Api server and restarting automatically when changes occurred.
 * The Api server and debugger will be listening on ports 90xx which are mentioned in resources/compose-dev.yml file
 */
gulp.task('default', function () {
    var delay = 500, timer;
    server.listen({path: serverDirectory + '/app.js', execArgv: ['--debug']});
    gulp.watch([serverDirectory + '/**/*.js', '!' + serverDirectory + '/static/**/*.js'], function () {
        clearTimeout(timer);
        timer = setTimeout(server.restart, delay);
    });
});