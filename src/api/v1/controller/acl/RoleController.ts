import {Response, Router} from "express";
import {BaseController, IExtRequest} from "../../../BaseController";
import {Err} from "vesta-util/Err";
import {ValidationError} from "vesta-schema/error/ValidationError";
import {Role, IRole} from "../../../../cmn/models/Role";
import {Vql} from "vesta-schema/Vql";
import {Permission} from "../../../../cmn/models/Permission";
import {DatabaseError} from "vesta-schema/error/DatabaseError";


export class RoleController extends BaseController {

    public route(router: Router) {
        router.get('/acl/role/:id', this.checkAcl('acl.role', Permission.Action.Read), this.getRole.bind(this));
        router.get('/acl/role', this.checkAcl('acl.role', Permission.Action.Read), this.getRoles.bind(this));
        router.post('/acl/role', this.checkAcl('acl.role', Permission.Action.Add), this.addRole.bind(this));
        router.put('/acl/role', this.checkAcl('acl.role', Permission.Action.Edit), this.updateRole.bind(this));
        router.delete('/acl/role/:id', this.checkAcl('acl.role', Permission.Action.Delete), this.removeRole.bind(this));
    }

    protected init() {
    }

    public getRole(req: IExtRequest, res: Response) {
        Role.findById<IRole>(req.params.id, {relations: ['permissions']})
            .then(result => res.json(result))
            .catch(error => this.handleError(req, res, error));
    }

    public getRoles(req: IExtRequest, res: Response) {
        let query = req.query.query,
            role = new Role(query),
            validationError = role.validate(...Object.keys(query));
        if (validationError) {
            return this.handleError(req, res, new ValidationError(validationError))
        }
        let query = new Vql('Role');
        query.filter(query);
        Role.findByQuery(query)
            .then(result => res.json(result))
            .catch(error => this.handleError(req, res, error));
    }

    public addRole(req: IExtRequest, res: Response) {
        let role = new Role(req.body),
            validationError = role.validate();
        if (validationError) {
            return this.handleError(req, res, new ValidationError(validationError));
        }
        role.insert<IRole>()
            .then(result => res.json(result))
            .catch(error => this.handleError(req, res, error));
    }

    public updateRole(req: IExtRequest, res: Response) {
        let role = new Role(req.body),
            validationError = role.validate();
        if (validationError) {
            return this.handleError(req, res, new ValidationError(validationError));
        }
        Role.findById<IRole>(role.id)
            .then(result => {
                if (result.items.length == 1) {
                    return role.update()
                        .then(result => {
                            this.acl.initAcl();
                            res.json(result);
                        });
                }
                throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord);
            })
            .catch(error => this.handleError(req, res, error));
    }

    public removeRole(req: IExtRequest, res: Response) {
        let role = new Role({id: +req.params.id});
        return role.delete()
            .then(result => {
                result.items.length && this.acl.initAcl();
                res.json(result);
            })
            .catch(error => this.handleError(req, res, error));
    }
}