import {LogFactory} from "./LogFactory";
import {LogLevel} from "../cmn/enum/Log";
import MemoryUsage = NodeJS.MemoryUsage;

export interface ILogger {
    id: string;
    level: number;
    duration: number;
    data: Array<any>;
}

export class Logger {
    private iLogger: ILogger;
    private start: number;
    private benchmarks: any = {};
    private static instance: Logger;

    constructor(private level: LogLevel) {
        this.iLogger = <ILogger>{
            level: level,
            data: []
        };
        if (level >= LogFactory.setting.level) {
            this.start = Date.now();
            // this.iLogger.id = uuid.v1();
        }
        Logger.instance = this;
    }

    private shouldNotBeLogged(): boolean {
        return this.level <= LogFactory.setting.level;
    }

    public debug(...debug: Array<any>) {
        if (this.level > LogLevel.Debug) return;
        this.iLogger.data.push({type: LogLevel.Debug, data: debug});
    }

    public info(...info: Array<any>) {
        if (this.level > LogLevel.Info) return;
        this.iLogger.data.push({type: LogLevel.Info, data: info});
    }

    public warn(...warn: Array<any>) {
        if (this.level > LogLevel.Warn) return;
        this.iLogger.data.push({type: LogLevel.Warn, data: warn});
    }

    public err(...err: Array<any>) {
        if (this.level > LogLevel.Error) return;
        this.iLogger.data.push({type: LogLevel.Error, data: err});
    }

    public startBenchmark(name: string) {
        if (this.level > LogLevel.Verbose) return;
        this.benchmarks[name] = {
            timestamp: process.hrtime(),
            cpuUsage: process.cpuUsage(),
            memUsage: process.memoryUsage()
        }
    }

    public stopBenchMark(name: string) {
        if (this.level > LogLevel.Verbose) return;
        let bm = this.benchmarks[name];
        if (!bm) return;
        let memUsage = process.memoryUsage();
        this.iLogger.data.push({
            type: LogLevel.Verbose,
            data: {
                name: name,
                duration: process.hrtime(bm.timestamp),
                cpuUsage: process.cpuUsage(bm.cpuUsage),
                memUsage: {
                    rss: bm.memUsage.rss - memUsage.rss
                }
            }
        });
        delete this.benchmarks[name];
    }

    public done(content?: string) {
        if (this.level == LogLevel.None) return;
        if (content) this.iLogger.data.push(content);
        this.iLogger.duration = Date.now() - this.start;
        LogFactory.save(this.iLogger);
    }

    public static getInstance(): Logger {
        return Logger.instance;
    }
}