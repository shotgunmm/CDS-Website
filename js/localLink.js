const ladingPageAvailable = false;

document.addEventListener('DOMContentLoaded', () => {
	localPagesAvailable();
});

function localPagesAvailable() {
	const isLocal = window.location.host === '127.0.0.1:5500' || window.location.hostname === 'localhost';

	const linkStatusIcons = document.querySelectorAll('#siteNav .icon-status');

	// Update brand link on local
	const brandLink = document.querySelector('#header .brand a');

	if (isLocal) {
		document.documentElement.classList.add('is-local');
	}

	if (brandLink && isLocal) {
		brandLink.setAttribute('href', '/');
	}

	// append new li > a
	const headerNav = document.querySelector('#header #siteNav .nav');

	// console.log(headerNav);

	if (headerNav && ladingPageAvailable) {
		const li = document.createElement('li');
		// li.className = 'ms-auto';

		const newLink = document.createElement('a');
		newLink.className = 'text-decoration-none';
		newLink.href = 'landing.html';
		newLink.textContent = 'Landing';

		li.appendChild(newLink);
		headerNav.appendChild(li);
	}

	// Disable links when NOT local
	if (!isLocal) {
		// disableLinks('#siteNav li a');
		linkStatusIcons.forEach((icon) => icon.remove());
	}
}

function disableLinks(selector) {
	document.querySelectorAll(selector).forEach((link) => {
		link.setAttribute('href', '#');
	});
}
