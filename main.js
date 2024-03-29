const { app, BrowserWindow } = require('electron');
try {
    require('electron-reloader')(module)
} catch (_) { }

const express = require("express");
const { ipcMain } = require('electron')

const server = express();
const session = require('cookie-session');
const passport = require('passport');
const EveOAuth2Strategy = require('passport-eve-oauth2').Strategy;
const randomstring = require("randomstring");
const ua = require('universal-analytics');
const visitor = ua('UA-275958012-1'); // Replace with your Measurement ID
visitor.pageview('/', 'WH-Buddy', '0.0.1').send();


const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const fs = require("fs");

const systems = JSON.parse(fs.readFileSync(__dirname + "/extraResources/systems.json"));
const whData = JSON.parse(fs.readFileSync(__dirname + "/extraResources/whData.json"));

server.use(session({
    resave: false,
    saveUninitialized: true,
    secret: randomstring.generate(8)
}));

passport.use(new EveOAuth2Strategy({
    clientID: 'd01f7784b7db44f29d6065b6bb052a3b',
    clientSecret: 'AUxp4UXTglh4GGZzi9vjGqsOB9azoZQghwKfJiz0',
    scope: "esi-location.read_location.v1 esi-location.read_online.v1",
    callbackURL: 'http://localhost:62340/auth/callback',
    state: "secret"
},
    function (accessToken, refreshToken, profile, cb) {
        return cb(null, {
            'accessToken': accessToken,
            'refreshToken': refreshToken,
            'profile': profile
        });
    }
));

passport.serializeUser(function (user, cb) {
    cb(null, user);
});

passport.deserializeUser(function (obj, cb) {
    cb(null, obj);
});

server.use(passport.initialize());
server.use(passport.session());

let win;

const createWindow = () => {
    win = new BrowserWindow({
        width: 400,
        height: 130,
        transparent: true,
        frame: false,
        resizable: true,
        minimizable: false,
        title: "WH Buddy",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        icon: __dirname + "/img/wormhole.png"
    });

    win.setAlwaysOnTop(true, 'screen');
    win.loadFile('index.html');
};

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});


server.listen("62340", function (err) {
    if (err) {
        console.log(err);
    }
    else {
        console.log("Server Online");
    }
});

server.get("/", function (req, res) {
    res.send("WH Buddy");
})


server.get('/auth/eve', passport.authenticate('eveOnline'));

server.get('/auth/callback', passport.authenticate('eveOnline', { failureRedirect: '/' }), async function (req, res) {
    clearInterval(getCurrentSystem_cron);
    clearInterval(getOnlineStatus_cron);
    clearInterval(refreshToken_cron);
    res.send("Authentication Successful!");
    win.webContents.send("login", req.user.profile.CharacterName);
    getCurrentSystem(req.user.profile.CharacterID, req.user);
    getOnlineStatus(req.user.profile.CharacterID, req.user);
    refreshToken(req.user);
});



function getSystemNameFromID(id) {
    for (entry of systems) {
        if (entry[0] == id) {
            return entry[1];
        }
    }
}

function getSystemDetailsFromName(name) {
    for (wh of whData) {
        if (wh.name == name) {
            return wh
        }
    }
    return { 'name': name };
}

let getCurrentSystem_cron, getOnlineStatus_cron, refreshToken_cron;

async function getCurrentSystem(characterID, user) {
    getCurrentSystem_cron = setInterval(async () => {
        const response = await fetch(`https://esi.evetech.net/latest/characters/${characterID}/location?datasource=tranquility&token=${user.accessToken}`, {
            method: 'get',
        });
        const responseJSON = await response.json();
        const systemName = getSystemNameFromID(responseJSON.solar_system_id);
        const systemDetails = getSystemDetailsFromName(systemName);
        win.webContents.send("systemID", responseJSON.solar_system_id);
        win.webContents.send("systemName", systemName);
        if(systemDetails.class){
        win.webContents.send("systemClass", systemDetails.class)
        }
        else{
            win.webContents.send("systemClass", '')
        }
        win.webContents.send("statics", systemDetails.static)
    }, 5000);
}

async function getOnlineStatus(characterID, user) {
    getOnlineStatus_cron = setInterval(async () => {
        const response = await fetch(`https://esi.evetech.net/latest/characters/${characterID}/online?datasource=tranquility&token=${user.accessToken}`, {
            method: 'get',
        });
        const responseJSON = await response.json();
        win.webContents.send("onlineStatus", responseJSON.online);
    }, 30000);
}

async function refreshToken(user) {

    refreshToken_cron = setInterval(async () => {

        var details = {
            'grant_type': 'refresh_token',
            'refresh_token': encodeURI(user.refreshToken),
            'scopes': "esi-location.read_location.v1 esi-location.read_online.v1",
        };

        var formBody = [];
        for (var property in details) {
            var encodedKey = encodeURIComponent(property);
            var encodedValue = encodeURIComponent(details[property]);
            formBody.push(encodedKey + "=" + encodedValue);
        }
        formBody = formBody.join("&");

        const contentHeader = "application/x-www-form-urlencoded";
        const hostHeader = "login.eveonline.com";
        const authHeader = "Basic ZDAxZjc3ODRiN2RiNDRmMjlkNjA2NWI2YmIwNTJhM2I6QVV4cDRVWFRnbGg0R0daemk5dmpHcXNPQjlhem9aUWdod0tmSml6MA==";

        const response = await fetch('https://login.eveonline.com/v2/oauth/token', {
            method: 'post',
            body: formBody,
            headers: { 'Content-Type': contentHeader, 'Host': hostHeader, 'Authorization': authHeader }
        });

        const data = await response.json();

        if (data.error) {
            console.log(data.error);
            return;
        }

        user.accessToken = data.access_token;
        user.refreshToken = data.refresh_token;
    }, 300000);

}

ipcMain.on('resize-original', (event, arg) => {
    win.setSize(400, 150)
})

ipcMain.on('resize-reduced', (event, arg) => {
    win.setSize(400, 110)
})