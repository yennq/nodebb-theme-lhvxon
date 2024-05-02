<!-- IMPORT partials/account/header.tpl -->

<p>[[themes/lhvxon:settings.intro]]</p>

<hr />

<form id="theme-settings" role="form">
	<div class="form-check mb-3">
		<input class="form-check-input" type="checkbox" id="lhvxon:menus:legacy-layout" name="lhvxon:menus:legacy-layout">
		<label class="form-check-label" for="lhvxon:menus:legacy-layout">[[themes/lhvxon:settings.mobile-menu-side]]</label>
	</div>

	<div class="mb-3">
		<label for="lhvxon:navbar:autohide">[[themes/lhvxon:settings.autoHidingNavbar]]</label>
		<select multiple class="form-control" name="lhvxon:navbar:autohide" id="lhvxon:navbar:autohide">
			<option value="xs">[[themes/lhvxon:settings.autoHidingNavbar-xs]]</option>
			<option value="sm">[[themes/lhvxon:settings.autoHidingNavbar-sm]]</option>
			<option value="md">[[themes/lhvxon:settings.autoHidingNavbar-md]]</option>
			<option value="lg">[[themes/lhvxon:settings.autoHidingNavbar-lg]]</option>
		</select>
	</div>

	<button id="save" type="button" class="btn btn-primary">[[global:save-changes]]</button>
</form>

<!-- IMPORT partials/account/footer.tpl -->