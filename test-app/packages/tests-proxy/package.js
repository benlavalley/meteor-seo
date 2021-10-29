Package.describe({
	name: "velocity:test-proxy",
	summary: "Dynamically created package to expose test files to mirrors",
	version: "0.0.4",
	debugOnly: true
});

Package.onUse(function (api) {
	api.use("coffeescript", ["client", "server"]);
	api.addFiles("tests/mocha/client/_wait-for-router.js",["client"]);
	api.addFiles("tests/mocha/client/chai-jquery.js",["client"]);
	api.addFiles("tests/mocha/client/RouterSpec.coffee",["client"]);
});
