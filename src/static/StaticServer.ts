import * as express from "express";
import * as morgan from "morgan";
import {IServerAppSetting} from "../config/setting";
import * as http from "http";
import {Err} from "../cmn/Err";

export class StaticServer {
    private app:express.Express;
    private server:http.Server;

    constructor(private setting:IServerAppSetting) {
        this.app = express();
        this.server = http.createServer(this.app);
        this.server.on('error', err=>console.error('Static server error: ', err));
        this.server.on('listening', arg=>console.log('Static server starts listening on ', this.server.address()));
    }

    private configExpressServer() {
        this.app.use(morgan(this.setting.env == 'development' ? 'dev' : 'combined'));
        this.app.enable('trust proxy');
        this.app.disable('case sensitive routing');
        this.app.disable('strict routing');
        this.app.disable('x-powered-by');
    }

    public init() {
        this.configExpressServer();
        this.app.use(express.static(this.setting.dir.upload));
        this.app.use((req, res, next) => {
            res.status(404);
            var err = new Err(404, 'Not Found');
            res.json({error: err});
        });

        if (this.setting.env === 'development') {
            this.app.use((err:any, req, res, next) => {
                res.status(err.status || 500);
                console.log('development error', err);
                res.json({message: err.message, error: err});
            });
        }

        this.app.use((err:any, req, res, next) => {
            res.status(err.status || 500);
            res.send({
                message: err.message,
                error: {}
            });
        });
    }

    public start() {
        this.server.listen(this.setting.port);
    }
}
