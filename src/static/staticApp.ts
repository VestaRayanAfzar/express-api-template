#!/usr/bin/env node
import {setting} from "../config/setting";
import {StaticServer} from "./StaticServer";

var server = new StaticServer(setting);
server.init();
server.start();
