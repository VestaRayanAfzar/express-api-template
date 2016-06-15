import {Response, Router} from "express";
import {BaseController, IExtRequest} from "../../../BaseController";
import {Err} from "vesta-util/Err";
import {ValidationError} from "vesta-schema/error/ValidationError";
import {Role, IRole} from "../../../../cmn/models/Role";
import {IUpsertResult} from "vesta-schema/ICRUDResult";
import {Vql} from "vesta-schema/Vql";


export class RoleController extends BaseController {

    public route(router:Router) {
        router.get('/role/:id', this.checkAcl('acl.role', 'read'), this.getRole.bind(this));
        router.get('/role', this.checkAcl('acl.role', 'read'), this.getRoles.bind(this));
        router.post('/role', this.checkAcl('acl.role', 'create'), this.addRole.bind(this));
        router.put('/role', this.checkAcl('acl.role', 'update'), this.updateRole.bind(this));
        router.delete('/role', this.checkAcl('acl.role', 'delete'), this.removeRole.bind(this));
    }

    protected init() {

    }

    public getRole(req:IExtRequest, res:Response, next:Function) {
        Role.findById<IRole>(req.params.id, {relations: ['permissions']})
            .then(result=> res.json(result))
            .catch(err=> this.handleError(res, Err.Code.DBQuery, err.message));
    }

    public getRoles(req:IExtRequest, res:Response, next:Function) {
        var query = new Vql('Role');
        query.filter(req.params.query);
        Role.findByQuery(query)
            .then(result=>res.json(result))
            .catch(err=>this.handleError(res, Err.Code.DBQuery, err.message));
    }

    public addRole(req:IExtRequest, res:Response, next:Function) {
        var role = new Role(req.body),
            validationError = role.validate();
        if (validationError) {
            var result:IUpsertResult<IRole> = <IUpsertResult<IRole>>{};
            result.error = new ValidationError(validationError);
            return res.json(result);
        }
        role.insert<IRole>()
            .then(result=> res.json(result))
            .catch(err=> this.handleError(res, Err.Code.DBInsert, err.message));
    }

    public updateRole(req:IExtRequest, res:Response, next:Function) {
        var role = new Role(req.body),
            validationError = role.validate();
        if (validationError) {
            var result:IUpsertResult<IRole> = <IUpsertResult<IRole>>{};
            result.error = new ValidationError(validationError);
            return res.json(result);
        }
        Role.findById<IRole>(role.id)
            .then(result=> {
                if (result.items.length == 1) return role.update().then(result=>res.json(result));
                this.handleError(res, Err.Code.DBUpdate);
            })
            .catch(err=> this.handleError(res, Err.Code.DBUpdate, err.message));
    }

    public removeRole(req:IExtRequest, res:Response, next:Function) {
        Role.findById<IRole>(+req.body.id)
            .then(result=> {
                if (!result.items.length) {
                    return Promise.reject(new Error('not found'));
                }
                if (result.items[0].name == this.setting.security.adminRoleName && result.items[0].name == this.setting.security.guestRoleName) {
                    return this.handleError(res, Err.Code.Forbidden, 'admin and guest role are required');
                }
                var role = new Role({id: req.body.id});
                return role.delete().then(result=> res.json(result))
            })
            .catch(err=> this.handleError(res, Err.Code.DBDelete, err.message));


    }
}