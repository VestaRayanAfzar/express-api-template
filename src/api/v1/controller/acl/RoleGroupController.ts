import {Response, Router} from "express";
import {BaseController, IExtRequest} from "../../../BaseController";
import {Err} from "vesta-util/Err";
import {ValidationError} from "vesta-schema/error/ValidationError";
import {RoleGroup, IRoleGroup} from "../../../../cmn/models/RoleGroup";
import {Vql} from "vesta-schema/Vql";
import {Permission} from "../../../../cmn/models/Permission";
import {DatabaseError} from "vesta-schema/error/DatabaseError";


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

    public getRoleGroup(req: IExtRequest, res: Response) {
        RoleGroup.findById<IRoleGroup>(req.params.id, {relations: ['roles']})
            .then(result => res.json(result))
            .catch(error => this.handleError(req, res, error));
    }

    public getRoleGroups(req: IExtRequest, res: Response) {
        let query = req.query.query,
            roleGroup = new RoleGroup(query),
            validationError = roleGroup.validate(...Object.keys(query));
        if (validationError) {
            return this.handleError(req, res, new ValidationError(validationError))
        }
        let query = new Vql('RoleGroup');
        query.filter(query);
        RoleGroup.findByQuery(query)
            .then(result => res.json(result))
            .catch(error => this.handleError(req, res, error));
    }

    public addRoleGroup(req: IExtRequest, res: Response) {
        let roleGroup = new RoleGroup(req.body),
            validationError = roleGroup.validate();
        if (validationError) {
            return this.handleError(req, res, new ValidationError(validationError));
        }
        roleGroup.insert<IRoleGroup>()
            .then(result => res.json(result))
            .catch(error => this.handleError(req, res, error));
    }

    public updateRoleGroup(req: IExtRequest, res: Response) {
        let roleGroup = new RoleGroup(req.body),
            validationError = roleGroup.validate();
        if (validationError) {
            return this.handleError(req, res, new ValidationError(validationError));
        }
        RoleGroup.findById<IRoleGroup>(roleGroup.id)
            .then(result => {
                if (result.items.length == 1) {
                    return roleGroup.update()
                        .then(result => {
                            this.acl.initAcl();
                            res.json(result);
                        });
                }
                throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord);
            })
            .catch(error => this.handleError(req, res, error));
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
            .catch(error => this.handleError(req, res, error));
    }
}