import {Schema} from "../../cmn/Schema";
import {IModelValues} from "../../cmn/Model";
import {Vql, Condition} from "../../cmn/Vql";
import {Database, IDatabaseConfig} from "../../cmn/Database";
import {IQueryResult, IUpsertResult, IDeleteResult} from "../../cmn/ICRUDResult";
import {RedisClient, createClient} from "redis";
import {Err} from "../../cmn/Err";
import {DatabaseError} from "../../cmn/error/DatabaseError";

export class Redis extends Database {
    private static staticInstance:RedisClient;

    public static getInstance(config:IDatabaseConfig):Promise<Database> {
        if (Redis.staticInstance) {
            return Promise.resolve(new Redis(Redis.staticInstance));
        }
        return new Promise<Database>((resolve, reject)=> {
            var client = createClient(config.port, config.host);
            client.on('ready', function () {
                Redis.staticInstance = client;
                resolve(new Redis(client));
                console.log('Redis connection established');
            });
            client.on('error', function (error) {
                reject(error);
                console.log('Redis Error', error);
            });
            client.on('reconnecting', function () {
                console.log('Redis connection established');
            });
        })
    }

    constructor(instance:RedisClient) {
        super();
        if (!instance) throw new DatabaseError(Err.Code.DBConnection);
    }

    findById<T>(id:string):Promise<IQueryResult<T>> {
        return new Promise<IUpsertResult<T>>((resolve, reject)=> {
            Redis.staticInstance.get(id, (err, reply)=> {
                if (err) return reject(new DatabaseError(Err.Code.DBInsert, err.message));
                var data = null;
                if (reply) {
                    try {
                        data = <T>JSON.parse(reply);
                    } catch (e) {
                        data = reply;
                    }
                    resolve(data);
                } else {
                    resolve(null);
                }
            });
        })
    }

    findByModelValues<T>(model:string, modelValues:IModelValues, limit:number):Promise<IQueryResult<T>> {
        return undefined;
    }

    findByQuery<T>(query:Vql):Promise<IQueryResult<T>> {
        return undefined;
    }

    insertOne<T>(model:string, value:T):Promise<IUpsertResult<T>> {
        return new Promise<IUpsertResult<T>>((resolve, reject)=> {
            Redis.staticInstance.set(model, value, (err)=> {
                if (err) return reject(new DatabaseError(Err.Code.DBInsert, err.message));
                resolve();
            });
        })
    }

    updateOne<T>(model:string, value:T):Promise<IUpsertResult<T>> {
        return undefined;
    }

    updateAll<T>(model:string, newValues:IModelValues, condition:Condition):Promise<IUpsertResult<T>> {
        return undefined;
    }

    deleteOne(model:string, id:number|string):Promise<IDeleteResult> {
        return undefined;
    }

    deleteAll(model:string, condition:Condition):Promise<IDeleteResult> {
        return undefined;
    }

    init(schemaList:Array<Schema>) {
        return undefined;
    }
}