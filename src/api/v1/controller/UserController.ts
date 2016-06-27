import {Response, Router} from "express";
import {BaseController, IExtRequest} from "../../BaseController";
import {Err} from "vesta-util/Err";
import {ValidationError} from "vesta-schema/error/ValidationError";
import {User, IUser} from "../../../cmn/models/User";
import {IUpsertResult} from "vesta-schema/ICRUDResult";
import {Vql} from "vesta-schema/Vql";

export class UserController extends BaseController {

    public route(router:Router) {
        router.get('/acl/user/:id', this.checkAcl('acl.user', 'read'), this.getUser.bind(this));
        router.get('/acl/user', this.checkAcl('acl.user', 'read'), this.getUsers.bind(this));
        router.post('/acl/user', this.checkAcl('acl.user', 'create'), this.addUser.bind(this));
        router.put('/acl/user', this.checkAcl('acl.user', 'update'), this.updateUser.bind(this));
        router.delete('/acl/user', this.checkAcl('acl.user', 'delete'), this.removeUser.bind(this));
    }

    protected init() {

    }

    public getUser(req:IExtRequest, res:Response, next:Function) {
        User.findById<IUser>(req.params.id)
            .then(result=> res.json(result))
            .catch(reason=> this.handleError(res, Err.Code.DBQuery, reason.error.message));
    }

    public getUsers(req:IExtRequest, res:Response, next:Function) {
        var query = new Vql('User')
            .filter(req.params.query)
            .limitTo(Math.max(+req.params.limit || 50, 50))
            .fromPage(+req.params.page || 0);

        User.findByQuery(query)
            .then(result=>res.json(result))
            .catch(reason=>this.handleError(res, Err.Code.DBQuery, reason.error.message));
    }

    public addUser(req:IExtRequest, res:Response, next:Function) {
        var user = new User(req.body),
            validationError = user.validate();
        if (validationError) {
            var result:IUpsertResult<IUser> = <IUpsertResult<IUser>>{};
            result.error = new ValidationError(validationError);
            return res.json(result);
        }
        user.insert<IUser>()
            .then(result=> res.json(result))
            .catch(reason=> this.handleError(res, Err.Code.DBInsert, reason.error.message));
    }

    public updateUser(req:IExtRequest, res:Response, next:Function) {
        var user = new User(req.body),
            validationError = user.validate();
        if (validationError) {
            var result:IUpsertResult<IUser> = <IUpsertResult<IUser>>{};
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

    public removeUser(req:IExtRequest, res:Response, next:Function) {
        var user = new User({id: req.body.id});
        user.delete()
            .then(result=> res.json(result))
            .catch(reason=> this.handleError(res, Err.Code.DBDelete, reason.error.message));
    }
}