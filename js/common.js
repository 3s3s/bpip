var DEV_MODE = false;

var SERVER_BASE_URL = (DEV_MODE ? "https://dummy.bpip.org/" : "https://bpip.org/");

var HTML = {

    one_element: function (html) {
        let template = document.createElement("template");
        template.innerHTML = html;
        return template.content.firstChild;
    },

    before_or_after: function (element, html, before) {
        new_element = HTML.one_element(html);
        element.parentNode.insertBefore(new_element, before ? element : element.nextSibling);
        return new_element;
    },

    before: function (element, html) {
        return HTML.before_or_after(element, html, true);
    },

    after: function (element, html) {
        return HTML.before_or_after(element, html, false);
    }

};

var STORAGE = {

    DEFAULT_SETTINGS: { show_bpip: true, show_dt: false, show_status: false },
    INSTANCE_ID: null,

    check_id: function() {
        return browser.storage.sync.get({ instance_id: null }).then(store => {
            if (store.instance_id) {
                STORAGE.INSTANCE_ID = store.instance_id;
            } else {
                ID_LOW_BOUND = 1000000000;
                STORAGE.INSTANCE_ID = Math.floor(Math.random() * (Number.MAX_SAFE_INTEGER - ID_LOW_BOUND) + ID_LOW_BOUND).toString(16);
                console.log("Generated new ID: " + STORAGE.INSTANCE_ID);
                browser.storage.sync.set({ instance_id: STORAGE.INSTANCE_ID });
            }
            return STORAGE.INSTANCE_ID;
        });
    },

    get_id_and_settings: function() {
        return browser.storage.sync.get({ instance_id: null, settings: STORAGE.DEFAULT_SETTINGS });
    },

    get_settings: function() {
        return browser.storage.sync.get({ settings: STORAGE.DEFAULT_SETTINGS }).then(store => store.settings);
    },

    save_settings: function(user_settings) {
        return browser.storage.sync.set({ settings: user_settings });
    },

};