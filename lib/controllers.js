'use strict';

const accountHelpers = require.main.require('./src/controllers/accounts/helpers');
const helpers = require.main.require('./src/controllers/helpers');

const Controllers = module.exports;

Controllers.renderAdminPage = (req, res) => {
	res.render('admin/plugins/lhvxon', {
		title: 'LHVXON Theme',
	});
};

Controllers.renderThemeSettings = async (req, res, next) => {
	const userData = await accountHelpers.getUserDataByUserSlug(req.params.userslug, req.uid, req.query);
	if (!userData) {
		return next();
	}

	userData.title = '[[themes/lhvxon:settings.title]]';
	userData.breadcrumbs = helpers.buildBreadcrumbs([{ text: userData.username, url: `/user/${userData.userslug}` }, { text: '[[themes/lhvxon:settings.title]]' }]);

	res.render('account/theme', userData);
};
