import {Session} from "../session/Session";
import {JWT} from "../helpers/JWT";
import {IExtRequest} from "../api/BaseController";
import {Response, NextFunction} from "express";

export function sessionMiddleware(req: IExtRequest, res: Response, next: NextFunction) {
    let token = req.get('X-Auth-Token');
    if (!token) return newSession();
    JWT.verify(token, (err, payload) => err ? newSession() : restoreSession(payload.sessionId));

    function newSession() {
        Session.create()
            .then(session => {
                // console.log('new session created', session.sessionData);
                let token = JWT.sign({sessionId: session.sessionId});
                res.set('X-Auth-Token', token);
                req.session = session;
                next();
            });
    }

    function restoreSession(sessionId: string) {
        Session.restore(sessionId)
            .then(session => {
                if (!session) {
                    // session has been expired
                    return newSession();
                }
                // console.log('session verified', session.sessionData);
                res.set('X-Auth-Token', token);
                req.session = session;
                next();
            });
    }
}