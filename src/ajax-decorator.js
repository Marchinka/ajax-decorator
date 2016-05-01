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
		self.beforeSend = configuration.beforeSend;
		self.ajaxSuccess = configuration.ajaxSuccess;
		self.ajaxError = configuration.ajaxError;
		self.ajaxComplete = configuration.ajaxComplete;

		self.getNonNullFunction = function (f1, f2) {
			if (_.isFunction(f1)) {
				return f1;
			}
			if (_.isFunction(f2)) {
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

		self.addTimeoutAjax = function (url, method, timeout) {
			var dictionary = self.currentlyExecutingCallTimeouts[url]
			if (!dictionary) {
				self.currentlyExecutingCallTimeouts[url] = {};
				dictionary = self.currentlyExecutingCallTimeouts[url]
			}
			dictionary[method] = timeout;
		};

		self.executeThrottledCalls = function (options) {
			clearTimeout(self.getTimeoutAjax(options.url, options.method));
			self.addTimeoutAjax(options.url, options.method, setTimeout(function () {
				self.doAjax(options);
			}, self.getThrottleDelay(options)));
		};

		self.doAjax = function (options) {
			var enrichedOptions = _.clone(options);
			
			enrichedOptions.beforeSend = self.getNonNullFunction(options.beforeSend, self.beforeSend);
			
			enrichedOptions.success = function () {
				var ajaxSuccess = self.getNonNullFunction(options.ajaxSuccess, self.ajaxSuccess);
				if (ajaxSuccess){
					ajaxSuccess.apply(self, arguments)
				};
				options.success.apply(self, arguments);
			};

			enrichedOptions.error = function () {
				var ajaxError = self.getNonNullFunction(options.ajaxError, self.ajaxError);
				if (ajaxError){
					ajaxError.apply(self, arguments)
				};				
				options.error.apply(self, arguments);
			};

			enrichedOptions.complete = self.getNonNullFunction(options.ajaxComplete, self.ajaxComplete);

			enrichedOptions.ajaxSuccess = undefined;
			enrichedOptions.ajaxError = undefined;
			enrichedOptions.ajaxComplete = undefined;
			self.originalService.ajax(enrichedOptions);
		};

		self.ajax = function (options) {
			if (options.delay) {
				setTimeout(function () { 
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