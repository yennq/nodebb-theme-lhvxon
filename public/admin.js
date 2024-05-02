'use strict';

define('admin/plugins/lhvxon', ['settings'], function (Settings) {
	var ACP = {};

	ACP.init = function () {
		Settings.load('lhvxon', $('.lhvxon-settings'));

		$('#save').on('click', function () {
			Settings.save('lhvxon', $('.lhvxon-settings'));
		});
	};

	return ACP;
});
