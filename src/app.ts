#!/usr/bin/env node
import {setting} from './config/setting';
import {ServerApp} from './ServerApp';

var server = new ServerApp(setting);
server.init();
server.start();
