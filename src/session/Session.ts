import * as uuid from "node-uuid";
import {Database} from "vesta-schema/Database";
import {ISessionSetting} from "../config/setting";
import {DatabaseFactory} from "../helpers/DatabaseFactory";
import {Redis} from "vesta-driver-redis";
import {Logger} from "../helpers/Logger";

export interface ISessionData {
    payload: any;
    meta: {
        id: string;
        lastTime: number;
        persist?: boolean;
    }
}

export class Session {
    private static setting: ISessionSetting;
    private static db: Database;
    public sessionId: string;
    public isExpired = false;
    public sessionData: ISessionData;

    constructor(data: ISessionData, persist?: boolean) {
        let setting = Session.setting;
        let now = Date.now();
        if (data) {
            // restoring session
            if (!data.meta.persist && now - data.meta.lastTime > setting.maxAge) {
                this.isExpired = true;
            } else {
                data.meta.lastTime = now;
            }
            this.sessionData = data;
        } else {
            // creating new session
            this.sessionData = {
                payload: {},
                meta: {
                    id: setting.idPrefix + uuid.v4(),
                    lastTime: now,
                    persist: !!persist
                }
            }
        }
        this.sessionId = this.sessionData.meta.id;
    }

    public static init(setting: ISessionSetting) {
        Session.setting = setting;
        DatabaseFactory.register('sesDatabase', Session.setting.database, Redis);
        return DatabaseFactory.getInstance('sesDatabase')
            .then(connection => {
                Session.db = connection;
            })
    }

    public static create(persist?: boolean): Promise<Session> {
        let session = new Session(null, persist);
        return Session.db.insertOne(session.sessionId, JSON.stringify(session.sessionData))
            .then(() => session);
    }

    public static restore(sessionId: string): Promise<Session> {
        return Session.db.findById<ISessionData>(sessionId)
            .then(data => {
                if (!data.error && data.items.length) {
                    let session = new Session(data.items[0]);
                    if (session.isExpired) {
                        Logger.getInstance().warn(`Session Expired {ID: "${session.sessionId}", PAYLOAD: ${JSON.stringify(session.sessionData.payload)}}`);
                        session.destroy();
                        return null;
                    }
                    return session;
                }
                return null;
            });
    }

    public set(name: string, value: any) {
        this.sessionData.payload[name] = value;
        Session.db.insertOne(this.sessionId, JSON.stringify(this.sessionData));
    }

    public get<T>(name: string) {
        return <T>this.sessionData.payload[name];
    }

    public remove(name: string) {
        let value = this.sessionData.payload[name];
        delete this.sessionData.payload[name];
        Session.db.insertOne(this.sessionId, JSON.stringify(this.sessionData));
        return value;
    }

    public destroy() {
        this.sessionData = <ISessionData>{};
        Session.db.insertOne(this.sessionId, '');
    }
}
