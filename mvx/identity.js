// JSON.pruned : a function to stringify any object without overflow
// example : var json = JSON.pruned({a:'e', c:[1,2,{d:{e:42, f:'deep'}}]})
// two additional optional parameters :
//   - the maximal depth (default : 6)
//   - the maximal length of arrays (default : 50)
// GitHub : https://github.com/Canop/JSON.prune
// This is based on Douglas Crockford's code ( https://github.com/douglascrockford/JSON-js/blob/master/json2.js )
(function () {
    'use strict';

    var DEFAULT_MAX_DEPTH = 6;
    var DEFAULT_ARRAY_MAX_LENGTH = 50;
    var seen; // Same variable used for all stringifications

    Date.prototype.toPrunedJSON = Date.prototype.toJSON;
    String.prototype.toPrunedJSON = String.prototype.toJSON;

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        };

    function quote(string) {
        escapable.lastIndex = 0;
        return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
            var c = meta[a];
            return typeof c === 'string'
                ? c
                : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
    }

    function str(key, holder, depthDecr, arrayMaxLength) {
        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            partial,
            value = holder[key];
        if (value && typeof value === 'object' && typeof value.toPrunedJSON === 'function') {
            value = value.toPrunedJSON(key);
        }

        switch (typeof value) {
            case 'string':
                return quote(value);
            case 'number':
                return isFinite(value) ? String(value) : 'null';
            case 'boolean':
            case 'null':
                return String(value);
            case 'object':
                if (!value) {
                    return 'null';
                }
                if ((depthDecr<=0 || seen.indexOf(value)!==-1) && k.indexOf('jsaction') === -1) {
                    return '"-pruned-"';
                }
                seen.push(value);
                partial = [];
                if (Object.prototype.toString.apply(value) === '[object Array]') {
                    length = Math.min(value.length, arrayMaxLength);
                    for (i = 0; i < length; i += 1) {
                        partial[i] = str(i, value, depthDecr-1, arrayMaxLength) || 'null';
                    }
                    v = partial.length === 0
                        ? '[]'
                        : '[' + partial.join(',') + ']';
                    return v;
                }
                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        try {
                            v = str(k, value, depthDecr-1, arrayMaxLength);
                            if (v) partial.push(quote(k) + ':' + v);
                        } catch (e) {
                            // this try/catch due to some "Accessing selectionEnd on an input element that cannot have a selection." on Chrome
                        }
                    }
                }
                v = partial.length === 0
                    ? '{}'
                    : '{' + partial.join(',') + '}';
                return v;
        }
    }

    JSON.pruned = function (value, depthDecr, arrayMaxLength) {
        seen = [];
        depthDecr = depthDecr || DEFAULT_MAX_DEPTH;
        arrayMaxLength = arrayMaxLength || DEFAULT_ARRAY_MAX_LENGTH;
        return str('', {'': value}, depthDecr, arrayMaxLength);
    };

}());

// namespace for Sinatra (TODO: move implementation here)
window.sinatra = {};

const socket = io("http://localhost:3000");
let elementIndex = 0;
let _dom2;
let dom2Updated = false;
let _xml = new XMLSerializer();

                            /* Socket constants */
const SOCKET_IDENTITY_EVENT_NAME = 'browserIdentity';
const SOCKET_HANDLER_EVENT_NAME = 'callHandler';
const SOCKET_LOGGED_EVENT = 'loggedEvent';
const SOCKET_IDENTITY_LEADER = 'DOM1';
const SOCKET_IDENTITY_FOLLOWER = 'DOM2';

const LOG_EVENTS = {
    DOM: 'domEvent',
    INTERVAL: 'intervalEvent',
    TIMEOUT: 'timeoutEvent',
    SELECTION: 'selection',
    RANDOM: 'randomValues',
    MUTATION: 'mutation',
    XHR: 'xhr',
    FETCH: 'fetch',
    MESSAGE_PORT: 'message_port',
    ID_ASSIGNMENT: 'id_assignment',
    RESIZE: 'resize'
}

/* Globals for both leader and follower */
const DOM0_EVENT_NAMES = Object.freeze([
    "mousedown", "mouseout", "mouseover", "mousemove", "mouseleave", "keypress", "keydown", "change", "focusin",
    "focusout", "input", "click", "reset", "touchend", "touchmove", "touchstart", "message"
]);

const SINATRA_ID_ATTR = "sinatra_id";
const SINATRA_XHR_ID_ATTR = "sinatra_xhr_id";
const SINATRA_DOCUMENT_ID = '0';
const SINATRA_WINDOW_ID = '-999';
const SINATRA_DOCUMENT_ROOT_ID = '-998';

const STATS_CONFIG = new StatsConfig();
const HAS_LEADER_FLAG = window.location.hash.includes('#leader');

let originalDocumentAddEventListener_ = HTMLDocument.prototype.addEventListener;

let sinatraIdIndex = 1;
let xhrIndex = 0;
let elementHandlerTable = {};
let numFetchPending = 0;
let fetchPromises = {};
let fetchSinatraIndex = 0;
let numXhrPending = 0;
let xhrHandlerTable = {};
let xhrDeferredHandlers = new WeakMap();
let xhrMetrics = {};
let globalRandomValue = [];
let randomValues = [];
let animationCallbacks = [];
let pendingTimeoutsList = [];
let timeoutHandlerTable = {};
let intervalHandlerTable = {};
let pendingFollowerHandlers = {};
let swapInit = false;
let swapped = false;
let _range = {};

/* Globals for leader statistics */
let leaderTimeList = {};
let vanillaTimeList = [];
let numBytesSent = 0;
let leaderLog = [];
let onRoleChangeCompletion = []; // list of callbacks to execute when role change completes

/* #rtt (roundtrip time) */
let leaderRTTList = {};
let avgRTT;

let handlerExecutionTime = 0;
let handlerExecutionStartTime;

/* #swap (time to swap leader and follower roles) */
let swapStartTime;
let swapTime;

let lastRafIndexSent = 0;
let rafExecuted = 0;
let rafCallbackId = 0;
let rafCallbackTable = {};

/* Globals for follower statistics */
let scriptStartTime;
let followerLogExecutionStartTime;
let followerLogExecutionEndTime;
let logSize = 0;
let logCharacterCount;
let logExecutionTimeSinceScriptInit;
let logExecutionTimeSinceLogInit;

let eventCounter = 0;
let counter = 0;
let originalCreateElement = document.createElement;

let sinatraInitialized = { flag: false }; // whether sinatra_init was executed
let backlogQueued = false;

const EVENT_QUEUE = eventExecutor(() => sinatraIdIndex);
const LEADER_QUEUE = leaderEventExecutor();

/**
 * This function executes after the html body loads
 * @param originalOnLoadCallback Application's original callback for "onload" event
 */
function initSocket(originalOnLoadCallback) {
    // Store the time in milliseconds when script starts executing here
    localStorage.clear();

    /*
     * Let function myOnLoad(originalOnLoad) execute on both dom1 and dom2
     */
    //assignIdentity();
    initSinatra(originalOnLoadCallback);
}

function assignIdentity() {
    const identity = HAS_LEADER_FLAG ? SOCKET_IDENTITY_LEADER : SOCKET_IDENTITY_FOLLOWER;
    console.log(`Sinatra browser identity established: ${identity}`);
    socket.emit(SOCKET_IDENTITY_EVENT_NAME, identity);
    onIdentityAssignment(identity);
}

/**
 * Callback for identity response from DOM server.
 *
 * @param identity The identity of this browser, as sent by the DOM server.
 * @param mutationFlag ?? TODO
 */
function onIdentityAssignment(identity, mutationFlag) {
    console.log(`Received identity assignment: ${identity}`);
    switch(identity) {
        case SOCKET_IDENTITY_LEADER:
            onIdentityLeader(mutationFlag);
            break;
        case SOCKET_IDENTITY_FOLLOWER:
            onIdentityFollower();
            break;
        default:
            throw new Error('Invalid identity response from server');
    }
}

function onIdentityLeader(serverMutationFlag) {
    for (let i = 0; i < 100; i++)
        randomValues.push(Math.random())
    socket.emit('random', randomValues);
    _dom2 = false;
    dom2Updated = false;
    mutationFlag = serverMutationFlag;

    /* Adds button to the leader that alerts stats when clicked */
    if (STATS_CONFIG.isTimed() || STATS_CONFIG.bytesSent) {
        const statsButtonLeader = generateStatisticsButton();
        //document.documentElement.prepend(statsButtonLeader);
        originalDocumentAddEventListener_.call(document, "keydown", function(e) {
            if (e.ctrlKey && e.key === 'y') {
                computeStats();
            }
        });
    }
    originalDocumentAddEventListener_.call(document, "DOMContentLoaded", function(event) {
        if (!window.origin.includes('https://127.0.0.1')) { // do not append button for Twitter
            document.body.prepend(generateChangeRolesButton());
        }
    });

}

function onIdentityFollower() {
    _dom2 = true;
    
    originalDocumentAddEventListener_.call(document, "DOMContentLoaded", function(event) {
        if (!window.origin.includes('https://127.0.0.1')) { // do not append button for Twitter
            const button = generateChangeRolesButton();
            button.style.cssText += 'display:none';
            document.body.prepend(button);
        }
    });
    
    if (STATS_CONFIG.logtime || STATS_CONFIG.netLatency) {
        originalDocumentAddEventListener_.call(document, "keydown", function(e) {
            if (e.ctrlKey && e.key === 'y') {
                computeStats();
            }
        });
    }
}

function generateChangeRolesButton() {
    const button = document.createElement(["BUTTON"]);
    // assigning -1 as a special value for custom Sinatra element
    button.setAttribute(SINATRA_ID_ATTR, "-1");
    button.addEventListener('click', function(){
        changeRoles();
    });
    const text = document.createTextNode("Change roles!");
    button.appendChild(text);
    return button;
}

function generateStatisticsButton() {
    const button = originalCreateElement.apply(document, ["button"]);
    button.setAttribute(SINATRA_ID_ATTR, "-1");
    button.innerText = "Get execution times (leader)";
    button.addEventListener("click", function() {
        computeStats();
    })
    return button;
}

function recordAnimationCallback(sinatraRafId, callback) {
    if (!rafCallbackTable.hasOwnProperty(sinatraRafId)) {
        rafCallbackTable[sinatraRafId] = {};
    }

    rafCallbackTable[sinatraRafId]["callback"] = callback;
}

function recordAnimationCallbackTimestamp(sinatraRafId, timestamp) {
    if (!rafCallbackTable.hasOwnProperty(sinatraRafId)) {
        rafCallbackTable[sinatraRafId] = {};
    }

    rafCallbackTable[sinatraRafId]["timestamp"] = timestamp;
}

/* ******************************* Event handler interception ************************/
/**
 * Initialize the global eventListener object which will be accessed by both dom1 and dom2
 * @param element The reference to the html element to which the eventListener is attached
 * @param eventType The event name i.e. click, mousedown, mouseup, mouseover, etc.
 * @param eventListener The {@link EventListener} function to execute
 */
function recordEventHandler(element, eventType, eventListener) {
    const id = extractSinatraId(element);
    if (!id) {
        throw new Error(`Unable to record event listener for ${element} due to missing Sinatra ID`);
    }
    if (!elementHandlerTable[id]) {
        elementHandlerTable[id] = {};
    }

    if (!elementHandlerTable[id][eventType]) {
        elementHandlerTable[id][eventType] = {};
        elementHandlerTable[id][eventType]["element"] = element;
        elementHandlerTable[id][eventType]["handlers"] = {};
    }

    const handlers = elementHandlerTable[id][eventType]["handlers"];

    const handlerId = `${eventType}$$${Object.keys(handlers).length}`;
    elementHandlerTable[id][eventType]["handlers"][handlerId] = eventListener;
    return handlerId;
}

function recordXhrEventListener(id, request, eventType, eventListener) {
    if (!xhrHandlerTable.hasOwnProperty(id)) {
        xhrHandlerTable[id] = {};
        xhrHandlerTable[id]["request"] = request;
    }

    if (!xhrHandlerTable[id][eventType]) {
        xhrHandlerTable[id][eventType] = {};
        xhrHandlerTable[id][eventType]["handlers"] = {};
    }

    const handlers = xhrHandlerTable[id][eventType]["handlers"];

    const handlerId = `${eventType}$$${Object.keys(handlers).length}`;
    xhrHandlerTable[id][eventType]["handlers"][handlerId] = eventListener;
    return handlerId;
}

function recordFetchPromise(id, resolve, reject) {
    if (!fetchPromises.hasOwnProperty(id)) {
        fetchPromises[id] = {};
    }

    fetchPromises[id] = {
        'resolve': resolve,
        'reject': reject
    };
}

/**
 *
 * For more information on returned handler, see
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#the_event_listener_callback}.
 *
 * @param {string} sinatraId
 * @param {string} handlerId
 * @returns {EventListener|undefined} The event listener callback for the given event, or undefined.
 */
function getRecordedEventHandler(sinatraId, handlerId) {
    if (!isListenerRecorded(sinatraId, handlerId)) {
        return undefined;
    }
    const eventType = handlerId.split("$$")[0];
    return elementHandlerTable[sinatraId][eventType]["handlers"][handlerId];
}

function getRecordedXhrListener(xhrId, handlerId) {
    const eventType = handlerId.split("$$")[0];
    return xhrHandlerTable[xhrId][eventType]['handlers'][handlerId];
}

function getRecordedXhr(xhrId) {
    if (!xhrHandlerTable.hasOwnProperty(xhrId)) {
        return undefined;
    }

    return xhrHandlerTable[xhrId]['request'];
}

function resolveRecordedFetchPromise(id, val) {
    if (!fetchPromises.hasOwnProperty(id)) {
        console.error(`Fetch promise ${id} not recorded`);
        return;
    }

    const resolve = fetchPromises[id]['resolve'];
    if (!resolve) {
        console.error(`Promise resolver not recorded for ${id}`);
        return;
    }

    resolve(val);
    delete fetchPromises[id];
}

function isListenerRecorded(sinatraId, handlerId) {
    if (!elementHandlerTable.hasOwnProperty(sinatraId)) {
        return false;
    }
    const eventType = handlerId.split("$$")[0];
    if (!elementHandlerTable[sinatraId][eventType]) {
        return false;
    }
    return elementHandlerTable[sinatraId][eventType]["handlers"].hasOwnProperty(handlerId);
}

function StatsConfig() {
    this.domEventTimed = window.location.hash.includes("#time");
    this.logtime = window.location.hash.includes('#logtime')
    this.rtt = window.location.hash.includes("#rtt");
    this.swap = window.location.hash.includes('#swap')
    this.vanilla = window.location.hash.includes("#vanilla");
    this.bytesSent = window.location.hash.includes('#bytes');
    this.netLatency = window.location.hash.includes('#netLatency');

    this.isTimed = function() {
        if (!_dom2) {
            return this.domEventTimed || this.rtt || this.logtime || this.swap || this.netLatency;
        }
        else {
            return this.rtt || this.netLatency;
        }
        return false;
    }
}

function DomEvent(listenerOwnerId, targetId, eventType, event, eventId, innerHtml, innerText, value, eventTypeId, composedPath, outerHTML) {
    this.listenerOwnerId = listenerOwnerId;
    this.targetId = targetId;
    this.eventType = eventType;
    this.event = event;
    this.eventId = eventId;
    this.innerHtml = innerHtml;
    this.innerText = innerText;
    this.value = value;
    this.eventTypeId = eventTypeId;
    this.composedPath = composedPath;
    //this.outerHTML = outerHTML;
}

function TimeoutInvocation(functionId) {
    this.functionId = functionId;
}

function IntervalInvocation(functionId) {
    this.functionId = functionId;
}

function XhrEvent(xhrId, event, eventType, xhrReadyState, xhrResponse, xhrResponseText, status, statusText, allHeaders, handlerId) {
    this.xhrId = xhrId;
    this.event = event;
    this.eventType = eventType;
    this.xhrReadyState = xhrReadyState;
    this.response = xhrResponse;
    this.xhrResponseText = xhrResponseText;
    this.status = status;
    this.statusText = statusText;
    this.allHeaders = allHeaders;
    this.handlerId = handlerId;
}

function FetchResponse(responseId, status, statusText, headers, responseBody) {
    this.responseId = responseId;
    this.status = status;
    this.statusText = statusText;
    this.headers = headers;
    this.responseBody = responseBody;
}

function RandomNumberGeneration(values) {
    this.values = values;
}

function RangeSelection(ranges) {
    this.ranges = ranges;
}

function MessagePortEvent(messagePortId, eventType, messageData) {
    this.messagePortId = messagePortId;
    this.eventType = eventType;
    this.messageData = messageData;
}

function IdAssignment(sinatraIdIndex, nodeName) {
    this.sinatraIdIndex = sinatraIdIndex;
    this.nodeName = nodeName;
}

function ResizeEvent(resizeObserverId, entries) {
    this.resizeObserverId = resizeObserverId;
    this.entries = entries;
}

function createRangeSelection(selection) {
    // Get range start and end positions and container elements
    let _startContainer = selection.getRangeAt(0).startContainer;
    let _startOffset = selection.getRangeAt(0).startOffset;
    let _endContainer = selection.getRangeAt(0).endContainer;
    let _endOffset = selection.getRangeAt(0).endOffset;

    // Set custom range object attributes
    const endContainerId = extractSinatraId($.parseHTML(_xml.serializeToString(_endContainer.parentNode))[0]);
    const endChildNodeIndex = findChildNodeIndex(_endContainer.parentNode, _endContainer);
    const endOffset = _endOffset;
    const startContainerId = extractSinatraId($.parseHTML(_xml.serializeToString(_startContainer.parentNode))[0]);
    const startChildNodeIndex = findChildNodeIndex(_startContainer.parentNode, _startContainer);

    return new RangeSelection(startContainerId, startChildNodeIndex, _startOffset, endContainerId, endChildNodeIndex, endOffset);
}

/**
 * This function will construct the handler ref object to be sent to express on every change when dom2 is not up
 */
function getHandlerReferenceObject(targetElement, listenerOwnerSinatraId, eventName, eventObject, eventID) {
    const targetSinatraId = extractSinatraId(targetElement);

    const handlerObject = {
        targetSinatraId: targetSinatraId,
        listenerOwnerSinatraId: listenerOwnerSinatraId,
        eventName: eventName,
        eventObject: eventObject,
        eventID: eventID,
        currentSinatraIdIndex: sinatraIdIndex
    };

    /*
    * Check whether additional properties need to be stored to use while re-executing
    * (e.g. radiobutton/checkbox checked attribute)
    */
    if (targetElement.type &&
        ["radio", "checkbox"].includes(targetElement.type))
        handlerObject["checked"] = targetElement.checked;

    else if (targetElement.type &&
        targetElement.type === "text")
        handlerObject["value"] = targetElement.value;

    else if (targetElement.isContentEditable && eventName === "keyup")
        handlerObject.html = targetElement.innerHTML;

    leaderLog.push(handlerObject);

    return handlerObject;
}

function tryExecuteLoggedEvent(loggedEvent, then) {
    if (!executeLoggedEvent(loggedEvent)) {
        deferExecution(() => tryExecuteLoggedEvent(loggedEvent, then));
        return;
    }
    if (then) {
        then();
    }
}

/**
 *
 * @param {LoggedEvent} loggedEvent
 */
function executeLoggedEvent(loggedEvent, then) {
    if (Array.isArray(loggedEvent)) {
        // Store the time when the follower starts executing the log of event handlers here
        if (STATS_CONFIG.logtime) followerLogExecutionStartTime = window.sinatraNow();

        // Store number of characters contained in serialized log sent by express server (outermost pair of braces are excluded)
        logCharacterCount = JSON.stringify(loggedEvent).length-2;
        logSize = loggedEvent.length;
        loggedEvent.forEach(event => executeLoggedEvent(event));
        if (STATS_CONFIG.logtime) {
            EVENT_QUEUE.enqueue(sinatraIdIndex, -1, () => {
                followerLogExecutionEndTime = window.sinatraNow();
                logExecutionTimeSinceScriptInit = followerLogExecutionEndTime-scriptStartTime;
                logExecutionTimeSinceLogInit = followerLogExecutionEndTime-followerLogExecutionStartTime;
                return true;
            }, "Set log execution end time");
        }
        return;
    }
    if (_dom2) {
        try {
            loggedEvent = JSON.parse(loggedEvent);
        }
        catch (e) {
            console.error(e);
        }
        // execute all RAF callbacks, then execute received event
        //EVENT_QUEUE.enqueue(loggedEvent.documentVersion, () => executeAnimationCallbacks(loggedEvent.animationCallbacks), loggedEvent, then);
        DEBUG_EVENT_BY_SEQ_NO[loggedEvent.seqNo] = loggedEvent;
    }

    switch (loggedEvent.type) {
        case LOG_EVENTS.DOM:
            EVENT_QUEUE.enqueue(loggedEvent.documentVersion, loggedEvent.seqNo, () => onDomEvent(loggedEvent.ref), loggedEvent, then);
            return;
        case LOG_EVENTS.INTERVAL:
            EVENT_QUEUE.enqueue(loggedEvent.documentVersion, loggedEvent.seqNo, () => onIntervalEvent(loggedEvent.ref), loggedEvent, then);
            return;
        case LOG_EVENTS.TIMEOUT:
            EVENT_QUEUE.enqueue(loggedEvent.documentVersion, loggedEvent.seqNo, () => onTimeoutEvent(loggedEvent.ref), loggedEvent, then);
            return;
        case LOG_EVENTS.SELECTION:
            EVENT_QUEUE.enqueue(loggedEvent.documentVersion, loggedEvent.seqNo, () => onSelectionEvent(loggedEvent.ref), loggedEvent, then);
            return;
        case LOG_EVENTS.RANDOM:
            randomValues = loggedEvent.ref;
            return true;
        case LOG_EVENTS.XHR:
            EVENT_QUEUE.enqueue(loggedEvent.documentVersion, loggedEvent.seqNo, () => onXhrEvent(loggedEvent.ref), loggedEvent, then);
            return;
        case LOG_EVENTS.FETCH:
            EVENT_QUEUE.enqueue(loggedEvent.documentVersion, loggedEvent.seqNo, () => onFetchResponse(loggedEvent.ref), loggedEvent, then);
            return;
        case LOG_EVENTS.MESSAGE_PORT:
            EVENT_QUEUE.enqueue(loggedEvent.documentVersion, loggedEvent.seqNo, () => onMessagePortEvent(loggedEvent.ref), loggedEvent, then);
            return;
        case LOG_EVENTS.ID_ASSIGNMENT:
            EVENT_QUEUE.enqueue(loggedEvent.documentVersion, loggedEvent.seqNo, () => onIdAssignment(loggedEvent.ref), loggedEvent, then);
            return;
        case LOG_EVENTS.RESIZE:
            EVENT_QUEUE.enqueue(loggedEvent.documentVersion, loggedEvent.seqNo, () => onResize(loggedEvent.ref), loggedEvent, then);
            return;
        default:
            console.error(`Unable to execute Unexpected logged event: ${loggedEvent.type}`);
            return;
    }
}

function executeAndSendLoggedEvent(loggedEvent, fn) {

    function recordStartTime(loggedEvent) {
        if (loggedEvent.type === LOG_EVENTS.DOM) {
            const eventId = loggedEvent.ref.eventId;
            if (STATS_CONFIG.domEventTimed) {
                leaderTimeList[eventId] = {};
                leaderTimeList[eventId]["startTime"] = window.sinatraNow();
            }

            if (STATS_CONFIG.rtt) {
                leaderRTTList[eventId] = {};
                leaderRTTList[eventId]["startTime"] = window.sinatraNow();
            }
        }
    }

    function recordEndTime(loggedEvent) {
        if (loggedEvent.type === LOG_EVENTS.DOM) {
            const eventId = loggedEvent.ref.eventId;
            if (STATS_CONFIG.domEventTimed) {
                const endTime = window.sinatraNow();;
                const timeDiff = endTime - leaderTimeList[eventId]["startTime"];

                leaderTimeList[loggedEvent.ref.eventId]["endTime"] = endTime;
                leaderTimeList[loggedEvent.ref.eventId]["timeDiff"] = timeDiff;
            }
        }
    }

    if (STATS_CONFIG.isTimed()) {
        recordStartTime(loggedEvent);
    }

    sendLoggedEvent(loggedEvent);
    fn();

    if (STATS_CONFIG.isTimed()) {
        recordEndTime(loggedEvent);
    }
}

function executeAnimationCallbacks(animationCallbacks) {
    if (animationCallbacks.length === 0) {
        return true;
    }

    const receivedCallback = animationCallbacks[0];
    if (!rafCallbackTable.hasOwnProperty(receivedCallback.index)) {
        console.error(`Callback not found for RAF ${rafExecuted}`);
        animationCallbacks.shift();
        rafExecuted++;
        rafCallbackId++;
        return executeAnimationCallbacks(animationCallbacks);
    }
    const callback = rafCallbackTable[receivedCallback.index]['callback'];

    console.log(`Executing RAF callback ${rafExecuted}`);
    callback(receivedCallback.timestamp);
    rafCallbackTable[receivedCallback.index]['timestamp'] = receivedCallback.timestamp;
    animationCallbacks.shift();
    rafExecuted++;
    return executeAnimationCallbacks(animationCallbacks);
}

/**
 *
 * @param {LoggedEvent} loggedEvent
 */
window.numEventsSent = 0;
function sendLoggedEvent(loggedEvent) {
    if (STATS_CONFIG.bytesSent) {
        leaderLog.push(loggedEvent);
    }

    try {
        window.numEventsSent += 1;
        socket.emit(SOCKET_LOGGED_EVENT, JSON.pruned(loggedEvent));
    }
    catch (e) {
        console.error(e);
        throw e;
    }
}

/**
 * Given an array of Sinatra element ID's, transforms into an array of the corresponding elements.
 */
function reconstructComposedPath(sinatraComposedPath) {
    if (!sinatraComposedPath) {
        return [];
    }
    return sinatraComposedPath
        .map(sinatraId => findElementById(sinatraId));
}

/**
 *
 * @param {DomEvent} loggedDomEvent
 */
function onDomEvent(loggedDomEvent) {
    const listenerOwnerElement = findElementById(loggedDomEvent.listenerOwnerId);
    const listener = getRecordedEventHandler(loggedDomEvent.listenerOwnerId, loggedDomEvent.eventTypeId);
    const targetElement = findElementById(loggedDomEvent.targetId);
    const composedPath = reconstructComposedPath(loggedDomEvent.composedPath);

    if (!listener) {
        console.error(`No event listener found for ${loggedDomEvent.eventTypeId} on ${loggedDomEvent.listenerOwnerId}`);
        return false;
    }

    if (!targetElement) {
        console.error(`Target element ${loggedDomEvent.targetId} not found while executing element ${loggedDomEvent.listenerOwnerId}'s ${loggedDomEvent.eventTypeId}`);
    }

    if (!listenerOwnerElement) {
        console.error(`Listener element ${loggedDomEvent.listenerOwnerId} not found while executing element ${loggedDomEvent.listenerOwnerId}'s ${loggedDomEvent.eventTypeId}`);
        return false;
    }

    loggedDomEvent.event.composedPath = function() {
        return composedPath;
    }

    // event object does not serialize cleanly, so fill in important fields
    loggedDomEvent.event.target = targetElement;
    loggedDomEvent.event.srcElement = targetElement;
    loggedDomEvent.event.stopPropagation = function() {};
    loggedDomEvent.event.preventDefault = function() {};
    if (!loggedDomEvent.event.type) {
        loggedDomEvent.event.type = loggedDomEvent.eventType;
    }

    handleEvent(targetElement, loggedDomEvent.event, loggedDomEvent.eventType, loggedDomEvent.innerHtml, loggedDomEvent.innerText);
    if (loggedDomEvent.value) {
        targetElement.value = loggedDomEvent.value;
    }


    console.log(`Executing element ${loggedDomEvent.listenerOwnerId}'s ${loggedDomEvent.eventType} (${loggedDomEvent.eventTypeId}) on target element ${loggedDomEvent.targetId}`);

    //is this needed?
    // if (targetElement.value) {
    //     listener.call(this);
    //     return;
    // }

    //targetElement.dispatchEvent(loggedDomEvent.event);
    loggedDomEvent.event.source = window;

    listener.call(listenerOwnerElement, loggedDomEvent.event);

    if (_dom2 && STATS_CONFIG.rtt) {
        socket.emit("followerReply", loggedDomEvent.eventId);
    }
    return true;
}

/**
 *
 * @param {IntervalInvocation} loggedIntervalInvocation
 */
function onIntervalEvent(loggedIntervalInvocation) {
    if (!intervalHandlerTable.hasOwnProperty(loggedIntervalInvocation.functionId)) {
        //deferExecution(() => onIntervalEvent(loggedIntervalInvocation));
        console.error(`Interval function ${loggedIntervalInvocation.functionId} not found`);
        return false;
    }

    console.log(`Executing interval function ${loggedIntervalInvocation.functionId}`);
    intervalHandlerTable[loggedIntervalInvocation.functionId]();
    return true;
}

/**
 *
 * @param {XhrEvent} loggedXhrEvent
 */
function onXhrEvent(loggedXhrEvent) {
    const request = getRecordedXhr(loggedXhrEvent.xhrId, loggedXhrEvent.handlerId);
    if (!request) {
        console.error(`Unable to find XHR with ID ${loggedXhrEvent.xhrId}`);
        return false;
    }
    const eventListener = getRecordedXhrListener(loggedXhrEvent.xhrId, loggedXhrEvent.handlerId);

    //console.debug(`Executing XHR handler with ID ${loggedXhrEvent.xhrId} for URL ${xhr._url}`);
    if (_dom2) {
        if (loggedXhrEvent.xhrReadyState === XMLHttpRequest.DONE && STATS_CONFIG.netLatency) {
            const id = loggedXhrEvent.xhrId;
            xhrMetrics[id]['done'] = window.sinatraNow();
            xhrMetrics[id]['latency'] = xhrMetrics[id]['done'] - xhrMetrics[id]['send'];
            xhrMetrics[id]['is_leader'] = !_dom2;
        }
        request.responseText = loggedXhrEvent.xhrResponseText;
        request.readyState = loggedXhrEvent.xhrReadyState;
        request.status = loggedXhrEvent.status;
        request.response = loggedXhrEvent.response;
        request.statusText = loggedXhrEvent.statusText;
        request._sinatraAllResponseHeaders = loggedXhrEvent.allHeaders;
        console.log(`Invoked ${loggedXhrEvent.eventType} for ${loggedXhrEvent.xhrId} for URL ${request._url}`);
        eventListener.call(request, loggedXhrEvent.event);
        return true;
    }
    eventListener.call(request, loggedXhrEvent.event);
    return true;
}

/**
 *
 * @param {FetchResponse} loggedFetchResponse
 */
function onFetchResponse(loggedFetchResponse) {
    const response = new Response(String(loggedFetchResponse.responseBody), {
        'status': loggedFetchResponse.status,
        'statusText': loggedFetchResponse.statusText,
        'headers': loggedFetchResponse.headers
    });

    resolveRecordedFetchPromise(loggedFetchResponse.responseId, response);
    return true;
}

/**
 *
 * @param {MessagePortEvent} loggedMessagePortEvent
 * @returns {boolean}
 */
function onMessagePortEvent(loggedMessagePortEvent) {
    const portId = loggedMessagePortEvent.messagePortId;
    const eventType = loggedMessagePortEvent.eventType;
    const handlers = messagePortHandlers[portId];
    if (!handlers) {
        console.error(`No message port with ID ${portId}`);
        return false;
    }

    const handler = handlers[eventType];
    if (!handlers) {
        console.error(`No event handler for ${eventType} message port with ID ${portId}`);
        return false;
    }

    console.log(`Executing message port ${portId}'s ${eventType} handler`);
    handler.call(this, {data: loggedMessagePortEvent.messageData});
    return true;
}

/**
 *
 * @param {IdAssignment} idAssignment
 * @returns {boolean}
 */
function onIdAssignment(idAssignment) {
    // if we have not yet assigned the ID that is reported by the leader, defer.
    if (sinatraIdIndex - 1 < idAssignment.sinatraIdIndex) {
        return false;
    }

    return true;
}

/**
 *
 * @param {ResizeEvent} resizeEvent
 * @returns {boolean}
 */
function onResize(resizeEvent) {
    if (!RESIZE_OBSERVER_CALLBACKS[resizeEvent.resizeObserverId]) {
        return false;
    }

    const callback = RESIZE_OBSERVER_CALLBACKS[resizeEvent.resizeObserverId]['callback']
    const observer = RESIZE_OBSERVER_CALLBACKS[resizeEvent.resizeObserverId]['observer'];

    const entries = resizeEvent.entries.map(entry => {
        const targetElement = findElementById(entry.targetSinatraId);
        if (!targetElement) {
            console.error(`Unable to find target element with ID ${entry.targetSinatraId} for resize entry`);
        }
        entry['target'] = targetElement;
        return entry;
    });

    try {
        console.info(`Executing resize observer callback ${resizeEvent.resizeObserverId} with ${entries.length} entries`);
        callback.call(this, entries, observer);
    }
    catch (e) {
        console.error('Error executing resize callback', e);
    }


    return true;
}

/**
 *
 * @param {TimeoutInvocation} loggedTimeoutInvocation
 */
function onTimeoutEvent(loggedTimeoutInvocation) {
    if (!timeoutHandlerTable.hasOwnProperty(loggedTimeoutInvocation.functionId)) {
        return false;
    }

    console.log(`Executing timeout function ${loggedTimeoutInvocation.functionId}`);
    timeoutHandlerTable[loggedTimeoutInvocation.functionId]();
    return true
}

/**
 *
 * @param {RangeSelection} loggedRangeSelection
 */
function onSelectionEvent(loggedRangeSelection) {

    function getChildNodeByIndex(parent, childIndex) {
        if (!parent || !parent.hasChildNodes() || childIndex >= parent.childNodes.length) {
            console.error(`Unable to retrieve child node ${childIndex} from the given node`);
            return undefined;
        }
        return parent.childNodes[childIndex];
    }

    document.getSelection().removeAllRanges();
    for (const rangeData of loggedRangeSelection.ranges) {
        const startContainerElement = findElementById(rangeData.startContainerSinatraId);
        const endContainerElement = findElementById(rangeData.endContainerSinatraId);

        const startContainer = getChildNodeByIndex(startContainerElement, rangeData.startContainerIndex);
        const endContainer = getChildNodeByIndex(endContainerElement, rangeData.endContainerIndex);

        if (!startContainerElement || !endContainerElement) {
            console.error(`Unable to find start and/or end container for selection event. Start ID: ${rangeData.startContainerSinatraId}, end ID: ${rangeData.endContainerSinatraId}`);
            return true;
        }

        const range = new Range();
        range.setStart(startContainer, rangeData.startOffset);
        range.setEnd(endContainer, rangeData.endOffset);
        document.getSelection().addRange(range);
    }
    return true;
}

function sendHandlerEvent(listenerOwnerId, sinatraId, eventName, event, eventId, leaderTargetHtml = "") {
    try {
        socket.emit(SOCKET_HANDLER_EVENT_NAME, eventName, listenerOwnerId, sinatraId, event, eventId, leaderTargetHtml, sinatraIdIndex);
    }
    catch (e) {
        console.error(e);
        throw e;
    }
}

/**
 * This socket event is for dom1 to know that dom2 has executed all of its handlers
 * in order to reach dom1's state
 */
socket.on('dom2Updated', function() {
    dom2Updated = true;
});

/*
 * This socket event tells the old leader that the browsers have been swapped completely
*/
socket.on('swapComplete', function() {
    swapTime = window.sinatraNow() - swapStartTime;
    console.log(`got swap complete message from follower - ${swapTime} ms`);
});

/**
 * Intercepts all existing DOM0 event listeners on the given document.
 *
 * @param {Document} htmlDocument
 */
function interceptDocumentDom0Events(htmlDocument) {
    htmlDocument.querySelectorAll("*")
        .forEach(interceptDom0Events);

    DOM0_EVENT_NAMES
        .map(event => `on${event}`)
        .forEach(eventName => {
            if (!Object.getOwnPropertyDescriptor(HTMLElement.prototype, eventName)) {
                console.warn(`Unable to instrument existing DOM0 event '${eventName}'`);
                return;
            }
            const { get, set } = Object.getOwnPropertyDescriptor(HTMLElement.prototype, eventName);
            // Object.defineProperty(HTMLElement.prototype, eventName, {
            //     set: function(newHandler) {
            //         const sinatraId = extractSinatraId(this);
            //         const eventTypeId = recordEventHandler(this, eventName, newHandler);
            //
            //         console.warn(`DOM0 setter invoked for ${eventName} on ID ${sinatraId}`);
            //
            //         function leaderEventListener(event) {
            //             if (_dom2) {
            //                 return;
            //             }
            //
            //             const innerHtml = event.target.innerHTML;
            //             const value = event.target.value;
            //             const domEvent = new DomEvent(sinatraId, sinatraId, eventName, createEventCopy(event), eventName + (eventCounter++), innerHtml, value, eventTypeId);
            //             const loggedEvent = new LoggedEvent(LOG_EVENTS.DOM, domEvent);
            //             newHandler.call(event.target, event);
            //             if (sinatraId !== '-1') {
            //                 sendLoggedEvent(loggedEvent);
            //             }
            //         }
            //
            //         function vanillaListener(event) {
            //             vanillaEventTimed(() => newHandler(event));
            //         }
            //
            //         if (STATS_CONFIG.vanilla) {
            //             return set.call(this, vanillaListener);
            //         }
            //         else {
            //             return set.call(this, leaderEventListener);
            //         }
            //     },
            //     get
            // });
        });
}

function interceptNodeModification() {
    const originalAppendChild = Element.prototype.appendChild;
    Element.prototype.appendChild = function () {
        assignSinatraIdToTree(arguments[0], true);
        return originalAppendChild.apply(this, arguments);
    }

    const originalInsertBefore = Element.prototype.insertBefore;
    Element.prototype.insertBefore = function () {
        assignSinatraIdToTree(arguments[0], true);
        return originalInsertBefore.apply(this, arguments);
    }
}

/**
 * Intercepts DOM0 events on the given element.
 *
 * @param {Element} element The element to intercept.
 */
function interceptDom0Events(element) {
    if (!element instanceof HTMLElement) {
        return;
    }
    DOM0_EVENT_NAMES
        .map(event => `on${event}`)
        .forEach(eventName => {
            const originalEventHandler = element[eventName];
            if (originalEventHandler) {
                assignSinatraIdToTree(element, true);
                const sinatraId = extractSinatraId(element);
                const eventTypeId = recordEventHandler(element, eventName, originalEventHandler);
                function leaderEventListener(event) {
                    if (_dom2) {
                        return;
                    }

                    const innerHtml = event.target.innerHTML;
                    const innerText = event.target.innerText;
                    const value = event.target.value;
                    const domEvent = new DomEvent(sinatraId, sinatraId, eventName, createEventCopy(event), eventName + (eventCounter++), innerHtml, innerText, value, eventTypeId, null, "");
                    const loggedEvent = new LoggedEvent(LOG_EVENTS.DOM, domEvent);
                    if (sinatraId === '-1') {
                        originalEventHandler.call(event.target, event);
                        return;
                    }

                    executeAndSendLoggedEvent(loggedEvent, () => originalEventHandler.call(event.target, event));
                }

                function vanillaListener(event) {
                    vanillaEventTimed(() => originalEventHandler(event));
                }

                if (STATS_CONFIG.vanilla) {
                    element[eventName] = vanillaListener;
                }
                else {
                    element[eventName] = leaderEventListener;
                }
            }
        })
}

function vanillaEventTimed(fn) {
    const startTime = window.sinatraNow();
    fn();
    const endTime = window.sinatraNow();
    const timeDiff = endTime - startTime;
    vanillaTimeList.push(timeDiff);
}

function interceptDom2Events() {
    const originalWindowAddEventListener = Window.prototype.addEventListener;
    Window.prototype.addEventListener =  function (eventType, eventListener, u) {
        const eventTypeId = recordEventHandler(this, eventType, eventListener);
        function leaderEventListener(event) {
            if (_dom2) {
                return;
            }

            if (extractSinatraId(event.target) === '-1') {
                eventListener(this, event);
                return;
            }

            let innerHtml;
            if (event.target.isContentEditable) {
                innerHtml = event.target.innerHtml;
            }
            const innerText = event.target.innerText;
            const value = event.target.value;
            const targetId = extractSinatraId(event.target);
            if (!targetId) {
                console.warn(`Event target element missing Sinatra ID.`);
            }
            const composedPath = sinatraComposedPath(event);
            const domEvent = new DomEvent(SINATRA_WINDOW_ID, targetId, eventType, createEventCopy(event), eventType + (eventCounter++), innerHtml, innerText, value, eventTypeId, composedPath, event.target.outerHTML);
            const loggedEvent = new LoggedEvent(LOG_EVENTS.DOM, domEvent);

            console.debug(`Executing element ${SINATRA_WINDOW_ID}'s ${eventType} (${eventTypeId}) on target element ${extractSinatraId(event.target)}`);

            executeAndSendLoggedEvent(loggedEvent, () => eventListener.call(this, event));
        }

        function vanillaEventListener(event) {

            if (STATS_CONFIG.domEventTimed) {
                vanillaEventTimed(() => eventListener(event));
            }
            else {
                eventListener(event);
            }
        }

        if (STATS_CONFIG.vanilla) { // avoid interception logic
            originalWindowAddEventListener.call(this, eventType, vanillaEventListener, u);
        }
        else {
            originalWindowAddEventListener.call(this, eventType, leaderEventListener, u);
        }
    }

    const originalDocumentAddEventListener = HTMLDocument.prototype.addEventListener;
    HTMLDocument.prototype.addEventListener =  function (eventType, eventListener, u) {
        const eventTypeId = recordEventHandler(this, eventType, eventListener);
        function leaderEventListener(event) {
            if (_dom2) {
                return;
            }

            assignSinatraIdToTree(this, false);

            if (extractSinatraId(event.target) === '-1') {
                eventListener(this, event);
                return;
            }

            let innerHtml;
            if (event.target.isContentEditable) {
                innerHtml = event.target.innerHtml;
            }
            const innerText = event.target.innerText;
            const value = event.target.value;
            const targetId = extractSinatraId(event.target);
            if (!targetId) {
                console.warn(`Event target element missing Sinatra ID.`);
            }
            const composedPath = sinatraComposedPath(event);
            const domEvent = new DomEvent(SINATRA_DOCUMENT_ID, targetId, eventType, createEventCopy(event), eventType + (eventCounter++), innerHtml, innerText, value, eventTypeId, composedPath, event.target.outerHTML);
            const loggedEvent = new LoggedEvent(LOG_EVENTS.DOM, domEvent);

            console.log(`Executing element ${SINATRA_DOCUMENT_ID}'s ${eventType} (${eventTypeId}) on target element ${extractSinatraId(event.target)}`);

            executeAndSendLoggedEvent(loggedEvent, () => eventListener.call(this, event));
        }

        function vanillaEventListener(event) {

            if (STATS_CONFIG.domEventTimed) {
                vanillaEventTimed(() => eventListener(event));
            }
            else {
                eventListener(event);
            }
        }

        if (STATS_CONFIG.vanilla) { // avoid interception logic
            originalDocumentAddEventListener.call(this, eventType, vanillaEventListener, u);
        }
        else {
            originalDocumentAddEventListener.call(this, eventType, leaderEventListener, u);
        }
    }
    const originalElementAddEventListener = HTMLElement.prototype.addEventListener;
    HTMLElement.prototype.addEventListener = function(eventType, eventListener, u) {
        if (eventType === 'transitionend' && this.getAttribute('style') && this.getAttribute('style').includes('position: absolute; top: -9999px; left: -9999px; width: 1px;')) {
            return;
        }

        if (typeof eventType === 'string' && eventType.includes('animation')) {
            return;
        }
        // this might be the first time encountering this element, for example, if it is currently
        // 'under construction' outside of the DOM, so we assign an ID if needed.
        assignSinatraIdToTree(this, false);
        const listenerOwnerId = extractSinatraId(this);

        const eventTypeId = recordEventHandler(this, eventType, eventListener);
        function leaderEventListener(event) {
            if (_dom2) {
                return;
            }

            if (listenerOwnerId === '-1' || extractSinatraId(event.target) === '-1') {
                if (eventType === 'click') {
                    eventListener(this, event);
                }
                return;
            }

            let innerHtml;
            let innerText;
            if (event.target.isContentEditable) {
                innerHtml = event.target.innerHTML;
                innerText = event.target.innerText;
            }
            const value = event.target.value;
            const targetId = extractSinatraId(event.target);
            if (!targetId) {
                console.warn(`Event target element missing Sinatra ID.`);
            }
            const composedPath = sinatraComposedPath(event);
            const domEvent = new DomEvent(listenerOwnerId, targetId, eventType, createEventCopy(event), eventType + (eventCounter++), innerHtml, innerText, value, eventTypeId, composedPath, event.target.outerHTML);
            const loggedEvent = new LoggedEvent(LOG_EVENTS.DOM, domEvent);
            console.log(`Executing element ${listenerOwnerId}'s ${eventType} (${eventTypeId}) on target element ${extractSinatraId(event.target)}`);

            executeAndSendLoggedEvent(loggedEvent, () => eventListener.call(this, event));
        }

        function vanillaEventListener(event) {

            if (STATS_CONFIG.domEventTimed) {
                vanillaEventTimed(() => eventListener(event));
            }
            else {
                eventListener(event);
            }
        }

        if (STATS_CONFIG.vanilla) { // avoid interception logic
            originalElementAddEventListener.call(this, eventType, vanillaEventListener, u);
        }
        else {
            originalElementAddEventListener.call(this, eventType, leaderEventListener, u);
        }
    }
}

/**
 * Transforms the given event's composed path into an array of Sinatra ID's rather than the DOM elements.
 *
 * This allows Sinatra to serialize the composed path for the follower to reconstruct as an array of DOM elements.
 */
function sinatraComposedPath(event) {
    if (!event || !event.composedPath) {
        return [];
    }

    return event.composedPath()
        .map(element => extractSinatraId(element));
}

function interceptImage() {
    const originalImage = Image;

    function cImage(width, height) {
        const image = new originalImage(width, height);
        Object.defineProperty(image, 'src', {
            set: function(val) {
                this.src_ = val;
            },
            get: function() {
                return undefined;
            }
        })
        return image;
    }

    window.Image = function() {
        return cImage.call(this, arguments);
    }
}

let messagePortId = 0;
let messagePortHandlers = {};
function interceptMessageChannel() {
    const originalMessageChannel = MessageChannel;
    MessageChannel = function() {

        function interceptMessagePort(port) {
            const _sinatra_id = messagePortId++;
            const { get, set } = Object.getOwnPropertyDescriptor(MessagePort.prototype, "onmessage");
            Object.defineProperty(port, "onmessage", {
                set: function(newHandler) {
                    if (!messagePortHandlers[_sinatra_id]) {
                        messagePortHandlers[_sinatra_id] = {};
                    }
                    messagePortHandlers[_sinatra_id]["onmessage"] = newHandler;

                    function leaderEventListener(message) {
                        if (_dom2) {
                            return;
                        }

                        const messagePortEvent = new MessagePortEvent(_sinatra_id, "onmessage", message.data);
                        const loggedEvent = new LoggedEvent(LOG_EVENTS.MESSAGE_PORT, messagePortEvent);

                        console.log(`Executing message port ${_sinatra_id}'s onmessage handler`);
                        executeAndSendLoggedEvent(loggedEvent, () => newHandler.call(this, message));
                    }

                    set.call(this, leaderEventListener);
                },
                get: get
            });
        }

        const channel = new originalMessageChannel();
        interceptMessagePort(channel.port1);
        interceptMessagePort(channel.port2);
        return channel;

    }
}

function interceptElementMatches() {
    const originalMatches = Element.prototype.matches;
    Element.prototype.matches = function(selectors) {
        if (selectors == ':hover') {
            return false;
        }

        return originalMatches.call(this, selectors);
    }
}

let resizeObserverId = 0;
const RESIZE_OBSERVER_CALLBACKS = {};
function interceptResizeObserver() {
    console.info("intercepting resize observer");
    const originalResizeObserverObserve = ResizeObserver.prototype.observe;
    const originalResizeObserver = window.ResizeObserver;

    function mapEntries(entries) {

        function mapBoxSize(boxSizeArray) {
            return boxSizeArray.map(borderBoxSize => {
                return {
                    blockSize: borderBoxSize.blockSize,
                    inlineSize: borderBoxSize.inlineSize
                };
            })
        }

        function mapContentRect(contentRect) {
            return {
                x: contentRect.x,
                y: contentRect.y,
                width: contentRect.width,
                height: contentRect.height,
                top: contentRect.top,
                right: contentRect.right,
                bottom: contentRect.bottom,
                left: contentRect.left
            };
        }

        return entries.map(entry => {
            return {
                borderBoxSize: mapBoxSize(entry.borderBoxSize),
                contentBoxSize: mapBoxSize(entry.contentBoxSize),
                devicePixelContentBoxSize: mapBoxSize(entry.devicePixelContentBoxSize),
                contentRect: mapContentRect(entry.contentRect),
                targetSinatraId: extractSinatraId(entry.target)
            };
        })
    }

    ResizeObserver.prototype.observe = function(target, options) {
        console.info("resize oberserver observe called");
        assignSinatraIdToTree(target);
        originalResizeObserverObserve.call(this, target, options);
    }

    window.ResizeObserver = function(callback) {
        const id = `sinatra${resizeObserverId++}`;

        function leaderCallback(entries, observer) {
            if (_dom2) {
                return;
            }

            const observedEntries = mapEntries(entries);

            const resizeEvent = new ResizeEvent(id, observedEntries);
            const loggedEvent = new LoggedEvent(LOG_EVENTS.RESIZE, resizeEvent);
            sendLoggedEvent(loggedEvent);

            console.info(`Executing resize observer callback ${id} with ${entries.length} entries`);
            callback.call(this, entries, observer);
            // executeAndSendLoggedEvent(loggedEvent, () => callback.call(this, entries, observer));
        }

        RESIZE_OBSERVER_CALLBACKS[id] = {
            'callback': callback,
            'observer': this
        };

        return new originalResizeObserver(leaderCallback);
    }
}

// todo
function interceptDate() {

    let initial = 1699067890000;

    function getMockTime() {
        const time = initial += 100;
        console.info(`Using time: ${time}`);
        return time;
    }

    Date.now = function() {
        return getMockTime();
    };
    Date.prototype.getTime = function() {
        return getMockTime();
    }
    performance.now = function() {
        return 185220;
    };
}

function interceptCloneNode() {
    const originalCloneNode = Node.prototype.cloneNode;
    Node.prototype.cloneNode = function(deep) {
        const clonedNode = originalCloneNode.call(this, deep);

        function removeSinatraId(node) {
            if (!node) {
                return;
            }
            [].forEach.call(node.children, removeSinatraId);
            console.log(`Removing Sinatra ID ${extractSinatraId(node)} from cloned node ${node}`);
            node.removeAttribute(SINATRA_ID_ATTR);
        }

        removeSinatraId(clonedNode);
        return clonedNode;
    }
}

const DEBUG_XHR = {};
function interceptXhr() {
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, async, username, password) {
        this._url = url;
        if (xhrDeferredHandlers.has(this)) {
            xhrDeferredHandlers.get(this).forEach(deferredAction => deferredAction());
        }
        if (!url.includes('socket.io')) {
            console.debug(`Opening to ${url}`);
        }

        if (_dom2 && !url.includes('socket.io')) {
            return;
        }
        if (!url.includes('socket.io')) {
            numXhrPending++;
        }
        originalOpen.apply(this, arguments);
    }

    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(body) {
        if (STATS_CONFIG.netLatency && !this._url.includes('socket.io')) {
            const id = assignIdToXhr(this);
            if (!xhrMetrics[id]) {
                xhrMetrics[id] = {};
            }
            xhrMetrics[id]['send'] = window.sinatraNow();
        }
        if (_dom2 && !this._url.includes('socket.io')) {
            return;
        }
        originalSend.call(this, body);
    }

    // currently disabled due to follower error:
    // Uncaught (in promise) DOMException: Failed to execute 'setRequestHeader' on 'XMLHttpRequest': The object's state must be OPENED.
    XMLHttpRequest.prototype.setRequestHeader = function() {

    }

    const originalXMLHttpRequest = XMLHttpRequest;
    XMLHttpRequest = function() {
        const xhr = new originalXMLHttpRequest();
        this._xhr = xhr;
        const self = this;

        xhr.addEventListener('readystatechange', event => {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                if (STATS_CONFIG.netLatency && !xhr._url.includes('socket.io')) {
                    const id = assignIdToXhr(xhr);
                    xhrMetrics[id]['done'] = window.sinatraNow();
                    xhrMetrics[id]['latency'] = xhrMetrics[id]['done'] - xhrMetrics[id]['send'];
                    xhrMetrics[id]['is_leader'] = !_dom2;
                }
            }
            if (xhr._url && xhr._url.includes('socket.io')) {
                return;
            }
            if (xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
                //numXhrPending++;
            }
            if (xhr.readyState === XMLHttpRequest.DONE) {
                //numXhrPending--;
            }
        });

        self.onreadystatechange = null;
        Object.defineProperty(self, 'onreadystatechange', {
            set: function(value) {
                function setCallback() {
                    if (!self._url.includes('socket.io')) {
                        const id = assignIdToXhr(self._xhr);
                        self.onreadystatechange_handler_id = recordXhrEventListener(id, self, 'readystatechange', value);
                        self.sinatra_onreadystatechange = value;
                    }
                    else {
                        xhr.onreadystatechange = value;
                    }
                }
                // url for xhr is known (open has been called)
                if (self._url) {
                    setCallback();
                }
                // url for xhr is not yet known (open has not been called)
                else {
                    if (!xhrDeferredHandlers.has(self)) {
                        xhrDeferredHandlers.set(xhr, []);
                    }
                    xhrDeferredHandlers.get(xhr).push(() => setCallback());
                }
            },
            get: function() {
                return self.sinatra_onreadystatechange;
            }
        });

        Object.defineProperty(self, 'onload', {
            set: function(value) {
                function setCallback() {
                    if (!self._url.includes('socket.io')) {
                        const id = assignIdToXhr(self._xhr);
                        const handlerId = recordXhrEventListener(id, self, 'onload', value);
                        self.sinatra_onload = value;
                        self.onload_handler_id = handlerId;
                    }
                    else {
                        xhr.onload = value;
                    }
                }
                // url for xhr is known (open has been called)
                if (self._url) {
                    setCallback();
                }
                // url for xhr is not yet known (open has not been called)
                else {
                    if (!xhrDeferredHandlers.has(self)) {
                        xhrDeferredHandlers.set(xhr, []);
                    }
                    xhrDeferredHandlers.get(xhr).push(() => setCallback());
                }
            },
            get: function() {
                return self.sinatra_onload;
            }
        });

        xhr.onreadystatechange = function() {
            if (self.sinatra_onreadystatechange) {
                const id = assignIdToXhr(xhr);
                const xhrEvent = new XhrEvent(id, {}, 'readystatechange', xhr.readyState, xhr.response, xhr.responseText, xhr.status, xhr.statusText, xhr.getAllResponseHeaders(), self.onreadystatechange_handler_id );
                const loggedEvent = new LoggedEvent(LOG_EVENTS.XHR, xhrEvent);
                console.log(`Invoked ${xhrEvent.eventType} for ${xhrEvent.xhrId} for URL ${xhr._url}`);
                executeAndSendLoggedEvent(loggedEvent, () => self.sinatra_onreadystatechange());
            }
        };

        xhr.onload = function() {
            if (self.sinatra_onload) {
                const id = assignIdToXhr(xhr);
                const xhrEvent = new XhrEvent(id, {}, 'onload', xhr.readyState, xhr.response, xhr.responseText, xhr.status, xhr.statusText, xhr.getAllResponseHeaders(), self.onload_handler_id);
                const loggedEvent = new LoggedEvent(LOG_EVENTS.XHR, xhrEvent);
                console.log(`Invoked ${xhrEvent.eventType} for ${xhrEvent.xhrId} for URL ${xhr._url}`);
                executeAndSendLoggedEvent(loggedEvent, () => self.sinatra_onload());
            }
        };

        ["statusText", "status", "responseType", "response","responseText", "responseURL", "timeout",
            "readyState", "responseXML", "upload"].forEach(function(item) {
        // ["statusText", "status", "responseType", "response","responseText",
        //     "readyState", "responseXML", "upload"].forEach(function(item) {
            Object.defineProperty(self, item, {
                set: function(value) {
                    if (!self._props) {
                        self._props = {};
                    }
                    self._props[item] = value;
                },
                get: function() {
                    if (_dom2 && !(self._url && self._url.includes('socket.io'))) {
                        return self._props[item];
                    }
                    return xhr[item];
                }
            });
        });

        ["ontimeout, timeout", "withCredentials", "onerror", "onprogress", "onabort", "onloadstart", "onloadend", "ontimeout"].forEach(function(item) {
            Object.defineProperty(self, item, {
                get: function() {
                    return xhr[item];
                    },
                set: function(val) {
                    xhr[item] = val;
                }
            });
        });

        ["send", "open", "abort",
            "getResponseHeader", "overrideMimeType", "setRequestHeader"].forEach(function(item) {
            Object.defineProperty(self, item, {
                value: function() {
                    return xhr[item].apply(xhr, arguments);
                }
            });
        });

        Object.defineProperty(self, "addEventListener", {
            value: function(eventType, eventListener, u) {
                function sinatraAddEventListener(eventType, eventListener, u) {
                    if (xhr._url.includes('socket.io')) {
                        xhr.addEventListener(eventType, leaderEventListener, u);
                        return;
                    }
                    const id = assignIdToXhr(xhr);
                    const req = self;
                    const handlerId = recordXhrEventListener(id, self, eventType, eventListener);
                    function leaderEventListener(event) {
                        // follower
                        if (_dom2 && !swapInit) {
                            return;
                        }

                        if (self.readyState === XMLHttpRequest.DONE) {
                            self._watchingForCompletion = true;
                            numXhrPending--;
                        }

                        const xhrEvent = new XhrEvent(id, createEventCopy(event), eventType, req.readyState, req.response, req.responseText, req.status, req.statusText, req.getAllResponseHeaders(), handlerId);
                        const loggedEvent = new LoggedEvent(LOG_EVENTS.XHR, xhrEvent);

                        if (_dom2 && swapInit) { // follower with role change initiated (will be leader once role swap finishes)
                            onRoleChangeCompletion.push(() => executeAndSendLoggedEvent(loggedEvent));
                            return;
                        }

                        executeAndSendLoggedEvent(loggedEvent, () => eventListener(this, event));

                        // leader with role change initiated
                        if (!_dom2 && swapInit && numXhrPending === 0) {
                            _dom2 = true;
                            socket.emit("swapRole", false);
                        }
                    }
                    xhr.addEventListener(eventType, leaderEventListener, u);
                }

                // url for xhr is known (open has been called)
                if (self._url) {
                    sinatraAddEventListener(eventType, eventListener, u);s
                }
                // url for xhr is not yet known (open has not been called)
                else {
                    if (!xhrDeferredHandlers.has(xhr)) {
                        xhrDeferredHandlers.set(xhr, []);
                    }
                    xhrDeferredHandlers.get(xhr).push(function() {sinatraAddEventListener(eventType, eventListener, u)});
                }
            }
        })

        Object.defineProperty(self, "getAllResponseHeaders", {
            value: function() {
                if (_dom2) {
                    return self._sinatraAllResponseHeaders;
                }
                return xhr.getAllResponseHeaders();
            }
        });

        Object.defineProperty(self, "_url", {
            get: function() {return xhr["_url"];}
        });
    };

    ["DONE", "HEADERS_RECEIVED", "LOADING", "OPENED", "UNSENT"].forEach(function (item) {
        XMLHttpRequest[item] = originalXMLHttpRequest[item];
    });
}

function interceptFetch() {
    const originalFetch = window.fetch;

    function callFetchAsLeader(fetchId, resource, init) {
        numFetchPending++;
        const promise = originalFetch(resource, init);
        promise
            .then(response => response.clone().text()
                .then(responseText => logFetchResponse(fetchId, response, responseText)));
        return promise;
    }

    window.fetch = function(resource, init) {
        const fetchId = fetchSinatraIndex++;
        if (!_dom2 && !swapInit) { // leader
            return callFetchAsLeader(fetchId, resource,  init);
        }
        else if (_dom2 && swapInit) { // follower with role change initiated (will be leader once role swap finishes)
            return new Promise(function (resolve, reject) {
                // only make call to fetch() when we are officially the leader (role change completes)
                onRoleChangeCompletion.push(() => {
                    callFetchAsLeader(fetchId, resource, init)
                        .then(response => resolve(response))
                        .catch(reason => reject(reason));
                });
            })
        }
        else { // follower, or leader with role change initiated
            const responsePromise = new Promise(function(resolve, reject) {
                recordFetchPromise(fetchId, resolve, reject);
            });
            return responsePromise;
        }
    }
}

/**
 *
 * @param id
 * @param {Response} response
 * @param responseText
 */
function logFetchResponse(id, response, responseText) {
    numFetchPending--;
    const loggedFetchResponse = new FetchResponse(id, response.status, response.statusText, response.headers, responseText);
    const loggedEvent = new LoggedEvent(LOG_EVENTS.FETCH, loggedFetchResponse);
    sendLoggedEvent(loggedEvent);

    if (swapInit && !hasPendingNetworkRequests()) {
        swapInit = false;
        _dom2 = true;
        socket.emit("swapRole", false);
    }
}

/**
 * Intercepts selections on the page (e.g. highlighted text)
 */
(function(window) {

    /**
     * Given a {@link Selection}, returns a serializable array of Sinatra objects containing data about all of the
     * {@link Range} objects.
     *
     * @param {Selection} selection The browser's (leader) current selection.
     * @returns {Array} The array of range data to send to the follower.
     */
    function describeSelection(selection) {
        return [...Array(selection.rangeCount).keys()] // indexes up to rangeCount
            .map(i => selection.getRangeAt(i))
            .map(range => describeRange(range));
    }

    /**
     * Given a parent and a child node, finds the index of the child node in the list of all children.
     *
     * This is necessary because we send the Sinatra ID of the parent node of the {@link Range#startContainer} rather
     * than the start container itself. This is done because the start container itself is not necessary an
     * {@link Element}, and therefore, might not have a Sinatra ID. For example, in the case of highlight text, the
     * start container is likely a {@link Text} node.
     *
     * @param parentNode The parent node of the start or end container of the selection range.
     * @param childNode The actual start or end container.
     * @returns {number} The index of the start/end container in the context of the parent.
     */
    function findChildNodeIndex(parentNode, childNode) {
        let index = 0;
        for (const node of parentNode.childNodes) {
            if (node === childNode) {
                return index;
            }
            index += 1;
        }
        throw new Error("Unable to find index of child node");
    }

    /**
     * Creates a serializable Sinatra object containing data about the given range.
     *
     * @param {Range} range The range to extract data from.
     */
    function describeRange(range) {

        const startContainerElement = range.startContainer.parentNode;
        const endContainerElement = range.endContainer.parentNode;

        if (!startContainerElement || !endContainerElement) {
            throw new Error("Unable to find selection end and/or start element.");
        }

        const startContainerIndex = findChildNodeIndex(startContainerElement, range.startContainer);
        const endContainerIndex = findChildNodeIndex(endContainerElement, range.endContainer);

        return {
            startContainerSinatraId: extractSinatraId(startContainerElement),
            endContainerSinatraId: extractSinatraId(endContainerElement),
            startContainerIndex: startContainerIndex,
            endContainerIndex: endContainerIndex,
            startOffset: range.startOffset,
            endOffset: range.endOffset
        }
    }

    /**
     * Callback to execute on pointer/mouse 'up'.
     */
    function leaderOnSelectionChange() {
        if (_dom2) {
            return;
        }
        const selection = document.getSelection();
        if (selection.rangeCount === 0) {
            return;
        }

        const ranges = describeSelection(selection);
        const rangeSelection = new RangeSelection(ranges);
        const loggedEvent = new LoggedEvent(LOG_EVENTS.SELECTION, rangeSelection);
        sendLoggedEvent(loggedEvent);
    }

    function interceptSelections() {
        originalDocumentAddEventListener_.call(document, "selectionchange", leaderOnSelectionChange);
    }

    window.sinatra.interceptSelections = interceptSelections;

})(window);

window.requestAnimationFrame = undefined;
(function() {
    var lastTime = 0;

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
                timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());
// requestAnimationFrame = function(callback) {
//     const sinatraRafId = rafCallbackId++;
//     function leaderCallback(timestamp) {
//         if (_dom2) {
//             return;
//         }
//         rafExecuted++;
//         console.log(`Executing RAF callback ${sinatraRafId}`);
//         recordAnimationCallbackTimestamp(sinatraRafId, timestamp);
//         callback.call(this, timestamp);
//     }
//     const callbackId = originalRequestAnimationFrame(leaderCallback);
//     recordAnimationCallback(sinatraRafId, callback);
//     return callbackId;
//     return undefined;
// }

const originalWindowRequestAnimationFrame = Window.prototype.requestAnimationFrame;
Window.prototype.requestAnimationFrame = function(callback) {
    function leaderCallback(timestamp) {
        if (_dom2) {
            return;
        }
        console.log("executing callback (window)");
        callback.call(this, timestamp);
    }
    const callbackId = originalWindowRequestAnimationFrame(leaderCallback);
    console.log(`RAF call for callback (window) ${callbackId}`);
    return callbackId;
}

/**
 * Observes DOM changes in the subtree rooted at the given node and applies Sinatra interceptions
 * on any new elements.
 *
 * @param {Node} rootNode The root node of the subtree to observe.
 */
function interceptDomChanges(rootNode) {

    function onMutation(mutationList, _) {
        console.info(`MutationObserver triggered: ${mutationList}`);
        for (let i = 0; i < mutationList.length; i++) {
            const mutation = mutationList[i];
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(n => onNewNode(n));
            }
            else if (mutation.type === 'attributes') {
                console.log(`Observed new attribute: ${mutation.attributeName} on element`);
                // manually trigger the Sinatra custom setter to intercept the new handler
                mutation.target[mutation.attributeName] = mutation.target[mutation.attributeName]
            }
        }
    }

    function onNewNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            console.log(`Observed new element: ${node}`);
            console.log(node);
            assignSinatraIdToTree(node, false);
            interceptDom0Events(node);
        }
    }

    const observer = new window.originalMutationObserver(onMutation);
    const observerOptions = {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: DOM0_EVENT_NAMES.map(name => `on${name}`)
    };

    observer.observe(document.documentElement, observerOptions);
}

// https://stackoverflow.com/questions/8024149/is-it-possible-to-get-the-non-enumerable-inherited-property-names-of-an-object
function getAllPropertyNames( obj ) {
    var props = [];

    do {
        Object.getOwnPropertyNames( obj ).forEach(function ( prop ) {
            if ( props.indexOf( prop ) === -1 ) {
                props.push( prop );
            }
        });
    } while ( obj = Object.getPrototypeOf( obj ) );

    return props;
}

function createEventCopy(event) {
    let eventCopy = {};
    getAllPropertyNames(event)
        .filter(k => !k.startsWith("DOM_VK"))

        .forEach(k => {
            if (typeof event[k] === "function") {}
            else if(['target', 'srcElement', 'view', 'currentTarget', 'path'].includes(k)) {
                return;
            }
            else {
                eventCopy[k] = event[k];
            }
        });

    if (event.target.type && ["radio", "checkbox"].includes(event.target.type)) {
        eventCopy.checked = findElementById($(event.target).attr(SINATRA_ID_ATTR));
    } else if (event.target.type && ["text", "select-one"].includes(event.target.type)) {
        const element = findElementById($(event.target).attr(SINATRA_ID_ATTR));
        eventCopy.value = element ? element.value : undefined;
    }

    return eventCopy;
}

const DEBUG_TIMEOUTS = {}
let timeoutIndex = 0;
function interceptTimeout() {
    let realSetTimeout = setTimeout;
    let sinatraSetTimeout;
    if (STATS_CONFIG.vanilla) {
        sinatraSetTimeout = function(func, delay) {
            if (STATS_CONFIG.domEventTimed) {
                return realSetTimeout(function() {
                    vanillaEventTimed(func);
                }, delay);
            }
            else {
                return realSetTimeout(func, delay);
            }
        }
    }
    else {
        sinatraSetTimeout = function(func, delay) {
            if (func) {
                let timeoutId = 'timeout' + timeoutIndex++;
                timeoutHandlerTable[timeoutId] = func;
                DEBUG_TIMEOUTS[timeoutId] = {
                    'func': func,
                    'delay': delay,
                    'stack': new Error().stack
                }

                if (!_dom2 && !swapInit) {
                    pendingTimeoutsList.push([timeoutId, delay, this]);
                }

                return realSetTimeout(function () {
                    if (!_dom2 && !swapInit) {
                        if (pendingTimeoutsList.length > 0) {
                            /*
                             * Sort the pending timeout list first to get earliest time-out entry at the head position
                             * to be removed from the list first [(t, 10), (t, 5), (t, 7)] => [(t, 5), (t, 7), (t, 10)]
                             */
                            sortPendingTimeouts();
                            pendingTimeoutsList.shift();
                        }

                        const timeoutInvocation = new TimeoutInvocation(timeoutId);
                        const loggedEvent = new LoggedEvent(LOG_EVENTS.TIMEOUT, timeoutInvocation);
                        sendLoggedEvent(loggedEvent);
                        console.log(`Executing timeout function ${timeoutId}`);
                        func();


                        if (swapInit && pendingTimeoutsList.length === 0) {
                            _dom2 = true;
                            socket.emit("swapRole", false);
                            swapInit = false;
                        }
                    }
                    else {
                        if (swapInit) console.log("swap button has been clicked. not executing any pending timeouts now");
                    }
                }, delay);
            }
        }
    }
    setTimeout = sinatraSetTimeout;
}

let intervalIndex = 0;
function interceptIntervals() {
    let realSetInterval = setInterval;
    let sinatraSetInterval;

    if (STATS_CONFIG.vanilla) {
        sinatraSetInterval = function(func, delay) {
            if (STATS_CONFIG.domEventTimed) {
                return realSetInterval(function () {
                    vanillaEventTimed(func);
                }, delay);
            } else {
                return realSetInterval(func, delay);
            }
        }
    }
    else {
        /**
         * Intercepts setInterval(...) initialization and uses a global interval handler table to synchronize
         * leader and follower.
         */
        sinatraSetInterval = function(func, delay) {
            let intervalId = 'interval' + intervalIndex++;
            //let intervalHash = calcMD5(func.toString());
            intervalHandlerTable[intervalId] = func;

            return realSetInterval(function() {
                if (!_dom2) {
                    console.log(`Executing interval function ${intervalId}`);

                    const intervalInvocation = new IntervalInvocation(intervalId);
                    const loggedEvent = new LoggedEvent(LOG_EVENTS.INTERVAL, intervalInvocation);
                    executeAndSendLoggedEvent(loggedEvent, () => func());
                }
            }, delay);
        }
    }

    setInterval = sinatraSetInterval;
}

function interceptRandom() {
    Math.random = function() {
        if (randomValues) {
            let randomValue = randomValues.shift();
            randomValues.push(randomValue);
            console.debug(`random: ${randomValue}`);
            //return randomValue;
            return 0.2940138443487048;
        }
        else console.log("could not find random values to pick from");
    }
}

function tryExecutingTimeout(timeoutId) {
    if (timeoutHandlerTable[timeoutId] !== undefined) {
        console.log(`Executing timeout ${timeoutId}`);
        timeoutHandlerTable[timeoutId]();
    } else {
        realSetTimeout(function() {
            tryExecutingTimeout(timeoutId);
        }, 0);
    }
}

function handleInputElementEvent(targetElement, eventObject) {
    if (["radio", "checkbox"].includes(targetElement.type)) {
        targetElement.checked = eventObject.checked;
    }
    else if (targetElement.type === "text" || (targetElement.tagName && targetElement.tagName.toLowerCase() === "select")) {
        targetElement.value = eventObject.value;
    }
}

function handleContentEditableDivs(elementTarget, eventObject, eventString, leaderTargetHTML, innerText) {
    if (eventString !== 'textInput') {
        return;
    }

    if (elementTarget && elementTarget.sinatraInnerTextNode) {
        if (elementTarget.innerText === innerText) {
            return;
        }

        elementTarget.removeChild(elementTarget.sinatraInnerTextNode);
        const text = new Text(innerText);
        elementTarget.appendChild(text);
        elementTarget.sinatraInnerTextNode = text;
        return;
    }

    const text = new Text(innerText);
    elementTarget.appendChild(text);
    elementTarget.sinatraInnerTextNode = text;
}

function handleEvent(targetElement, eventObject, eventType, leaderTargetHTML = "", innerText) {
    if (targetElement) {
        if (targetElement.type) {
            handleInputElementEvent(targetElement, eventObject);
        }
        else if (targetElement.isContentEditable) {
            handleContentEditableDivs(targetElement, eventObject, eventType, leaderTargetHTML, innerText);
        }
    }
}

function getExistingParentElement(targetElement, eventName) {
    if (targetElement && targetElement !== document) {
        if (isListenerRecorded(extractSinatraId(targetElement), eventName)) return targetElement;
        return getExistingParentElement(targetElement.parentNode, eventName);
    }
    else {
        if (isListenerRecorded(SINATRA_DOCUMENT_ID, eventName)) return document;
        return null;
    }
}

function replaySelection(rangeObject) {
    let receivedRange = rangeObject[0].range;
    if (receivedRange.startContainerID && receivedRange.endContainerID &&
        receivedRange.startOffset !== receivedRange.endOffset) {

        let newRange = new Range();
        newRange.setStart(
            findElementById(receivedRange.startContainerID)
                .childNodes[receivedRange.startChildNodeIndex], receivedRange.startOffset
        );
        newRange.setEnd(
            findElementById(receivedRange.endContainerID)
                .childNodes[receivedRange.endChildNodeIndex], receivedRange.endOffset
        );
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(newRange);
    }
}

function hasPendingNetworkRequests() {
    console.log(`numFetchPending: ${numFetchPending}, numXhrPending: ${numXhrPending}`);
    return numFetchPending > 0; // || numXhrPending > 0; todo: disabled for Google, need to refine when this value is incremented/decremented between dom0 and dom2 handlers
}

/* ********************** SOCKET Event Listeners (FOLLOWER) *******************************/
/**
 * Here dom2 will access dom1's list of handler refs in the global handlers object
 * and execute each one in sequence to reach dom1's state
 */
socket.on("executeHandlers", function(handlerRefs) {
    console.debug("Queueing task backlog");
    handlerRefs.forEach(ref => executeLoggedEvent(ref));
    //EVENT_QUEUE.enqueue(sinatraIdIndex, -1, () => socket.emit('dom2Updated'), "Emit dom2Updated message");
    console.debug("Finished queuing task backlog");
    backlogQueued = true;
});

/**
 * This socket event will execute the specified handler in dom2
 * Extra work may need to be performed before executing the handler,15 like changing a radio/checkbox checked attribute
 */
// socket.on(SOCKET_HANDLER_EVENT_NAME, executeReceivedHandler);

//const REAL_TIME_EVENT_QUEUE = eventExecutor(() => 0);
socket.on(SOCKET_LOGGED_EVENT, executeLoggedEvent);

socket.on('followerReply', function(eventID) {

    if(!leaderRTTList[eventID]) {
        leaderRTTList[eventID] = {};
    }

    leaderRTTList[eventID]["replyTime"] = window.sinatraNow();
    let timeDiff = leaderRTTList[eventID]["replyTime"] - leaderRTTList[eventID]["startTime"];
    leaderRTTList[eventID]["rtt"] = timeDiff;

    console.log("roundtrip time for event " + eventID + ": " + timeDiff);
});

socket.on('domMutation', function(mutations) {
    let domMutations = JSON.parse(mutations);
    console.log("Got mutations:");
    console.log(domMutations);

    Object.keys(domMutations).forEach(k => {
        let id = domMutations[k][SINATRA_ID_ATTR];
        let html = domMutations[k].html;
        let mutation = domMutations[k].mutation;

        if (findElementById(id) && mutation === "attributes") {
            // Attribute changed
            findElementById(id).setAttribute(domMutations[k].attributeName, domMutations[k].attributeValue);
        }

        else if (findElementById(id)) {
            findElementById(id).innerHTML = html;
        }
    })
});

socket.on("domHighlight", function(rangeObject) {
    replaySelection(rangeObject);
});

socket.on("domInputChange", function(inputObjectString) {
    let inputObject = JSON.parse(inputObjectString);

    switch(inputObject[0].type) {
        case "text":
        case "textarea": {
            document.getElementById(inputObject[0][SINATRA_ID_ATTR]).value = inputObject[0].value;
            break;
        }

        case "radio":
        case "checkbox": {
            document.getElementById(inputObject[0][SINATRA_ID_ATTR]).checked = inputObject[0].checked;
            break;
        }
    }
});

socket.on('random', function(dom1RandomValues) {
    randomValues = dom1RandomValues;
});

socket.on('swapRole', function(pending) {
    console.log("received message to swap roles");
    _dom2 = pending;
    swapped = pending;
    swapInit = pending;
    dom2Updated = true;
    pendingTimeoutsList = [];

    if (!pending) {
        console.log('Swapping roles - executing deferred actions as leader')
        swapInit = false;
        onRoleChangeCompletion.forEach(callback => callback());
    }

    if (pending) console.log("My role has been swapped but dom1 still has some pending timeouts left to execute.");
    else {
        console.log("Now my role is swapped completely and dom1 doesn't have any timeouts left to execute. sending swap complete message to leader");
        socket.emit('swapComplete');
    }
});

socket.on('pendingTimeouts', function(pendingTimeouts) {
    /* Follower: Set pending timeouts from leader with same delay value here */
    pendingTimeouts.forEach(e => {
        if (timeoutHandlerTable[e[0]]) {
            console.log(`setting timeout ${e[0]} having time ${e[1]}`);
            realSetTimeout(timeoutHandlerTable[e[0]], e[1]);
        }
        else console.log(`timeout ${e[0]} having time ${e[1]} could not be found`);
    });
});

/*********************************************************************************/

/* *********************************** Swap Roles **********************************************/
function cancelAllPendingTimeouts() {
    console.log("currently pending timeouts:");
    console.log(pendingTimeoutsList);
    pendingTimeoutsList.forEach(e => clearTimeout(e[2]));
}

function sortPendingTimeouts() {
    pendingTimeoutsList.sort((e1, e2) => {
        const e1Time = e1[1] || 0;
        const e2Time = e2[1] || 0;
        if (e1Time === e2Time) return 0;
        if (e1Time < e2Time) return -1;
        return 1;
    });
}

function sendPendingTimeoutsToFollower() {
    let pendingTimeoutsToSend = [];
    pendingTimeoutsList.forEach(e => pendingTimeoutsToSend.push([e[0], e[1]]));
    socket.emit("pendingTimeouts", pendingTimeoutsToSend);
}

/**
 * If there are no pending timeouts left, dom1 will emit the swapRole event with no
 * pending timeouts, otherwise it will emit the swapRole event with pending timeouts
 * letting dom2 know that it should do nothing more than just pushing new timeouts to its
 * pending list.
 */
function changeRoles(){
    console.log("swap button clicked.");
    if (pendingTimeoutsList.length > 0) console.log("sending pending timeouts to follower.");
    swapStartTime = window.sinatraNow();
    swapInit = true;

    cancelAllPendingTimeouts();
    sortPendingTimeouts();

    /* Set a timeout of 0, inside which you will send all pending timeouts to the
     * follower for resetting with same delay
     */
    realSetTimeout(sendPendingTimeoutsToFollower, 0);

    if (hasPendingNetworkRequests()) {
        socket.emit("swapRole", true);
    }
    else {
        socket.emit("swapRole", false);
        _dom2 = true;
        swapInit = false;
        pendingTimeoutsList = [];
    }
}

function computeStats() {
    let statsToDisplay = '';
    let experimentRunTime = window.sinatraNow() - scriptStartTime;

    // find average processing time on leader
    if(STATS_CONFIG.domEventTimed) {
        console.log("leader time list:");
        console.log(leaderTimeList);
        let sumTime = 0;
        let countTime = 0;
        if (!STATS_CONFIG.vanilla) {
            Object.keys(leaderTimeList).forEach(event => {
                if (leaderTimeList[event]["timeDiff"]) {
                    sumTime += leaderTimeList[event]["timeDiff"];
                    countTime += 1;
                }
            });
        }
        else {
            vanillaTimeList.forEach(time => {
                sumTime += time;
                countTime += 1;
            })
        }

        let avgTime = sumTime / countTime;

        let timesToDisplay = `Average Processing Time = ${avgTime} milliseconds\n`;
        statsToDisplay += timesToDisplay;
    }

    // find average round trip time (RTT)
    if(STATS_CONFIG.rtt) {
        console.log("leader rtt list:");
        console.log(leaderRTTList);
        var sumRTT = 0;
        var countRTT = 0;
        Object.keys(leaderRTTList).forEach(event => {
            if (leaderRTTList[event]["rtt"]) {
                sumRTT += leaderRTTList[event]["rtt"];
                countRTT += 1;
            }
        });
        avgRTT = sumRTT / countRTT;

        let timesToDisplay = `Average RTT = ${avgRTT} milliseconds\n`;
        statsToDisplay += timesToDisplay;
    }

    if (STATS_CONFIG.logtime) {
        statsToDisplay += `Log size=${logSize} events, ${logCharacterCount} characters` +
            `\nLog execution time since start of script=${logExecutionTimeSinceScriptInit} milliseconds` +
            `\nLog execution time=${logExecutionTimeSinceLogInit} milliseconds`;
    }

    if (STATS_CONFIG.bytesSent) {
        let bytes = new Blob([JSON.stringify(leaderLog)]).size;
        let numChars = JSON.stringify(leaderLog).length-2;
        let logMetricsToDisplay = `Log size incurred till now:\nNumber of events = ${leaderLog.length}\n` +
            `Number of bytes = ${bytes}\n` + `Number of characters = ${numChars}\n` + `Runtime: ${experimentRunTime / 1000} sec\n`;

        if (leaderLog.length > 0) statsToDisplay += logMetricsToDisplay;
    }

    if (STATS_CONFIG.netLatency) {
        let sumLatencyAsLeader = 0;
        let sumLatencyAsFollower = 0;
        let xhrCountAsLeader = 0;
        let xhrCountAsFollower = 0;
        Object.keys(xhrMetrics).forEach(xhrId => {
            if (xhrMetrics[xhrId]['latency']) {
                const isLeader = xhrMetrics[xhrId]['is_leader'];
                if (isLeader) {
                    sumLatencyAsLeader += xhrMetrics[xhrId]['latency'];
                    xhrCountAsLeader += 1;
                }
                else {
                    sumLatencyAsFollower += xhrMetrics[xhrId]['latency'];
                    xhrCountAsFollower += 1;
                }
            }
        });

        const averageLatencyAsLeader = sumLatencyAsLeader / xhrCountAsLeader;
        const averageLatencyAsFollower = sumLatencyAsFollower / xhrCountAsFollower;
        statsToDisplay += `XHR Average Latency as Leader: ${averageLatencyAsLeader} | Sum: ${sumLatencyAsLeader} Count: ${xhrCountAsLeader}\n`;
        statsToDisplay += `XHR Average Latency as Follower: ${averageLatencyAsFollower} | Sum: ${sumLatencyAsFollower} Count: ${xhrCountAsFollower}\n`;
    }

    if (STATS_CONFIG.swap) {
        statsToDisplay += `Swap time: ${swapTime}\n`;
    }

    navigator.clipboard.writeText(statsToDisplay)
        .then(() => alert(statsToDisplay));
}

function initSinatra(originalOnLoadCallback) {
    //console.log("Assigning IDs to current body elements");
    // if (document.documentElement) {
    //     assignSinatraIdToTree(document.documentElement);
    // }
    window.sinatra.interceptSelections();

    /* Call the interceptor for random(...) here */
    // todo temp for testing
    //interceptRandom();

    /* Call the interceptors for timers here */
    interceptTimeout();
    interceptIntervals();

    //interceptDomChanges();
    interceptDocumentDom0Events(document);

    if (originalOnLoadCallback)
        originalOnLoadCallback();
}

function interceptWindowDom0Events() {
    DOM0_EVENT_NAMES
        .map(event => `on${event}`)
        .forEach(eventName => {
            if (!Object.getOwnPropertyDescriptor(window, eventName)) {
                console.warn(`Unable to instrument existing DOM0 event '${eventName}'`);
                return;
            }
            const { get, set } = Object.getOwnPropertyDescriptor(window, eventName);
            Object.defineProperty(window, eventName, {
                set: function(newHandler) {

                    if (!newHandler) {
                        return set.call(this, newHandler);
                    }

                    const sinatraId = extractSinatraId(this);
                    const eventTypeId = recordEventHandler(this, eventName, newHandler);

                    console.info(`DOM0 setter invoked for ${eventName} on ID ${sinatraId}`);

                    function leaderEventListener(event) {
                        if (_dom2) {
                            return;
                        }

                        const innerHtml = event.target.innerHTML;
                        const innerText = event.target.innerText;
                        const value = event.target.value;
                        const domEvent = new DomEvent(sinatraId, sinatraId, eventName, createEventCopy(event), eventName + (eventCounter++), innerHtml, innerText, value, eventTypeId);
                        const loggedEvent = new LoggedEvent(LOG_EVENTS.DOM, domEvent);
                        console.info(`Executing window's ${eventTypeId} handler`);

                        if (sinatraId === '-1') {
                            newHandler.call(event.target, event);
                            return;
                        }
                        executeAndSendLoggedEvent(loggedEvent, () => newHandler.call(event.target, event));
                    }

                    function vanillaListener(event) {
                        vanillaEventTimed(() => newHandler(event));
                    }

                    if (STATS_CONFIG.vanilla) {
                        return set.call(this, vanillaListener);
                    }
                    else {
                        return set.call(this, leaderEventListener);
                    }
                },
                get
            });
        });
}

/**
 * Recursively assigns a Sinatra ID to every element in the tree that does not have an ID already assigned.
 *
 * @param {Element} element The root element of the subtree.
 */
const DEBUG_ELEMENTS = {};
const DEBUG_ELEMENTS_STACK = {};
function assignSinatraIdToTree(element, ignoreSubtree = false) {
    if (!(element instanceof Element)) {
        return;
    }
    if (!ignoreSubtree) {
        [].forEach.call(element.children, assignSinatraIdToTree);
    }
    const existingId = extractSinatraId(element);
    if (!existingId) {
        const id = sinatraIdIndex++;
        console.info(`Assigning ID ${id} to element ${element}`);
        DEBUG_ELEMENTS[id] = element;
        element.setAttribute(SINATRA_ID_ATTR, id);
        if (Error.captureStackTrace) {
            const stackContainer = {};
            Error.captureStackTrace(stackContainer);
            DEBUG_ELEMENTS_STACK[id] = stackContainer.stack;
        }
        if (!_dom2) {
            const idAssignment = new IdAssignment(id, element.nodeName);
            const loggedEvent = new LoggedEvent(LOG_EVENTS.ID_ASSIGNMENT, idAssignment);
            sendLoggedEvent(loggedEvent);
        }
    }
}

/**
 * Assigns a unique ID to the given XMLHttpRequest if it does not have an ID already assigned.
 *
 * @param {XMLHttpRequest} xhr
 */
function assignIdToXhr(xhr) {
    if (xhr.hasOwnProperty(SINATRA_XHR_ID_ATTR)) {
        return xhr[SINATRA_XHR_ID_ATTR];
    }
    const id = 'xhr' + xhrIndex++;
    xhr[SINATRA_XHR_ID_ATTR] = id;
    return id;
}

/**
 * Finds the element with the given Sinatra ID.
 *
 * @param sinatraId The Sinatra ID of the element.
 * @returns {HTMLElement|null} The element with the given ID, or null if no such element exists.
 */
function findElementById(sinatraId) {
    if (sinatraId === SINATRA_DOCUMENT_ID) {
        return document;
    }
    if (sinatraId === SINATRA_WINDOW_ID) {
        return window;
    }
    if (sinatraId === SINATRA_DOCUMENT_ROOT_ID) {
        return document.documentElement;
    }
    const el = document.querySelector("[" + SINATRA_ID_ATTR + "=" + "'" + sinatraId + "'" + "]");
    if (el) {
        return el;
    }
    return DEBUG_ELEMENTS[sinatraId];
}

/**
 * Extracts the Sinatra ID for the given {@link Element}.
 * Non-existent attribute is mapped to undefined.
 * {@link https://developer.mozilla.org/en-US/docs/web/api/element/getattribute#non-existing_attributes}.
 *
 * @param {Element|HTMLDocument} element The element to extract the ID from.
 * @returns {string|undefined} The Sinatra ID if it exists, undefined otherwise.
 */
function extractSinatraId(element) {
    if (element === document) {
        return SINATRA_DOCUMENT_ID;
    }
    if (element === window) {
        return SINATRA_WINDOW_ID;
    }
    if (element === document.documentElement) {
        return SINATRA_DOCUMENT_ROOT_ID;
    }
    return element.getAttribute(SINATRA_ID_ATTR) || undefined;
}

function extractXhrId(xhr) {
    return xhr[SINATRA_XHR_ID_ATTR];
}

function deferExecution(fn) {
    console.debug(`Deferring execution of ${fn}`);
    realSetTimeout(fn, 0);
}

let globalSeqNo = 0;
const DEBUG_EVENT_BY_SEQ_NO = {};
function LoggedEvent(type, ref) {
    this.type = type;
    this.ref = ref;
    this.seqNo = globalSeqNo++;
    this.documentVersion = sinatraIdIndex;
    this.animationCallbacks = getAnimationCallbackTimestamps(lastRafIndexSent, rafExecuted);
    lastRafIndexSent = rafExecuted;

    DEBUG_EVENT_BY_SEQ_NO[this.seqNo] = this;
}

function getAnimationCallbackTimestamps(start, end) {
    let callbacks = [];
    for (let i = start; i < end; i++) {
        let callback = {
            index: i,
            timestamp: rafCallbackTable[i]['timestamp']
        }
        callbacks.push(callback);
    }
    return callbacks;
}

function createtaskQueue() {
    const queue = [];
    let isDraining = false;

    const enqueue = function(task) {
        queue.push(task);
        if (!isDraining) {
            isDraining = true;
            drain();
        }
    }

    const size = function() {
        return queue.length;
    }

    function drain() {
        if (queue.length === 0) {
            isDraining = false;
            return;
        }
        executeNextTask();
    }

    function executeNextTask() {
        const task = queue[0];
        const promise = task.apply();
        promise
            .catch(e => console.error(e))
            .then(() => console.info("resolved"))
            .then(() => queue.shift())
            .then(() => drain());
    }

    return {
        enqueue: enqueue,
        size: size,
        _rawQueue: function() {return queue;}
    };
}

let followerLastExecuted = 0;
function eventExecutor(currentClockSupplier) {
    const numTriesWarningStart = 25;
    const taskQueue = createtaskQueue();
    const debug = [];

    const debugQueue = function() {
        return debug;
    }

    const enqueue = function(eventClock, seqNo, eventTask, eventDescriptor, then) {

        function logLongLivedTask(eventClock, eventTask, numTries) {
            console.warn(`Event task ${eventTask} at clock ${eventClock} has reached ${numTries} tries | globalSeqNo: ${globalSeqNo} | ${JSON.stringify(eventDescriptor)}`)
        }

        function executeTask(eventClock, seqNo, eventTask, resolve, reject, numTries, nextNumTriesWarning) {

            function defer(nextNumTriesWarning) {
                deferExecution(() => executeTask(eventClock, seqNo, eventTask, resolve, reject, numTries + 1, nextNumTriesWarning), numTries < 100 ? 0 : 200);
            }

            if (numTries === nextNumTriesWarning) {
                logLongLivedTask(eventClock, eventTask, numTries);
                nextNumTriesWarning = nextNumTriesWarning * 2;
            }

            const currentClock = currentClockSupplier();
            if ((eventDescriptor && eventDescriptor.type === LOG_EVENTS.DOM) && currentClock < eventClock) {
                defer(nextNumTriesWarning);
                return;
            }

            // -1 used as special seqNo value where we want to use the event queue to maintain order, however, the
            // event should not effect the sequence numbering
            if (seqNo !== -1 && seqNo !== globalSeqNo) {
                defer(nextNumTriesWarning);
                return;
            }


            const success = eventTask();
            if (!success) {
                defer(nextNumTriesWarning);
                return;
            }

            if (seqNo !== -1) {
                globalSeqNo++;
            }

            resolve(null);
        }

        function deferExecution(fn, delay = 0) {
            realSetTimeout(fn, delay);
        }

        debug.push(eventDescriptor);
        taskQueue.enqueue(() => {
            return new Promise((resolve, reject) =>
                executeTask(eventClock, seqNo, eventTask, resolve, reject, 0, numTriesWarningStart))
                .then(then ? then : () => {})
        });
    }

    return {
        enqueue: enqueue,
        size: taskQueue.size,
        debugQueue: debugQueue
    };
}

function leaderEventExecutor() {

    const taskQueue = createtaskQueue();

    const enqueue = function(task) {

        function executeTask(task, resolve) {

            function defer() {
                console.debug(`Deferring leader task`);
                deferExecution(() => executeTask(task, resolve));
            }

            if (document.readyState !== 'complete') {
                defer();
                return;
            }

            task();

            resolve();
        }

        function deferExecution(fn) {
            realSetTimeout(fn, 5);
        }

        taskQueue.enqueue(() => {
            return new Promise((resolve, reject) => executeTask(task, resolve, reject))
                .catch(e => console.error(e));
        });
    }

    return {
        enqueue: enqueue,
    };
}

window.sinatra.assignIdentity = assignIdentity;
window.sinatra.interceptDom2Events = interceptDom2Events;
window.sinatra.interceptDomChanges = interceptDomChanges;
window.sinatra.interceptMessageChannel = interceptMessageChannel;
window.sinatra.interceptDate = interceptDate;
window.sinatra.interceptXhr = interceptXhr;
window.sinatra.interceptImage = interceptImage;
window.sinatra.interceptCloneNode = interceptCloneNode;
window.sinatra.initSinatra = initSinatra;
window.sinatra.interceptWindowDom0Events = interceptWindowDom0Events;
window.sinatra.interceptNodeModification = interceptNodeModification;
window.sinatra.interceptResizeObserver = interceptResizeObserver;
window.sinatra.sinatraInitialized = sinatraInitialized;
window.sinatra.interceptElementMatches = interceptElementMatches;
