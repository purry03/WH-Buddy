let { ipcRenderer } = require("electron")

window.$ = window.jQuery = require('jquery');


$('#logInBtn').on("click", (event, data) => {
    require('electron').shell.openExternal("http://localhost:3000/auth/eve");
});

let navBarIsHidden = false;

$('#minimize').on("click", (event, data) => {
    if (navBarIsHidden) {
        $("nav").show();
        ipcRenderer.send('resize-original')
        navBarIsHidden = false;
    }
    else {
        $("nav").hide();
        ipcRenderer.send('resize-reduced')
        navBarIsHidden = true;
    }
});

ipcRenderer.on("login", (event, charName) => {
    $("nav h3").html(charName);
})

ipcRenderer.on("system", (event, system) => {
    $("#system").html(system);
})

ipcRenderer.on("statics", (event, statics) => {
    console.log(statics);
    $(".statics").html(statics);
})

ipcRenderer.on("onlineStatus", (event, isOnline) => {
    if (isOnline) {
        $(".trackingStatus").css("background-color", "green");
    }
    else {
        $(".trackingStatus").css("background-color", "red");

    }
})