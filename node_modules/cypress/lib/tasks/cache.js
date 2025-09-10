"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const state_1 = __importDefault(require("./state"));
const logger_1 = __importDefault(require("../logger"));
const fs_1 = __importDefault(require("../fs"));
const util_1 = __importDefault(require("../util"));
const path_1 = require("path");
const cli_table3_1 = __importDefault(require("cli-table3"));
const dayjs_1 = __importDefault(require("dayjs"));
const relativeTime_1 = __importDefault(require("dayjs/plugin/relativeTime"));
const chalk_1 = __importDefault(require("chalk"));
const lodash_1 = __importDefault(require("lodash"));
const get_folder_size_1 = __importDefault(require("./get-folder-size"));
dayjs_1.default.extend(relativeTime_1.default);
// output colors for the table
const colors = {
    titles: chalk_1.default.white,
    dates: chalk_1.default.cyan,
    values: chalk_1.default.green,
    size: chalk_1.default.gray,
};
const logCachePath = () => {
    logger_1.default.always(state_1.default.getCacheDir());
    return undefined;
};
const clear = () => {
    return fs_1.default.removeAsync(state_1.default.getCacheDir());
};
const prune = () => __awaiter(void 0, void 0, void 0, function* () {
    const cacheDir = state_1.default.getCacheDir();
    const checkedInBinaryVersion = util_1.default.pkgVersion();
    let deletedBinary = false;
    try {
        const versions = yield fs_1.default.readdirAsync(cacheDir);
        for (const version of versions) {
            if (version !== checkedInBinaryVersion) {
                deletedBinary = true;
                const versionDir = (0, path_1.join)(cacheDir, version);
                yield fs_1.default.removeAsync(versionDir);
            }
        }
        if (deletedBinary) {
            logger_1.default.always(`Deleted all binary caches except for the ${checkedInBinaryVersion} binary cache.`);
        }
        else {
            logger_1.default.always(`No binary caches found to prune.`);
        }
    }
    catch (e) {
        if (e.code === 'ENOENT') {
            logger_1.default.always(`No Cypress cache was found at ${cacheDir}. Nothing to prune.`);
            return;
        }
        throw e;
    }
});
const fileSizeInMB = (size) => {
    return `${(size / 1024 / 1024).toFixed(1)}MB`;
};
/**
 * Collects all cached versions, finds when each was used
 * and prints a table with results to the terminal
 */
const list = (showSize = false) => {
    return getCachedVersions(showSize)
        .then((binaries) => {
        const head = [colors.titles('version'), colors.titles('last used')];
        if (showSize) {
            head.push(colors.titles('size'));
        }
        const table = new cli_table3_1.default({
            head,
        });
        binaries.forEach((binary) => {
            const versionString = colors.values(binary.version);
            const lastUsed = binary.accessed ? colors.dates(binary.accessed) : 'unknown';
            const row = [versionString, lastUsed];
            if (showSize) {
                const size = colors.size(fileSizeInMB(binary.size));
                row.push(size);
            }
            return table.push(row);
        });
        logger_1.default.always(table.toString());
    });
};
const getCachedVersions = (showSize) => {
    const cacheDir = state_1.default.getCacheDir();
    return fs_1.default
        .readdirAsync(cacheDir)
        .filter(util_1.default.isSemver)
        .map((version) => {
        return {
            version,
            folderPath: (0, path_1.join)(cacheDir, version),
        };
    })
        .mapSeries((binary) => {
        // last access time on the folder is different from last access time
        // on the Cypress binary
        const binaryDir = state_1.default.getBinaryDir(binary.version);
        const executable = state_1.default.getPathToExecutable(binaryDir);
        return fs_1.default.statAsync(executable).then((stat) => {
            const lastAccessedTime = lodash_1.default.get(stat, 'atime');
            if (!lastAccessedTime) {
                // the test runner has never been opened
                // or could be a test simulating missing timestamp
                return binary;
            }
            const accessed = (0, dayjs_1.default)(lastAccessedTime).fromNow();
            binary.accessed = accessed;
            return binary;
        }, (e) => {
            // could not find the binary or gets its stats
            return binary;
        });
    })
        .mapSeries((binary) => {
        if (showSize) {
            const binaryDir = state_1.default.getBinaryDir(binary.version);
            return (0, get_folder_size_1.default)(binaryDir).then((size) => {
                return Object.assign(Object.assign({}, binary), { size });
            });
        }
        return binary;
    });
};
const cacheModule = {
    path: logCachePath,
    clear,
    prune,
    list,
    getCachedVersions,
};
exports.default = cacheModule;
