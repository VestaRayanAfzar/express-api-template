import * as fs from "fs";
import {IDatabaseConfig} from "vesta-schema/Database";
import {LogStorage} from "../helpers/LogFactory";
import {LogLevel} from "../cmn/enum/Log";

export interface IAdminSetting {
    logLevel: number;
    monitoring: boolean;
    samplingInterval: number;
}

export interface ILogSetting {
    level: LogLevel;
    dir: string;
    storage?: LogStorage;
}

export interface ISessionSetting {
    maxAge: number;
    idPrefix: string;
    hashing: string;
    database: IDatabaseConfig
}

export interface ISecuritySetting {
    secret: string;
    salt: string;
    hashing: string;
    guestRoleName: string;
    rootRoleName: string;
    session: ISessionSetting;
}

export interface IServerAppSetting {
    env: string;
    log: ILogSetting;
    version: {app: string; api: string};
    regenerateSchema: boolean;
    database: IDatabaseConfig;
    port: number;
    dir: {
        upload: string;
        log: string;
    };
    security: ISecuritySetting;
}

let env = process.env;

let adminSetting: IAdminSetting;
try {
    adminSetting = JSON.parse(fs.readFileSync(__dirname + '/setting.json', {encoding: 'utf8'}));
} catch (err) {
    adminSetting = {
        logLevel: env.LOG_LEVEL,
        monitoring: false,
        samplingInterval: 0
    };
    fs.writeFileSync(__dirname + '/setting.json', JSON.stringify(adminSetting));
    console.error(err);
}

export const setting: IServerAppSetting = {
    env: env.NODE_ENV,
    log: {
        level: adminSetting.logLevel,
        dir: '/log'
    },
    version: {
        app: '0.1.0',
        api: 'v1'
    },
    regenerateSchema: true,
    database: <IDatabaseConfig>{
        protocol: env.ADB_PROTOCOL,
        host: env.ADB_HOST,
        port: +env.ADB_PORT,
        user: env.ADB_USERNAME,
        password: env.ADB_PASSWORD,
        database: env.ADB_NAME
    },
    dir: {
        upload: '/upload',
        log: '/log'
    },
    port: env.PORT,
    security: {
        secret: env.SECRET_KEY,
        salt: env.SALT,
        hashing: 'sha256',
        guestRoleName: 'guest',
        rootRoleName: 'root',
        session: {
            maxAge: 6 * 3600 * 1000,// 6 hours
            idPrefix: 'sess:',
            hashing: 'HS256',
            database: <IDatabaseConfig>{
                protocol: env.SDB_PROTOCOL,
                host: env.SDB_HOST,
                port: +env.SDB_PORT
            }
        }
    }
};
