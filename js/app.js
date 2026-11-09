'use strict';

function domCta() {
	// DOM CTA Style
	const ctas = document.querySelectorAll('.cta');

	const ctaBaseClasses = ['cta', 'py-2', 'text-decoration-none', 'text-uppercase', 'd-inline-flex', 'align-items-center', 'rounded-3'];

	ctas.forEach((cta) => {
		cta.classList.add(...ctaBaseClasses, 'px-3');
	});
}

function fadeInSec() {
	// Fade-In Animation
	const fadeInEle = document.querySelectorAll('.fade-in');
	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					entry.target.classList.add('visible');
					observer.unobserve(entry.target);
				}
			});
		},
		{ threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
	);

	fadeInEle.forEach((ele) => observer.observe(ele));
}

function trackHeaderHeight() {
	// Sticky header: expose its height so the sticky help bar and anchor offsets sit beneath it
	const header = document.getElementById('header');

	if (!header) return;

	const setHeight = () => document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');

	setHeight();
	new ResizeObserver(setHeight).observe(header);
}

function settleHashScroll() {
	// Arriving on /services/#section: the browser scrolls at load, then lazy images and the fade-in slide shift the layout. Re-scroll once things settle, unless the visitor has already started scrolling.
	const target = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;

	if (!target) return;

	let userScrolled = false;
	['wheel', 'touchmove', 'keydown', 'mousedown'].forEach((evt) => window.addEventListener(evt, () => (userScrolled = true), { once: true, passive: true }));

	const settle = () => {
		if (!userScrolled) target.scrollIntoView({ behavior: 'instant' });
	};

	window.addEventListener('load', () => setTimeout(settle, 150));
	setTimeout(settle, 900);
}

document.addEventListener('DOMContentLoaded', () => {
	trackHeaderHeight();
	settleHashScroll();
	fadeInSec();
	domCta();
});
