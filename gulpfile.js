var gulp = require("gulp");
var ts = require("gulp-typescript");
var clean = require("gulp-clean");
var child = require("child_process");
var moment = require("moment");
var fs = require("fs-extra");
let uglify = require("gulp-uglify-es").default;

var paths = {
  dist: "dist",
  logs: "logs/*",
  tsSources: "src/**/*.ts"
};

var server;
var serverLog = fs.createWriteStream(
  "./logs/" + moment().format("YYYY-MM-DD HH-mm") + ".log",
  { flags: "a" }
);

var run = function() {
  if (server) if (server.kill) server.kill();

  server = child.spawn("node", ["dist/app.js"], { stdio: "inherit" });
};

gulp.task("cleanLogs", function() {
  return gulp.src(paths.logs, { read: false }).pipe(clean());
});

// clean dist folder
gulp.task("clean", function(cb) {
  return gulp.src(paths.dist, { read: false }).pipe(clean());
});

gulp.task("prod", function() {
  var buildPath = "../builds/serendip-business-api/";

  fs.emptyDirSync(buildPath);

  [
    ".env",
    "files",
    "package.json",
    "package-lock.json",
    "liara.json",
    "Dockerfile",
    "README.md"
  ].forEach(file => {
    fs.copySync(file, buildPath + file);
  });

  return gulp
    .src("dist/**/*.js")
    .pipe(gulp.dest(buildPath + "dist/"));
});

// compile typescripts
gulp.task("ts", function() {
  return gulp
    .src(paths.tsSources)
    .pipe(
      ts({
        noImplicitAny: false,
        target: "es2017",
        sourceMap: true,
        module: "CommonJS",
        baseUrl: ".",
        paths: {
          "*": ["node_modules/*", "src/types/*"]
        }
      })
    )
    .pipe(gulp.dest(paths.dist));
});

// whats typescripts , compile and then run
gulp.watch(paths.tsSources, ["run"]);

// clean before build
gulp.task("preBuild", ["clean"]);

// clean and compile
gulp.task("build", ["preBuild", "ts"], function() {});

// compile and run node process
gulp.task("run", ["ts"], run);

gulp.task("default", ["build", "run"], function() {});
