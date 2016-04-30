import {Schema} from "../../cmn/Schema";
import {Database} from "../../cmn/Database";
import {IModelValues} from "../../cmn/Model";
import {Vql, Condition} from "../../cmn/Vql";
import {IQueryResult, IUpsertResult, IDeleteResult} from "../../cmn/ICRUDResult";

export class Mongodb extends Database {
    findById<T>(model:string, id:number|string):Promise<IQueryResult<T>> {
        return undefined;
    }

    findByModelValues<T>(model:string, modelValues:IModelValues, limit:number):Promise<IQueryResult<T>> {
        return undefined;
    }

    findByQuery<T>(query:Vql):Promise<IQueryResult<T>> {
        return undefined;
    }

    insertOne<T>(model:string, value:T):Promise<IUpsertResult<T>> {
        return undefined;
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

    generateConditionCode(condition:Condition):string {
        return undefined;
    }
}