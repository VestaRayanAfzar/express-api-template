import {IServerAppSetting} from "../config/setting";
import {Acl} from "../helpers/Acl";
import {Database} from "vesta-schema/Database";
import {Router} from "express";
import {exporter} from "./v1/import";

export class ApiFactory {

    public static create(setting: IServerAppSetting, acl: Acl, database: Database): Promise<any> {
        let apiRouter = Router();
        return ApiFactory.loadControllers(setting, acl, database)
            .then(controllerRouter => apiRouter.use('/api/' + setting.version.api, controllerRouter))
    }

    private static loadControllers(setting: IServerAppSetting, acl, database: Database): Promise<Router> {
        return new Promise((resolve, reject) => {
            let router: Router = Router(),
                resolveList: Array<Promise<boolean>> = [];
            for (let controllerName in exporter.controller) {
                if (exporter.controller.hasOwnProperty(controllerName)) {
                    let instance = new exporter.controller[controllerName](setting, acl, database);
                    instance.route(router);
                    let resolver = instance.resolve();
                    if (resolver) resolveList.push(resolver);
                }
            }
            return resolveList.length ?
                Promise.all(resolveList).then(() => resolve(router)).catch(reason => reject(reason)) :
                resolve(router);
        });
    }
}