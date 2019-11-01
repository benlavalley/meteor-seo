
Package.describe({
	name: 'lookback:seo',
	summary: 'Automatically add meta, OpenGraph and Twitter tags from your Iron Router routes.',
	version: '1.1.4',
	git: 'http://github.com/lookback/meteor-seo',
});

Package.onUse(function (api) {
	api.versionsFrom('METEOR@1.8.1');

	api.imply('yasinuslu:blaze-meta@0.3.4', 'client');

	api.use([
		'ecmascript',
		'mongo',
		'tracker',
		'underscore',
		'check',
		'jquery',
		'iron:router',
	], 'client');

	api.mainModule('lib/router.js', 'client');
});
