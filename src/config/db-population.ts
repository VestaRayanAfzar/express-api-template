import {User} from "../cmn/models/User";
import {Role, IRole} from "../cmn/models/Role";
import {Permission} from "../cmn/models/Permission";
import {RoleGroup, IRoleGroup} from "../cmn/models/RoleGroup";
import {setting} from "./setting";
import {Hashing} from "../helpers/Hashing";

export function populate() {
    var adminPromise = Permission.findByModelValues({resource: '*', action: '*'})
        .then(result=> {
            return (new Role({
                name: setting.security.adminRoleName,
                desc: 'Admin role',
                permissions: [result.items[0]['id']]
            })).insert<IRole>()
        })
        .then(result=> {
            return (new RoleGroup({
                name: setting.security.adminRoleName,
                desc: 'Admin Role Group',
                roles: [result.items[0].id]
            })).insert<IRoleGroup>()
        })
        .then(result=> {
            return (new User({
                username: 'root',
                password: Hashing.withSalt('tntfx256'),
                roleGroups: [result.items[0]['id']]
            })).insert();
        });

    var guest = [];
    guest.push(Permission.findByModelValues({resource: 'account', action: 'login'}));
    guest.push(Permission.findByModelValues({resource: 'index', action: 'hi'}));
    var guestPromise = Promise.all(guest)
        .then(data=> {
            return (new Role({
                name: setting.security.guestRoleName,
                desc: 'Guest role',
                permissions: [data[0].items[0].id, data[1].items[0].id]
            })).insert<IRole>()
        })
        .then(result=> {
            return (new RoleGroup({
                name: setting.security.guestRoleName,
                desc: 'Guest Role Group',
                roles: [result.items[0].id]
            })).insert<IRoleGroup>();
        });

    return Promise.all([adminPromise, guestPromise]);
}