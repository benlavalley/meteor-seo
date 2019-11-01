import { Tracker } from 'meteor/tracker';

export const share = {};

share.RouterUtils = {
	once(fn) {
		return function () {
			let ran;
			ran = this.hasRunOnceFunctions = this.hasRunOnceFunctions || [];
			if (!_.contains(ran, fn)) {
				fn.call(this);
				return ran.push(fn);
			}
		};
	},
	onReady(fn) {
		return function () {
			if (!this.ready()) {
				return;
			}
			return Tracker.afterFlush(fn.bind(this));
		};
	},
};
