import {IVariantServerAppSetting, VariantSetting} from "./setting.var";
import {IDatabaseConfig} from "../cmn/Database";

var env = process.env;

export interface IServerAppSetting extends IVariantServerAppSetting {
    env:string;
    version:{app:string; api:string};
    database:IDatabaseConfig;
    port:number;
    security:{
        secret:string;
        salt:string;
        hashing:string;
        session:{
            idPrefix:string;
            hashing:string;
            database:IDatabaseConfig
        };
    }
}

export const setting:IServerAppSetting = {
    env: env.NODE_ENV,
    version: {
        app: '0.1.0',
        api: 'v1'
    },
    database: <IDatabaseConfig>{
        protocol: env.ADB_PROTOCOL,
        host: env.ADB_HOST,
        port: +env.ADB_PORT,
        user: env.ADB_USERNAME,
        password: env.ADB_PASSWORD,
        database: env.ADB_NAME
    },
    dir: VariantSetting.dir,
    regenerateSchema: VariantSetting.regenerateSchema,
    port: env.PORT,
    security: {
        secret: env.SECRET_KEY,
        salt: env.SALT,
        hashing: 'sha256',
        session: {
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
