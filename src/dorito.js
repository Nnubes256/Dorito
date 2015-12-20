/**
 * The Dorito modloader
 * @namespace
 */
var Dorito = function() {
    this.logHistory = [];

    this.isNW = false;
    this.nw = null;

    this.Signal = signals.Signal;

    /**
    * The path from where to load the addons.
    * @name modPath
    * @memberof Dorito
    */
    this.modPath = "addons/";

    /**
    * Whenever Dorito has been initialized sucessfully.
    * @name initDone
    * @memberof Dorito
    */
    this.initDone = false;
    this.Filesystem = null;
};

/**
* A collection of Signals.js events to listen for.
* @summary Events.
* @memberof Dorito
* @namespace
*/
Dorito.prototype.Events = {
    // HACK using global variable
    /**
    * Fires when Dorito has finished calling init().
    * @event Dorito#Events#DoritoInitialized
    */
    DoritoInitialized: new signals.Signal(),
    /**
    * Fires just before the game launches.
    * @event Dorito#Events#CrossCodeLoaded
    */
    CrossCodeLoaded: new signals.Signal()
};

/**
* Custom console.log()
* @deprecated Nosense method
* @memberof Dorito
* @method
*/
Dorito.prototype._log = console.log.bind(this);

/**
* Custom console.warn()
* @deprecated Nosense method
* @memberof Dorito
* @method
*/
Dorito.prototype._warn = console.warn.bind(this);

/**
* Custom console.error()
* @deprecated Nosense method
* @memberof Dorito
* @method
*/
Dorito.prototype._error = console.error.bind(this);

Dorito.prototype._loadModules = function() {
    this.Filesystem = require('fs');
};

Dorito.prototype._loadNW = function() {
    // Test for NW.js, otherwise is a browser.
    try {
        this.nw = require('nw.gui');
        console.log(
            "NW.js context detected. Dorito will load mods from dataPath."
        );
        this.isNW = true;
        this._loadModules();
        return true;
    } catch(e) {
        console.log(
            "Possible browser context detected. " +
            "Dorito will load from addons/"
        );
        this.isNW = false;
        return false;
    }
};

/*
Dorito.prototype.initEvents = function() {
// We don't need this anymore, now using Signals.js
};
*/

Dorito.prototype.appendScript = function(pathToScript) {
    return new Promise(function(resolve, reject) {
        try {
            var head = document.getElementsByTagName("head")[0];
            var js = document.createElement("script");
            js.type = "text/javascript";
            js.src = pathToScript;
            head.appendChild(js);
            resolve();
        } catch(e) {
            reject(e);
        }
    });
};

Dorito.prototype.createNWFolder = function() {
    var self = this;
    return new Promise(function(resolve, reject) {
        self.Filesystem.mkdir(self.modPath, function(err) {
            if(err) {
                console.error(err);
                return reject(err);
            }
            resolve();
        });
    });
};

Dorito.prototype.loadAllNW = function() {
    // Load the mods using fs, then append them to file.
    // TODO test type-checking code.
    // That means: DO NOT PLACE ANYTHING THAT ISN'T JS ON /mods !!
    var self = this;
    return new Promise(function(resolve, reject) {
        try {
            self.Filesystem.readdir(self.modPath, function(err, files) {
                if (err) {
                    return reject(err);
                }
                // TODO test
                var jsFiles = files.filter(function(file) {
                    return file.substr(-3) === '.js';
                });
                console.log(jsFiles);
                resolve(jsFiles);
            });
        } catch(e) {
            reject(e);
        }
    }).then(function(jsFiles) {
        return Promise.all(jsFiles.map(function(js) {
            // See note #1 for rant about security of this.
            return self.appendScript(self.modPath + js);
        }));
    }).catch(function(err) {
        //console.error("An error ocurred while reading the mods: " + err);
        self.disable(err);
    });
};

Dorito.prototype.requestFile = function(file) {
    return new Promise(function(resolve, reject) {
        var request = new XMLHttpRequest();
        request.open('GET', file, true);
        request.onload = function() {
            if (this.status >= 200 && this.status < 400) {
                resolve(this.response);
            } else {
                reject(new Error(this.statusText));
            }
        };
        request.onerror = function() {
            reject(new Error("Network error."));
        };
        request.send();
    });
};

Dorito.prototype.loadAllBrowser = function() {
    // Load the mods using HTTP, then append them to file.
    var addonList;
    var self = this;
    return self.requestFile(self.modPath + "/addons.json")
        .then(JSON.parse)
        .then(function(json) {
            // LIBS
            addonList = json;
            console.log("Found " + addonList.libs.length + " libs.");
            return Promise.all(addonList.libs.map(function(row) {
                // See note #1 for rant about security of this.
                return self.appendScript(self.modPath + row.path);
            }));
        }).then(function() {
            // ADDONS
            if(!addonList) throw new Error("No addons list received!");
            console.log("Found " + addonList.addons.length + " addons.");
            return Promise.all(addonList.addons.map(function(row) {
                // See note #1 for rant about security of this.
                return self.appendScript(self.modPath + row.path);
            }));
        }).catch(function(err) {
            //console.error("An error ocurred while loading the mods: " + err);
            self.disable(err);
        });
};
/**
* Function called when window.startCrossCode exists.
* @fires Dorito#Events#CrossCodeLoaded
* @memberof Dorito
*/
Dorito.prototype.ready = function() {
    if (this.initDone) {
        console.log("CrossCode Ready");
        this.Events.CrossCodeLoaded.dispatch();
    } else {
        console.error("WARN: Didn't load in time!");
    }
};

/**
* Function called when all mods have been loaded.
* @memberof Dorito
*/
Dorito.prototype.doneInit = function() {
    console.log("Done init.");
    this.initDone = true;
};

/**
* Function called from the HTML when initDone is set to true.
* @fires Dorito#Events#DoritoInitialized
* @memberof Dorito
*/
Dorito.prototype.callDone = function() {
    this.Events.DoritoInitialized.dispatch();
};

/**
* Automatic throwing
*
* @param e - The object to throw.
* @throws Throws the object passed as argument
* @memberof Dorito
*/
Dorito.prototype.disable = function(e) {
    // TODO why I do this
    throw e;
};

/**
 * Loads NW.js if it exists, inits the events and loads all mods.
 * @memberof Dorito
 */
Dorito.prototype.init = function() {
    var s = this;
    this._loadNW();
    //this.initEvents();
    if(this.isNW) {
        this.modPath = this.nw.App.dataPath + "/addons/";
        this.loadAllNW().then(function() {
            return s.doneInit();
        }).catch(function(err) {
            // If there's no addons/ folder
            if(err && err.code && err.code === 'ENOENT') {
                // Create it and warn the user
                console.warn("Mod folder not found, creating");
                s.createNWFolder().then(function() {
                    alert(
                        "Mod folder created at:\n\n" +
                        self.modPath +
                        "\n\nPlease restart the game!"
                    );
                    return s.nw.App.quit();
                }).catch(console.error.bind(this));
            } else console.error(err);
        });
    } else {
        this.loadAllBrowser().then(function() {
            return s.doneInit();
        }).catch(console.error.bind(this));
    }
};

var dorito = new Dorito();

/**
* Dorito API constructor
* @constructor
* @classdesc Dorito API methods.
* @namespace DoritoAPI
* @param {Dorito} dorito - Dorito mod-loader instance.
* @throws {TypeError} Argument dorito must be a Dorito instance.
*/
var DoritoAPI = function(dorito) {
    if(!dorito || !(dorito instanceof Dorito)) {
        throw new TypeError(
            "DoritoAPI: Dorito instance not passed as argument to init"
        );
    }

    this.dorito = dorito;
    this.self = this;

    /**
    * Functions to inject code in functions(yo dawg).
    * Note: the actually only function here was originally made by
    * {@link http://me.dt.in.th Thai Pangsakulyanont}. Author credit will
    * be added whenever is necessary.
    * @name Injectors
    * @namespace Injectors
    * @memberof DoritoAPI
    */
    this.Injectors = {};

    /**
    * Injects code inside a function using monkey-patching.
    *
    * Retrieves a method's reference, `methodName`, stored in `object`,
    * passes this method to the first argument of `overrideFunction`,
    * and replaces the original method with the return value of that
    * function(which is expected to return another function with the
    * custom behavior).
    * @param {Object} object - Object where the function resides.
    * @param {String} methodName - Method to override.
    * @param
    * {Function} overrideFunction - Function tasked to do the override.
    * @author Thai Pangsakulyanont
    * @name override
    * @method
    * @memberof DoritoAPI.Injectors
    */
    this.Injectors.override = function(object, methodName, overrideFunction) {
        object[methodName] = overrideFunction(object[methodName]);
    };

    /**
    * Some decorators for use with {@link DoritoAPI.Injectors.override}.
    * Note: most functions here were originally made by
    * {@link http://me.dt.in.th Thai Pangsakulyanont}. Author credit will
    * be added whenever is necessary.
    *
    * All functions in this namespace must be `named_like_this`
    *
    * Example of an InjectType:
    * ```
    * // If you don't ask for parameters here you are free to place here
    * // the first return and tell users to use the InjectType with no
    * // brackets(look at InjectTypes#memoize for an example of this).
    * this.InjectTypes.foo = function(bar) {
    *     // Put outer scope variables here.
    *     // First, return a function that takes an argument:
    *     return function(original) {
    *         // This function will be called with one argument:
    *         // 'original' will be the original function.
    *         // Put init code here.
    *         var baz = bar + 2;
    *
    *         // Then return another function:
    *         return function() {
    *             // This will be called each time the function is called.
    *             // arguments will equal to the arguments passed to the
    *             // function.
    *             // If you want to pass new arguments to the function,
    *             // DON'T MODIFY ARGUMENTS DIRECTLY! Instead, use a
    *             // reference. It makes the code more maintainable.
    *             var newArguments = arguments;
    *
    *             // In this example, we'll make the first argument baz+bar.
    *             newArguments[0] = bar + baz;
    *
    *             // And then call the original function with the new
    *             // arguments.
    *             // If you want to call the original function, or your
    *             // custom function to execute, or whatever, use
    *             // Function.apply(this, args), so the context doesn't
    *             // change unexpectedly.
    *             var returnValue = original.apply(this, newArguments);
    *
    *             // If you don't want to modify the return value of the
    *             // function(thing which DoritoAPI.InjectTypes.compose can
    *             // already do), you MUST return the original return value
    *             // (so the caller function doesn't suspect anything :P)
    *             return returnValue;
    *         };
    *     };
    * };
    * ```
    *
    * @member {DoritoAPI}
    * @namespace InjectTypes
    * @memberof DoritoAPI
    */
    this.InjectTypes = {};

    /**
    * An injector for use with {@link DoritoAPI.Injectors.override}.
    * @typedef {Function} InjectType
    * @memberof DoritoAPI.InjectTypes
    */

    /**
    * Decorator for injecting a function after the original code.
    *
    * Note that you can't modify the return value. For that, use
    * {@link DoritoAPI.InjectTypes.compose}.
    * @summary Injects a function after the original code.
    * @type InjectType
    * @param {Function} extraBehavior - Additional code to run.
    * @returns {Function}
    * @author Thai Pangsakulyanont
    * @name after
    * @memberof DoritoAPI.InjectTypes
    */
    this.InjectTypes.after = function(extraBehavior) {
        return function(original) {
            return function() {
                var returnValue = original.apply(this, arguments);
                extraBehavior.apply(this, arguments);
                return returnValue;
            };
        };
    };

    /**
    * Decorator for injecting a function before the original code.
    *
    * Note that anything you return will be lost, and you can access the
    * values of the arguments through your own function's arguments, but
    * you can't modify them. For that, use
    * {@link DoritoAPI.InjectTypes.filter}.
    * @summary Injects a function before the original code.
    * @type InjectType
    * @param {Function} extraBehavior - Additional code to run.
    * @returns {Function}
    * @author Thai Pangsakulyanont
    * @name before
    * @memberof DoritoAPI.InjectTypes
    */
    this.InjectTypes.before = function(extraBehavior) {
        return function(original) {
            return function() {
                extraBehavior.apply(this, arguments);
                return original.apply(this, arguments);
            };
        };
    };

    /**
    * Decorator for injecting a argument-filtering function.
    * This decorator is similar from {@link DoritoAPI.InjectTypes.before},
    * but differs in that you have read/write access the arguments.
    *
    * The arguments passed to the original can be read from your own
    * function's arguments. You can write new values by returning an array
    * with the new arguments.
    * @summary
    * Injects an argument-filtering function before the original code.
    * @type InjectType
    * @param {Function} extraBehavior - Additional code to run.
    * @returns {Function}
    * @name filter
    * @memberof DoritoAPI.InjectTypes
    */
    this.InjectTypes.filter = function(extraBehavior) {
        return function(original) {
            return function() {
                var newArguments = extraBehavior.apply(this, arguments);
                return original.apply(
                    this,
                    (newArguments && newArguments instanceof Array) ?
                    newArguments : arguments
                );
            };
        };
    };

    /**
    * Decorator for injecting a function that modifies the return value of
    * the original function.
    *
    * The orignal return value will be passed as an argument to your own
    * function, and the value you return will be the new return value of
    * the original function.
    * @summary Injects a function able to modify the return value.
    * @type InjectType
    * @param {Function} extraBehavior - Additional code to run.
    * @returns {Function}
    * @author Thai Pangsakulyanont
    * @name compose
    * @memberof DoritoAPI.InjectTypes
    */
    this.InjectTypes.compose = function(extraBehavior) {
        return function(original) {
            return function() {
                return extraBehavior.call(
                    this,
                    original.apply(this, arguments)
                );
            };
        };
    };

    /**
    * Decorator for injecting a function that benchmarks the original
    * function.
    *
    * This decorator has been adapted from Thai Pangsakulyanont's code to
    * use `performance.now()` and to take one argument, `extraBehavior`, a
    * callback function taking as argument an object with two properties:
    *   * `benchmark`: the time taken to run the original function.
    *   * `returnValue`: the return value of the original function.
    * @summary Injects a benchmark function.
    * @type InjectType
    * @param {Function} extraBehavior - Additional code to run.
    * @returns {Function}
    * @name benchmark
    * @memberof DoritoAPI.InjectTypes
    */
    this.InjectTypes.benchmark = function(extraBehavior) {
        return function(original) {
            return function() {
                var start = performance.now();
                var returnValue = original.apply(this, arguments);
                var end = performance.now();
                extraBehavior({
                    benchmark: (start - end),
                    returnValue: returnValue
                });
                return returnValue;
            };
        };
    };

    /**
    * Decorator for injecting a function that memoizes(not to be confused
    * with memorize) the arguments passed to the original function,
    * speeding up later calls to the functions with that same value as
    * arguments.
    *
    * Note that this function doesn't take an `extraBehavior` argument, so
    * you'll be able to call this function without brackets when using an
    * {@link DoritoAPI.Injectors Injector}.
    *
    * This function is a modification of Thai Pangsakulyanont's original
    * memoize function, with the additon of supporting multiple arguments.
    * @summary Injects a memoizing function.
    * @type InjectType
    * @param original - Original function.
    * @returns {Function}
    * @name memoize
    * @memberof DoritoAPI.InjectTypes
    */
    this.InjectTypes.memoize = function(original) {
        var memory = {};
        return function() {
            for (var cell in memory) {
                if (memory.hasOwnProperty(cell)) {
                    if(arguments == cell[0]) {
                        return cell[1];
                    }
                }
            }
            var returnValue = original.call(this, x);
            memory.push([arguments,returnValue]);
            return returnValue;
        };
    };

    /**
    * Decorator for injecting a function that attaches an event to be
    * dispatched before the function gets called.
    * The event will have the next properties:
    *   * `functionArguments`: an array with the arguments passed to the
    *   function.
    * @summary Injects an event dispatcher before the original function.
    * @type InjectType
    * @param {Signal} ev - A Signals.js event
    * @returns {Function}
    * @name dispatch_before
    * @memberof DoritoAPI.InjectTypes
    */
    this.InjectTypes.dispatch_before = function(ev) {
        if(!ev)
        throw new TypeError("No listener passed!");
        if(!(ev instanceof signals.Signal))
        throw new TypeError("Listener is not a Signal!");
        var doritoapi = self;
        // HACK is this ok?
        function _isArgumentsObject(obj) {
            return Object.prototype.toString.call(
                obj
            ) === '[object Arguments]';
        }
        return function(original) {
            var myEvent = ev;
            return function() {
                var data = {};
                data.args = arguments;
                data.self = this;
                data.cancelled = false;
                myEvent.dispatch(data);
                if(data.cancelled) return null; // Cancel func execution
                var eventArguments = data.args || arguments;
                if(
                    !(eventArguments instanceof Array) &&
                    !(_isArgumentsObject(eventArguments))
                ) {
                    doritoapi.dorito._warn(
                        "dispatch_before result is not an array, " +
                        "using original arguments." +
                        " NOTE new versions shouldn't let code reach here!"
                    );
                    eventArguments = arguments;
                }
                return original.apply(
                    this,
                    eventArguments
                );
            };
        };
    };

    /**
    * Decorator for injecting a function that attaches an event to be
    * dispatched after the function gets called.
    * The event object will have the next properties:
    *   * `functionArguments`: an array with the arguments passed to the
    *       function.
    *   * `returnValue`: the return value of the function.
    * @summary Injects an event dispatcher after the original function.
    * @type InjectType
    * @param {Signal} ev - The name given to the listener
    * @returns {Function}
    * @name dispatch_after
    * @memberof DoritoAPI.InjectTypes
    */
    this.InjectTypes.dispatch_after = function(ev) {
        if(!ev)
        throw new TypeError("No listener passed!");
        if(!(ev instanceof signals.Signal))
        throw new TypeError("Listener is not a Signal!");
        var doritoapi = self;
        return function(original) {
            var myEvent = ev;
            return function() {
                var data = {};
                data.args = arguments;
                data.self = this;
                var returnValue = original.apply(this, arguments);
                if(data.args != arguments)
                data._argsAfterRun = arguments;
                else
                data._argsAfterRun = null;
                data.returnValue = returnValue;
                myEvent.dispatch(data);
            };
        };
    };

    /**
    * Utilities for messing with the canvas.
    * @member {DoritoAPI}
    * @namespace GameCanvas
    * @memberof DoritoAPI
    */
    this.GameCanvas = {};

    /**
    * The game's canvas.
    * @name canvas
    * @memberof DoritoAPI.GameCanvas
    */
    this.GameCanvas.canvas = document.getElementById('canvas');

    /**
    * Returns the game's canvas.
    * @returns {HTMLCanvasElement} The DOM element.
    * @name getCanvas
    * @method
    * @memberof DoritoAPI.GameCanvas
    */
    this.GameCanvas.getCanvas = function() {
        return this.GameCanvas.canvas;
    };

    /**
    * Returns the game canvas's context.
    * @returns {CanvasRenderingContext2D} The canvas' context.
    * @name getContext
    * @method
    * @memberof DoritoAPI.GameCanvas
    */
    this.GameCanvas.getContext = function() {
        return this.GameCanvas.canvas.getContext('2d');
    };

    console.log("DoritoAPI loaded");
};

var dorito_api = new DoritoAPI(dorito);
