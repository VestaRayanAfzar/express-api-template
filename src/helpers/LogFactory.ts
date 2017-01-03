import * as fs from "fs";
import {Logger, ILogger} from "./Logger";
import {ILogSetting} from "../config/setting";

export enum LogStorage  {Console = 1, File}

export class LogFactory {
    static setting: ILogSetting;
    static logFile: string;

    static init(setting: ILogSetting) {
        LogFactory.setting = setting;
        let now = new Date();
        if (setting.storage == LogStorage.Console) {
            return true;
        }
        LogFactory.logFile = `${setting.dir}/${now.getTime()}-logger.log`;
        try {
            if (!fs.existsSync(LogFactory.logFile)) {
                fs.writeFileSync(`${LogFactory.logFile}`, `Initiating at ${now}`);
            }
        } catch (e) {
            console.log('LogFactory.init ERROR::', e);
            return false;
        }
        return true;
    }

    static create() {
        return new Logger(LogFactory.setting.level);
    }

    static save(log: ILogger) {
        if (LogFactory.setting.storage == LogStorage.Console) {
            console.log(log);
            return;
        }
        fs.appendFile(LogFactory.logFile, `\n${JSON.stringify(log)}`, {encoding: 'utf8'}, err => {
            console.error(err);
        });
    }
}