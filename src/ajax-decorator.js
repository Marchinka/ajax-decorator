(function(window, document) {
	window.AjaxDecorator = function (configuration) {
		var self = this;

		if(!window._)
		{
			throw new Error("Underscore.js must be loaded as a dependency");
		}

		if (!configuration.originalService) {
			throw new Error("A base ajax call handler is required in AjaxDecorator constructor");
		}

		if (!_.isFunction(configuration.originalService.ajax)) {
			throw new Error("A base ajax call handler is required to have an 'ajax' method");	
		}

		self.originalService = _.clone(configuration.originalService);
		self.throttle = configuration.throttle;
		self.getThrottleDelay = function (options) {
			var throttleDelay = options.throttle || self.throttle;
			return throttleDelay;
		};
		self.optimizedRequest = configuration.optimizedRequest;
		self.beforeSend = configuration.beforeSend;
		self.ajaxSuccess = configuration.ajaxSuccess;
		self.ajaxError = configuration.ajaxError;
		self.ajaxComplete = configuration.ajaxComplete;
		self.verbose = configuration.verbose;

		self.getNonNullFunction = function (f1, f2) {
			if (_(f1).isFunction()) {
				return f1;
			}
			if (_(f2).isFunction()) {
				return f2;
			}
			return undefined;
		};

		self.currentlyExecutingCallTimeouts = {};
		
		self.getTimeoutAjax = function (url, method) {
			var dictionary = self.currentlyExecutingCallTimeouts[url]
			if (dictionary) {
				return dictionary[method];
			} else {
				return;
			}
		};

		var verboseLog = function (text) {
			if (self.verbose) {
				console.log(text);
			}
		};

		var chacheKeyPrefix = "AJAX_CACHE_"

		getRequestUniqueKey = function (options) {
			return  chacheKeyPrefix + options.url;
		};

		self.addTimeoutAjax = function (url, method, timeout) {
			var dictionary = self.currentlyExecutingCallTimeouts[url]
			if (!dictionary) {
				self.currentlyExecutingCallTimeouts[url] = {};
				dictionary = self.currentlyExecutingCallTimeouts[url]
			}
			dictionary[method] = timeout;
		};

		self.executeThrottledCalls = function (options) {
			var throttleDelay = self.getThrottleDelay(options)
			verboseLog("Request ordered with " + throttleDelay + " milliseconds throttle delay.")
			clearTimeout(self.getTimeoutAjax(options.url, options.method));
			self.addTimeoutAjax(options.url, options.method, setTimeout(function () {
				verboseLog("Throttled call performed");
				self.doAjax(options);
			}, throttleDelay));
		};

		var isRequestToBeOptimize = function (options) {
			var result = false;
			_(self.optimizedRequest).each(function (optimizedRequest) {
				var regex;
				if (optimizedRequest.regexMatch) {
					regex = new RegExp(optimizedRequest.url);
				} else {
					regex = new RegExp("^(\/)*" + optimizedRequest.url + "(\/)*$");	
				}
				var match = options.url.match(regex);
				result = result || match;
			});
			return result;
		};

		self.isRequestCachable = function (options) {
			var isGet = options.method && options.method.toLowerCase() === "get";
			var isToOptimize = isRequestToBeOptimize(options);
			return 	isGet && isToOptimize;
		};

		self.getCachedResult = function (options) {
			if (options.refetch) {
				localStorage.removeItem(getRequestUniqueKey(options));
				return undefined;
			}

			if (self.isRequestCachable(options)) {
				var cachedJsonResult = localStorage.getItem(getRequestUniqueKey(options));
				var cachedResult = JSON.parse(cachedJsonResult);
				return cachedResult;
			}

			return undefined;
		};

		self.cacheResultIfRequired = function (result, options) {
			if (self.isRequestCachable(options)) {
				var cachedResult = JSON.stringify(result);
				var key = getRequestUniqueKey(options);
				localStorage.setItem(key, cachedResult);
				verboseLog("Result " + cachedResult + " cached to key " + key);
			}
		};

		self.doAjax = function (options) {
			var enrichedOptions = _.clone(options);
			
			enrichedOptions.beforeSend = self.getNonNullFunction(options.beforeSend, self.beforeSend);
			
			enrichedOptions.success = function () {
				var ajaxSuccess = self.getNonNullFunction(options.ajaxSuccess, self.ajaxSuccess);
				if (ajaxSuccess){
					verboseLog("ajaxSuccess event");
					ajaxSuccess.apply(self, arguments)
				};
				var result = arguments[0];
				self.cacheResultIfRequired(result, options);
				verboseLog("success callback");
				options.success.apply(self, arguments);
			};

			enrichedOptions.complete = self.getNonNullFunction(options.ajaxComplete, self.ajaxComplete);

			var cachedResult = self.getCachedResult(options);
			if (cachedResult) {
				verboseLog("Request to url " + options.url + " with cached result");
				if(_(enrichedOptions.beforeSend).isFunction()) {
					enrichedOptions.beforeSend(cachedResult);
				}
				if (_(enrichedOptions.success).isFunction()) {
					enrichedOptions.success(cachedResult);
				}
				if (_(enrichedOptions.complete).isFunction()) {
					enrichedOptions.complete(cachedResult);
				}
				return;
			}

			enrichedOptions.error = function () {
				var ajaxError = self.getNonNullFunction(options.ajaxError, self.ajaxError);
				if (ajaxError){
					verboseLog("ajaxError event");
					ajaxError.apply(self, arguments)
				};
				verboseLog("error callback");
				options.error.apply(self, arguments);
			};

			enrichedOptions.ajaxSuccess = undefined;
			enrichedOptions.ajaxError = undefined;
			enrichedOptions.ajaxComplete = undefined;
			
			verboseLog("Request to url" + options.url + " sent to server");
			self.originalService.ajax(enrichedOptions);
		};

		self.clearCache = function () {
			var keys = Object.keys(localStorage);
			_(keys).each(function (key) {
				if (key.indexOf(chacheKeyPrefix) > -1) {
					localStorage.removeItem(key);	
				}
			});
			verboseLog("Cache cleared");
		};

		self.ajax = function (options) {
			var logText = "Ajax " + (options.method || '')
						+ " request to url " 
						+ (options.url || '')
						+ " with parameters: " 
						+ (JSON.stringify(options.data) || 'none');
			verboseLog(logText);
			if (options.delay) {
				verboseLog("Request ordered with " + options.delay + " milliseconds delay");
				setTimeout(function () { 
					verboseLog("Delayed request performed");
					self.doAjax(options);
				}, options.delay)
			} else if (self.getThrottleDelay(options)) {
				self.executeThrottledCalls(options);
			} else {
				self.doAjax(options);
			}
		}
	};
})(window, document);