import {Response, NextFunction} from "express";
import {IExtRequest} from "../api/BaseController";
import {LogFactory} from "../helpers/LogFactory";

export function loggerMiddleware(req: IExtRequest, res: Response, next: NextFunction) {
    let log = LogFactory.create();
    log.info({
        ip: req.headers['X-Real-IP'] || req.ip,
        url: req.url,
        userAgent: req.headers['user-agent']
    });
    res.on('end', () => log.done(':END:'));
    res.on('finish', () => log.done(':FINISH:'));
    req.log = log;
    next();
}