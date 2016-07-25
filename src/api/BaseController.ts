import * as fs from "fs";
import {Router, Request, Response, NextFunction} from "express";
import {Session} from "../session/Session";
import {IServerAppSetting} from "../config/setting";
import {Database} from "vesta-schema/Database";
import {IUser, User} from "../cmn/models/User";
import {Err} from "vesta-util/Err";
import {Acl} from "../helpers/Acl";
import {IRole} from "../cmn/models/Role";

export interface IExtRequest extends Request {
    sessionDB:Database;
    session:Session;
}

export abstract class BaseController {

    constructor(protected setting:IServerAppSetting, protected acl:Acl, protected database:Database) {
        this.init();
    }

    protected init() {
    }

    protected user(req) {
        let user = req.session.get('user');
        user = user || {roleGroups: [{name: this.setting.security.guestRoleName}]};
        return new User(user);
    }

    public abstract route(router:Router):void;

    protected checkAcl(resource:string, action:string) {
        this.acl.addResource(resource, action);
        return (req:Request, res:Response, next:NextFunction)=> {
            if ((<IExtRequest>req).session) {
                let user:IUser = (<IExtRequest>req).session.get<IUser>('user');
                if (!user) user = {roleGroups: [{name: this.setting.security.guestRoleName}]};
                for (let i = user.roleGroups.length; i--;) {
                    if (this.acl.isAllowed((<IRole>user.roleGroups[i]).name, resource, action)) {
                        return next();
                    }
                }
            }
            this.handleError(res, Err.Code.Forbidden, 'Access to this edge is forbidden');
        }
    }

    public resolve():Promise<boolean> {
        return null;
    }

    protected handleError(res:Response, error:Err);
    protected handleError(res:Response, code:number, message?:string);
    protected handleError(res:Response, code:any, message?:any):void {
        let err:Err;
        if (typeof code == 'number') {
            err = new Err(code, message);
        } else {
            err = <Err>code;
            if (this.setting.env == 'production') {
                err = new Err(Err.Code.Server, `Something goes wrong (Production Mode)`);
        }
        }
        res.status(code < Err.Code.Client ? Err.Code.Server : code);
        res.json(err);
    }

    protected checkAndDeleteFile(filePath:string):Promise<string> {
        return new Promise((resolve, reject)=> {
            fs.exists(filePath, exists=> {
                if (exists) return fs.unlink(filePath, err=> err ? reject(err) : resolve(filePath));
                resolve(filePath);
            })
        })
    }
}