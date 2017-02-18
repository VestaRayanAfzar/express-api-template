import * as http from "http";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as morgan from "morgan";
import * as fs from "fs";
import {IServerAppSetting} from "./config/setting";
import {ApiFactory} from "./api/ApiFactory";
import {sessionMiddleware} from "./middlewares/session";
import {IExtRequest} from "./api/BaseController";
import {Database, IModelCollection} from "vesta-schema/Database";
import {Acl, AclPolicy} from "./helpers/Acl";
import {Err} from "vesta-util/Err";
import {DatabaseFactory} from "./helpers/DatabaseFactory";
import {MySQL} from "vesta-driver-mysql/MySQL";
import {loggerMiddleware} from "./middlewares/logger";
import {LogFactory, LogStorage} from "./helpers/LogFactory";
import {Session} from "./session/Session";
let cors = require('cors');
let helmet = require('helmet');

export class ServerApp {
    private app: express.Express;
    private server: http.Server;
    private sessionDatabase: Database;
    private database: Database;
    private acl: Acl;

    constructor(private setting: IServerAppSetting) {
        this.app = express();
        this.server = http.createServer(this.app);
        this.server.on('error', err => console.error(err));
        this.server.on('listening', arg => console.log(arg));
        this.acl = new Acl(setting, AclPolicy.Deny);
        this.setting.log.storage = this.setting.env == 'development' ? LogStorage.Console : LogStorage.File;
        if (!LogFactory.init(this.setting.log)) {
            process.exit(1);
        }
    }

    private configExpressServer() {
        this.app.use(helmet({
            noCache: true,
            referrerPolicy: true
        }));
        // todo CHANGE origin in production mode based on your requirement
        this.app.use(cors({
            origin: [/https?:\/\/*:*/],
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['X-Requested-With', 'Content-Type', 'Content-Length', 'X-Auth-Token', 'X-Auth-User'],
            exposedHeaders: ['Content-Type', 'Content-Length', 'X-Auth-Token']
        }));
        this.app.use(loggerMiddleware);
        this.app.use(morgan(this.setting.env == 'development' ? 'dev' : 'combined'));
        this.app.use(bodyParser.urlencoded({limit: '50mb', extended: false}));
        this.app.use(bodyParser.json({limit: '50mb'}));
        // closing connection after sending response ???
        this.app.use((req: IExtRequest, res: express.Response, next: express.NextFunction) => {
            res.set('Connection', 'Close');
            next();
        });

        this.app.enable('trust proxy');
        this.app.disable('case sensitive routing');
        this.app.disable('strict routing');
        this.app.disable('x-powered-by');
        this.app.disable('etag');
    }

    private initRouting(): Promise<any> {
        this.app.use('/asset', express.static(this.setting.dir.upload));
        this.app.use((req: IExtRequest, res, next) => {
            req.sessionDB = this.sessionDatabase;
            sessionMiddleware(req, res, next);
        });
        return ApiFactory.create(this.setting, this.acl, this.database)
            .then(routing => this.app.use('/', routing));
    }

    private initErrorHandlers() {
        // 404
        this.app.use((req, res, next) => {
            res.status(404);
            let err = new Err(404, 'Not Found');
            res.json({error: err});
        });
        // 50x development mode
        if (this.setting.env === 'development') {
            this.app.use((err: any, req, res, next) => {
                res.status(err.status || 500);
                console.log(`internal server error on dev: `, err);
                res.json({message: err.message, error: err});
            });
        }
        // 50x production mode
        this.app.use((err: any, req, res, next) => {
            res.status(err.status || 500);
            res.send({
                message: err.message,
                error: {}
            });
        });
    }

    private initDatabase(): Promise<any> {
        let modelFiles = fs.readdirSync(__dirname + '/cmn/models');
        let models: IModelCollection = {};
        // creating models list
        for (let i = modelFiles.length; i--;) {
            let modelName = modelFiles[i].slice(0, -3);
            let model = require('./cmn/models/' + modelFiles[i]);
            models[model[modelName]['schema']['name']] = model[modelName];
        }
        // registering database drivers
        DatabaseFactory.register('appDatabase', this.setting.database, MySQL, models);
        // getting application database instance
        return DatabaseFactory.getInstance('appDatabase')
            .then(db => this.setting.regenerateSchema ? db.init() : db)
    }

    public init(): Promise<any> {
        this.configExpressServer();
        return Session.init(this.setting.security.session)
            .then(() => this.initDatabase())
            .then(() => this.initRouting())
            .then(() => {
                this.initErrorHandlers();
                return this.acl.initAcl();
            })
    }

    public start() {
        this.server.listen(this.setting.port);
    }
}