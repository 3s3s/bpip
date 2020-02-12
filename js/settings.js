function validate_switches() {
    //
}

function save_settings() {
    validate_switches();
    var user_settings = {
        show_bpip: document.getElementById("show_bpip").checked,
        show_dt: document.getElementById("show_dt").checked,
        show_status: document.getElementById("show_status").checked,
    };
    STORAGE.save_settings(user_settings)
        .then(() => {
            //document.getElementById("result").textContent = " Options saved ";
            //setTimeout(() => { document.getElementById("result").innerText = ""; }, 1000);
        });
}

function restore_settings() {
    document.getElementById("version").innerText = browser.runtime.getManifest().version;
    STORAGE.get_id_and_settings()
        .then(store => {
            document.getElementById("show_bpip").checked = store.settings.show_bpip;
            document.getElementById("show_dt").checked = store.settings.show_dt;
            document.getElementById("show_status").checked = store.settings.show_status;
            console.log(store.instance_id);
            document.getElementById("extension_id").innerHTML = "Extension ID: " + store.instance_id;
            //console.log(store.instance_id);
        });
    validate_switches();
}

document.addEventListener("DOMContentLoaded", restore_settings);
document.querySelectorAll(".switch input").forEach(e => { e.addEventListener("change", save_settings); });
document.querySelector(".advanced-link").addEventListener("click", e => {
    e.preventDefault();
    document.querySelectorAll(".advanced").forEach(d => {
        d.style.visibility = (window.getComputedStyle(d).visibility == "hidden" ? "visible" : "hidden");
    });
});
document.querySelector(".clear-cache").addEventListener("click", e => {
    browser.runtime.sendMessage({ action_name: "clear-cache" })
        .then(msg => {
            document.getElementById("result").textContent = msg.result;
            setTimeout(() => { document.getElementById("result").textContent = ""; }, 1000);
        });
});
