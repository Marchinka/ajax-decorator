(function(window, document) {
	var service = {
		mockedCalls: [],
		ajax: function (options) {
			for (var i in this.mockedCalls) {
				var mockedCall = this.mockedCalls[i];
				var isCallToMock = options.url === mockedCall.url && options.method === mockedCall.method;
				if (isCallToMock) {
					switch(mockedCall.callbackType) {
					    case "success":
					    	if (options.success) {
					        	options.success(mockedCall.result)
					    	}
					        break;
					    default:
					    	if (options.error) {
					        	options.error(mockedCall.result)
					    	}
					}
					if (options.always) {
						options.always(mockedCall.result);
					}
					mockedCall.called = true;
					mockedCall.numberOfCalls++;
					mockedCall.data = options.data;
				}
			}

		},
		addMockedAjax: function (mockedCall) {
			mockedCall.called = false;
			mockedCall.numberOfCalls = 0;
			this.mockedCalls.push(mockedCall);
		}
	};
	window.ajaxMock = service;
})(window, document);