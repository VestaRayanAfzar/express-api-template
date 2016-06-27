import * as fs from "fs";
import * as path from "path";
import * as formidable from "formidable";
import {Files} from "formidable";
import {setting} from "../config/setting";
import {Err} from "vesta-util/Err";
import {Hashing} from "./Hashing";
import {IExtRequest} from "../api/BaseController";
var mkdirp = require('mkdirp');

export class FileUploader<T> {
    private form = new formidable.IncomingForm();
    private files:Files;

    constructor(private destination:string, private genRandomFileName:boolean = true) {
        this.form.uploadDir = path.join(setting.dir.upload, 'tmp');
        this.form.keepExtensions = true;
    }

    public upload(req:IExtRequest):Promise<T> {
        var uploadedFiles:T = <T>{};
        return new Promise((resolve, reject)=> {
            this.form.parse(req, (err, fields, files)=> {
                if (err) {
                    return reject({error: new Err(Err.Code.WrongInput, err.message)})
                }
                this.files = files;
                resolve();
            })
        })
            .then(()=> this.assertDestination())
            .then(()=> {
                var renameList = [];
                Object.keys(this.files).forEach(fieldName=> {
                    var uploadPath = this.files[fieldName].path;
                    var fileName = this.genFileName(uploadPath);
                    uploadedFiles[fieldName] = fileName;
                    renameList.push(this.rename(uploadPath, path.join(this.destination, fileName)));
                });
                return Promise.all(renameList);
            })
            .then(()=> uploadedFiles);
    }

    private assertDestination():Promise<any> {
        return new Promise((resolve, reject)=> {
            fs.exists(this.destination, check=> {
                if (check) {
                    return resolve();
                } else {
                    mkdirp(this.destination, error=> {
                        return error ? reject({error}) : resolve();
                    })
                }
            });
        })
    }

    private rename(srcFileName:string, destFileName:string):Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            fs.rename(srcFileName, destFileName, (error)=> {
                return error ? reject({error}) : resolve(true);
            });
        });
    }

    private genFileName(filePath:string):string {
        var parts = path.parse(filePath);
        var name = (this.genRandomFileName ? Hashing.simple(parts.name + Date.now().toString()) : parts.name);
        name += parts.ext;
        return name;
    }
}

mkdirp(path.join(setting.dir.upload, 'tmp'));