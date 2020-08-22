var WebSocketService = function (model, webSocket) {
    var webSocketService = this;

    var webSocket = webSocket;
    var model = model;
    var flag = false;
    var delUserID;
    var dackuser = [];

    this.hasConnection = false;

    this.welcomeHandler = function (data) {
        webSocketService.hasConnection = true;

        model.userTadpole.id = data.id;
        model.tadpoles[data.id] = model.tadpoles[-1];
        delete model.tadpoles[-1];

        $("#chat").initChat();
        if ($.cookie("todpole_name")) {
            webSocketService.sendMessage("name:" + $.cookie("todpole_name"));
        }
        if ($.cookie("todpole_Color")) {
            webSocketService.sendMessage("rgb" + $.cookie("todpole_Color"));
        }
        if ($.cookie("todpole_sex")) {
            webSocketService.sendMessage("吾乃" + $.cookie("todpole_sex"));
        }
    };

    this.updateHandler = function (data) {
        var newtp = false;

        if (!model.tadpoles[data.id]) {
            newtp = true;
            model.tadpoles[data.id] = new Tadpole();
            model.arrows[data.id] = new Arrow(
                model.tadpoles[data.id],
                model.camera
            );
        }
        for (let i = 0; i < dackuser.length; i++) {
            if (dackuser[i] == data.id) {
                newtp = false;
            }
        }

        var tadpole = model.tadpoles[data.id];

        if (flag && dackuser != null) {
            for (let i = 0; i < dackuser.length; i++) {
                // console.log(dackuser[i])
                delete model.tadpoles[dackuser[i]];
                delete model.arrows[dackuser[i]];
            }
        }

        if (tadpole.id == model.userTadpole.id) {
            tadpole.name = data.name;
            return;
        } else {
            tadpole.name = data.name;
        }

        if (newtp) {
            tadpole.x = data.x;
            tadpole.y = data.y;
            vmLog.updateUsers(model.tadpoles);
            vmLog.addLog({
                type: "connect",
                user: tadpole,
            });
        } else {
            tadpole.targetX = data.x;
            tadpole.targetY = data.y;
        }

        tadpole.angle = data.angle;
        tadpole.sex = data.sex;
        tadpole.momentum = data.momentum;
	tadpole.icon = data.icon;
        
	tadpole.timeSinceLastServerUpdate = 0;
    };

    this.messageHandler = function (data) {
        var tadpole = model.tadpoles[data.id];
        if (!tadpole) {
            return;
        }
        let tadpole1 = new Tadpole();
        // console.log(tadpole1.draw());
        tadpole.timeSinceLastServerUpdate = 0;
        tadpole.messages.push(new Message(data.message));
        vmLog.addLog({
            user: tadpole,
            message: {
                content: data.message,
                time: new Date(),
                x: parseInt(tadpole.x),
                y: parseInt(tadpole.y),
            },
            type: "message",
        });
    };

    this.closedHandler = function (data) {
        if (model.tadpoles[data.id]) {
            vmLog.addLog({
                type: "disconnect",
                message: model.tadpoles[data.id].name + "离开了池塘",
            });
            delete model.tadpoles[data.id];
            delete model.arrows[data.id];
            vmLog.updateUsers(model.tadpoles);
        }
    };

    this.redirectHandler = function (data) {
        if (data.url) {
            if (authWindow) {
                authWindow.document.location = data.url;
            } else {
                document.location = data.url;
            }
        }
    };

    this.processMessage = function (data) {
        var fn = webSocketService[data.type + "Handler"];
        if (fn) {
            fn(data);
        }
    };

    this.connectionClosed = function () {
        webSocketService.hasConnection = false;
        $("#cant-connect").fadeIn(300);
    };

    this.sendUpdate = function (tadpole) {
        var sendObj = {
            type: "update",
            icon: tadpole.icon,
            x: tadpole.x.toFixed(1),
            y: tadpole.y.toFixed(1),
            angle: tadpole.angle.toFixed(3),
            momentum: tadpole.momentum.toFixed(3),
            sex: tadpole.sex,
        };

        if (tadpole.name) {
            sendObj["name"] = tadpole.name;
        }

        webSocket.send(JSON.stringify(sendObj));
    };

    this.sendMessage = function (msg) {
        let regexp = /^(\s吾名|name[:：;；]|吾名)(.+)/i;
        if (regexp.test(msg)) {
            model.userTadpole.name = msg.match(regexp)[2];
            $.cookie("todpole_name", model.userTadpole.name, {
                expires: 14,
            });
            return;
        }

        regexp = /^(\s吾乃|吾乃|sex)(男生|女生|0|1|3|男|女)/;
        if (regexp.test(msg)) {
            let sex = msg.match(regexp)[2];
            if (sex === "女生" || sex === "0") {
                model.userTadpole.sex = 0;
            } else if (sex === "男生" || sex === "1") {
                model.userTadpole.sex = 1;
            } else {
                model.userTadpole.sex = 3;
                // return;
            }
            $.cookie("todpole_sex", model.userTadpole.sex, {
                expires: 14,
            });
            return;
        }

        regexp = /^circle(\d+)$/;
        if (regexp.test(msg)) {
            let match = msg.match(regexp);
            let r = match[1] >= 10 ? parseInt(match[1]) : 50;
            vmLog.setCircleRadius(r);
            console.log(model.tadpoles);
            return;
        }

        regexp = /^circle(\d+)[,，](\d+)[,，]?(\d+)?$/;
        if (regexp.test(msg)) {
            if (typeof circleInterval !== "undefined") {
                clearInterval(circleInterval);
            }
            let match = msg.match(regexp);
            let x0 = parseInt(match[1]);
            let y0 = parseInt(match[2]);
            let r =
                match[3] !== undefined && match[3] >= 10
                    ? parseInt(match[3])
                    : 100;
            let degree = 0;
            circleInterval = setInterval(() => {
                degree += 10;
                let hudu = ((2 * Math.PI) / 360) * degree;
                let x1 = x0 + Math.sin(hudu) * r;
                let y1 = y0 - Math.cos(hudu) * r;
                model.userTadpole.x = x1;
                model.userTadpole.y = y1;
            }, 50);
            return;
        }

        regexp = /^stop circle$/;
        if (regexp.test(msg)) {
            clearInterval(circleInterval);
            return;
        }

        regexp = /^-?(\d+)[,，]-?(\d+)$/i;
        if (regexp.test(msg)) {
            let pos = msg.match(regexp);
            let str = pos[0].split(/[,，]/);
            app.deliveryTo(parseInt(str[0]), parseInt(str[1]));
            return;
        }

        regexp = /^(\s速度|速度)(\d+)$/i;
        if (regexp.test(msg)) {
            let num = msg.match(regexp)[2];
            let speed = parseInt(num) > 0 ? parseInt(num) : 1;
            app.speed(speed);
        }
	
	regexp = /^(\srgb|rgb)(.+)/i;
        if (regexp.test(msg)) {
            let userColor = msg.match(regexp)[2];
	    model.userTadpole.icon = "/images/default.png";    	
	    model.userTadpole.icon += "?Color=" + userColor;
	    $.cookie("todpole_Color", userColor, {
                expires: 14,
            });
	    return;
        }

        regexp = /^(\sdelcolor|delcolor)$/;
        if (regexp.test(msg)) {
	   model.userTadpole.icon = "/images/default.png";  
	   document.cookie = "todpole_Color=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
	   return;
        }

        regexp = /^flicker$/;
        if (regexp.test(msg)) {
            let sex = model.userTadpole.sex;
            let interval = setInterval(() => {
                if (model.userTadpole.sex === -1) {
                    model.userTadpole.sex = 1;
                }
                model.userTadpole.sex = model.userTadpole.sex ^ 1;
                $.cookie("todpole_sex", model.userTadpole.sex, {
                    expires: 14,
                });
                this.sendUpdate(model.userTadpole);
            }, 500);
            setTimeout(function () {
                clearInterval(interval);
                model.userTadpole.sex = sex;
                $.cookie("todpole_sex", model.userTadpole.sex, {
                    expires: 14,
                });
            }, 60000);
            return;
        }

        var sendObj = {
            type: "message",
            message: msg,
        };

        webSocket.send(JSON.stringify(sendObj));
    };

    this.authorize = function (token, verifier) {
        var sendObj = {
            type: "authorize",
            token: token,
            verifier: verifier,
        };

        webSocket.send(JSON.stringify(sendObj));
    };

    this.deleteUser = function (name, e) {
        // let userid = queryIdByName(name);
        console.log(name);
        console.log(model.userTadpole.id);
        if (name == model.userTadpole.id) {
            console.log("dddd");
            flag = false;
            return;
        }
        flag = true;
        if (e) {
            // delete dackuser[userid];
            dackuser.pop(name);
            // console.log(dackuser);
            return;
        }
        delUserID = name;
        // console.log(user);
        dackuser.push(name);
        // console.log(dackuser)
        for (let i = 0; i < dackuser.length; i++) {
            delete model.tadpoles[dackuser[i]];
            delete model.arrows[dackuser[i]];
        }
        return;
    };

    var queryIdByName = function (name) {
        var userid = JSON.stringify(model.tadpoles);
        userid = JSON.parse(userid);

        for (var j in userid) {
            if (userid[j].name == name) {
                return j;
            }
        }

        return null;
    };
};
