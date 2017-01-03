import {AccountController} from "./controller/AccountController";
import {IndexController} from "./controller/IndexController";
import {PermissionController} from "./controller/acl/PermissionController";
import {RoleController} from "./controller/acl/RoleController";
import {RoleGroupController} from "./controller/acl/RoleGroupController";
import {UserController} from './controller/UserController';
///<vesta:import/>

export interface IExporter {
    controller:any;
}

export const exporter:IExporter = {
    controller: {
        account: AccountController,
        index: IndexController,
        permission: PermissionController,
        role: RoleController,
        roleGroup: RoleGroupController,
        user: UserController,
		///<vesta:expressController/>
    }
};