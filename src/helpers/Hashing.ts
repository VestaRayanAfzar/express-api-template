import {setting} from "../config/setting";
import * as crypto from "crypto";

export class Hashing {

    public static withSalt(password:string):string {
        var hash = crypto.createHash(setting.security.hashing);
        var saltedPassword = password.length % 2 == 0 ? (setting.security.salt + password) : (password + setting.security.salt);
        return hash.update(saltedPassword).digest('hex');
    }

    public static compare(password, hash) {
        var hashedPassword = Hashing.withSalt(password);
        return hashedPassword == hash;
    }

    public static simple(text:string){
        var hash = crypto.createHash(setting.security.hashing);
        return hash.update(text).digest('hex');
    }
}