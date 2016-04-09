var path = require('path'),
    gulp = require('gulp'),
    server = require('gulp-develop-server'),
    root = path.join(__dirname, '..', '..'),
    serverDirectory = path.join(root, 'build');

/**
 * Serving Api server and restarting automatically when changes occurred.
 * The Api server will be listening on port 30xx which is mentioned in resources/compose-dev.yml file
 * The debug port is mapped to 33xx which is mentioned in resources/compose-dev.yml file
 */
gulp.task('default', function () {
    server.listen({path: serverDirectory + '/app.js', execArgv: ['--debug']});
    gulp.watch([serverDirectory + '/**/*.js', '!' + serverDirectory + '/static/**/*.js'], function () {
        server.restart();
    });
});

/**
 * Serving static files like uploaded files
 * The Static server will be listening on port 34xx which is mentioned in resources/compose-dev.yml file
 * The debug port is mapped to 35xx which is mentioned in resources/compose-dev.yml file
 */
gulp.task('static', function () {
    server.listen({path: serverDirectory + '/static/staticApp.js', execArgv: ['--debug']});
    gulp.watch(serverDirectory + '/static/**/*.js', function () {
        server.restart();
    });
});