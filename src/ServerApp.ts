import * as http from "http";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as morgan from "morgan";
import {IServerAppSetting} from "./config/setting";
import {ApiFactory} from "./api/ApiFactory";
import {DatabaseFactory} from "./database/DatabaseFactory";
import {sessionMiddleware} from "./middlewares/session";
import {Err} from "./cmn/Err";
import {IExtRequest} from "./api/BaseController";
import {Database} from "./cmn/Database";
import {Schema} from "./cmn/Schema";
import * as fs from "fs";
var cors = require('cors');

export class ServerApp {
    private app:express.Express;
    private server:http.Server;
    private sessionDatabase:Database;
    private database:Database;

    constructor(private setting:IServerAppSetting) {
        this.app = express();
        this.server = http.createServer(this.app);
        this.server.on('error', err=>console.error(err));
        this.server.on('listening', arg=>console.log(arg));
    }

    private configExpressServer() {
        this.app.use(cors({
            origin: [/https?:\/\/*:*/],
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['X-Requested-With', 'Content-Type', 'Content-Length', 'X-Auth-Token', 'X-Auth-User'],
            exposedHeaders: ['Content-Type', 'Content-Length', 'X-Auth-Token']
        }));
        this.app.use(morgan('dev'));
        this.app.use(bodyParser.urlencoded({extended: false}));
        this.app.use(bodyParser.json({limit: '10mb'}));

        this.app.enable('trust proxy');
        this.app.disable('case sensitive routing');
        this.app.disable('strict routing');
        this.app.disable('x-powered-by');
        this.app.disable('etag');
    };

    private afterDatabaseInstantiation() {
        var routing = ApiFactory.create(this.setting, this.database);
        this.app.use((req:IExtRequest, res, next)=> {
            req.sessionDB = this.sessionDatabase;
            sessionMiddleware(req, res, next);
        });
        this.app.use('/', routing);

        this.app.use((req, res, next) => {
            res.status(404);
            var err = new Err(404, 'Not Found');
            res.json({error: err});
        });

        if (this.setting.env === 'development') {
            this.app.use((err:any, req, res, next) => {
                res.status(err.status || 500);
                console.log(`internal server error on dev: `, err);
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

    public init() {
        this.configExpressServer();

        DatabaseFactory.getInstance(this.setting.security.session.database)
            .then(connection=> {
                this.sessionDatabase = connection;
                return DatabaseFactory.getInstance(this.setting.database, this.setting.regenerateSchema);
            })
            .then(connection=> {
                this.database = connection;
                this.database.init(this.getSchemaList()).then(()=>this.afterDatabaseInstantiation());
            })
            .catch(err=> {
                console.error((this.sessionDatabase ? 'Main' : 'Session') + ` Database instantiation error: `, err);
                process.exit(1);
            });
    }

    private getSchemaList():Array<Schema> {
        var modelFiles = fs.readdirSync(__dirname + '/cmn/models');
        var models:Array<Schema> = [];
        for (var i = modelFiles.length; i--;) {
            var modelName = modelFiles[i].slice(0, modelFiles[i].length - 3);
            models.push(require(__dirname + '/cmn/models/' + modelFiles[i])[modelName]['schema']);
        }
        return models;
    }


    public start() {
        this.server.listen(this.setting.port);
    }
}