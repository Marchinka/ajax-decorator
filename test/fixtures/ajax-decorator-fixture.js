(function(window, document) {
	describe("ajax-decorator", function() {
		describe("ctor", function() {

			it("throws error if originalService is falsy", function () {
				// SETUP
				var expectedError = "A base ajax call handler is required in AjaxDecorator constructor";
				var errorThrower = function () {
					new AjaxDecorator({ originalService: undefined });
				};

				// EXERCISE AND ASSERT
				expect(errorThrower).to.throw(expectedError);
		    });

			it("throws error if originalService does not have ana ajax methid", function () {
				// SETUP
				var expectedError = "A base ajax call handler is required to have an 'ajax' method";
				var errorThrower = function () {
					new AjaxDecorator({ originalService: {} });
				};

				// EXERCISE AND ASSERT
				expect(errorThrower).to.throw(expectedError);
		    });

		});

		describe("ajax method", function() {
			it("calls ajax methd of originalService", function () {
				// SETUP
				var data = [
					{ key: "key1", value: "value1"},
					{ key: "key2", value: "value2"}
				];
				var restUrl = "api/path/to/data";
				var mock = {
					method: "GET",
					url: restUrl,
					result: data,
					callbackType: "success"
				};
				window.ajaxMock.addMockedAjax(mock);
				var decorator = new AjaxDecorator({ originalService: window.ajaxMock });

				// EXERCISE
				decorator.ajax({
					method: "GET",
					url: restUrl
				});

				// ASSERT
				expect(mock.called).to.be.true;
		    });
	    });
	});	
})(window, document);
