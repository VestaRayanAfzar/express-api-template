import {Router} from "express";
import {IndexController} from "./v1/IndexController";
import {IServerAppSetting} from "../config/setting";
import {Acl} from "../helpers/Acl";
import {Database} from "vesta-schema/Database";
import {Router} from "express";
import {exporter} from "./v1/import";

export class ApiFactory {

    public static create(setting:IServerAppSetting, acl:Acl, database:Database):Router {
        var apiRouter = Router();
        var controllerRouter = ApiFactory.loadControllers(setting, acl, database);
        return apiRouter.use('/api/' + setting.version.api, controllerRouter);
    }

    private static loadControllers(setting:IServerAppSetting, acl, database:Database):Router {
        var router:Router = Router();
        for (var controllerName in exporter.controller) {
            if (exporter.controller.hasOwnProperty(controllerName)) {
                var instance = new exporter.controller[controllerName](setting, acl, database);
                instance.route(router);
            }
        }
        return router;
    }
}