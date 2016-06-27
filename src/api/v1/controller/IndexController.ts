import {Router, Response} from "express";
import {BaseController, IExtRequest} from "../../BaseController";

export class IndexController extends BaseController {

    public route(router:Router):void {
        router.get('/', this.sayHi.bind(this));
    }

    private sayHi(req:IExtRequest, res:Response) {
        res.json({message: `Hello world from Vesta Framework Api ${this.setting.version.api}`});
    }
}