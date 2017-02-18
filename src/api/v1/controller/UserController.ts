import {Response, Router} from "express";
import {BaseController, IExtRequest} from "../../BaseController";
import {Err} from "vesta-util/Err";
import {ValidationError} from "vesta-schema/error/ValidationError";
import {User, IUser} from "../../../cmn/models/User";
import {IUpsertResult} from "vesta-schema/ICRUDResult";
import {Vql} from "vesta-schema/Vql";
import {Permission} from "../../../cmn/models/Permission";


export class UserController extends BaseController {
    public route(router: Router) {
        router.get('/acl/user/count', this.checkAcl('user', Permission.Action.Read), this.getUsersCount.bind(this));
        router.get('/acl/user/:id', this.checkAcl('user', Permission.Action.Read), this.getUser.bind(this));
        router.get('/acl/user', this.checkAcl('user', Permission.Action.Read), this.getUsers.bind(this));
        router.post('/acl/user', this.checkAcl('user', Permission.Action.Add), this.addUser.bind(this));
        router.put('/acl/user', this.checkAcl('user', Permission.Action.Edit), this.updateUser.bind(this));
        router.delete('/acl/user', this.checkAcl('user', Permission.Action.Delete), this.removeUser.bind(this));
    }

    protected init() {
    }

    public getUsersCount(req: IExtRequest, res: Response, next: Function) {
        let query = new Vql('User');
        query.filter(req.query.query);
        User.count(query)
            .then(result=>res.json(result))
            .catch(reason=>this.handleError(res, Err.Code.DBQuery, reason.error.message));
    }

    public getUser(req: IExtRequest, res: Response, next: Function) {
        User.findById<IUser>(req.params.id)
            .then(result=> {
                if (result.items.length) {
                    delete result.items[0].password;
                }
                res.json(result);
            })
            .catch(reason=> this.handleError(res, Err.Code.DBQuery, reason.error.message));
    }

    public getUsers(req: IExtRequest, res: Response, next: Function) {
        var query = new Vql('User')
            .filter(req.query.query)
            .limitTo(Math.min(+req.query.limit || 50, 50))
            .fromPage(+req.query.page || 0);
        if (req.query.orderBy) {
            let orderBy = req.query.orderBy[0];
            query.sortBy(orderBy.field, orderBy.ascending == 'true');
        }
        User.findByQuery<IUser>(query)
            .then(result=> {
                if (result.items.length) {
                    result.items.forEach(item=> delete item.password);
                }
                res.json(result)
            })
            .catch(reason=> this.handleError(res, Err.Code.DBQuery, reason.error.message));
    }

    public addUser(req: IExtRequest, res: Response, next: Function) {
        var user = new User(req.body),
            validationError = user.validate();
        if (validationError) {
            var result: IUpsertResult<IUser> = <IUpsertResult<IUser>>{};
            result.error = new ValidationError(validationError);
            return res.json(result);
        }
        user.insert<IUser>()
            .then(result=> res.json(result))
            .catch(reason=> this.handleError(res, Err.Code.DBInsert, reason.error.message));
    }

    public updateUser(req: IExtRequest, res: Response, next: Function) {
        var user = new User(req.body),
            validationError = user.validate();
        if (validationError) {
            var result: IUpsertResult<IUser> = <IUpsertResult<IUser>>{};
            result.error = new ValidationError(validationError);
            return res.json(result);
        }
        User.findById<IUser>(user.id)
            .then(result=> {
                if (result.items.length == 1) return user.update().then(result=>res.json(result));
                this.handleError(res, Err.Code.DBUpdate);
            })
            .catch(reason=> this.handleError(res, Err.Code.DBUpdate, reason.error.message));
    }

    public removeUser(req: IExtRequest, res: Response, next: Function) {
        var user = new User({id: req.body.id});
        user.delete()
            .then(result=> res.json(result))
            .catch(reason=> this.handleError(res, Err.Code.DBDelete, reason.error.message));
    }
}