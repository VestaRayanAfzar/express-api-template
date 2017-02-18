import {Response, Router} from "express";
import {BaseController, IExtRequest} from "../../../BaseController";
import {Err} from "vesta-util/Err";
import {ValidationError} from "vesta-schema/error/ValidationError";
import {Permission, IPermission} from "../../../../cmn/models/Permission";
import {Vql} from "vesta-schema/Vql";
import {DatabaseError} from "vesta-schema/error/DatabaseError";


export class PermissionController extends BaseController {

    public route(router: Router) {
        router.get('/acl/permission/:id', this.checkAcl('acl.permission', Permission.Action.Read), this.getPermission.bind(this));
        router.get('/acl/permission', this.checkAcl('acl.permission', Permission.Action.Read), this.getPermissions.bind(this));
        router.put('/acl/permission', this.checkAcl('acl.permission', Permission.Action.Edit), this.updatePermission.bind(this));
    }

    protected init() {
    }

    public getPermission(req: IExtRequest, res: Response) {
        Permission.findById<IPermission>(req.params.id)
            .then(result => res.json(result))
            .catch(error => this.handleError(req, res, error));
    }

    public getPermissions(req: IExtRequest, res: Response) {
        let query = req.query.query,
            permission = new Permission(query),
            validationError = permission.validate(...Object.keys(query));
        if (validationError) {
            return this.handleError(req, res, new ValidationError(validationError))
        }
        let query = new Vql('Permission');
        query.filter(req.query.query);
        Permission.findByQuery(query)
            .then(result => res.json(result))
            .catch(error => this.handleError(req, res, error));
    }

    public updatePermission(req: IExtRequest, res: Response) {
        let permission = new Permission(req.body),
            validationError = permission.validate();
        if (validationError) {
            return this.handleError(req, res, new ValidationError(validationError));
        }
        Permission.findById<IPermission>(permission.id)
            .then(result => {
                if (result.items.length == 1) {
                    result.items[0].status = permission.status;
                    permission.setValues(result.items[0]);
                    return permission.update()
                        .then(result => {
                            this.acl.initAcl();
                            res.json(result);
                        });
                }
                throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord);
            })
            .catch(error => this.handleError(req, res, error));
    }
}