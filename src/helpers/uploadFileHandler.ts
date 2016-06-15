import * as fs from "fs";
import * as path from "path";
import * as formidable from "formidable";
import {Request} from "express";
import {setting} from "../config/setting";
import {Err} from "vesta-util/Err";
import {Hashing} from "./Hashing";
var mkdirp = require('mkdirp');

export interface IUploadOption {
    destination:string;
    genRandomFileName:boolean;
    filename?:string;
}

mkdirp(path.join(setting.dir.upload, 'tmp'));

export function uploadFileHandler(req:Request, settings:IUploadOption) {
    var uploadDirectory = settings.destination;

    var form = new formidable.IncomingForm();
    form.uploadDir = path.join(setting.dir.upload, 'tmp');
    form.keepExtensions = true;

    return new Promise<string>(
        function (resolve, reject) {
            form.parse(req, (err, fields, files)=> {
                if (err) {
                    return reject({error: new Err(Err.Code.WrongInput, err.message)})
                }
                var file = files[Object.keys(files)[0]];
                resolve(file.path);
            });
        })
        .then(function (uploadPath) {
            return new Promise<string>(function (resolve, reject) {
                fs.exists(uploadDirectory, function (check) {
                    if (check) {
                        return resolve(uploadPath);
                    } else {
                        mkdirp(uploadDirectory, function (error) {
                            return error ? reject({error}) : resolve(uploadPath);
                        })
                    }
                });
            })
        })
        .then(function (uploadPath) {
            return new Promise<string>(function (resolve, reject) {
                var fileName = genFileName(settings, uploadPath);
                fs.rename(uploadPath, path.join(uploadDirectory, fileName), (error)=> {
                    return error ? reject({error}) : resolve(fileName);
                });
            });
        });
}

function genFileName(setting:IUploadOption, filePath:string):string {
    var parts = path.parse(filePath);
    var name = (setting.genRandomFileName ? Hashing.simple(parts.name + Date.now().toString()) : (setting.filename || parts.name));
    name += parts.ext;
    return name;
}