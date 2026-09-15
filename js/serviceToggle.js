function serviceToggle() {
	const breakpoint = 992;
	const serviceNames = document.querySelectorAll('#whatWeDo .list-do .service-name');
	const serviceWraps = document.querySelectorAll('#whatWeDo .service-wrap');
	const mobileServiceNames = document.querySelectorAll('#whatWeDo .service-wrap > .service-name');
	const firstService = serviceWraps[0]?.dataset.service;
	let activeService = document.querySelector('#whatWeDo .service-wrap.active')?.dataset.service || firstService;

	function setActiveService(service) {
		activeService = service;

		serviceNames.forEach((item) => {
			item.classList.toggle('active', item.dataset.service === service);
		});

		serviceWraps.forEach((wrap) => {
			wrap.classList.toggle('active', wrap.dataset.service === service);
		});
	}

	function closeAllServices() {
		serviceNames.forEach((item) => {
			item.classList.remove('active');
		});

		serviceWraps.forEach((wrap) => {
			wrap.classList.remove('active');
		});

		activeService = null;
	}

	serviceNames.forEach((serviceName) => {
		serviceName.addEventListener('click', function () {
			if (window.innerWidth < breakpoint) return;

			setActiveService(this.dataset.service);
		});
	});

	mobileServiceNames.forEach((serviceName) => {
		serviceName.addEventListener('click', function () {
			if (window.innerWidth >= breakpoint) return;

			const wrap = this.closest('.service-wrap');

			if (!wrap) return;

			const service = wrap.dataset.service;
			const isOpen = wrap.classList.contains('active');

			if (isOpen) {
				closeAllServices();
			} else {
				setActiveService(service);
			}
		});
	});

	let wasDesktop = window.innerWidth >= breakpoint;

	window.addEventListener('resize', function () {
		const isDesktop = window.innerWidth >= breakpoint;

		if (isDesktop === wasDesktop) return;

		wasDesktop = isDesktop;

		if (isDesktop) {
			setActiveService(activeService || firstService);
		} else if (activeService) {
			setActiveService(activeService);
		} else {
			closeAllServices();
		}
	});

	if (window.innerWidth >= breakpoint) {
		setActiveService(activeService || firstService);
	} else if (activeService) {
		setActiveService(activeService);
	}

	const helpLinks = document.querySelectorAll('#ourHelp .our-help__list a[href]');
	const helpSelect = document.querySelector('#ourHelp .select-help');
	const helpSelectText = helpSelect?.querySelector('.text');
	const helpSelectOption = document.querySelector('#ourHelp .select-help-option');

	if (!helpLinks.length && !helpSelect) return;

	function setActiveHelpLink(hash) {
		if (!hash) return;
		helpLinks.forEach((link) => {
			const isActive = link.getAttribute('href') === hash;
			link.classList.toggle('active', isActive);
			if (isActive && helpSelectText) {
				helpSelectText.textContent = link.textContent.trim();
			}
		});
	}

	if (window.location.hash) {
		setActiveHelpLink(window.location.hash);
	}

	window.addEventListener('hashchange', function () {
		setActiveHelpLink(window.location.hash);
	});

	helpLinks.forEach((link) => {
		link.addEventListener('click', function () {
			const hash = this.getAttribute('href');
			setActiveHelpLink(hash);

			if (window.innerWidth < breakpoint && helpSelectOption && helpSelect) {
				helpSelectOption.classList.add('d-none');
				helpSelectOption.classList.remove('d-flex');
				helpSelect.classList.remove('clicked');
			}
		});
	});

	if (helpSelect && helpSelectOption) {
		helpSelect.addEventListener('click', function () {
			if (window.innerWidth >= breakpoint) return;
			const isOpening = helpSelectOption.classList.contains('d-none');
			helpSelectOption.classList.toggle('d-none', !isOpening);
			helpSelectOption.classList.toggle('d-flex', isOpening);
			this.classList.toggle('clicked', isOpening);
		});

		document.addEventListener('click', function (e) {
			if (window.innerWidth >= breakpoint) return;
			if (!helpSelect.contains(e.target) && !helpSelectOption.contains(e.target)) {
				helpSelectOption.classList.add('d-none');
				helpSelectOption.classList.remove('d-flex');
				helpSelect.classList.remove('clicked');
			}
		});

		function updateHelpSelect() {
			if (window.innerWidth >= breakpoint) {
				helpSelectOption.classList.remove('d-none');
				helpSelectOption.classList.add('d-flex');
				helpSelect.classList.remove('clicked');
			} else {
				helpSelectOption.classList.add('d-none');
				helpSelectOption.classList.remove('d-flex');
				helpSelect.classList.remove('clicked');
			}
		}

		updateHelpSelect();
		window.addEventListener('resize', updateHelpSelect);
	}
}

serviceToggle();
