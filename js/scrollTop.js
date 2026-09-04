window.addEventListener('load', function () {
	const path = document.querySelector('.scroll-top .path');
	if (!path) return;

	const pathLength = path.getTotalLength();

	path.style.transition = 'none';
	path.style.strokeDasharray = pathLength;
	path.style.strokeDashoffset = pathLength;

	function updateScroll() {
		const scroll = window.scrollY || window.pageYOffset;
		const docHeight = document.documentElement.scrollHeight;
		const winHeight = window.innerHeight;
		const scrollable = docHeight - winHeight;

		if (scrollable <= 0) {
			path.style.strokeDashoffset = pathLength;
			return;
		}

		const progress = pathLength - (scroll * pathLength) / scrollable;
		path.style.strokeDashoffset = progress;

		// console.log('Scroll:', scroll);
		// console.log('Document Height:', docHeight);
		// console.log('Window Height:', winHeight);
		// console.log('Scrollable:', scrollable);
		// console.log('Progress:', progress);
	}

	updateScroll();

	window.addEventListener('scroll', function () {
		updateScroll();

		const scrollTop = document.querySelector('.scroll-top');
		if (!scrollTop) return;

		if (window.scrollY > 50) {
			scrollTop.classList.add('active-progress');
		} else {
			scrollTop.classList.remove('active-progress');
		}
	});

	const scrollTop = document.querySelector('.scroll-top');
	if (scrollTop) {
		scrollTop.addEventListener('click', function (e) {
			e.preventDefault();
			window.scrollTo({ top: 0, behavior: 'smooth' });
		});
	}
});
