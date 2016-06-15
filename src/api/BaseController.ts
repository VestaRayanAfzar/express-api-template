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
        var user = req.session.get('user');
        user = user || {roleGroups: [{name: this.setting.security.guestRoleName}]};
        return new User(user) ;
    }

    public abstract route(router:Router):void;

    protected checkAcl(resource:string, action:string) {
        this.acl.addResource(resource, action);
        return (req:Request, res:Response, next:NextFunction)=> {
        if ((<IExtRequest>req).session) {
                var user:IUser = (<IExtRequest>req).session.get<IUser>('user');
                if (!user) user = {roleGroups: [{name: this.setting.security.guestRoleName}]};
                for (var i = user.roleGroups.length; i--;) {
                    if (this.acl.isAllowed((<IRole>user.roleGroups[i]).name, resource, action)) {
                return next();
            }
        }
    }
            this.handleError(res, Err.Code.Forbidden, 'Access to this edge is forbidden');
        }
    }

    protected handleError(res:Response, code:number = 500, message:string = ''):void {
        var err = new Err(code, message);
        if (code) {
            res.status(code);
        }
        res.json({error: err});
    }
}