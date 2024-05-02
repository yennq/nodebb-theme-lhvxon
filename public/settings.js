'use strict';

define('forum/account/theme', ['forum/account/header', 'storage', 'settings', 'alerts'], function (header, Storage, settings, alerts) {
	const Theme = {};

	Theme.init = () => {
		header.init();
		Theme.setupForm();
	};

	Theme.setupForm = () => {
		const saveEl = document.getElementById('save');
		const formEl = document.getElementById('theme-settings');
		const [sidebarSwapped, autohideNavbarEnvs] = [
			!!Storage.getItem('lhvxon:menus:legacy-layout'),
			Storage.getItem('lhvxon:navbar:autohide'),
		];

		document.getElementById('lhvxon:menus:legacy-layout').checked = sidebarSwapped;
		try {
			const parsed = JSON.parse(autohideNavbarEnvs) || ['xs', 'sm'];
			parsed.forEach((env) => {
				const optionEl = document.getElementById('lhvxon:navbar:autohide').querySelector(`option[value="${env}"]`);
				optionEl.selected = true;
			});
		} catch (e) {
			console.warn(e);
		}

		if (saveEl) {
			saveEl.addEventListener('click', () => {
				const themeSettings = settings.helper.serializeForm($(formEl));
				Object.keys(themeSettings).forEach((key) => {
					if (key === 'lhvxon:menus:legacy-layout') {
						if (themeSettings[key] === 'on') {
							Storage.setItem('lhvxon:menus:legacy-layout', 'true');
						} else {
							Storage.removeItem('lhvxon:menus:legacy-layout');
						}

						return;
					}

					Storage.setItem(key, themeSettings[key]);
				});

				alerts.success('[[success:settings-saved]]');
			});
		}
	};

	return Theme;
});
