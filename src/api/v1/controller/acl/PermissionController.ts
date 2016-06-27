import {Response, Router} from "express";
import {BaseController, IExtRequest} from "../../../BaseController";
import {Err} from "vesta-util/Err";
import {ValidationError} from "vesta-schema/error/ValidationError";
import {Permission, IPermission} from "../../../../cmn/models/Permission";
import {IUpsertResult} from "vesta-schema/ICRUDResult";
import {Vql} from "vesta-schema/Vql";


export class PermissionController extends BaseController {

    public route(router:Router) {
        router.get('/permission/:id', this.checkAcl('acl.permission', 'read'), this.getPermission.bind(this));
        router.get('/permission', this.checkAcl('acl.permission', 'read'), this.getPermissions.bind(this));
        router.put('/permission', this.checkAcl('acl.permission', 'update'), this.updatePermission.bind(this));
    }

    protected init() {

    }

    public getPermission(req:IExtRequest, res:Response, next:Function) {
        Permission.findById<IPermission>(req.params.id)
            .then(result=> res.json(result))
            .catch(reason=> this.handleError(res, Err.Code.DBQuery, reason.error.message));
    }

    public getPermissions(req:IExtRequest, res:Response, next:Function) {
        var query = new Vql('Permission');
        query.filter(req.params.query);
        Permission.findByQuery(query)
            .then(result=>res.json(result))
            .catch(reason=>this.handleError(res, Err.Code.DBQuery, reason.error.message));
    }


    public updatePermission(req:IExtRequest, res:Response, next:Function) {
        var permission = new Permission(req.body),
            validationError = permission.validate();
        if (validationError) {
            var result:IUpsertResult<IPermission> = <IUpsertResult<IPermission>>{};
            result.error = new ValidationError(validationError);
            return res.json(result);
        }
        Permission.findById<IPermission>(permission.id)
            .then(result=> {
                if (result.items.length == 1) {
                    result.items[0].status = permission.status;
                    permission.setValues(result.items[0]);
                    return permission.update().then(result=> {
                        this.acl.initAcl();
                        res.json(result);
                    });
                }
                this.handleError(res, Err.Code.DBUpdate);
            })
            .catch(reason=> this.handleError(res, Err.Code.DBUpdate, reason.error.message));
    }
}