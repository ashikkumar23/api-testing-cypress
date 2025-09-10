"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bluebird_1 = __importDefault(require("bluebird"));
const debug_1 = __importDefault(require("debug"));
const path_1 = __importDefault(require("path"));
const util_1 = __importDefault(require("../util"));
const state_1 = __importDefault(require("../tasks/state"));
const errors_1 = require("../errors");
const debug = (0, debug_1.default)('cypress:cli');
const getVersions = () => {
    return bluebird_1.default.try(() => {
        if (util_1.default.getEnv('CYPRESS_RUN_BINARY')) {
            let envBinaryPath = path_1.default.resolve(util_1.default.getEnv('CYPRESS_RUN_BINARY'));
            return state_1.default.parseRealPlatformBinaryFolderAsync(envBinaryPath)
                .then((envBinaryDir) => {
                if (!envBinaryDir) {
                    return (0, errors_1.throwFormErrorText)(errors_1.errors.CYPRESS_RUN_BINARY.notValid(envBinaryPath))();
                }
                debug('CYPRESS_RUN_BINARY has binaryDir:', envBinaryDir);
                return envBinaryDir;
            })
                .catch({ code: 'ENOENT' }, (err) => {
                return (0, errors_1.throwFormErrorText)(errors_1.errors.CYPRESS_RUN_BINARY.notValid(envBinaryPath))(err.message);
            });
        }
        return state_1.default.getBinaryDir();
    })
        .then(state_1.default.getBinaryPkgAsync)
        .then((pkg) => {
        const versions = {
            binary: state_1.default.getBinaryPkgVersion(pkg),
            electronVersion: state_1.default.getBinaryElectronVersion(pkg),
            electronNodeVersion: state_1.default.getBinaryElectronNodeVersion(pkg),
        };
        debug('binary versions %o', versions);
        return versions;
    })
        .then((binaryVersions) => {
        const buildInfo = util_1.default.pkgBuildInfo();
        let packageVersion = util_1.default.pkgVersion();
        if (!buildInfo)
            packageVersion += ' (development)';
        else if (!buildInfo.stable)
            packageVersion += ' (pre-release)';
        const versions = {
            package: packageVersion,
            binary: binaryVersions.binary || 'not installed',
            electronVersion: binaryVersions.electronVersion || 'not found',
            electronNodeVersion: binaryVersions.electronNodeVersion || 'not found',
        };
        debug('combined versions %o', versions);
        return versions;
    });
};
const versionsModule = {
    getVersions,
};
exports.default = versionsModule;
