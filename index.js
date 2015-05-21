var { ActionButton } = require('sdk/ui/button/action');
var { setInterval, clearInterval } = require('sdk/timers');
var prefs = require('sdk/simple-prefs').prefs;
var tabs = require('sdk/tabs');
var Request = require('sdk/request').Request;
var _ = require('sdk/l10n').get;

var button = ActionButton({
    id: "ttrss-ping",
    label: "Configure to your TT-RSS installation!",
    icon: "./normal.png",
    badge: "",
    badgeColor: prefs.BackgroundColor,
    onClick: openPage
});

var interval;

if (prefs.Enabled) {
    button.removeListener("click", openPage);
    button.on("click", check);
    check();
    interval = setInterval(check, prefs.UpdateInterval*60000);
}

require('sdk/simple-prefs').on("BackgroundColor", function() {
    button.badgeColor = prefs.BackgroundColor;
});

require('sdk/simple-prefs').on("Enabled", function() {
    if (!prefs.Enabled) {
        button.badge = "";
        button.icon = "./normal.png";
        button.label = "Go to your TT-RSS";

        clearInterval(interval);
        button.removeListener("click", check);
        button.on("click", openPage);
    } else {
        check();
        interval = setInterval(check, prefs.UpdateInterval*60000);
        button.removeListener("click", openPage);
        button.on("click", check);
    }
});

function check() {
    var login = prefs.Login;

    var lastChar = prefs.BaseURL.substr(-1); // Selects the last character
    if (lastChar !== '/') {         // If the last character is not a slash
       prefs.BaseURL = prefs.BaseURL + '/';
    }
   // console.log(prefs.BaseURL);

    var unreadcount = Request({
        url: prefs.BaseURL+"public.php",
        content: "op=getUnread&fresh=1&login="+login,
        
        onComplete: function (response) {
            var unread = 0;
            // check for successful response
            if(response.status === 200) {
                // console.log("response: ", response.text);
                var answer = response.text.split(";");
                var unread = parseInt(answer[0]);
                // console.log("unread: ", unread);
                if (isNaN(unread)) unread = 0;

                // console.log("update, count="+unread);
                
                if(unread === 0) {
                    var zero = _("no")
                    button.badge = unread;
                    button.label = _("unreadcount_id", zero)
                    button.icon = "./normal.png";
                } else if (unread > 0) {
                    button.badge = unread;
                    button.label = _("unreadcount_id", unread)
                    button.icon = "./alert.png";
                } else {
                    button.badge = "!";
                    button.label = _("Error: %s",answer[1].trim());
                    button.icon = "./error.png";
                };
                button.removeListener("click", check);
                button.on("click", openPage);
            } else {
                // console.log(response.text);
                button.badge = "X";
                if (response.status === "404") {
                    button.label = _("There is no TT-RSS installation in that URL!");
                } else {
                    button.label = _("Error %s while updating", response.status);
                }
                button.icon = "./error.png";
            }
        }
    });

    if (prefs.BaseURL !== "http://example.com/tt-rss/") {
        unreadcount.post();
    }
};

function openPage(state) {
    var isopen = false;
    var url = prefs.BaseURL;
    if (prefs.BaseURL !== "http://example.com/tt-rss/") {
        for each (var tab in tabs) {
            if (tab.url.substr(0, url.length) == url) {
                tab.activate();
                isopen = true;
                break;
            }
        }
        if (!isopen) {
            // Open a new tab in the currently active window.
            tabs.open(prefs.BaseURL);
            if (prefs.Enabled) {
                button.removeListener("click", openPage);
                button.on("click", check);
            }
        }
        if (prefs.Enabled) {check();}
    }
}