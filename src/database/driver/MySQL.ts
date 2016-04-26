import * as mysql from "mysql";
import {IPool, IConnectionConfig, IConnection} from "mysql";
import {Schema} from "../../cmn/Schema";
import {Database, IDatabaseConfig} from "../../cmn/Database";
import {IModelValues, IModelFields} from "../../cmn/Model";
import {Vql, Condition} from "../../cmn/Vql";
import {IQueryResult, IUpsertResult, IDeleteResult} from "../../cmn/ICRUDResult";
import {DatabaseError} from "../../cmn/error/DatabaseError";
import {Err} from "../../cmn/Err";
import {Field, IFieldProperties, FieldType, Relationship} from "../../cmn/Field";

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
                    database: config.database
                });
            }
            MySQL.pool.getConnection((err, connection)=> {
                if (err) return reject(new DatabaseError(Err.Code.DBConnection, err.message));
                MySQL.staticInstance = connection;
                var result:Promise<boolean> = true ? MySQL.initializeDatabase(config, connection) : Promise.resolve<boolean>();
                result.then(()=> {
                    resolve(new MySQL(MySQL.staticInstance));
                })
            });
        })
    }

    constructor(connection:IConnection) {
        super();
        if (!connection) throw new DatabaseError(Err.Code.DBConnection);
    }

    public findById<T>(model:string, id:number|string):Promise<IQueryResult<T>> {
        return undefined;
    }

    public findByModelValues<T>(model:string, modelValues:IModelValues, limit:number):Promise<IQueryResult<T>> {
        return undefined;
    }

    public findByQuery<T>(query:Vql):Promise<IQueryResult<T>> {
        return undefined;
    }

    public insertOne<T>(model:string, value:T):Promise<IUpsertResult<T>> {
        return undefined;
    }

    public updateOne<T>(model:string, value:T):Promise<IUpsertResult<T>> {
        return undefined;
    }

    public updateAll<T>(model:string, newValues:IModelValues, condition:Condition):Promise<IUpsertResult<T>> {
        return undefined;
    }

    public deleteOne(model:string, id:number|string):Promise<IDeleteResult> {
        return undefined;
    }

    public deleteAll(model:string, condition:Condition):Promise<IDeleteResult> {
        return undefined;
    }

    public init(schemaList:Array<Schema>):Promise<boolean> {
        var createSchemaPromise = Promise.resolve();
        for (var i = 0; i < schemaList.length; i++) {
            createSchemaPromise = createSchemaPromise.then(this.createTable(schemaList[i]));
        }
        return createSchemaPromise;
    }


    private createTable(schema:Schema) {
        var fields = schema.getFields();
        var createDefinition = this.createDefinition(fields,schema.name);
        var ownTable = `CREATE TABLE IF NOT EXISTS ${schema.name} (\n${createDefinition.ownColumn})\n ENGINE=InnoDB DEFAULT CHARSET=utf8`;
        var ownTablePromise = new Promise((resolve, reject)=> {
            MySQL.staticInstance.query(ownTable, (err, result)=> {
                if (err) {
                    return reject()
                }
                return resolve(result);
            });
        });
        var translateTablePromise = new Promise((resolve, reject)=> {
            if (!createDefinition.lingualColumn) {
                return resolve(true);
            }
            var translateTable = `CREATE TABLE IF NOT EXISTS ${schema.name}_translation (\n${createDefinition.lingualColumn}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8`;
            MySQL.staticInstance.query(translateTable, (err, result)=> {
                if (err) {
                    return reject()
                }
                return resolve(result);
            });
        });

        return ()=> Promise.all([ownTablePromise, translateTablePromise].concat(createDefinition.relations));

    }

    private relationTable(field:Field,table:string):Promise<boolean> {
        var schema = new Schema(table + 'Has' + this.pascalCase(field.fieldName));
        schema.addField('id').primary().required();
        schema.addField(this.camelCase(table)).type(FieldType.Integer).required();
        schema.addField(field.fieldName).type(FieldType.Integer).required();
        return this.createTable(schema)();
    }

    private camelCase(str){
        return str[0].toLowerCase() + str.slice(1, str.length - 1)
    }

    private pascalCase(str){
        return str[0].toUpperCase() + str.slice(1, str.length - 1)
    }

    private createDefinition(fields:IModelFields,table:string, checkMultiLingual = true) {
        var multiLingualDefinition:Array<String> = [];
        var columnDefinition:Array<String> = [];
        var relations:Array<Promise<boolean>> = [];
        var keyIndex;
        for (var field in fields) {
            if (fields.hasOwnProperty(field)) {
                keyIndex = fields[field].properties.primary ? field : keyIndex;
                var column = this.columnDefinition(fields[field]);
                if (column) {
                    if (fields[field].properties.multilingual && checkMultiLingual) {
                        multiLingualDefinition.push(column);
                    } else {
                        columnDefinition.push(column);
                    }
                } else if (fields[field].properties.type == FieldType.Relation && fields[field].properties.relation.type == Relationship.Type.Many2Many) {
                    relations.push(this.relationTable(fields[field],table));
                }
            }
        }
        var keyFiled;

        if (keyIndex) {
            keyFiled = fields[keyIndex];
        } else {
            keyFiled = new Field('id');
            keyFiled.primary().type(FieldType.Integer).required();
            columnDefinition.push(this.columnDefinition(keyFiled));
        }

        var keySyntax = `PRIMARY KEY (${keyFiled.fieldName})`;
        columnDefinition.push(keySyntax);

        if (multiLingualDefinition.length) {
            multiLingualDefinition.push(this.columnDefinition(keyFiled));
            multiLingualDefinition.push(keySyntax);
        }

        return {
            ownColumn: columnDefinition.join(' ,\n '),
            lingualColumn: multiLingualDefinition.join(' ,\n '),
            relations: relations
        }
    }

    private columnDefinition(filed:Field) {
        var properties = filed.properties;
        if (properties.relation.type == Relationship.Type.Many2Many) {
            return '';
        }
        var columnSyntax = `${filed.fieldName} ${this.getType(properties)}`;
        columnSyntax += properties.required || properties.primary ? ' NOT NULL' : '';
        columnSyntax += properties.default ? ` DEFAULT '${properties.default}'` : '';
        columnSyntax += properties.unique ? ' UNIQUE ' : '';
        columnSyntax += properties.primary ? ' AUTO_INCREMENT ' : '';
        return columnSyntax;
    }

    private getType(properties:IFieldProperties) {
        var typeSyntax;
        switch (properties.type) {
            case FieldType.Boolean:
                typeSyntax = "BIT(1)";
                break;
            case FieldType.EMail:
            case FieldType.File:
            case FieldType.Password:
            case FieldType.Tel:
            case FieldType.URL:
            case FieldType.String:
                if (!properties.primary) {
                    typeSyntax = `VARCHAR(${properties.maxLength ? properties.maxLength : 255 })`;
                } else {
                    typeSyntax = 'BIGINT';
                }
                break;
            case FieldType.Float:
            case FieldType.Number:
                typeSyntax = `DECIMAL(${properties.max ? properties.max.toString().length : 10},10)`;
                break;
            case FieldType.Enum:
            case FieldType.Integer:
                typeSyntax = `INT(${properties.max ? properties.max.toString(2).length : 11})`;
                break;
            case FieldType.Object:
                typeSyntax = `BLOB`;
                break;
            case FieldType.Timestamp:
                typeSyntax = 'BIGINT';
                break;
            case FieldType.Relation:
                if (properties.relation.type == Relationship.Type.One2One || properties.relation.type == Relationship.Type.One2Many) {
                    typeSyntax = 'BIGINT';
                }
                break;

        }
        return typeSyntax;
    }

    private static initializeDatabase(config:IDatabaseConfig, connection:IConnection) {
        return new Promise((resolve, reject)=> {
            var sql = `ALTER DATABASE \`${config.database}\`  CHARSET = utf8 COLLATE = utf8_general_ci;`;
            connection.query(sql, (err, result)=> {
                if (err) {
                    return reject()
                }
                return resolve(result);
            })
        })
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