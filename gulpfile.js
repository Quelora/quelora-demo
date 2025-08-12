//npx gulp
const gulp = require('gulp');
const concat = require('gulp-concat');
const cleanCSS = require('gulp-clean-css');

gulp.task('css', () => {
  return gulp.src([
      "css/animations.css",
      "css/community.css",
      "css/cropper.css",
      "css/emoji.css",
      "css/icons.css",
      "css/misc.css",
      "css/modal.css",
      "css/notifications.css",
      "css/player.css",
      "css/profile.css",
      "css/quelora.css",
      "css/responsive.css",
      "css/session.css",
      "css/settings.css",
      "css/toast.css",
      "css/variables.css"
    ])
    .pipe(concat('quelora.min.css'))
    .pipe(cleanCSS())
    .pipe(gulp.dest('js/quelora/dist'));
});

gulp.task('default', gulp.series('css'));