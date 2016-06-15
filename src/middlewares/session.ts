import {Session} from "../session/Session";
import {JWT} from "../helpers/JWT";
import {setting} from "../config/setting";

var sessionIdPrefix = setting.security.session.idPrefix;

export function sessionMiddleware(req, res, next) {
    var token = req.get('X-Auth-Token');
    if (!token) return createSession();

    JWT.verify(token, function (err, payload) {
        if (err) {
            return createSession();
            // return next(new Err(Err.Code.Token, err.message));
        }
        var dbSessionId = sessionIdPrefix + payload.sessionId;
        req.sessionDB.findById(dbSessionId)
            .then(data=> {
                if (data.items.length) {
                    req.session = new Session(dbSessionId, data.items[0], req.sessionDB);
            } else {
                console.log('sessionId not found', payload.sessionId);
                    return createSession();
            }
            next();
        })
    });

    function createSession() {
        Session.createSession(req.sessionDB, sessionIdPrefix, {}, res)
            .then(session=> {
                req.session = session;
                next();
            });
    }
}
