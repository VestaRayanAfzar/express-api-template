import {Response, Router} from "express";
import {BaseController, IExtRequest} from "../../BaseController";
import {Err} from "vesta-util/Err";
import {ValidationError} from "vesta-schema/error/ValidationError";
import {User, IUser} from "../../../cmn/models/User";
import {IUpsertResult, IQueryResult} from "vesta-schema/ICRUDResult";
import {Session} from "../../../session/Session";
import {IRequestResult} from "vesta-util/IRequestResult";
import {RoleGroup} from "../../../cmn/models/RoleGroup";
import {Hashing} from "../../../helpers/Hashing";
import {Permission} from "../../../cmn/models/Permission";


export class AccountController extends BaseController {

    public route(router: Router) {
        router.get('/me', this.getMe.bind(this));
        router.put('/account', this.checkAcl('account', Permission.Action.Edit), this.update.bind(this));
        router.post('/account', this.checkAcl('account', 'register'), this.register.bind(this));
        router.post('/account/login', this.checkAcl('account', 'login'), this.login.bind(this));
        router.get('/account/logout', this.checkAcl('account', 'logout'), this.logout.bind(this));
    }

    protected init() {
    }

    public register(req: IExtRequest, res: Response, next: Function) {
        var user = new User(req.body),
            result: IUpsertResult<IUser> = <IUpsertResult<IUser>>{},
            validationError = user.validate();
        if (validationError) {
            result.error = new ValidationError(validationError);
            return res.json(result);
        }
        user.password = Hashing.withSalt(user.password);
        user.insert<User>()
            .then(result=> {
                result.items[0].password = '';
                user.setValues(result.items[0]);
                req.session && req.session.destroy();
                Session.createSession(req.sessionDB, this.setting.security.session.idPrefix, {}, res)
                    .then(session=> {
                        req.session = session;
                        req.session.set('user', user.getValues());
                        res.json(result);
                    })

            })
            .catch(reason=> this.handleError(res, Err.Code.DBInsert, reason.error.message));
    }

    private updateGroupRoles(roleGroups: Array<RoleGroup>): Array<RoleGroup> {
        for (var i = roleGroups.length; i--;) {
            if (roleGroups[i]['status']) {
                roleGroups[i]['roles'] = this.acl.getGroupRoles(roleGroups[i]['name']);
            } else {
                roleGroups.slice(i)
            }
        }
        return roleGroups;
    }

    public login(req: IExtRequest, res: Response, next: Function) {
        var user = new User(req.body);
        user.password = Hashing.withSalt(user.password);
        User.findByModelValues<IUser>({username: user.username, password: user.password}, {
            relations: [{
                name: 'roleGroups',
                fields: ['id', 'name', 'status']
            }]
        }).then(result=> {
            if (!result.items.length) {
                return res.json(result);
            }
            result.items[0]['roleGroups'] = this.updateGroupRoles(<Array<RoleGroup>>result.items[0]['roleGroups']);
            result.items[0].password = '';
            user.setValues(result.items[0]);
            req.session && req.session.destroy();
            Session.createSession(req.sessionDB, this.setting.security.session.idPrefix, {}, res)
                .then(session=> {
                    req.session = session;
                    req.session.set('user', user.getValues());
                    res.json(result);
                })
        }).catch(reason=> this.handleError(res, Err.Code.DBQuery, reason.error.message));

    }

    public logout(req: IExtRequest, res: Response, next: Function) {
        var result: IRequestResult<boolean> = <IRequestResult<boolean>>{};
        User.findById<IUser>(this.user(req).id)
            .then(result=> {
                if (!result.items.length) {
                    return Promise.reject(new Error('logout failed'));
                }
            })
            .then(data=> {
                req.session && req.session.destroy();
                Session.createSession(req.sessionDB, this.setting.security.session.idPrefix, {}, res)
                    .then(session=> this.getMe(req, res, next))
            })
            .catch(reason=> this.handleError(res, Err.Code.DBQuery, reason.error.message));
    }

    public getMe(req: IExtRequest, res: Response, next: Function) {
        var user = this.user(req);
        if (user.id) {
            User.findById<IUser>(user.id, {relations: [{name: 'roleGroups', fields: ['id', 'name', 'status']}]})
                .then(result=> {
                    result.items[0]['roleGroups'] = this.updateGroupRoles(<Array<RoleGroup>>result.items[0]['roleGroups']);
                    result.items[0].password = '';
                    res.json(result)
                })
                .catch(reason=> this.handleError(res, Err.Code.DBQuery, reason.error.message));
        } else {
            var guest = <IUser>{
                username: this.setting.security.guestRoleName,
                roleGroups: this.updateGroupRoles(<Array<RoleGroup>>[{
                    status: true,
                    name: this.setting.security.guestRoleName
                }])
            };
            res.json(<IQueryResult<IUser>>{items: [guest]});
        }
    }

    public update(req: IExtRequest, res: Response, next: Function) {
        var user = new User(req.body),
            validationError = user.validate();
        user.id = this.user(req).id;
        if (validationError) {
            var result: IUpsertResult<IUser> = <IUpsertResult<IUser>>{};
            result.error = new ValidationError(validationError);
            return res.json(result);
        }
        User.findById<IUser>(user.id)
            .then(result=> {
                if (result.items.length == 1) return user.update<IUser>().then(result=>res.json(result));
                this.handleError(res, Err.Code.DBUpdate);
            })
            .catch(reason=> this.handleError(res, Err.Code.DBUpdate, reason.error.message));
    }
}