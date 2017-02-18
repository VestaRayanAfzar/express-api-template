import {Router, Response} from "express";
import {BaseController, IExtRequest} from "../../BaseController";
import {Role} from "../../../cmn/models/Role";
import {Vql} from "vesta-schema/Vql";
import {HLCondition as C} from "vesta-schema-HLCondition";

export class IndexController extends BaseController {

    public route(router: Router): void {
        router.get('/', this.sayHi.bind(this));
        router.get('/log', this.showLog.bind(this));
        router.get('/dbTest', this.dbProcess.bind(this));
        router.get('/health', this.dbProcess.bind(this));
    }

    private sayHi(req: IExtRequest, res: Response) {
        req.log.startBenchmark('IndeController@sayHi');
        let bigNumber = 1000;
        let html = `<table>`;
        for (let i = 1; i < bigNumber; ++i) {
            html += `<tr>`;
            for (let j = 1; j < bigNumber; ++j) {
                html += `<td>${i * j}</td>`;
            }
            html += `</tr>`;
        }
        html += `</table>`;
        req.log.stopBenchMark('IndeController@sayHi');
        res.end(`<h1>All Done...</h1>`);
    }

    private showLog() {

    }

    private dbProcess(req: IExtRequest, res: Response) {
        let q = new Vql(Role.schema.name);
        q.fetchRecordFor('permissions');
        q.where(C.or(C.gt('name', ''), C.gtOrEq('id', 1)));
        Role.findByQuery(q).then(result=>res.json(result))
    }
}