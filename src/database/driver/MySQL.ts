import * as mysql from "mysql";
import {IPool, IConnectionConfig, IConnection} from "mysql";
import {Schema} from "../../cmn/Schema";
import {Database, IDatabaseConfig, IQueryOption} from "../../cmn/Database";
import {IModelFields} from "../../cmn/Model";
import {Vql, Condition} from "../../cmn/Vql";
import {IQueryResult, IUpsertResult, IDeleteResult} from "../../cmn/ICRUDResult";
import {DatabaseError} from "../../cmn/error/DatabaseError";
import {Err} from "../../cmn/Err";
import {Field, IFieldProperties, FieldType, Relationship} from "../../cmn/Field";

interface ICalculatedQueryOptions {
    limit:string,
    orderBy:string,
    fields:string,
    condition:string,
}

export class MySQL extends Database {
    private static pool:IPool;
    private static staticInstance:IConnection;
    private static regenerateSchema:boolean = false;
    private schemaList:{[name:string]:Schema} = {};

    public static getInstance(config:IDatabaseConfig, regenerateSchema:boolean = false):Promise<Database> {
        if (MySQL.staticInstance) return Promise.resolve(new MySQL(MySQL.staticInstance));
        MySQL.regenerateSchema = regenerateSchema;
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
                var result:Promise<boolean> =  MySQL.regenerateSchema ? MySQL.initializeDatabase(config, connection) : Promise.resolve<boolean>();
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

    public init(schemaList:Array<Schema>):Promise<boolean> {
        for (var i = schemaList.length; i--;) {
            this.schemaList[schemaList[i].name] = schemaList[i];
        }
        var createSchemaPromise = Promise.resolve();
        if (MySQL.regenerateSchema) {
            for (var i = 0; i < schemaList.length; i++) {
                createSchemaPromise = createSchemaPromise.then(this.createTable(schemaList[i]));
            }
        }
        return createSchemaPromise;
    }

    public findById<T>(model:string, id:number | string, option ?:IQueryOption):Promise <IQueryResult<T>> {
        var query = new Vql(model)
            .where(new Condition(Condition.Operator.EqualTo).compare('id', id))
            .select(...option.fields)
            .fromOffset(option.offset ? option.offset : (option.page - 1) * option.limit)
            .limitTo(option.limit)
            .fetchRecordFor(...option.relations);
        query.orderBy = option.orderBy;
        return this.findByQuery(query);
    }

    public findByModelValues<T>(model:string, modelValues:T, option ?:IQueryOption):Promise < IQueryResult <T>> {
        var query = new Vql(model);
        query.fields = option.fields;
        query.page = option.page;
        query.limit = option.limit;
        query.orderBy = option.orderBy;
        query.relations = option.relations;
        query.condition = new Condition(Condition.Operator.And);
        for (var key in modelValues) {
            if (modelValues.hasOwnProperty(key)) {
                var condition = new Condition(Condition.Operator.EqualTo);
                condition.compare(key, modelValues[key]);
                query.condition.append(condition);
            }
        }
        return this.findByQuery(query);
    }

    public findByQuery<T>(query:Vql):Promise < IQueryResult <T>> {
        var params:ICalculatedQueryOptions = this.getQueryParams(query);
        var result:IQueryResult<T> = <IQueryResult<T>>{};
        return new Promise<IQueryResult<T>>((resolve, reject)=> {
            MySQL.staticInstance.query(`SELECT ${params.fields} FROM \`${query.model}\` ${params.condition} ${params.orderBy} ${params.limit}`, (err, list)=> {
                if (err) {
                    result.error = new Err(Err.Code.DBQuery);
                    reject(result);
                }
                this.getManyToManyRelation(list, query)
                    .then(list=> {
                        result.items = this.normalizeList(this.schemaList[query.model], list);
                        resolve(result);
                    });


            });
        })
    }

    public insertOne<T>(model:string, value:T):Promise < IUpsertResult <T>> {
        var result:IUpsertResult<T> = <IUpsertResult<T>>{};
        var analysedValue = this.getAnalysedValue<T>(model, value);
        var properties = [];
        for (var i = analysedValue.properties.length; i--;) {
            properties.push(`\`${analysedValue.properties[i].field}\` = ${analysedValue.properties[i].value}`);
        }
        return new Promise((resolve, reject)=> {
            MySQL.staticInstance.query(`INSERT INTO \`${model}\` SET ${analysedValue.properties.join(',')}`, (err, insertResult)=> {
                if (err) {
                    result.error = new Err(Err.Code.DBInsert);
                    reject(result);
                }
                var steps = [];
                for (var key in analysedValue.relations) {
                    if (analysedValue.relations.hasOwnProperty(key)) {
                        steps.push(this.addRelation<T>({id: insertResult['insertId']}, key, analysedValue.relations[key]));
                    }

                }
                Promise.all(steps)
                    .then(data=> {
                        MySQL.staticInstance.query(`SELECT * FROM \`${model}\` WHERE id = ${insertResult['insertId']}`, (err, list)=> {
                            if (err) {
                                result.error = new Err(Err.Code.DBDelete);
                                reject(result);
                            }
                            result.items = list;
                            resolve(result)
                        });
                    });

            });
        });
    }

    public insert<T>(model:string, value:Array<T>):Promise < IUpsertResult <T>> {
        var result:IUpsertResult<T> = <IUpsertResult<T>>{};
        var fields = this.schemaList[model].getFields();
        var fieldsName = [];
        var insertList = [];
        for (var field in fields) {
            if (fields.hasOwnProperty(field) && fields[field].properties.type != FieldType.Relation || fields[field].properties.relation.type != Relationship.Type.Many2Many) {
                fieldsName.push(field);
            }
        }
        for (var i = value.length; i--;) {
            var insertPart = [];
            for (var j = fieldsName.length; j--;) {
                insertPart.push(value[i].hasOwnProperty(fieldsName[j]) ? `'${value[i][fieldsName][j]}'` : '\'\'');
            }
            insertList.push(`(${insertPart.join(',')})`)

        }


        return new Promise((resolve, reject)=> {
            MySQL.staticInstance.query(`INSERT INTO ${model}} (${fieldsName.join(',')}) 
                    VALUES ${insertList.join(',')}`, (err, insertResult)=> {
                if (err) {
                    reject(err)
                }
                result.items = insertResult;
                resolve(result);
            })
        })
    }


    public addRelation<T,M>(model:T, relation:string, value:number|Array<number>|M|Array<M>):Promise<IUpsertResult<M>> {
        var modelName = model.constructor['schema'].name;
        var fields = this.schemaList[modelName].getFields();
        if (fields[relation] && fields[relation].properties.type == FieldType.Relation) {
            if (fields[relation].properties.relation.type != Relationship.Type.Many2Many) {
                return this.addOneToManyRelation(model, relation, value)
            } else {
                return this.addManyToManyRelation(model, relation, value)
            }
        }
        return Promise.reject(new Err(Err.Code.DBInsert));
    }

    public removeRelation<T>(model:string, relation:string, condition:Condition|number, ids?:Array<number>) {
        var safeCondition:Condition;
        if (typeof condition == 'number') {
            safeCondition = new Condition(Condition.Operator.EqualTo);
            safeCondition.compare('id', condition);
        } else {
            safeCondition = <Condition>condition;
        }
        var modelName = model.constructor['schema'].name;
        var fields = this.schemaList[modelName].getFields();
        if (fields[relation] && fields[relation].properties.type == FieldType.Relation) {
            if (fields[relation].properties.relation.type != Relationship.Type.Many2Many) {
                return this.removeOneToManyRelation(model, relation, safeCondition)
            } else {
                return this.removeManyToManyRelation(model, relation, safeCondition, ids)
            }
        }
        return Promise.reject(new Err(Err.Code.DBDelete));
    }

    public updateOne<T>(model:string, value:T):Promise < IUpsertResult <T>> {
        var properties = [];
        var result:IUpsertResult<T> = <IUpsertResult<T>>{};
        for (var key in value) {
            if (value.hasOwnProperty(key) && this.schemaList[model].getFieldsNames().indexOf(key) >= 0 && key != 'id') {
                properties.push(`\`${model}\`.${key} = '${value[key]}'`)
            }
        }
        return new Promise((resolve, reject)=> {
            MySQL.staticInstance.query(`UPDATE \`${model}\` SET ${properties.join(',')} WHERE id = ${value['id']}`, (err, updateResult)=> {
                if (err) {
                    result.error = new Err(Err.Code.DBUpdate);
                    reject(result);
                }
                MySQL.staticInstance.query(`SELECT * FROM \`${model}\` WHERE id = ${value['id']}`, (err, list)=> {
                    if (err) {
                        result.error = new Err(Err.Code.DBDelete);
                        reject(result);
                    }
                    result.items = list;
                    resolve(result)
                });
            });
        });
    }

    public updateAll<T>(model:string, newValues:T, condition:Condition):Promise < IUpsertResult < T >> {
        var sqlCondition = this.getCondition(condition);
        var result:IDeleteResult = <IDeleteResult>{};
        var properties = [];
        for (var key in newValues) {
            if (newValues.hasOwnProperty(key) && this.schemaList[model].getFieldsNames().indexOf(key) >= 0 && key != 'id') {
                properties.push(`\`${model}\`.${key} = '${newValues[key]}'`)
            }
        }
        return new Promise((resolve, reject)=> {
            MySQL.staticInstance.query(`SELECT id FROM \`${model}\` ${sqlCondition ? `WHERE ${sqlCondition}` : ''}`, (err, list)=> {
                if (err) {
                    result.error = new Err(Err.Code.DBQuery);
                    reject(result);
                }
                var ids = [];
                for (var i = list.length; i--;) {
                    ids.push(list[i].id);
                }
                if (ids.length) {
                    MySQL.staticInstance.query(`UPDATE \`${model}\` SET ${properties.join(',')}  WHERE id IN (${ids.join(',')})}`, (err, updateResult)=> {
                        if (err) {
                            result.error = new Err(Err.Code.DBDelete);
                            reject(result);
                        }
                        MySQL.staticInstance.query(`SELECT * FROM \`${model}\` WHERE id IN (${ids.join(',')})`, (err, list)=> {
                            if (err) {
                                result.error = new Err(Err.Code.DBDelete);
                                reject(result);
                            }

                            result.items = list;
                            resolve(result)

                        });

                    });
                } else {
                    result.items = [];
                    resolve(result)
                }
            });
        });
    }

    public deleteOne(model:string, id:number | string):Promise < IDeleteResult > {
        var result:IDeleteResult = <IDeleteResult>{};
        var fields = this.schemaList[model].getFields();
        return new Promise((resolve, reject)=> {
            MySQL.staticInstance.query(`DELETE FROM \`${model}\` WHERE id = ${id}}`, (err, deleteResult)=> {
                if (err) {
                    result.error = new Err(Err.Code.DBDelete);
                    reject(result);
                }
                for (var field in this.schemaList[model].getFields()) {
                    if (fields.hasOwnProperty(field) && fields[field].properties.type == FieldType.Relation) {
                        this.removeRelation(model, field, 0)
                    }
                }
                result.items = [id];
            });
        });
    }

    public deleteAll(model:string, condition:Condition):Promise < IDeleteResult > {
        var sqlCondition = this.getCondition(condition);
        var result:IDeleteResult = <IDeleteResult>{};
        return new Promise((resolve, reject)=> {
            MySQL.staticInstance.query(`SELECT id FROM \`${model}\` ${sqlCondition ? `WHERE ${sqlCondition}` : ''}`, (err, list)=> {
                if (err) {
                    result.error = new Err(Err.Code.DBQuery);
                    reject(result);
                }
                var ids = [];
                for (var i = list.length; i--;) {
                    ids.push(list[i].id);
                }
                if (ids.length) {
                    MySQL.staticInstance.query(`DELETE FROM \`${model}\` WHERE id IN ${ids.join(',')}}`, (err, deleteResult)=> {
                        if (err) {
                            result.error = new Err(Err.Code.DBDelete);
                            reject(result);
                        }
                        result.items = ids;
                        resolve(result)
                    });
                } else {
                    result.items = [];
                    resolve(result)
                }
            });
        });
    }

    private getAnalysedValue<T>(model:string, value:T) {
        var properties = [];
        var schemaFieldsName = this.schemaList[model].getFieldsNames();
        var schemaFields = this.schemaList[model].getFields();
        var relations = {};
        for (var key in value) {
            if (value.hasOwnProperty(key) && schemaFieldsName.indexOf(key) >= 0 && value[key] !== undefined) {
                if (schemaFields[key].properties.type != FieldType.Relation) {
                    properties.push({field: key, value: value})
                } else {
                    relations[key] = value[key]
    }

            }
        }
        return {
            properties: properties,
            relations: relations,
        }
    }

    private getQueryParams(query:Vql):ICalculatedQueryOptions {
        var params:ICalculatedQueryOptions = <ICalculatedQueryOptions>{};
        query.offset = query.offset ? query.offset : (query.page ? query.page - 1 : 0 ) * query.limit;
        params.limit = `LIMIT ${query.offset ? query.offset : 0 }, ${query.limit ? query.limit : 50 } `;
        params.orderBy = '';
        if (query.orderBy.length) {
            var orderArray = [];
            for (var i = 0; i < query.orderBy.length; i--) {
                orderArray.push(`\`${query.model}\`.${query.orderBy[i].field} ${query.orderBy[i].ascending ? 'ASC' : 'DESC'}`);
            }
            params.orderBy = `ORDER BY ${orderArray.join(',')}`;
        }
        var fields:Array<string> = [];
        var modelFields = this.schemaList[query.model].getFields();
        if (query.fields && query.fields.length) {
            for (var i = 0; i < query.fields.length; i++) {
                fields.push(`\`${query.model}\`.${query.fields[i]}`)
            }
        } else {
            for (var key in modelFields) {
                if (modelFields.hasOwnProperty(key)) {
                    if (modelFields[key].properties.type != FieldType.Relation) {
                        fields.push(`\`${query.model}\`.${modelFields[key].fieldName}`);
                    } else if ((!query.relations || query.relations.indexOf(modelFields[key].fieldName) < 0) && modelFields[key].properties.relation.type != Relationship.Type.Many2Many) {
                        fields.push(`\`${query.model}\`.${modelFields[key].fieldName}`);
                    }
                }
            }
    }

        for (var i = 0; i < query.relations.length; i++) {
            var relationName:string = typeof query.relations[i] == 'string' ? query.relations[i] : query.relations[i]['name'];
            var field:Field = modelFields[relationName];
            if (!field) {
                throw `FIELD ${relationName} NOT FOUND IN model ${query.model}`
    }
            var properties = field.properties;
            if (properties.type == FieldType.Relation) {
                if (properties.relation.type == Relationship.Type.One2Many || properties.relation.type == Relationship.Type.One2One) {
                    var relatedModelName = properties.relation.model.schema.name;
                    var modelFiledList = [];
                    var filedNameList = properties.relation.model.schema.getFieldsNames();
                    var relatedModelFields = properties.relation.model.schema.getFields();
                    for (var j = 0; j < filedNameList.length; j++) {

                        if (typeof query.relations[i] == 'string' || query.relations[i]['fields'].indexOf(filedNameList[j]) >= 0) {
                            if (relatedModelFields[filedNameList[j]].properties.type != FieldType.Relation || relatedModelFields[filedNameList[j]].properties.relation.type != Relationship.Type.Many2Many) {
                                modelFiledList.push(`'"${filedNameList[j]}":','"',${this.qoute(filedNameList[j])},'"'`)
                            }
                        }
                    }
                    modelFiledList.length && fields.push(`(SELECT CONCAT('{',${modelFiledList.join(',",",')},'}') FROM ${properties.relation.model.schema.name} WHERE \`${relatedModelName}\`.id = ${query.model}.${field.fieldName}  LIMIT 1) as ${field.fieldName}`)
                }
            }
    }
        params.fields = fields.join(',');
        params.condition = '';
        if (query.condition) {
            params.condition = this.getCondition(query.condition);
            params.condition = params.condition ? `WHERE ${params.condition}` : '';
        }
        return params;
    }

    private getCondition(condition:Condition) {
        var operator = this.getOperatorSymbol(condition.operator);
        if (!condition.isConnector) {
            return `(${condition.comparison.field} ${operator} ${condition.comparison.isValueOfTypeField ? condition.comparison.value : `'${condition.comparison.value}'`})`;
        } else {
            var childrenCondition = [];
            for (var i = 0; i < condition.children.length; i++) {
                childrenCondition.push(this.getCondition(condition.children[i]));
            }
            return `(${childrenCondition.join(` ${operator} `)})`;
        }
    }

    private getManyToManyRelation(list:Array < any >, query:Vql) {
        var ids = [];
        var runRelatedQuery = (i)=> {
            var relationName = typeof query.relations[i] == 'string' ? query.relations[i] : query.relations[i]['name'];
            var relationship = this.schemaList[query.model].getFields()[relationName].properties.relation;
            var fields = '*';
            if (typeof query.relations[i] != 'string') {
                for (var j = query.relations[i]['fields'].length; j--;) {
                    query.relations[i]['fields'][j] = `\`${query.relations[i]['fields'][j]}\``;
                }
                fields = query.relations[i]['fields'].join(',');
            }
            return new Promise((resolve, reject)=> {
                var leftKey = this.camelCase(query.model);
                var rightKey = this.camelCase(relationship.model.schema.name);
                MySQL.staticInstance.query(`SELECT ${fields},r.${leftKey},r.${rightKey}  FROM \`${relationship.model.schema.name}\` m 
                LEFT JOIN \`${query.model + 'Has' + this.pascalCase(relationName)}\` r 
                ON (m.id = r.${rightKey}) 
                WHERE r.${leftKey} IN (${ids.join(',')})`, (err, relatedList)=> {
                    if (err) {
                        reject(err);
                    }
                    var result = {};
                    result[relationName] = relatedList;
                    resolve(result);
                })
            });

        };
        for (var i = list.length; i--;) {
            ids.push(list[i]['id']);
        }
        var relations:Array<Promise<any>> = [];
        if (ids.length && query.relations && query.relations.length) {
            for (var i = query.relations.length; i--;) {
                var relationName = typeof query.relations[i] == 'string' ? query.relations[i] : query.relations[i]['name'];
                var relationship = this.schemaList[query.model].getFields()[relationName].properties.relation;
                if (relationship.type == Relationship.Type.Many2Many) {
                    relations.push(runRelatedQuery(i))
                }
            }
        }
        if (!relations.length) return Promise.resolve(list);
        return Promise.all(relations)
            .then(data=> {
                for (var i = data.length; i--;) {
                    for (var related in data[i]) {
                        if (data[i].hasOwnProperty(related)) {
                            for (var k = list.length; k--;) {
                                var id = list[k]['id'];
                                list[k][related] = [];
                                for (var j = data[i][related].length; j--;) {
                                    if (id == data[i][related][j][this.camelCase(query.model)]) {
                                        list[k][related].push(data[i][related][j]);
                                    }
    }

    }
                        }
                    }
                }
                return list;
            });

    }

    private normalizeList(schema:Schema, list:Array < any >) {
        var fields:IModelFields = schema.getFields();
        for (var i = list.length; i--;) {
            for (var key in list[i]) {
                if (list[i].hasOwnProperty(key) &&
                    fields.hasOwnProperty(key) &&
                    fields[key].properties.type == FieldType.Relation &&
                    fields[key].properties.relation.type != Relationship.Type.Many2Many) {

                    list[i][key] = this.parseJson(list[i][key]);
                }
            }
            }
        return list;
        }

    private parseJson(str) {
        var search = ['\n', '\b', '\r', '\t', '\v', '\''];
        var replace = ['\\n', '\\b', '\\r', '\\t', '\\v', "\\'"];
        for (var i = search.length; i--;) {
            str = str.replace(search[i], replace[i]);
    }
        return JSON.parse(str);

    }

    private createTable(schema:Schema) {
        var fields = schema.getFields();
        var createDefinition = this.createDefinition(fields, schema.name);
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

    private relationTable(field:Field, table:string):Promise < any > {
        var schema = new Schema(table + 'Has' + this.pascalCase(field.fieldName));
        schema.addField('id').primary().required();
        schema.addField(this.camelCase(table)).type(FieldType.Integer).required();
        schema.addField(this.camelCase(field.properties.relation.model.schema.name)).type(FieldType.Integer).required();
        return this.createTable(schema)();
    }

    private camelCase(str) {
        return str[0].toLowerCase() + str.slice(1)
    }

    private pascalCase(str) {
        return str[0].toUpperCase() + str.slice(1)
    }

    private qoute(str) {
        return `\`${str}\``;
    }

    private createDefinition(fields:IModelFields, table:string, checkMultiLingual = true) {
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
                    relations.push(this.relationTable(fields[field], table));
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
        if (properties.relation && properties.relation.type == Relationship.Type.Many2Many) {
            return '';
        }
        var columnSyntax = `\`${filed.fieldName}\` ${this.getType(properties)}`;
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
                typeSyntax = `INT(${properties.max ? properties.max.toString(2).length : 20})`;
                break;
            case FieldType.Object:
                typeSyntax = `BLOB`;
                break;
            case FieldType.Text:
                typeSyntax = `TEXT`;
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

    private addOneToManyRelation<T>(model:T, relation:string, value:number|{[property:string]}):Promise<IUpsertResult<T>> {
        var result:IUpsertResult<T> = <IUpsertResult<T>>{};
        var modelName = model.constructor['schema'].name;
        var fields = this.schemaList[modelName].getFields();
        if (fields[relation] && fields[relation].properties.type == FieldType.Relation
            && fields[relation].properties.relation.type != Relationship.Type.Many2Many) {
            if (+value > 0) {
                return new Promise((resolve, reject)=> {
                    MySQL.staticInstance.query(`UPDATE \`${modelName}\` SET \`${relation}\` = '${value}' WHERE id='${model.id}' `, (err, updateResult)=> {
                        if (err) {
                            reject(new Err(Err.Code.DBUpdate));
                        }
                        result.items = updateResult;
                        resolve(result);
                    })
                })
            } else if (fields[relation].properties.relation.isWeek) {
                return this.insertOne(fields[relation].properties.relation.model.schema.name, value);
            }
        }
    }

    private addManyToManyRelation<T,M>(model:T, relation:string, value:number|Array<number>|M|Array<M>):Promise<IUpsertResult<M>> {
        var result:IUpsertResult<T> = <IUpsertResult<T>>{};
        var modelName = model.constructor['schema'].name;
        var fields = this.schemaList[modelName].getFields();
        var relatedModelName = fields[relation].properties.relation.model.schema.name;
        var newRelation = [];
        var relationIds = [];
        if (fields[relation] && fields[relation].properties.type == FieldType.Relation
            && fields[relation].properties.relation.type == Relationship.Type.Many2Many) {
            if (+value > 0) {
                relationIds.push(value);
            } else if (value instanceof Array) {
                for (var i = value['length']; i--;) {
                    if (+value[i]) {
                        relationIds.push(+value[i])
                    } else if (typeof value[i] == 'object' && fields[relation].properties.relation.isWeek) {
                        newRelation.push(value[i])
                    }
                }
            } else if (typeof value == 'object' && fields[relation].properties.relation.isWeek) {
                newRelation.push(value)
            }
            } else {
            return Promise.reject(new Err(Err.Code.DBInsert));
        }
        return new Promise(
            (resolve, reject)=> {
                if (!newRelation.length) {
                    resolve(relationIds);
                }
                this.insert(relatedModelName, newRelation)
                    .then(result=> {
                        for (var i = result.items.length; i--;) {
                            relationIds.push(result.items[i].id);
                        }
                        resolve(relationIds)
                    })
                    .catch(()=> {
                        reject(new Err(Err.Code.DBInsert));
                    })
            })
            .then(relationIds=> {
                var insertList = [];
                for (var i = relationIds.length; i--;) {
                    insertList.push(`(${model.id},${relationIds[i]})`);
                }
                return new Promise((resolve, reject)=> {
                    MySQL.staticInstance.query(`INSERT INTO ${modelName}Has${this.pascalCase(relation)} 
                    (\`${this.camelCase(modelName)}\`,\`${this.camelCase(relatedModelName)}\`) VALUES ${insertList.join(',')}`, (err, insertResult)=> {
                        if (err) {
                            reject(new Err(Err.Code.DBInsert));
                        }
                        result.items = insertResult;
                        resolve(result);
                    })

                })
            });

    }

    private removeOneToManyRelation<T>(model:string, relation:string, condition:Condition) {
        var paredCondition = this.getCondition(condition);
        var result:IUpsertResult<T> = <IUpsertResult<T>>{};
        var relatedModelName = this.schemaList[model].getFields()[relation].properties.relation.model.schema.name;
        var vql = new Vql(model);
        vql.select('id').where(condition);
        this.findByQuery(vql)
            .then(result=> {
                var deleteVql = new Vql(relatedModelName).select('id').where(new Condition(Condition.Operator.Or));
                for (var i = result.items.length; i--;) {
                    deleteVql.condition.append(new Condition(Condition.Operator.EqualTo).compare('id', result.items[i][relation]))
                }
            });
        return new Promise((resolve, reject)=> {
            MySQL.staticInstance.query(`UPDATE \`${model}\` SET ${relation} = 0 WHERE ${paredCondition}`, (err, updateResult)=> {
                if (err) {
                    reject(new Err(Err.Code.DBUpdate))
                } else {
                    result.items = updateResult;
                    resolve(result);
                    if (this.schemaList[model].getFields()[relation].properties.relation.isWeek) {
                        this.deleteOne(relatedModelName, id);
                    }
                }

            });

        })
    }

    private removeManyToManyRelation<T>(model:string, relation:string, condition:Condition, ids?:Array<number>) {
        var paredCondition = this.getCondition(condition);
        var result:IUpsertResult<T> = <IUpsertResult<T>>{};
        var relatedModelName = this.schemaList[model].getFields()[relation].properties.relation.model.schema.name;
        return new Promise((resolve, reject)=> {
            MySQL.staticInstance.query(`DELETE FROM ${model}Has${this.pascalCase(relation)}  
            WHERE \`${this.camelCase(model)}\` = ${model.id} AND \'${this.camelCase(relatedModelName)}\' IN (${ids.join(',')})`, (err, updateResult)=> {
                if (err) {
                    reject(new Err(Err.Code.DBUpdate))
                } else {
                    result.items = updateResult;
                    resolve(result);
                    if (this.schemaList[model].getFields()[relation].properties.relation.isWeek) {
                        MySQL.staticInstance.query(`DELETE FROM \`${relatedModelName}\` WHERE id IN (${ids.join(',')}})`);
                    }
            }
        });
        })

    }

}