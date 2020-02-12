var API_URLS = {
    USER_CHECK: SERVER_BASE_URL + "ex/profileinfo.aspx",
};

// Default server settings
var SERVER_SETTINGS = {
    warning: null,
    cache_time: 600, // 10 minutes
}

// This is a list of all cached objects (e.g. user IDs)
// "object": { timestamp: ..., property1: ..., property2: ... }
let cached_objects = {};
// Maximum number of objects allowed in the cache
let CACHE_MAX_SIZE = 1000;

// This is an array of Promise.resolve functions that will be called sequentially with delay
let throttled_resolvers = [];
// Number of milliseconds to wait before resolving the next queued request promise
let QUEUED_REQUEST_INTERVAL = 1100;
// Number of milliseconds the request promise might take to resolve
let REQUEST_MAX_TIME = 10000;
// Max number of request promises to allow in the queue
let REQUEST_MAX_QUEUE = 20;
// Number of milliseconds to wait before rejecting the queued request promise
let REQUEST_PROMISE_TIMEOUT = REQUEST_MAX_QUEUE * (QUEUED_REQUEST_INTERVAL + REQUEST_MAX_TIME);

function handle_next_resolver() {
    let p = throttled_resolvers.shift();
    if (p === undefined) {
        setTimeout(handle_next_resolver, QUEUED_REQUEST_INTERVAL);
    }
    else {
        p.resolve();
    }
}

setTimeout(handle_next_resolver, QUEUED_REQUEST_INTERVAL);

function queue_promise() {
    return new Promise((resolve, reject) => {
        throttled_resolvers.push({ resolve: resolve });
        setTimeout(function () { reject(new Error("Queued request has timed out.")); }, REQUEST_PROMISE_TIMEOUT);
    });
}

function json_post(url, request_object) {
    return fetch(url, {
        headers: {
            "Content-Type": "application/json; charset=utf-8",
        },
        method: "POST",
        mode: "cors",
        body: JSON.stringify(request_object)
    })
        .then(response => {
            if (response.ok) {
                return response.text();
            }
            else {
                throw new Error("Network response was not good: " + response.status + " " + response.statusText);
            }
        })
        .then(response_text => {
            try {
                return JSON.parse(response_text);
            }
            catch(e) {
                throw new Error("JSON error '" + e.message + "' in: " + response_text);
            }
        })
        .then(response_object => {
            console.log("API request: " + JSON.stringify(request_object));
            console.log("API response: " + JSON.stringify(response_object));
            return response_object;
        });
}

function bpip_action(store, message) {
    let url = null;
    message.result = {};
    if (message.action_type == "USER") {
        if (store.settings.show_dt || store.settings.show_status) {
            url = API_URLS.USER_CHECK;
        } else {
            return Promise.resolve(message);
        }
    }
    if (url) {
        let now = new Date();
        // Check if any of the payload objects are in the cache. Prune cache while we're at it.
        // console.log("CACHE size: " + Object.keys(cached_objects).length);
        // console.log("CACHE now: " + now);
        // console.log("CACHE time: " + SERVER_SETTINGS.cache_time);
        for (let key in cached_objects) {
            //TODO: avoid hardcoding "__type"
            if (key == "__type") {
                continue;
            }
            //console.log("CACHE timestamp: " + key + " " + cached_objects[key].timestamp);
            if (now - cached_objects[key].timestamp > 1000 * SERVER_SETTINGS.cache_time) {
                //console.log("CACHE prune: " + key);
                delete cached_objects[key];
            } else {
                if (key in message.payload) {
                    //console.log("CACHE reuse: " + key);
                    message.result[key] = cached_objects[key];
                    delete message.payload[key];
                }
            }
        }
        let request_items = Object.keys(message.payload);
        message.settings = store.settings;
        if (request_items.length > 0) {
            let request_object = { instance_id: null, items: request_items };
            return json_post(url, request_object)
                .then(response_object => {
                    if (response_object.error_message) {
                        throw new Error("Server error: " + response_object.error_message);
                    }
                    SERVER_SETTINGS = response_object.server_settings;
                    for (let key in response_object.result) {
                        message.result[key] = response_object.result[key];
                        cached_objects[key] = response_object.result[key];
                        cached_objects[key].timestamp = now;
                    }
                    Object.keys(cached_objects)
                        .sort((a, b) => cached_objects[a].timestamp - cached_objects[b].timestamp)
                        .slice(CACHE_MAX_SIZE)
                        .forEach(key => delete cached_objects[key]);
                    return message;
                });
        } else {
            return Promise.resolve(message);
        }
    }
    else {
        return Promise.reject(new Error("Unknown action type: " + message.action_type));
    }
}

browser.runtime.onMessage.addListener(function(message, sender) {
    if (message.action_name === "bpip-request") {
        if (throttled_resolvers.length >= REQUEST_MAX_QUEUE) {
            return Promise.reject(new Error("[WARNING] Try again later, queue limit reached: " + REQUEST_MAX_QUEUE));
        }
        console.log(message);
        return queue_promise()
            .then(() => STORAGE.get_id_and_settings())
            .then(store => bpip_action(store, message))
            .catch((error) => {
                console.log("Request failed in the background:");
                console.log(error);
                throw new Error(error.message);
            })
            .finally(() => {
                setTimeout(handle_next_resolver, QUEUED_REQUEST_INTERVAL);
            })
        ;
    }
    else if (message.action_name === "is-enabled") {
        message.result = SERVER_SETTINGS.warning;
        return Promise.resolve(message);
    }
    else if (message.action_name === "clear-cache") {
        let counter = 0;
        for (let key in cached_objects) {
            delete cached_objects[key];
            counter++;
        }
        message.result = " " + counter + " objects removed from cache ";
        return Promise.resolve(message);
    }
});

// Check the ID
STORAGE.check_id().then(i => {
    //console.log("My ID is " + i);
});

// Open the settings box when the button is clicked
browser.browserAction.onClicked.addListener(() => { browser.runtime.openOptionsPage(); });