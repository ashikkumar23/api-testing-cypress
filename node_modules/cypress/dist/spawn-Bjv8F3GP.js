'use strict';

var xvfb = require('./xvfb-D9xcxM5q.js');
var _ = require('lodash');
var os = require('os');
var cp = require('child_process');
var path = require('path');
var Debug = require('debug');
var chalk = require('chalk');
var listr2 = require('listr2');
var commonTags = require('common-tags');
var Bluebird = require('bluebird');
var logSymbols = require('log-symbols');
var figures = require('figures');
var cliCursor = require('cli-cursor');
var dayjs = require('dayjs');
var readline = require('readline');
var process$1 = require('process');

// Vendored from @cypress/listr-verbose-renderer
const formattedLog = (options, output) => {
    const timestamp = dayjs().format(options.dateFormat);
    // eslint-disable-next-line no-console
    console.log(`${chalk.dim(`[${timestamp}]`)} ${output}`);
};
const renderHelper = (task, event, options) => {
    const log = formattedLog.bind(undefined, options);
    if (event.type === 'STATE') {
        const message = task.isPending() ? 'started' : task.state;
        log(`${task.title} [${message}]`);
        if (task.isSkipped() && task.output) {
            log(`${figures.arrowRight} ${task.output}`);
        }
    }
    else if (event.type === 'TITLE') {
        log(`${task.title} [title changed]`);
    }
};
const render = (tasks, options) => {
    for (const task of tasks) {
        task.subscribe((event) => {
            if (event.type === 'SUBTASKS') {
                render(task.subtasks, options);
                return;
            }
            renderHelper(task, event, options);
        }, (err) => {
            // eslint-disable-next-line no-console
            console.log(err);
        });
    }
};
class VerboseRenderer {
    constructor(tasks, options) {
        this._tasks = tasks;
        this._options = Object.assign({
            dateFormat: 'HH:mm:ss',
        }, options);
    }
    static get nonTTY() {
        return true;
    }
    render() {
        cliCursor.hide();
        render(this._tasks, this._options);
    }
    end() {
        cliCursor.show();
    }
}

const debug$1 = Debug('cypress:cli');
const verifyTestRunnerTimeoutMs = () => {
    const verifyTimeout = +((xvfb.util === null || xvfb.util === void 0 ? void 0 : xvfb.util.getEnv('CYPRESS_VERIFY_TIMEOUT')) || 'NaN');
    if (_.isNumber(verifyTimeout) && !_.isNaN(verifyTimeout)) {
        return verifyTimeout;
    }
    return 30000;
};
const checkExecutable = (binaryDir) => xvfb.__awaiter(void 0, void 0, void 0, function* () {
    const executable = xvfb.stateModule.getPathToExecutable(binaryDir);
    debug$1('checking if executable exists', executable);
    try {
        const isExecutable = yield xvfb.util.isExecutableAsync(executable);
        debug$1('Binary is executable? :', isExecutable);
        if (!isExecutable) {
            return xvfb.throwFormErrorText(xvfb.errors.binaryNotExecutable(executable))();
        }
    }
    catch (err) {
        if (err.code === 'ENOENT') {
            if (xvfb.util.isCi()) {
                return xvfb.throwFormErrorText(xvfb.errors.notInstalledCI(executable))();
            }
            return xvfb.throwFormErrorText(xvfb.errors.missingApp(binaryDir))(commonTags.stripIndent `
        Cypress executable not found at: ${chalk.cyan(executable)}
      `);
        }
        throw err;
    }
});
const runSmokeTest = (binaryDir, options) => {
    let executable = xvfb.stateModule.getPathToExecutable(binaryDir);
    const needsXvfb = xvfb.xvfb.isNeeded();
    debug$1('needs Xvfb?', needsXvfb);
    /**
     * Spawn Cypress running smoke test to check if all operating system
     * dependencies are good.
     */
    const spawn = (linuxWithDisplayEnv) => xvfb.__awaiter(void 0, void 0, void 0, function* () {
        const random = _.random(0, 1000);
        const args = ['--smoke-test', `--ping=${random}`];
        if (needsSandbox()) {
            // electron requires --no-sandbox to run as root
            debug$1('disabling Electron sandbox');
            args.unshift('--no-sandbox');
        }
        if (options.dev) {
            executable = 'node';
            const startScriptPath = xvfb.relativeToRepoRoot('scripts/start.js');
            if (!startScriptPath) {
                throw new Error(`Cypress start script (scripts/start.js) not found in parent directory of ${__dirname}`);
            }
            args.unshift(startScriptPath);
        }
        const smokeTestCommand = `${executable} ${args.join(' ')}`;
        debug$1('running smoke test');
        debug$1('using Cypress executable %s', executable);
        debug$1('smoke test command:', smokeTestCommand);
        debug$1('smoke test timeout %d ms', options.smokeTestTimeout);
        const stdioOptions = _.extend({}, {
            env: Object.assign(Object.assign({}, process.env), { FORCE_COLOR: '0' }),
            timeout: options.smokeTestTimeout,
        });
        try {
            const result = yield xvfb.util.exec(executable, args, stdioOptions);
            // TODO: when execa > 1.1 is released
            // change this to `result.all` for both stderr and stdout
            // use lodash to be robust during tests against null result or missing stdout
            const smokeTestStdout = _.get(result, 'stdout', '');
            debug$1('smoke test stdout "%s"', smokeTestStdout);
            if (!xvfb.util.stdoutLineMatches(String(random), smokeTestStdout)) {
                debug$1('Smoke test failed because could not find %d in:', random, result);
                const smokeTestStderr = _.get(result, 'stderr', '');
                const errorText = smokeTestStderr || smokeTestStdout;
                return xvfb.throwFormErrorText(xvfb.errors.smokeTestFailure(smokeTestCommand, false))(errorText);
            }
        }
        catch (err) {
            debug$1('Smoke test failed:', err);
            let errMessage = err.stderr || err.message;
            debug$1('error message:', errMessage);
            if (err.timedOut) {
                debug$1('error timedOut is true');
                return xvfb.throwFormErrorText(xvfb.errors.smokeTestFailure(smokeTestCommand, true))(errMessage);
            }
            if (linuxWithDisplayEnv && xvfb.util.isBrokenGtkDisplay(errMessage)) {
                xvfb.util.logBrokenGtkDisplayWarning();
                return xvfb.throwFormErrorText(xvfb.errors.invalidSmokeTestDisplayError)(errMessage);
            }
            return xvfb.throwFormErrorText(xvfb.errors.missingDependency)(errMessage);
        }
    });
    const spawnInXvfb = (linuxWithDisplayEnv) => xvfb.__awaiter(void 0, void 0, void 0, function* () {
        yield xvfb.xvfb.start();
        return spawn(linuxWithDisplayEnv || false).finally(() => xvfb.__awaiter(void 0, void 0, void 0, function* () {
            yield xvfb.xvfb.stop();
        }));
    });
    const userFriendlySpawn = (linuxWithDisplayEnv) => xvfb.__awaiter(void 0, void 0, void 0, function* () {
        debug$1('spawning, should retry on display problem?', Boolean(linuxWithDisplayEnv));
        try {
            yield spawn(linuxWithDisplayEnv);
        }
        catch (err) {
            if (err.code === 'INVALID_SMOKE_TEST_DISPLAY_ERROR') {
                return spawnInXvfb(linuxWithDisplayEnv);
            }
            throw err;
        }
    });
    if (needsXvfb) {
        return spawnInXvfb();
    }
    // if we are on linux and there's already a DISPLAY
    // set, then we may need to rerun cypress after
    // spawning our own Xvfb server
    const linuxWithDisplayEnv = xvfb.util.isPossibleLinuxWithIncorrectDisplay();
    return userFriendlySpawn(linuxWithDisplayEnv);
};
function testBinary(version, binaryDir, options) {
    debug$1('running binary verification check', version);
    // if running from 'cypress verify', don't print this message
    if (!options.force) {
        xvfb.loggerModule.log(commonTags.stripIndent `
    It looks like this is your first time using Cypress: ${chalk.cyan(version)}
    `);
    }
    xvfb.loggerModule.log();
    // if we are running in CI then use
    // the verbose renderer else use
    // the default
    let renderer = xvfb.util.isCi() ? VerboseRenderer : 'default';
    // NOTE: under test we set the listr renderer to 'silent' in order to get deterministic snapshots
    if (xvfb.loggerModule.logLevel() === 'silent' || options.listrRenderer)
        renderer = 'silent';
    const rendererOptions = {
        renderer,
    };
    const tasks = new listr2.Listr([
        {
            title: xvfb.util.titleize('Verifying Cypress can run', chalk.gray(binaryDir)),
            task: (ctx, task) => xvfb.__awaiter(this, void 0, void 0, function* () {
                debug$1('clearing out the verified version');
                yield xvfb.stateModule.clearBinaryStateAsync(binaryDir);
                yield Promise.all([
                    runSmokeTest(binaryDir, options),
                    Bluebird.delay(1500), // good user experience
                ]);
                debug$1('write verified: true');
                yield xvfb.stateModule.writeBinaryVerifiedAsync(true, binaryDir);
                xvfb.util.setTaskTitle(task, xvfb.util.titleize(chalk.green('Verified Cypress!'), chalk.gray(binaryDir)), rendererOptions.renderer);
            }),
        },
    ], rendererOptions);
    return tasks.run();
}
const maybeVerify = (installedVersion, binaryDir, options) => xvfb.__awaiter(void 0, void 0, void 0, function* () {
    const isVerified = yield xvfb.stateModule.getBinaryVerifiedAsync(binaryDir);
    debug$1('is Verified ?', isVerified);
    let shouldVerify = !isVerified;
    // force verify if options.force
    if (options.force) {
        debug$1('force verify');
        shouldVerify = true;
    }
    if (shouldVerify) {
        yield testBinary(installedVersion, binaryDir, options);
        if (options.welcomeMessage) {
            xvfb.loggerModule.log();
            xvfb.loggerModule.log('Opening Cypress...');
        }
    }
});
const start$1 = (...args_1) => xvfb.__awaiter(void 0, [...args_1], void 0, function* (options = {}) {
    debug$1('verifying Cypress app');
    _.defaults(options, {
        dev: false,
        force: false,
        welcomeMessage: true,
        smokeTestTimeout: verifyTestRunnerTimeoutMs(),
        skipVerify: xvfb.util.getEnv('CYPRESS_SKIP_VERIFY') === 'true',
    });
    if (options.skipVerify) {
        debug$1('skipping verification of the Cypress app');
        return Promise.resolve();
    }
    const packageVersion = xvfb.util.pkgVersion();
    let binaryDir = xvfb.stateModule.getBinaryDir(packageVersion);
    if (options.dev) {
        return runSmokeTest('', options);
    }
    const parseBinaryEnvVar = () => xvfb.__awaiter(void 0, void 0, void 0, function* () {
        const envBinaryPath = xvfb.util.getEnv('CYPRESS_RUN_BINARY');
        debug$1('CYPRESS_RUN_BINARY exists, =', envBinaryPath);
        xvfb.loggerModule.log(commonTags.stripIndent `
      ${chalk.yellow('Note:')} You have set the environment variable:

      ${chalk.white('CYPRESS_RUN_BINARY=')}${chalk.cyan(envBinaryPath)}

      This overrides the default Cypress binary path used.
    `);
        xvfb.loggerModule.log();
        try {
            const isExecutable = yield xvfb.util.isExecutableAsync(envBinaryPath);
            debug$1('CYPRESS_RUN_BINARY is executable? :', isExecutable);
            if (!isExecutable) {
                return xvfb.throwFormErrorText(xvfb.errors.CYPRESS_RUN_BINARY.notValid(envBinaryPath))(commonTags.stripIndent `
        The supplied binary path is not executable
        `);
            }
            const envBinaryDir = yield xvfb.stateModule.parseRealPlatformBinaryFolderAsync(envBinaryPath);
            if (!envBinaryDir) {
                return xvfb.throwFormErrorText(xvfb.errors.CYPRESS_RUN_BINARY.notValid(envBinaryPath))();
            }
            debug$1('CYPRESS_RUN_BINARY has binaryDir:', envBinaryDir);
            binaryDir = envBinaryDir;
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                return xvfb.throwFormErrorText(xvfb.errors.CYPRESS_RUN_BINARY.notValid(envBinaryPath))(err.message);
            }
            throw err;
        }
    });
    try {
        debug$1('checking environment variables');
        if (xvfb.util.getEnv('CYPRESS_RUN_BINARY')) {
            yield parseBinaryEnvVar();
        }
        yield checkExecutable(binaryDir);
        debug$1('binaryDir is ', binaryDir);
        const pkg = yield xvfb.stateModule.getBinaryPkgAsync(binaryDir);
        const binaryVersion = xvfb.stateModule.getBinaryPkgVersion(pkg);
        if (!binaryVersion) {
            debug$1('no Cypress binary found for cli version ', packageVersion);
            return xvfb.throwFormErrorText(xvfb.errors.missingApp(binaryDir))(`
      Cannot read binary version from: ${chalk.cyan(xvfb.stateModule.getBinaryPkgPath(binaryDir))}
    `);
        }
        debug$1(`Found binary version ${chalk.green(binaryVersion)} installed in: ${chalk.cyan(binaryDir)}`);
        if (binaryVersion !== packageVersion) {
            // warn if we installed with CYPRESS_INSTALL_BINARY or changed version
            // in the package.json
            xvfb.loggerModule.log(`Found binary version ${chalk.green(binaryVersion)} installed in: ${chalk.cyan(binaryDir)}`);
            xvfb.loggerModule.log();
            xvfb.loggerModule.warn(commonTags.stripIndent `


      ${logSymbols.warning} Warning: Binary version ${chalk.green(binaryVersion)} does not match the expected package version ${chalk.green(packageVersion)}

        These versions may not work properly together.
      `);
            xvfb.loggerModule.log();
        }
        yield maybeVerify(binaryVersion, binaryDir, options);
    }
    catch (err) {
        if (err.known) {
            throw err;
        }
        return xvfb.throwFormErrorText(xvfb.errors.unexpected)(err.stack);
    }
});
const isLinuxLike = () => os.platform() !== 'win32';
/**
 * Returns true if running on a system where Electron needs "--no-sandbox" flag.
 * @see https://crbug.com/638180
 *
 * On Debian we had problems running in sandbox even for non-root users.
 * @see https://github.com/cypress-io/cypress/issues/5434
 * Seems there is a lot of discussion around this issue among Electron users
 * @see https://github.com/electron/electron/issues/17972
*/
const needsSandbox = () => isLinuxLike();

const debug = Debug('cypress:cli');
const DBUS_ERROR_PATTERN = /ERROR:dbus\/(bus|object_proxy)\.cc/;
function isPlatform(platform) {
    return os.platform() === platform;
}
function needsStderrPiped(needsXvfb) {
    return _.some([
        isPlatform('darwin'),
        (needsXvfb && isPlatform('linux')),
        xvfb.util.isPossibleLinuxWithIncorrectDisplay(),
    ]);
}
function needsEverythingPipedDirectly() {
    return isPlatform('win32');
}
function getStdioStrategy(needsXvfb) {
    if (needsEverythingPipedDirectly()) {
        return 'pipe';
    }
    // https://github.com/cypress-io/cypress/issues/921
    // https://github.com/cypress-io/cypress/issues/1143
    // https://github.com/cypress-io/cypress/issues/1745
    if (needsStderrPiped(needsXvfb)) {
        // returning pipe here so we can massage stderr
        // and remove garbage from Xlib and libuv
        // due to starting the Xvfb process on linux
        return ['inherit', 'inherit', 'pipe'];
    }
    return 'inherit';
}
function createSpawnFunction(executable, args, options) {
    return (overrides = {}) => {
        return new Promise((resolve, reject) => {
            _.defaults(overrides, {
                onStderrData: false,
            });
            const { onStderrData } = overrides;
            const envOverrides = xvfb.util.getEnvOverrides(options);
            const electronArgs = [];
            const node11WindowsFix = isPlatform('win32');
            let startScriptPath;
            if (options.dev) {
                executable = 'node';
                // if we're in dev then reset
                // the launch cmd to be 'npm run dev'
                // This path is correct in the build output, but not the source code. This file gets bundled into
                // `dist/spawn-<hash>.js`, which makes this resolution appear incorrect at first glance.
                startScriptPath = xvfb.relativeToRepoRoot('scripts/start.js');
                if (!startScriptPath) {
                    throw new Error(`Cypress start script (scripts/start.js) not found in parent directory of ${__dirname}`);
                }
            }
            if (!options.dev && needsSandbox()) {
                electronArgs.push('--no-sandbox');
            }
            // strip dev out of child process options
            /**
               * @type {import('child_process').ForkOptions}
               */
            let stdioOptions = _.pick(options, 'env', 'detached', 'stdio');
            // figure out if we're going to be force enabling or disabling colors.
            // also figure out whether we should force stdout and stderr into thinking
            // it is a tty as opposed to a pipe.
            stdioOptions.env = _.extend({}, stdioOptions.env, envOverrides);
            if (node11WindowsFix) {
                stdioOptions = _.extend({}, stdioOptions, { windowsHide: false });
            }
            if (xvfb.util.isPossibleLinuxWithIncorrectDisplay()) {
                // make sure we use the latest DISPLAY variable if any
                debug('passing DISPLAY', process.env.DISPLAY);
                stdioOptions.env.DISPLAY = process.env.DISPLAY;
            }
            if (stdioOptions.env.ELECTRON_RUN_AS_NODE) {
                // Since we are running electron as node, we need to add an entry point file.
                startScriptPath = path.join(xvfb.stateModule.getBinaryPkgPath(path.dirname(executable)), '..', 'index.js');
            }
            else {
                // Start arguments with "--" so Electron knows these are OUR
                // arguments and does not try to sanitize them. Otherwise on Windows
                // an url in one of the arguments crashes it :(
                // https://github.com/cypress-io/cypress/issues/5466
                args = [...electronArgs, '--', ...args];
            }
            if (startScriptPath) {
                args.unshift(startScriptPath);
            }
            if (process.env.CYPRESS_INTERNAL_DEV_DEBUG) {
                args.unshift(process.env.CYPRESS_INTERNAL_DEV_DEBUG);
            }
            debug('spawn args %o %o', args, _.omit(stdioOptions, 'env'));
            debug('spawning Cypress with executable: %s', executable);
            const child = cp.spawn(executable, args, stdioOptions);
            function resolveOn(event) {
                return function (code, signal) {
                    return xvfb.__awaiter(this, void 0, void 0, function* () {
                        debug('child event fired %o', { event, code, signal });
                        if (code === null) {
                            const errorObject = xvfb.errors.childProcessKilled(event, signal);
                            const err = yield xvfb.getError(errorObject);
                            return reject(err);
                        }
                        resolve(code);
                    });
                };
            }
            child.on('close', resolveOn('close'));
            child.on('exit', resolveOn('exit'));
            child.on('error', reject);
            if (isPlatform('win32')) {
                const rl = readline.createInterface({
                    input: process$1.stdin,
                    output: process$1.stdout,
                });
                // on windows, SIGINT does not propagate to the child process when ctrl+c is pressed
                // this makes sure all nested processes are closed(ex: firefox inside the server)
                rl.on('SIGINT', function () {
                    return xvfb.__awaiter(this, void 0, void 0, function* () {
                        const kill = (yield import('tree-kill')).default;
                        kill(child.pid, 'SIGINT');
                    });
                });
            }
            // if stdio options is set to 'pipe', then
            //   we should set up pipes:
            //  process STDIN (read stream) => child STDIN (writeable)
            //  child STDOUT => process STDOUT
            //  child STDERR => process STDERR with additional filtering
            if (child.stdin) {
                debug('piping process STDIN into child STDIN');
                process$1.stdin.pipe(child.stdin);
            }
            if (child.stdout) {
                debug('piping child STDOUT to process STDOUT');
                child.stdout.pipe(process$1.stdout);
            }
            // if this is defined then we are manually piping for linux
            // to filter out the garbage
            if (child.stderr) {
                debug('piping child STDERR to process STDERR');
                child.stderr.on('data', (data) => {
                    const str = data.toString();
                    // if we have a callback and this explicitly returns
                    // false then bail
                    if (onStderrData && onStderrData(str)) {
                        return;
                    }
                    if (str.match(DBUS_ERROR_PATTERN)) {
                        debug(str);
                    }
                    else {
                        // else pass it along!
                        process$1.stderr.write(data);
                    }
                });
            }
            // https://github.com/cypress-io/cypress/issues/1841
            // https://github.com/cypress-io/cypress/issues/5241
            // In some versions of node, it will throw on windows
            // when you close the parent process after piping
            // into the child process. unpiping does not seem
            // to have any effect. so we're just catching the
            // error here and not doing anything.
            process$1.stdin.on('error', (err) => {
                if (['EPIPE', 'ENOTCONN'].includes(err.code)) {
                    return;
                }
                throw err;
            });
            if (stdioOptions.detached) {
                child.unref();
            }
        });
    };
}
function spawnInXvfb(spawn) {
    return xvfb.__awaiter(this, void 0, void 0, function* () {
        try {
            yield xvfb.xvfb.start();
            const code = yield userFriendlySpawn(spawn);
            return code;
        }
        finally {
            yield xvfb.xvfb.stop();
        }
    });
}
function userFriendlySpawn(spawn, linuxWithDisplayEnv) {
    return xvfb.__awaiter(this, void 0, void 0, function* () {
        debug('spawning, should retry on display problem?', Boolean(linuxWithDisplayEnv));
        let brokenGtkDisplay = false;
        const overrides = {};
        if (linuxWithDisplayEnv) {
            _.extend(overrides, {
                electronLogging: true,
                onStderrData(str) {
                    // if we receive a broken pipe anywhere
                    // then we know that's why cypress exited early
                    if (xvfb.util.isBrokenGtkDisplay(str)) {
                        brokenGtkDisplay = true;
                    }
                },
            });
        }
        try {
            const code = yield spawn(overrides);
            if (code !== 0 && brokenGtkDisplay) {
                xvfb.util.logBrokenGtkDisplayWarning();
                return spawnInXvfb(spawn);
            }
            return code;
        }
        catch (error) {
            // we can format and handle an error message from the code above
            // prevent wrapping error again by using "known: undefined" filter
            if (error.known === undefined) {
                const raiseErrorFn = xvfb.throwFormErrorText(xvfb.errors.unexpected);
                yield raiseErrorFn(error.message);
            }
            throw error;
        }
    });
}
function start(args_1) {
    return xvfb.__awaiter(this, arguments, void 0, function* (args, options = {}) {
        var _a, _b, _c, _d;
        let executable = xvfb.util.getEnv('CYPRESS_RUN_BINARY') ?
            path.resolve(xvfb.util.getEnv('CYPRESS_RUN_BINARY')) :
            xvfb.stateModule.getPathToExecutable(xvfb.stateModule.getBinaryDir());
        // Always push cwd into the args
        // which additionally acts as a signal to the
        // binary that it was invoked through the NPM module
        const baseArgs = args ? (typeof args === 'string' ? [args] : args) : [];
        const decoratedArgs = baseArgs.concat([
            '--cwd', process.cwd(),
            '--userNodePath', process.execPath,
            '--userNodeVersion', process.versions.node,
        ]);
        const needsXvfb = xvfb.xvfb.isNeeded();
        debug('needs to start own Xvfb?', needsXvfb);
        const stdio = (_a = options.stdio) !== null && _a !== void 0 ? _a : getStdioStrategy(needsXvfb);
        const dev = (_b = options.dev) !== null && _b !== void 0 ? _b : false;
        const detached = (_c = options.detached) !== null && _c !== void 0 ? _c : false;
        const env = (_d = options.env) !== null && _d !== void 0 ? _d : process.env;
        const spawn = createSpawnFunction(executable, decoratedArgs, { stdio, dev, detached, env });
        if (needsXvfb) {
            return spawnInXvfb(spawn);
        }
        // if we are on linux and there's already a DISPLAY
        // set, then we may need to rerun cypress after
        // spawning our own Xvfb server
        const linuxWithDisplayEnv = xvfb.util.isPossibleLinuxWithIncorrectDisplay();
        return userFriendlySpawn(spawn, linuxWithDisplayEnv);
    });
}

exports.VerboseRenderer = VerboseRenderer;
exports.start = start$1;
exports.start$1 = start;
