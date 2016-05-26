import * as uuid from "node-uuid";
import {Response} from "express";
import {JWT} from "../helpers/JWT";
import {Database} from "vesta-schema/Database";

export class Session {
    private storage = {};

    constructor(private sessionId:string, data:any, private db:Database) {
        this.storage = data;
    }

    public set(name:string, value:any) {
        this.storage[name] = value;
        this.db.insertOne(this.sessionId, JSON.stringify(this.storage));
    }

    public get<T>(name:string) {
        return <T>this.storage[name];
    }

    public remove(name:string) {
        var value = this.storage[name];
        delete this.storage[name];
        this.db.insertOne(this.sessionId, JSON.stringify(this.storage));
        return value;
    }

    public destroy() {
        this.storage = {};
        this.db.insertOne(this.sessionId, '');
    }

    public static createSession(db:Database, idPrefix:string, data:any, res:Response):Promise<Session> {
        var sessionId = uuid.v4();
        var dbSessionId = idPrefix + sessionId;
        return new Promise<Session>((resolve, reject)=> {
            db.insertOne(dbSessionId, JSON.stringify(data)).then(()=> {
                var session = new Session(dbSessionId, data, db);
                var token = JWT.sign({sessionId: sessionId});
                res.set('X-Auth-Token', token);
                resolve(session);
            });
        })
    }
}
