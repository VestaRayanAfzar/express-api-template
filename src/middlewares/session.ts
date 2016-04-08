import {Session} from "../session/Session";
import {JWT} from "../helpers/JWT";
import {setting} from "../config/setting";
import {Err} from "../cmn/Err";

var sessionIdPrefix = setting.security.session.idPrefix;

export function sessionMiddleware(req, res, next) {
    var token = req.get('X-Auth-Token');
    if (!token) {
        Session.createSession(req.sessionDB, sessionIdPrefix, {}, res)
            .then(session=> {
                req.session = session;
                next();
            });
        return;
    }

    JWT.verify(token, function (err, payload) {
        if (err) {
            return next(new Err(Err.Code.Token, err.message));
        }
        var dbSessionId = sessionIdPrefix + payload.sessionId;
        req.sessionDB.get(dbSessionId, function (err, reply) {
            if (reply) {
                try {
                    var data = JSON.parse(reply);
                    req.session = new Session(dbSessionId, data, req.sessionDB);
                } catch (e) {
                    console.log('Error parsing session data', e);
                }
            } else {
                console.log('sessionId not found', payload.sessionId);
            }
            next();
        })
    });
}
