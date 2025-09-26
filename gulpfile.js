//npx gulp
const gulp = require('gulp');
const concat = require('gulp-concat');
const cleanCSS = require('gulp-clean-css');

gulp.task('css', () => {
  return gulp.src([
      "quelora/css/animations.css",
      "quelora/css/community.css",
      "quelora/css/cropper.css",
      "quelora/css/emoji.css",
      "quelora/css/icons.css",
      "quelora/css/misc.css",
      "quelora/css/modal.css",
      "quelora/css/notifications.css",
      "quelora/css/player.css",
      "quelora/css/profile.css",
      "quelora/css/quelora.css",
      "quelora/css/responsive.css",
      "quelora/css/session.css",
      "quelora/css/settings.css",
      "quelora/css/toast.css",
      "quelora/css/variables.css"
    ])
    .pipe(concat('quelora.min.css'))
    .pipe(cleanCSS())
    .pipe(gulp.dest('quelora/js/dist'));
});

gulp.task('default', gulp.series('css'));