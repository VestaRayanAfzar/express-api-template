import {setting} from '../config/setting';
import * as jwt from 'jsonwebtoken';
import {SignOptions, VerifyOptions, VerifyCallback} from "jsonwebtoken";

let security = setting.security;

export class JWT {

    static sign(payload:any):string {
        let secretOrPrivateKey = security.secret,
            options:SignOptions = {
                algorithm: security.session.hashing
            };
        try {
            return jwt.sign(payload, secretOrPrivateKey, options);
        } catch (e) {
            console.error('jwt sign failed', e);
            return null;
        }
    }

    static verify(token:string, callback:VerifyCallback) {
        let secretOrPrivateKey = security.secret,
            options:VerifyOptions = {
                algorithms: [security.session.hashing],
                ignoreExpiration: true
            };
        try {
            jwt.verify(token, secretOrPrivateKey, options, callback);
        } catch (e) {
            callback(e, null);
        }
    }
}
