import {Router} from "express";
import {IndexController} from "./v1/IndexController";
import {IServerAppSetting} from "../config/setting";
import {Database} from "../cmn/Database";

export class ApiFactory {

    public static create(setting:IServerAppSetting, database:Database):Router {
        var apiRouter = Router();
        var controllerRouter = ApiFactory.manualLoadControllers(setting, database);
        return apiRouter.use('/api/' + setting.version.api, controllerRouter);
    }

    private static manualLoadControllers(setting:IServerAppSetting, database:Database):Router {
        var router:Router = Router();
        var indexController = new IndexController(setting, database);
        indexController.route(router);
        ///<vesta:router/>
        return router;
    }
}