var gulp = require('gulp');
var git = require('gulp-git');
var jsdoc = require('gulp-jsdoc3');
const mocha = require('gulp-mocha');

gulp.task('default', function() {
    // place code for your default task here
    //gulp.start('git-pull')
    gulp.start('doc')
});

gulp.task('git-pull', function(){
    git.pull('origin', 'master', {args: '--rebase'}, function (err) {
        if (err) throw err;
    });
});

gulp.task('doc', function (cb) {
    var config = require('./jsdoc/conf.json');
    gulp.src(['README.md'], {read: false})
        .pipe(jsdoc(config, cb));
});

gulp.task('test', () => 
    gulp.src('./resman/unit-tests/*.js', {read: false})
        // gulp-mocha needs filepaths so you can't have any plugins before it
        .pipe(mocha({reporter : 'mocha-teamcity-reporter'}))
);