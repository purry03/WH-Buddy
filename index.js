let { ipcRenderer } = require("electron")

window.$ = window.jQuery = require('jquery');

ipcRenderer.send('resize-original');


$('#logInBtn').on("click", (event, data) => {
    require('electron').shell.openExternal("http://localhost:3000/auth/eve");
});

let navBarIsHidden = false;

$('#minimize').on("click", (event, data) => {
    if (navBarIsHidden) {
        $("nav").show();
        ipcRenderer.send('resize-original');
        $("#minimize").html("-");
        navBarIsHidden = false;
    }
    else {
        $("nav").hide();
        ipcRenderer.send('resize-reduced');
        $("#minimize").html("+");
        navBarIsHidden = true;
    }
});

ipcRenderer.on("login", (event, charName) => {
    $("nav h3").html(charName);
})

let systemName = '', systemID = '';

$('a').on("click", function (e) {
    e.preventDefault();
    require('electron').shell.openExternal($(this).attr("href"));
});

ipcRenderer.on("systemID", (event, system) => {
    systemID = system;
    $("#zkill").attr("href", `https://zkillboard.com/system/${systemID}/`);
})

ipcRenderer.on("systemName", (event, system) => {
    systemName = system.toString();
    $("#system").html(system);
    $("#anoikis").attr("href", `http://anoik.is/systems/${systemName}`);
    $("#dotlan").attr("href", `https://evemaps.dotlan.net/system/${systemName}`);
});

ipcRenderer.on("statics", (event, statics) => {
    let toWrite = '';
    if (typeof statics == 'undefined' || statics.length == 0) {
        toWrite = 'No Statics';
        $(".statics").html(toWrite);
    }
    else {
        statics.forEach((static) => {
            toWrite = toWrite + ' ' + static;
        });
        $(".statics").html(toWrite.toUpperCase());
    }
})

ipcRenderer.on("onlineStatus", (event, isOnline) => {
    if (isOnline) {
        $(".trackingStatus").css("background-color", "green");
        $(".trackingStatus").attr("title", "Online");
    }
    else {
        $(".trackingStatus").css("background-color", "red");
        $(".trackingStatus").attr("title", "Offline");
    }
})