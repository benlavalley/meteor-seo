import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { check, Match } from 'meteor/check';
import { Meta } from 'meteor/yasinuslu:blaze-meta';
import { Iron } from 'meteor/iron:core';
import { share } from './router-utils';

function callOrGet(router, val) {
	if (_.isFunction(val)) {
		return val.call(router);
	} else {
		return val;
	}
}

function Formatter(opts) {
	check(opts.name, String);
	return function (content, key) {
		if (!content) {
			return;
		}
		if (!Match.test(content, Match.OneOf(String, Function, Array))) {
			return console.warn(`Content for ${key} must be a function, array, or string!`, content);
		}
		content = _.isFunction(content) ? content.call(this) : content;
		const prefix = opts.prefix ? `${opts.prefix}:` : '';
		const property = `${prefix}${key}`;
		content = Array.isArray(content) ? content.join(', ') : content;
		return Meta.set({
			name: opts.name,
			property,
			content,
		});
	};
}

const OpenGraphFormatter = Formatter({
	name: 'property',
	prefix: 'og',
});

const TwitterFormatter = Formatter({
	name: 'name',
	prefix: 'twitter',
});

const MetaFormatter = Formatter({
	name: 'name',
});

const TitleFormatter = function (title, defaults) {
	let browserTitle;
	let stringTitle;
	let suffix;
	const separator = defaults.separator || '·';
	suffix = defaults.suffix;
	if (_.isObject(title)) {
		if (Match.test(title, Match.ObjectIncluding({
			text: Match.OneOf(String, Function),
		}))) {
			if (!_.isUndefined(title.suffix)) {
				suffix = callOrGet(this, title.suffix);
			}
			stringTitle = callOrGet(this, title.text);
		}
	} else {
		stringTitle = title;
	}
	if (!Match.test(stringTitle, String)) {
		if (!defaults.noLogEmptyTitle) {
			return console.warn('Title must be a string! returned title is: ', stringTitle);
		}
	}
	browserTitle = stringTitle;
	if (suffix && suffix !== null) {
		browserTitle += ` ${separator} ${suffix}`;
	}
	Meta.setVar('title', browserTitle);
	TwitterFormatter(stringTitle, 'title');
	return OpenGraphFormatter(stringTitle, 'title');
};

const Computations = {
	_comps: [],
	add(c) {
		this._comps.push(c);
		return this;
	},
	clear() {
		if (this._comps.length === 0) {
			return this;
		}
		_.invoke(this._comps, 'stop');
		this._comps = [];
		return this;
	},
};

function run(defaults) {
	if (defaults == null) {
		defaults = {};
	}
	const router = this;
	const seo = router.lookupOption('seo') || {};
	const call = _.partial(callOrGet, router);
	const inheritFromParent = function (obj, props) {
		if (!Array.isArray(props)) {
			props = [props];
		}
		check(obj, Object);
		check(props, Array);
		return props.forEach(function (prop) {
			if (!obj[prop]) {
				if (seo[prop]) {
					return obj[prop] = seo[prop];
				} else if (defaults[prop]) {
					return obj[prop] = defaults[prop];
				}
			}
		});
	};
	return Tracker.autorun(function (c) {
		let url;
		Computations.add(c);
		const title = call(seo.title || defaults.title);
		TitleFormatter.call(router, title, _.pick(defaults, 'suffix', 'separator'));
		const twitter = _.extend({}, defaults.twitter, seo.twitter);
		const og = _.extend({}, defaults.og, seo.og);
		// meta = _.extend({}, defaults.meta, seo.meta); // updated to use function...
		const meta = _.extend({}, call(seo.meta || defaults.meta)); // allow function for meta
		inheritFromParent(twitter, ['image', 'description']);
		inheritFromParent(og, ['image', 'description']);
		inheritFromParent(meta, 'description');
		_.each(og, OpenGraphFormatter.bind(router));
		_.each(twitter, TwitterFormatter.bind(router));
		_.each(meta, MetaFormatter.bind(router));
		url = seo.url || location.href;
		url = call(url);
		TwitterFormatter(url, 'url');
		return OpenGraphFormatter(url, 'url');
	});
}

Meteor.startup(function () {
	return $('html').attr('prefix', 'og: http://ogp.me/ns#');
});

const ref = share.RouterUtils;
const onReadyCheck = ref.onReady;
const onceCheck = ref.once;

Iron.Router.plugins.seo = function setIronRouterSeoDefaults(router, options) {
	if (options == null) {
		options = {};
	}
	const defaults = options.defaults || {};
	const defaultTitle = (function () {
		const title = defaults.title;
		if (!title || title === '') {
			return '';
		}
		if (Match.test(title, Function)) {
			return title();
		}
		if (Match.test(title, Match.ObjectIncluding({
			text: String,
		}))) {
			return title.text;
		}
		return title;
	}());
	Meta.config({
		options: {
			title: defaultTitle,
		},
	});
	// update from ben:
	// Headers are not updating when an actual route stays the same but the path changes.
	// Seems like that was due to the 'once' check. Removing it - re-setting headers shouldnt be a big deal?
	// Update 11-1-2019 - I found that headers were being unset when route computations were re-run. Need to explore a better solution for this one day.
	let runWhenReady;
	if (defaults.skipOnceCheck) {
		runWhenReady = onReadyCheck(_.partial(run, defaults));
	} else {
		runWhenReady = onReadyCheck(onceCheck(_.partial(run, defaults)));
	}
	const routeOptions = _.pick(options, 'only', 'except');
	router.onAfterAction(runWhenReady, routeOptions);
	return router.onStop(function () {
		return Computations.clear();
	});
};
