import {Database, IDatabaseConfig, IDatabase, ISchemaList} from "vesta-schema/Database";
import {Err} from "vesta-util/Err";
import {DatabaseError} from "vesta-schema/error/DatabaseError";
import {Schema} from "vesta-schema/Schema";

export class DatabaseFactory {
    private static databases:{[protocol:string]:{
        database:IDatabase,
        schemaList?:{[name:string]:Schema},
        instance?:Database,
        config:IDatabaseConfig
    }};

    public static getInstance(protocol:string):Promise<Database> {
        var db = DatabaseFactory.databases[protocol];
        if (db) {
            if (db.instance) {
                return Promise.resolve(db.instance);
            } else {
                db.instance = new (db.database)(db.config, db.schemaList);
                return db.instance.connect().then(()=> {
                    return db.instance;
                })
            }
        } else {
            return Promise.reject(new DatabaseError(Err.Code.DBInvalidDriver));
        }
    }

    public static register(config:IDatabaseConfig,driver:IDatabase, schemaList?:ISchemaList) {
        if (driver && config && config.protocol) DatabaseFactory.databases[config.protocol] = {
            database: driver,
            schemaList: schemaList,
            config: config,
        };
    }
}