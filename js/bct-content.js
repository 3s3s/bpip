console.log("BCT-CONTENT initialized");

let MAX_VALID_USER_ID = 1500000000;
let PROFILE_URL_PREFIX = "https://bitcointalk.org/index.php?action=profile;u=";

function inject_user_info(settings) {
    let user_id_list = {};
    if (document.querySelector(".bpip-ext")) {
        console.log("BCT-CONTENT possible duplicate run, ignoring");
        return user_id_list;
    }
    let bpip_profile_link = '<a href="' + SERVER_BASE_URL + 'profile.aspx?id=%%USERID%%" target="_blank" class="bpip-profile-link bpip-ext"><img src="' + SERVER_BASE_URL + 'images/favicon.ico" /></a>';
    if (window.location.href.startsWith(PROFILE_URL_PREFIX)) {
        // User profile page
        let user_id = window.location.href.replace(PROFILE_URL_PREFIX, "");
        user_id_list[user_id] = null;
        if (settings.show_bpip) {
            let user_name_cell = document.querySelector("tr.titlebg ~ tr td.windowbg table tr").lastElementChild;
            bpip_profile_link = bpip_profile_link.replace("%%USERID%%", user_id);
            user_name_cell.innerHTML = user_name_cell.innerText + " " + bpip_profile_link;
        }
    } else {
        // Other pages - find profile info on the left side (e.g. in threads or PMs)
        document.querySelectorAll("img[title='View Profile']").forEach(img => {
            let profile_box = img.parentElement.parentElement.parentElement;
            let user_name_link = profile_box.querySelector("b > a");
            let profile_link = profile_box.querySelector("div.smalltext a[href*='action=profile']");
            if (user_name_link && profile_link) {
                let user_id = user_name_link.getAttribute("href").replace(PROFILE_URL_PREFIX, "");
                if (user_id > MAX_VALID_USER_ID) {
                    return;
                }
                user_id_list["" + user_id] = null;
                HTML.after(user_name_link, '<span class="bpip-dt-status bpip-dt-status-' + user_id + ' bpip-ext"></span>');
                HTML.after(HTML.after(user_name_link.parentElement, "<br />"), '<span class="bpip-user-status bpip-user-status-' + user_id + ' bpip-ext"></span>');
                if (settings.show_bpip) {
                    HTML.before(profile_link, bpip_profile_link.replace("%%USERID%%", user_id));
                }
            }
        });
    }
    return user_id_list;
}

function populate_user_info(settings, user_info, user_id) {
    if (window.location.href.startsWith(PROFILE_URL_PREFIX)) {
        // User profile page
        let insert_after_row = null;
        [...document.querySelectorAll("tr.titlebg ~ tr td.windowbg table tr")].some(e => {
            if (e.firstElementChild.innerText == "Position:") {
                insert_after_row = e;
                return true;
            }
        });
        if (settings.show_status && user_info.user_status && insert_after_row) {
            insert_after_row = HTML.after(insert_after_row, '<tr class="bpip-ext"><td><b>Status:</b></td><td>' + user_info.user_status + "</td>");
        }
        if (settings.show_dt && user_info.dt_status && insert_after_row) {
            insert_after_row = HTML.after(insert_after_row, '<tr class="bpip-ext"><td><b>DT level:</b></td><td>' + user_info.dt_status + "</td>");
        }
    } else {
        if (settings.show_dt) {
            document.querySelectorAll(".bpip-dt-status-" + user_id)
                .forEach(placeholder =>
                {
                    placeholder.innerHTML = user_info.dt_status;
                });
        }
        if (settings.show_status) {
            document.querySelectorAll(".bpip-user-status-" + user_id)
                .forEach(placeholder =>
                {
                    placeholder.innerHTML = user_info.user_status;
                });
        }
    }
}

let msg_is_enabled = { action_name: "is-enabled" };
browser.runtime.sendMessage(msg_is_enabled)
    .then(msg => {
        if (msg.result) {
            throw new Error("TERMINATED: " + msg.result);
        }
    })
    .then(() => {
        return STORAGE.get_id_and_settings();
    })
    .then(store => {
        let user_id_list = inject_user_info(store.settings);
        if ((store.settings.show_dt || store.settings.show_status) && Object.keys(user_id_list).length > 0) {
            let msg_user_info = { action_name: "bpip-request", action_type: "USER", payload: user_id_list };
            return browser.runtime.sendMessage(msg_user_info)
                .then(msg => {
                    if (msg.result && msg.settings) {
                        // TODO: check for warning
                        for (let user_id in msg.result) {
                            populate_user_info(msg.settings, msg.result[user_id], user_id);
                        }
                    } else {
                        throw new Error("No info from the server");
                    }
                })
                ;
        }
    })
    .catch(error => {
        console.log(error);
        //throw error;
    })
;
