//npx gulp
const gulp = require('gulp');
const concat = require('gulp-concat');
const cleanCSS = require('gulp-clean-css');

gulp.task('css', () => {
  return gulp.src([
    'quelora/css/*.css',
    '!quelora/dist/**'
  ])
    .pipe(concat('quelora.min.css'))
    .pipe(cleanCSS())
    .pipe(gulp.dest('quelora/css/dist')); 
});

gulp.task('default', gulp.series('css'));