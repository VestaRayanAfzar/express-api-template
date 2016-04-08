import {BaseController} from "../BaseController";
import {Router} from "express";
import {IExtRequest} from "../BaseController";
import {Response} from "express";

export class IndexController extends BaseController {
    public route(router:Router):void {
        router.get('/', this.sayHi.bind(this));
    }

    private sayHi(req:IExtRequest, res:Response) {
        res.json({message: 'Hello world from Vesta Framework'});
    }
}