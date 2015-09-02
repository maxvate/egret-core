
/// <reference path="../lib/types.d.ts" />

import utils = require('../lib/utils');
import watch = require("../lib/watch");
import Build = require('./build');
import server = require('../server/server');
import FileUtil = require('../lib/FileUtil');
import service = require('../service/index');
import CopyFiles = require('../actions/CopyFiles');
import CompileProject = require('../actions/CompileProject');
import CompileTemplate = require('../actions/CompileTemplate');

class Run implements egret.Command {

    private serverStarted = false;

    execute(): number {
        var build = new Build();
        build.execute(this.onBuildFinish);
        return DontExitCode;
    }

    private onBuildFinish = (exitCode: number) => {
        if (this.serverStarted)
            return;
        if (exitCode != 0) {
            process.exit(exitCode);
        }
        if (egret.args.platform == undefined || egret.args.platform == 'web') {
            utils.getAvailablePort(port=> this.onGotPort(port), egret.args.port);
        }
        else {
            process.exit(0);
        }
    }

    private onGotPort(port: number) {
        egret.args.port = port;
        console.log('\n');
        var addresses = utils.getNetworkAddress();
        if (addresses.length > 0) {
            egret.args.host = addresses[0];
        }
        this.serverStarted = true;
        server.startServer(egret.args, egret.args.startUrl);
        console.log("    " + utils.tr(10013, ''));
        console.log('\n');
        console.log('        ' + egret.args.startUrl);
        for (var i = 1; i < addresses.length; i++) {
            console.log('        ' + egret.args.getStartURL(addresses[i]));
        }

        console.log('\n');
        if (egret.args.autoCompile) {
            console.log('    ' + utils.tr(10010));
            this.watchFiles(egret.args.srcDir);
            this.watchFiles(egret.args.templateDir);
        }
        else {
            console.log('    ' + utils.tr(10012));
        }
    }

    private watchFiles(dir:string) {

        watch.createMonitor(dir, { persistent: true, interval: 2007, filter: (f, stat) => !f.match(/\.g(\.d)?\.ts/) }, m=> {
            m.on("created", (f) => this.sendBuildCMD(f))
                .on("removed", (f) => this.sendBuildCMD(f))
                .on("changed", (f) => this.sendBuildCMD(f));
        })
    }
    private sendBuildCMD(f) {
        console.log(f);
        service.execCommand({ command: "build", path: egret.args.projectDir, option: egret.args }, (cmd: egret.ServiceCommandResult) => {
            if (!cmd.exitCode)
                console.log('    ' +utils.tr(10011));
            else
                console.log('    ' +utils.tr(10014),cmd.exitCode);
            if (cmd.messages) {
                cmd.messages.forEach(m=> console.log(m));
            }
        });
    }
}


export = Run;
