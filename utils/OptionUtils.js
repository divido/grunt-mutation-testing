/**
 * OptionUtils
 *
 * @author Jimi van der Woning
 */
'use strict';

var _ = require('lodash'),
    glob = require('glob'),
    log4js = require('log4js'),
    path = require('path');


// Placeholder function for when no explicit before, after, or test function is provided
function CALL_DONE(done) {
    done(true);
}

var DEFAULT_OPTIONS = {
    before: CALL_DONE,
    beforeEach: CALL_DONE,
    test: CALL_DONE,
    afterEach: CALL_DONE,
    after: CALL_DONE,

    basePath: '.',
    testFramework: 'karma',
    logLevel: 'INFO',
    maxReportedMutationLength: 80,
    mutateProductionCode: false
};

// By default, report only to the console, which takes no additional configuration
var DEFAULT_REPORTER = {
    console: true
};

var LOG_OPTIONS = {
    appenders: [
        {
            type: 'console',
            layout: {
                type: 'pattern',
                pattern: '%[(%d{ABSOLUTE}) %p [%c]:%] %m'
            }
        }
    ]
};

// By default, always ignore mutations of the 'use strict' keyword
var DEFAULT_IGNORE = /('use strict'|"use strict");/;


/**
 * @private
 * Check if all required options are set on the given opts object
 * @param opts the options object to check
 * @returns {String|null} indicator of all required options have been set or not. String with error message or null if no error was set
 */
function areRequiredOptionsSet(opts) {
    return  !opts.hasOwnProperty('code')  ? 'Options has no own code property' :
            !opts.hasOwnProperty('specs')  ? 'Options has no own specs property' :
            !opts.hasOwnProperty('mutate')  ? 'Options has no own mutate property' :
            opts.code.length === 0 ? 'Code property is empty' :
            opts.specs.length === 0 ? 'Specs property is empty' :
            opts.mutate.length === 0 ? 'Mutate property is empty' :
            null;
}

function ensureReportersConfig(opts) {
    // Only set the default reporter when no explicit reporter configuration is provided
    if(!opts.hasOwnProperty('reporters')) {
        opts.reporters = DEFAULT_REPORTER;
    }
}

function ensureIgnoreConfig(opts) {
    if(!opts.discardDefaultIgnore) {
        opts.ignore = opts.ignore ? [DEFAULT_IGNORE].concat(opts.ignore) : DEFAULT_IGNORE;
    }
}

/**
 * Prepend all given files with the provided basepath and expand all wildcards
 * @param files the files to expand
 * @param basePath the basepath from which the files should be expanded
 * @returns {Array} list of expanded files
 */
function expandFiles(files, basePath) {
    var expandedFiles = [];
    files = files ? _.isArray(files) ? files : [files] : [];

    _.forEach(files, function(fileName) {
        expandedFiles = _.union(
            expandedFiles,
            glob.sync(path.join(basePath, fileName), { dot: true, nodir: true })
        );
    });

    return expandedFiles;
}

/**
 * Get the options for a given mutationTest grunt task
 * @param grunt
 * @param task the grunt task
 * @returns {*} the found options, or [null] when not all required options have been set
 */
function getOptions(grunt, task) {
    var globalOpts = grunt.config(task.name).options;
    var localOpts = grunt.config([task.name, task.target]).options;
    var opts = _.merge({}, DEFAULT_OPTIONS, globalOpts, localOpts);

    // Set logging options
    log4js.setGlobalLogLevel(log4js.levels[opts.logLevel]);
    log4js.configure(LOG_OPTIONS);

    opts.code = expandFiles(opts.code, opts.basePath);
    opts.specs = expandFiles(opts.specs, opts.basePath);
    opts.mutate = expandFiles(opts.mutate, opts.basePath);

    if (opts.karma) {
        opts.karma.notIncluded = expandFiles(opts.karma.notIncluded, opts.basePath);
    }

    var requiredOptionsSetErr = areRequiredOptionsSet(opts);
    if(requiredOptionsSetErr !== null) {
        grunt.warn('Not all required options have been set properly. ' + requiredOptionsSetErr);
        return null;
    }

    ensureReportersConfig(opts);
    ensureIgnoreConfig(opts);

    return opts;
}

module.exports.getOptions = getOptions;
