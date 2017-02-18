import {Response, Router} from "express";
import {BaseController, IExtRequest} from "../../../BaseController";
import {Err} from "vesta-util/Err";
import {ValidationError} from "vesta-schema/error/ValidationError";
import {RoleGroup, IRoleGroup} from "../../../../cmn/models/RoleGroup";
import {IUpsertResult} from "vesta-schema/ICRUDResult";
import {Vql} from "vesta-schema/Vql";
import {Permission} from "../../../../cmn/models/Permission";


export class RoleGroupController extends BaseController {

    public route(router: Router) {
        router.get('/acl/roleGroup/:id', this.checkAcl('acl.roleGroup', Permission.Action.Read), this.getRoleGroup.bind(this));
        router.get('/acl/roleGroup', this.checkAcl('acl.roleGroup', Permission.Action.Read), this.getRoleGroups.bind(this));
        router.post('/acl/roleGroup', this.checkAcl('acl.roleGroup', Permission.Action.Add), this.addRoleGroup.bind(this));
        router.put('/acl/roleGroup', this.checkAcl('acl.roleGroup', Permission.Action.Edit), this.updateRoleGroup.bind(this));
        router.delete('/acl/roleGroup/:id', this.checkAcl('acl.roleGroup', Permission.Action.Delete), this.removeRoleGroup.bind(this));
    }

    protected init() {

    }

    public getRoleGroup(req: IExtRequest, res: Response, next: Function) {
        RoleGroup.findById<IRoleGroup>(req.params.id, {relations: ['roles']})
            .then(result=> res.json(result))
            .catch(reason=> this.handleError(res, Err.Code.DBQuery, reason.error.message));
    }

    public getRoleGroups(req: IExtRequest, res: Response, next: Function) {
        var query = new Vql('RoleGroup');
        query.filter(req.query.query);
        RoleGroup.findByQuery(query)
            .then(result=>res.json(result))
            .catch(reason=> this.handleError(res, Err.Code.DBQuery, reason.error.message));
    }

    public addRoleGroup(req: IExtRequest, res: Response, next: Function) {
        var roleGroup = new RoleGroup(req.body),
            validationError = roleGroup.validate();
        if (validationError) {
            var result: IUpsertResult<IRoleGroup> = <IUpsertResult<IRoleGroup>>{};
            result.error = new ValidationError(validationError);
            this.acl.initAcl();
            return res.json(result);
        }
        roleGroup.insert<IRoleGroup>()
            .then(result=> res.json(result))
            .catch(reason=> this.handleError(res, Err.Code.DBInsert, reason.error.message));
    }

    public updateRoleGroup(req: IExtRequest, res: Response, next: Function) {
        var roleGroup = new RoleGroup(req.body),
            validationError = roleGroup.validate();
        if (validationError) {
            var result: IUpsertResult<IRoleGroup> = <IUpsertResult<IRoleGroup>>{};
            result.error = new ValidationError(validationError);
            return res.json(result);
        }
        RoleGroup.findById<IRoleGroup>(roleGroup.id)
            .then(result=> {
                if (result.items.length == 1) return roleGroup.update().then(result=> {
                    this.acl.initAcl();
                    res.json(result);
                });
                this.handleError(res, Err.Code.DBUpdate);
            })
            .catch(reason=> this.handleError(res, Err.Code.DBUpdate, reason.error.message));
    }

    public removeRoleGroup(req: IExtRequest, res: Response, next: Function) {
        RoleGroup.findById<IRoleGroup>(+req.params.id)
            .then(result=> {
                if (!result.items.length) return this .handleError(res, Err.Code.DBQuery, 'Record not found');
                let roleGroupName = result.items[0].name;
                let security = this.setting.security;
                if (roleGroupName == security.rootRoleName || roleGroupName == security.guestRoleName) {
                    return this.handleError(res, Err.Code.Forbidden, 'admin and guest roleGroups are required');
                }
                var roleGroup = new RoleGroup({id: +req.params.id});
                roleGroup.delete()
                    .then(result=> {
                        this.acl.initAcl();
                        res.json(result);
                    })
                    .catch(reason=> this.handleError(res, Err.Code.DBDelete, reason.error.message));
            })
            .catch(reason=> this.handleError(res, Err.Code.DBQuery, reason.error.message));

    }
}