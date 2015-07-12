var Timer = new Class({
	initialize: function(element, options) {
		this.element = $(element);
		this.options = options || {};

		this._events = new EventList();
		this._recent = new RecentTasks('js-recent-tasks', {
			onClick: function(name) {
				var input = this.element.getElement('input[type=text]');
				input.value = name;
			}.bind(this)
		});

		this.element.getElement('form').addEvent('submit', function(e) {
			var input = $(e.target).getElement('input[type=text]');
			var name = input.value;
			this.startEvent(name.trim());
			input.value = '';
			return false;
		}.bind(this));

		$('js-clear').addEvent('click', function() {
			this.reset();
		}.bind(this));

		$('js-stop').addEvent('click', function() {
			this.stop();
		}.bind(this));

		this._eventTable = this._createEventTable();
		this._summaryTable = this._createSummaryTable();
		this._updateDisplay.periodical(500, this);

		this.load();
	},

	_createEventTable: function() {
		var table = new JsTable('js-event-table', {empty_message: 'enter a task name and click start...'});
		
		table.addColumn('name');
		table.addColumn('start');
		table.addColumn('end');
		table.addColumn('length');

		return table;
	},

	_createSummaryTable: function() {
		var table = new JsTable('js-summary-table', {empty_message: '...'});
		
		table.addColumn('name');
		table.addColumn('length');

		// there should really be a method on the jstable to allow
		// the adding of more headers.
		//
		// The whle jstable is actually not as good as I thought it was
		// when I fist developed it. I'm kind of embarrased now...
		$e('tr', {
			children: $e('th', {
				colspan: 2,
				text: 'summary'
			}) 
		}).inject(table.element.getElement('thead'), 'top');

		return table;
	},

	_updateDisplay: function() {
		var e = this._events.current();

		if(!e) {
			$('js-duration').innerHTML = '00:00:00';
			$('js-event-name').innerHTML = '';
			$('js-total-duration').innerHTML = 'total: 00:00'
			return;
		}

		this._updateEventRow(e);
		$('js-duration').innerHTML = e.durationString();
		$('js-event-name').innerHTML = e.name();
		$('js-total-duration').innerHTML = 'total: ' + DateHelper.asDuration(this._events.totalDuration(), 'S');

		if(e.isNewMinute()) {
			this._reloadSummaryTable();
		}
	},

	startEvent: function(name) {
		if(!name || name.trim() == '') {
			this.flash();
			return;
		}

		var previous = this._events.current();
		var e = this._events.startNew(name);

		if(previous) {
			this._updateEventRow(previous);
		}

		this._addEventRow(e);
		this._recent.add(e.name());
		$('js-event-name').innerHTML = e.name();

		this._reloadSummaryTable();
		this.save();
	},

	stop: function() {
		this._events.stop();
	},

	_addEventRow: function(e) {
		var start = DateHelper.asTime(e.start());
		var end = e.end() == null ? '-' :   DateHelper.asTime(e.end());
		var length = e.durationString('S');
		this._eventTable.addRow(e.name(), start, end, length);
	},

	_addSummaryRow: function(e) {
		var length = DateHelper.asDuration(e.duration, 'S');
		this._summaryTable.addRow(e.name, length);
	},

	// just assume we are updating the final row.
	// also assume the name and the start time can't change, only the 
	// end and duration
	_updateEventRow: function(e) {
		var end = e.end() == null ? '-' : DateHelper.asTime(e.end());
		var length = e.durationString('S');
		var row_id = this._eventTable.rowCount() - 1;
		
		this._eventTable.setCell(row_id, 'end', end);
		this._eventTable.setCell(row_id, 'length', length);
	},

	flash: function() {
		var input = this.element.getElement('input[type=text]');
		input.setStyle('background-color', 'pink');
		(function() { input.setStyle('background-color', ''); }).delay(500);
	},

	// save to a cookie
	save: function() {
		this._recent.save();
		this._events.save();
	},

	load: function() {
		this._events.load();
		this._recent.load();
		this._reloadEventTable();
		this._reloadSummaryTable();
		this._updateDisplay();
	},

	reset: function() {
		this._events.reset();

		this._reloadEventTable();
		this._reloadSummaryTable();
		this._updateDisplay();
		this.save();
	},

	_reloadEventTable: function() {
		this._eventTable.clear();
		this._events.each(function(e) {
			this._addEventRow(e);
		}.bind(this));
	},

	_reloadSummaryTable: function() {
		this._summaryTable.clear();
		this._events.summarize().each(function(e) {
			this._addSummaryRow(e);
		}.bind(this));
	}
});

var EventList = new Class({
	Implements: CookiePersist, 
	initialize: function() {
		this._data = [];
		this._cookie_id = 'events';
	},

	startNew: function(name) {
		name = name || 'none';

		if(this.current() != null)
			this.current().finish();

		var e = new Event({name: name});
		this._data.push(e);
		return e;
	},

	stop: function() {
		if(this.current() != null) {
			this.current().finish();
			this.save();
		}

		return this;
	},

	current: function() {
		if(!this._data || this._data.length == 0)
			return null;

		return this._data[this._data.length - 1];
	},

	each: function(fn) {
		return Array.each(this._data || [], fn);
	},

	// reset the list based off some saved data
	fromObject: function(data) {
		data = data || [];
		this._data = data.map(function(item) {
			var e = new Event();
			e.fromObject(item);
			return e;
		});

		return this;
	},

	toObject: function() {
		return this._data.map(function(e) {
			return e.toObject();
		});
	},

	reset: function() {
		this.fromObject([]);
	},

	totalDuration: function() {
		if(!this._data) {
			return 0;
		}

		return Date.now() - this._data[0].start();
	},
	
	summarize: function() {
		var result = {};

		this._data.each(function(e) {
			result[e.name()] = (result[e.name()] || 0) + e.duration();
		});

		result = Object.map(result, function(v, k) {
			return {name: k, duration: v};
		});

		return Object.values(result).sort(function(a,b) { return b.duration - a.duration; });
	}
});



var DateHelper = {
	asTime: function(t) {
		d = new Date(t);
		return d.getHours().pad() + ':' + d.getMinutes().pad();
	},

	asDuration: function(t, format) {
		format = format || 'L'; // L | S

		var ms = t;
		var ts = ms / 1000;
		var tm = ts / 60;
		var th = tm / 60;

		var h = Math.floor(th);
		var m = Math.floor(tm % 60);
		var s = Math.floor(ts % 60);

		var result = h.pad() + ':' + m.pad();

		if(format == 'L')
			result +=':' + s.pad();

		return  result;
	}
};

var RecentTasks = new Class({
	Implements: [Options, CookiePersist],
	options: {
		onClick: function(name) {}
	},
	initialize: function(element, options) {
		this.element = $(element);
		this.setOptions(options);
		this._data = [];
		this._cookie_id = 'recent-tasks';
		this._max_links = 5;

		this.clear();
	},

	add: function(name) {
		name = name || 'none';
		this._data.erase(name);
		this._data.push(name);
		this._addLink(name);

		// maybe the link we just added is alredy in the list?
		// we don't want duplciates, so remove it
		this.element.getElements('a').each(function(link, i) {
			if(link.innerHTML == name && i != 0) {
				link.destroy();
			}
		});

		// too many links? get rid of the oldest one
		if(this._data.length > this._max_links) {
			this.removeLast();
		}
	},

	_addLink: function(name) {
		var link = new Element('a', {
			text: name,
			href: 'javascript:void(0)',
			events: {
				click: function() {
					this.options.onClick(name);
				}.bind(this)
			}
		});

		link.inject(this.element, 'top');
	},

	clear: function() {
		this.element.empty();
	},

	toObject: function() {
		return this._data;
	},

	fromObject: function(data) {
		this.clear();
		data = data || [];
		var start = (data.length - this._max_links).limit(0, data.length);
		for(var i=start; i < data.length; i++) {
			this.add(data[i]);
		}
	},

	removeLast: function() {
		this.element.getLast('a').destroy();
	}
});

var Event = new Class({
	initialize: function(options) {
		this.options = options || {};
		
		this._start = Date.now();
		this._end = null;
		this._name = this.options.name || 'none';
	},

	fromObject: function(data) {
		data = data || {};
		this._name = data.name;
		this._start = data.start;
		this._end = data.end;
		return this;
	},

	start: function() {
		return this._start;
	},

	end: function() {
		return this._end;
	},

	finish: function() {
		if(this._end == null) {
			this._end = Date.now();
		}
		
		return this._end;
	},

	duration: function() {
		return (this._end || Date.now()) - this._start;
	},

	// if it is the first 500ms of a new minute then this will
	// return true. Not really a good general method, but it is 
	// used by the parent display classes for know when to update
	// things
	isNewMinute: function() {
		return Math.round(this.duration() / 500) % 120 == 0;
	},

	durationString: function(format) {
		format = format || 'L'; // L | S
		var d = this.duration();
		return  DateHelper.asDuration(d, format);
	},

	isRunning: function() {
		return this._end == null;
	},

	name: function(name) {
		if(name) {
			this._name = name;
		}

		return this._name;
	},

	toObject: function() {
		return {
			name: this.name(),
			start: this.start(),
			end: this.end()
		};
	}
});

Number.implement({
	pad: function() {
		if(this < 10) {
			return '0' + this.toString();
		} else {
			return this.toString();
		}
	}
});

