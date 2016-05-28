import {Router, Request, Response, NextFunction} from "express";
import {Session} from "../session/Session";
import {IServerAppSetting} from "../config/setting";
import {Database} from "vesta-schema/Database";
import {IUser} from "../cmn/models/User";
import {Err} from "vesta-util/Err";

export interface IExtRequest extends Request {
    sessionDB:Database;
    session:Session;
}

export abstract class BaseController {

    constructor(protected setting:IServerAppSetting, protected database:Database) {
        this.init();
    }

    protected init() {

    }

    public abstract route(router:Router):void;

    protected auth(req:Request, res:Response, next:NextFunction) {
        if ((<IExtRequest>req).session) {
            var user = (<IExtRequest>req).session.get<IUser>('user');
            if (user && user.id) {
                return next();
            }
        }
        this.handleError(res, 'Unauthorized', 401);
    }

    protected acl(resource:string) {
        return (req:Request, res:Response, next:NextFunction)=> {
            this.auth(req, res, next);
        }
    }

    protected handleError(res:Response, message:string, code:number = 500):void {
        var err = new Err(code, message);
        if (code) {
            res.status(code);
        }
        res.json({error: err});
    }
}