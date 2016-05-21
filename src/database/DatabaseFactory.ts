import {Database, IDatabaseConfig} from "../cmn/Database";
import {MySQL} from "./driver/MySQL";
import {Mongodb} from "./driver/Mongodb";
import {Redis} from "./driver/Redis";
import {DatabaseError} from "../cmn/error/DatabaseError";
import {Err} from "../cmn/Err";

export class DatabaseFactory {

    public static getInstance(config:IDatabaseConfig, regenerateSchema?:boolean):Promise<Database> {
        switch (config.protocol) {
            case Database.MySQL:
                return MySQL.getInstance(config, regenerateSchema);
            case Database.Mongodb:
                return Mongodb.getInstance(config);
            case Database.Redis:
                return Redis.getInstance(config);
            default:
                Promise.reject(new DatabaseError(Err.Code.DBInvalidDriver))
        }
    }
}