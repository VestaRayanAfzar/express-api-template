import * as mysql from "mysql";
import {IPool, IConnectionConfig, IConnection} from "mysql";
import {Schema} from "../../cmn/Schema";
import {Database, IDatabaseConfig} from "../../cmn/Database";
import {IModelValues} from "../../cmn/Model";
import {Vql, Condition} from "../../cmn/Vql";
import {IQueryResult, IUpsertResult, IDeleteResult} from "../../cmn/ICRUDResult";
import {DatabaseError} from "../../cmn/error/DatabaseError";
import {Err} from "../../cmn/Err";

export class MySQL extends Database {
    private static pool:IPool;
    private static staticInstance:IConnection;

    public static getInstance(config:IDatabaseConfig):Promise<Database> {
        if (MySQL.staticInstance) return Promise.resolve(new MySQL(MySQL.staticInstance));
        return new Promise<Database>((resolve, reject)=> {
            if (!MySQL.pool) {
                MySQL.pool = mysql.createPool(<IConnectionConfig>{
                    host: config.host,
                    port: +config.port,
                    user: config.user,
                    password: config.password,
                    database: config.database/*,
                    charset: 'utf8_general_ci'*/
                });
            }
            MySQL.pool.getConnection((err, connection)=> {
                if (err) return reject(new DatabaseError(Err.Code.DBConnection, err.message));
                MySQL.staticInstance = connection;
                resolve(new MySQL(MySQL.staticInstance));
            });
        })
    }

    constructor(connection:IConnection) {
        super();
        if (!connection) throw new DatabaseError(Err.Code.DBConnection);
    }

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

    init(schema:Schema):string {
        return undefined;
    }

    private getOperatorSymbol(operator:number):string {
        switch (operator) {
            // Connectors
            case Condition.Operator.And:
                return 'AND';
            case Condition.Operator.Or:
                return 'OR';
            // Comparison
            case Condition.Operator.EqualTo:
                return '=';
            case Condition.Operator.NotEqualTo:
                return '<>';
            case Condition.Operator.GreaterThan:
                return '>';
            case Condition.Operator.GreaterThanOrEqualTo:
                return '>=';
            case Condition.Operator.LessThan:
                return '<';
            case Condition.Operator.LessThanOrEqualTo:
                return '<=';
            case Condition.Operator.Like:
                return 'LIKE';
            case Condition.Operator.NotLike:
                return 'NOT LIKE';
        }
    }

    private generateConditionCode(condition:Condition):string {
        var conditionString = '';
        condition.traverse(cnd=> {
            if (cnd.isConnector) {

            } else {
                var cmp = cnd.comparison;
                conditionString += `(${cmp.field}${this.getOperatorSymbol(cnd.operator)}${cmp.value})`;
            }
        });
        return conditionString;
    }
}