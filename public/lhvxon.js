'use strict';

$(document).ready(function () {
	setupNProgress();
	setupTaskbar();
	setupEditedByIcon();
	setupMobileMenu();
	configureNavbarHiding();

	$(window).on('resize', utils.debounce(configureNavbarHiding, 200));
	$(window).on('resize', updatePanelOffset);

	function updatePanelOffset() {
		const header = document.getElementById('header-menu');

		if (!header) {
			console.warn('[lhvxon/updatePanelOffset] Could not find #header-menu, panel offset unchanged.');
			return;
		}

		const rect = header.getBoundingClientRect();
		const offset = Math.max(0, rect.bottom);
		document.documentElement.style.setProperty('--panel-offset', `${offset}px`);
	}

	var lastBSEnv = '';
	function configureNavbarHiding() {
		if (!$.fn.autoHidingNavbar) {
			return;
		}

		require(['hooks', 'storage'], (hooks, Storage) => {
			let preference = ['xs', 'sm'];

			try {
				preference = JSON.parse(Storage.getItem('lhvxon:navbar:autohide')) || preference;
			} catch (e) {
				console.warn('[lhvxon/settings] Unable to parse value for navbar autohiding');
			}
			var env = utils.findBootstrapEnvironment();
			// if env didn't change don't destroy and recreate
			if (env === lastBSEnv) {
				return;
			}
			lastBSEnv = env;
			var navbarEl = $('[component="navbar"]');
			navbarEl.autoHidingNavbar('destroy').removeData('plugin_autoHidingNavbar');
			navbarEl.css('top', '');

			hooks
				.on('filter:navigator.scroll', (data) => {
					navbarEl.autoHidingNavbar('setDisableAutohide', true);
					return data;
				})
				.on('action:navigator.scrolled', () => {
					navbarEl.autoHidingNavbar('setDisableAutohide', false);
				});

			hooks.fire('filter:lhvxon.configureNavbarHiding', {
				resizeEnvs: preference,
			}).then(({ resizeEnvs }) => {
				if (resizeEnvs.includes(env)) {
					navbarEl.autoHidingNavbar({
						showOnBottom: false,
					});
				}

				function fixTopCss(topValue) {
					if (ajaxify.data.template.topic) {
						$('.topic .topic-header').css({ top: topValue });
					} else {
						var topicListHeader = $('.topic-list-header');
						if (topicListHeader.length) {
							topicListHeader.css({ top: topValue });
						}
					}
				}

				navbarEl.off('show.autoHidingNavbar')
					.on('show.autoHidingNavbar', function () {
						fixTopCss('');
					});

				navbarEl.off('hide.autoHidingNavbar')
					.on('hide.autoHidingNavbar', function () {
						fixTopCss('0px');
					});
			});
		});
	}

	function setupNProgress() {
		require(['nprogress'], function (NProgress) {
			if (typeof NProgress === 'undefined') {
				return;
			}

			$(window).on('action:ajaxify.start', function () {
				NProgress.set(0.7);
			});

			$(window).on('action:ajaxify.end', function (ev, data) {
				NProgress.done();
				setupHoverCards();

				if (data.url && data.url.match('user/')) {
					setupFavouriteButtonOnProfile();
				}
			});
		});
	}

	function setupTaskbar() {
		require(['lhvxon/taskbar'], function (taskbar) {
			taskbar.init();
		});
	}

	function setupEditedByIcon() {
		function activateEditedTooltips() {
			$('[data-pid] [component="post/editor"]').each(function () {
				var el = $(this);
				var icon;

				if (!el.attr('data-editor')) {
					return;
				}

				icon = el.closest('[data-pid]').find('.edit-icon').first();
				icon.prop('title', el.text()).tooltip().removeClass('hidden');
			});
		}

		$(window).on('action:posts.edited', function (ev, data) {
			var parent = $('[data-pid="' + data.post.pid + '"]');
			var icon = parent.find('.edit-icon').filter(function (index, el) {
				return parseInt($(el).closest('[data-pid]').attr('data-pid'), 10) === parseInt(data.post.pid, 10);
			});
			var el = parent.find('[component="post/editor"]').first();
			icon.prop('title', el.text()).tooltip().removeClass('hidden');
		});

		$(window).on('action:topic.loaded', activateEditedTooltips);
		$(window).on('action:posts.loaded', activateEditedTooltips);
	}

	function setupMobileMenu() {
		require(['lhvxon/mobile-menu'], function (mobileMenu) {
			mobileMenu.init();
		});
	}

	function setupHoverCards() {
		require(['components'], function (components) {
			components.get('topic')
				.on('click', '[component="user/picture"],[component="user/status"]', generateUserCard);
		});

		$(window).on('action:posts.loading', function (ev, data) {
			for (var i = 0, ii = data.posts.length; i < ii; i++) {
				(ajaxify.data.topics || ajaxify.data.posts)[data.posts[i].index] = data.posts[i];
			}
		});
	}

	function generateUserCard(ev) {
		var avatar = $(this);
		var uid = avatar.parents('[data-uid]').attr('data-uid');
		var data = (ajaxify.data.topics || ajaxify.data.posts);

		for (var i = 0, ii = data.length; i < ii; i++) {
			if (parseInt(data[i].uid, 10) === parseInt(uid, 10)) {
				data = data[i].user;
				break;
			}
		}

		$('.lhvxon-usercard').remove();

		if (parseInt(data.uid, 10) === 0) {
			return false;
		}

		socket.emit('user.isFollowing', { uid: data.uid }, function (err, isFollowing) {
			if (err) {
				return err;
			}

			app.parseAndTranslate('modules/usercard', data, function (html) {
				var card = $(html);
				avatar.parents('a').after(card.hide());

				if (parseInt(app.user.uid, 10) === parseInt(data.uid, 10) || !app.user.uid) {
					card.find('.btn-morph').hide();
				} else {
					setupFavouriteMorph(card, data.uid, data.username);

					if (isFollowing) {
						$('.btn-morph').addClass('heart');
					} else {
						$('.btn-morph').addClass('plus');
					}
				}

				setupCardRemoval(card);
				card.fadeIn();
			});
		});

		ev.preventDefault();
		return false;
	}

	function setupFavouriteButtonOnProfile() {
		setupFavouriteMorph($('[component="account/cover"]'), ajaxify.data.uid, ajaxify.data.username);
	}

	function setupCardRemoval(card) {
		function removeCard(ev) {
			if ($(ev.target).closest('.lhvxon-usercard').length === 0) {
				card.fadeOut(function () {
					card.remove();
				});

				$(document).off('click', removeCard);
			}
		}

		$(document).on('click', removeCard);
	}

	function setupFavouriteMorph(parent, uid, username) {
		require(['api', 'alerts'], function (api, alerts) {
			parent.find('.btn-morph').click(function (ev) {
				var type = $(this).hasClass('plus') ? 'follow' : 'unfollow';
				var method = $(this).hasClass('plus') ? 'put' : 'del';

				api[method]('/users/' + uid + '/follow').then(() => {
					alerts.success('[[global:alert.' + type + ', ' + username + ']]');
				});

				$(this).toggleClass('plus').toggleClass('heart');
				$(this).translateAttr('title', type === 'follow' ? '[[global:unfollow]]' : '[[global:follow]]');

				if ($(this).find('b.drop').length === 0) {
					$(this).prepend('<b class="drop"></b>');
				}

				var drop = $(this).find('b.drop').removeClass('animate');
				var x = ev.pageX - (drop.width() / 2) - $(this).offset().left;
				var y = ev.pageY - (drop.height() / 2) - $(this).offset().top;

				drop.css({ top: y + 'px', left: x + 'px' }).addClass('animate');
			});
		});
	}

	// yennq thêm chút chỉnh sửa
	'use strict';function _0x200e(){var _0x364dd6=['addClass','done','7zcjleh','exec','.images-slide\x20a','each','2faktZt','7858836zpCMiX','when','2749208hsbIcv','appendTo','1167825KcgNAD','remove','<iframe\x20src=\x22https://www.facebook.com/plugins/video.php?href=','match','.posts\x20.card-body\x20li,\x20.posts-list\x20.card-body\x20li,\x20.posts\x20.content\x20li,\x20.posts-list\x20.content\x20li','fb-watch','4454538imzCXk','.posts\x20.post-content\x20a,\x20.posts\x20.content\x20a','2014326EHWLsP','parent','<iframe\x20width=\x22640\x22\x20height=\x22360\x22\x20src=\x22https://www.youtube.com/embed/','img','5681040YgygWs','length','fb-video','\x22\x20frameborder=\x220\x22\x20allowfullscreen></iframe>','\x22\x20data-video-id=\x22','my-3\x20','videos','querySelectorAll','my-3\x20youtube-video','<blockquote\x20class=\x22tiktok-embed\x22\x20cite=\x22','href','images-slide','.images-slide','fb-tiktok','find','html','<div>','733252cWOemQ'];_0x200e=function(){return _0x364dd6;};return _0x200e();}(function(_0x48cb34,_0x2c21d3){var _0x17fce3=_0x209b,_0x59634d=_0x48cb34();while(!![]){try{var _0x56f285=parseInt(_0x17fce3(0x19e))/0x1+-parseInt(_0x17fce3(0x1a5))/0x2*(-parseInt(_0x17fce3(0x1b2))/0x3)+-parseInt(_0x17fce3(0x1a8))/0x4+parseInt(_0x17fce3(0x1aa))/0x5+-parseInt(_0x17fce3(0x1b0))/0x6*(parseInt(_0x17fce3(0x1a1))/0x7)+-parseInt(_0x17fce3(0x1b6))/0x8+parseInt(_0x17fce3(0x1a6))/0x9;if(_0x56f285===_0x2c21d3)break;else _0x59634d['push'](_0x59634d['shift']());}catch(_0x144279){_0x59634d['push'](_0x59634d['shift']());}}}(_0x200e,0x5ab98));function _0x209b(_0x57a879,_0x276879){var _0x200eeb=_0x200e();return _0x209b=function(_0x209b26,_0x387090){_0x209b26=_0x209b26-0x195;var _0x15314d=_0x200eeb[_0x209b26];return _0x15314d;},_0x209b(_0x57a879,_0x276879);}$(function(){$(window)['on']('action:ajaxify.end',function(_0x4327f6,_0x55c7c2){var _0x263727=_0x209b;$(_0x263727(0x1b1))[_0x263727(0x1a4)](function(_0x345041){var _0x359af6=_0x263727;if(this[_0x359af6(0x197)][_0x359af6(0x1ad)](/youtube\.com/)&&(this[_0x359af6(0x197)][_0x359af6(0x1ad)](/watch/)||this['href'][_0x359af6(0x1ad)](/embed/)||this[_0x359af6(0x197)][_0x359af6(0x1ad)](/shorts/))){var _0x19da0a=/(youtu.*be.*)\/(watch\?v=|embed\/|v|shorts|)(.*?((?=[&#?])|$))/gm,_0x2b1724=_0x19da0a[_0x359af6(0x1a2)](this[_0x359af6(0x197)])[0x3],_0x32e6a8=_0x359af6(0x1b4)+_0x2b1724+_0x359af6(0x1b9);$(_0x359af6(0x19d),{'class':_0x359af6(0x195)})['appendTo']($(this)[_0x359af6(0x1b3)]())['html'](_0x32e6a8),this['remove']();}else{if(this[_0x359af6(0x197)][_0x359af6(0x1ad)](/facebook\.com/)&&(this[_0x359af6(0x197)][_0x359af6(0x1ad)](/watch/)||this[_0x359af6(0x197)][_0x359af6(0x1ad)](/videos/)||this[_0x359af6(0x197)][_0x359af6(0x1ad)](/reel/))){var _0x32e6a8=_0x359af6(0x1ac)+this[_0x359af6(0x197)]+'&show_text=false&appId=496947783657177\x22\x20scrolling=\x22no\x22\x20frameborder=\x220\x22\x20allowfullscreen=\x22true\x22\x20allow=\x22autoplay;\x20clipboard-write;\x20encrypted-media;\x20picture-in-picture;\x20web-share\x22\x20allowFullScreen=\x22true\x22></iframe>',_0x29e58c=_0x359af6(0x1b8);if(this[_0x359af6(0x197)]['indexOf'](_0x359af6(0x1bc))>=0x0)_0x29e58c='fb-video';else this[_0x359af6(0x197)]['indexOf']('watch')>=0x0?_0x29e58c=_0x359af6(0x1af):_0x29e58c='fb-reel';$(_0x359af6(0x19d),{'class':_0x359af6(0x1bb)+_0x29e58c})[_0x359af6(0x1a9)]($(this)[_0x359af6(0x1b3)]())[_0x359af6(0x19c)](_0x32e6a8),this[_0x359af6(0x1ab)]();}else{if(this['href'][_0x359af6(0x1ad)](/tiktok\.com/)&&this[_0x359af6(0x197)][_0x359af6(0x1ad)](/video/)){var _0x19da0a=/^.*https:\/\/(?:m|www|vm)?\.?tiktok\.com\/((?:.*\b(?:(?:usr|v|embed|user|video)\/|\?shareId=|\&item_id=)(\d+))|\w+)/,_0x2b1724=_0x19da0a['exec'](this[_0x359af6(0x197)])[0x2],_0x32e6a8=_0x359af6(0x196)+this[_0x359af6(0x197)]+_0x359af6(0x1ba)+_0x2b1724+'\x22\x20style=\x22max-width:\x20605px;min-width:\x20325px;\x22\x20>\x20<section></section>\x20</blockquote>',_0x29e58c=_0x359af6(0x19a);$(_0x359af6(0x19d),{'class':_0x359af6(0x1bb)+_0x29e58c})['appendTo']($(this)[_0x359af6(0x1b3)]())[_0x359af6(0x19c)](_0x32e6a8),this[_0x359af6(0x1ab)]();}}}});var _0x42d61f=$(_0x263727(0x1ae));_0x42d61f[_0x263727(0x1b7)]>=0x2&&$[_0x263727(0x1a7)](_0x42d61f[_0x263727(0x1a4)](function(_0x81bdba){var _0x4d9885=_0x263727;$(this)[_0x4d9885(0x19b)](_0x4d9885(0x1b5))[_0x4d9885(0x1b7)]&&$(this)['closest']('ul')[_0x4d9885(0x19f)](_0x4d9885(0x198));}))[_0x263727(0x1a0)](function(){var _0x105208=_0x263727,_0x4fce2a=document[_0x105208(0x1bd)](_0x105208(0x199));imagesLoaded(_0x4fce2a,function(){var _0x117203=_0x105208,_0x30a78f=document['querySelector'](_0x117203(0x199)),_0x32c833=new Masonry(_0x30a78f,{'width':0xc8,'itemSelector':'li','gutter':0xa,'isResizable':!![]});new SimpleLightbox({'elements':_0x117203(0x1a3)});});});});});
});
