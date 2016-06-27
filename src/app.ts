#!/usr/bin/env node
import {setting} from "./config/setting";
import {ServerApp} from "./ServerApp";

var server = new ServerApp(setting);
server.init()
    .then(()=> server.start())
    .then(()=> console.log('server booted at', new Date().toString()))
    .catch(err=> {
        console.error('\nserver initiation error: ', err);
        process.exit(1);
    });