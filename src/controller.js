const {TelegramBaseController} = require('telegram-node-bot');
const rp = require('request-promise');

const {SERVICE_HOST, URL_CITIES, URL_TICKETS} = process.env;
const REQUEST_INTERVAL = 10 * 1000; //10s

const getTerms = $ => $.message.text.split(/\s+/).slice(1);

class Controller extends TelegramBaseController {
	constructor(storage) {
		super();
		this.storage = storage;
	}

	_fetchCities(term) {
		const url = `${SERVICE_HOST}/en/${URL_CITIES}?term=${term}`;
		return rp(url).then(res => {
			let cities = [];
			try {
				cities = JSON.parse(res);
			}
			catch(e) { }
			return cities;
		});
	}

	monitor($) {
		const parseNotification = key => ({from, to, date}) => {
			const uri = `${SERVICE_HOST}/en/${URL_TICKETS}`;
			const form = {station_id_from: from.value, station_id_till: to.value, date_dep: date};
			rp({method: 'POST', uri, form})
			.then(res => {
				if (res.error && res.value) {
					return $.sendMessage(key, res.value);
				}
				console.log(res);
			})
			.catch(err => $.sendMessage(err));
		};
		const keys = this.storage.keys();
		keys.forEach(key => {
			this.storage.getItem(key).then(notifications => {
				notifications.forEach(parseNotification(key));
			});
		});
		$.sendMessage('callback is called');
	}

	getCities($) {
		const term = getTerms($)[0];
		if (!term || term < 2) {
			return $.sendMessage('Please, enter at least two letters of your city');
		}
		this._fetchCities(term).then(cities => {
			$.sendMessage(`Available cities:\n${cities.map(c => c.title).join('\n') || '-'}`);
		});
	}

	updateNotifications($) {
		const [from, to, date] = getTerms($);
		if (!from || !to || !date) {
			return $.sendMessage('Please, enter all necessary arguments. \nFor example, /tickets Kyiv Odesa 12/01/2017');
		}
		Promise.all([
			this._fetchCities(from),
			this._fetchCities(to),
		])
		.then(([fromList, toList]) => {
			if (fromList.length > 0 && toList.length > 0) {
				const from = fromList[0];
				const to = toList[0];
				const notifications = this.storage.getItemSync($.message.chat.id) || [];
				this.storage.setItem(`${$.message.chat.id}`, [...notifications, {from, to, date: date.replace(/\./g, '/')}])
				.then(() => this.getNotifications($));
			} else {
				return $.sendMessage('Cannot detect city, please use /cities command to be sure, that you provide city correctly');
			}
		})
		.catch(err => {
			console.error(err);
		});
	}

	getNotifications($) {
		const notifications = this.storage.getItemSync($.message.chat.id) || [];
		const content = notifications.map(({from, to, date}, i) => ({
			text: `\u274C ${from.title} \u27A1 ${to.title} \uD83D\uDCC5 ${date}`, //text of the button
			callback: () => {
				this.storage.setItem(`${$.message.chat.id}`, [
					...notifications.slice(0, i),
					...notifications.slice(i + 1)
				])
				.then(() => this.getNotifications($));
			}
		}));
		$.runInlineMenu({
				method: 'sendMessage', //here you must pass the method name
				params: ['Your Notifications:'],
				menu: content
		});
	}

	get routes() {
		return {
			'citiesHandler': 'getCities',
			'ticketsHandler': 'updateNotifications',
			'notificationsHandler': 'getNotifications',
			'monitorHandler': 'monitor',
		};
	}
}

module.exports = Controller;