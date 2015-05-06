module.exports = function(grunt) {
  grunt.initConfig({

    jasmine_nodejs: {
      options: {
         specNameSuffix: ".specs.js", // also accepts an array
         helperNameSuffix: "Helpers.js",
         useHelpers: true,
         reporters: {
           console: {
             colors: true,
             cleanStack: 1,       // (0|false)|(1|true)|2|3
             verbosity: 3,        // (0|false)|1|2|(3|true)
             listStyle: "indent", // "flat"|"indent"
             activity: false
           }
         },
      },

      rabbus: {
        helpers: ["specs/helpers/**"],
        specs: ["specs/**/*.specs.js"]
      }
    },

    jshint: {
      rabbus: {
        src: ["sequence/**/*.js"],
        options: {
          jshintrc: ".jshintrc"
        }
      }
    },

    watch: {
      rabbus: {
        files: "sequence/**/*.js",
        tasks: ["specs"]
      },

      specs: {
        files: "specs/**/*.js",
        tasks: ["specs"]
      }
    }

  });

  grunt.loadNpmTasks("grunt-jasmine-nodejs");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-contrib-jshint");

  grunt.registerTask("specs", ["jshint", "jasmine_nodejs"]);
  grunt.registerTask("default", ["jshint", "watch"]);
};
