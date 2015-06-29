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

		this._eventTable = this._createEventTable();
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

	_updateDisplay: function() {
		var e = this._events.current();

		if(!e) {
			$('js-duration').innerHTML = '00:00:00';
			$('js-event-name').innerHTML = '';
			return;
		}

		this._updateEventRow(e);
		$('js-duration').innerHTML = e.durationString();
		$('js-event-name').innerHTML = e.name();
	},

	startEvent: function(name) {
		if(!name || name.trim() == '') {
			this.flash();
			return;
		}

		var previous = this._events.current();
		var e = this._events.startNew(name);

		if(previous) 
			this._updateEventRow(previous);

		this._addEventRow(e);
		this._recent.add(e.name());
		$('js-event-name').innerHTML = e.name();

		this.save();
	},

	_addEventRow: function(e) {
		var start = DateHelper.asTime(e.start());
		var end = e.end() == null ? '-' :   DateHelper.asTime(e.end());
		var length = e.durationString('S');
		this._eventTable.addRow(e.name(), start, end, length);
	},

	// just assume we are updating the final row.
	// also assume the name and the start time can't change, only the 
	// end and duration
	_updateEventRow: function(e) {
		var end = e.end() == null ? '-' :   DateHelper.asTime(e.end());
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
		this._updateDisplay();
	},

	reset: function() {
		this._events.reset();

		this._reloadEventTable();
		this._updateDisplay();
		this.save();
	},

	_reloadEventTable: function() {
		this._eventTable.clear();
		this._events.each(function(e) {
			this._addEventRow(e);
		}.bind(this));
	}
});

var CookiePersist = new Class({
	save: function() {
		if(!this._cookie_id || typeof this._cookie_id != 'string')
			throw 'Must set this._cookie_id to save object';

		if(!this.toObject)
			throw 'Must implement this.toObject() in order to save object';

		var data = this.toObject();
		var json = JSON.encode(data);
		Cookie.write(this._cookie_id, json, {duration: 90});
	},

	load: function() {
		if(!this._cookie_id || typeof this._cookie_id != 'string')
			throw 'Must set this._cookie_id to load object';

		if(!this.fromObject)
			throw 'Must implement this.fromObject() in order to load object';

		var json = Cookie.read(this._cookie_id);
		return json == null ? null : this.fromObject(JSON.decode(json));
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
	}
});



var DateHelper = {
	asTime: function(t) {
		d = new Date(t);
		return d.getHours().pad() + ':' + d.getMinutes().pad();
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
		this._data.push(name);
		this._addLink(name);
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
		this._data = data || [];
		var start = (this._data.length - this._max_links).limit(0, this._data.length);
		for(var i=start; i < this._data.length; i++) {
			v = this._data[i];
			this._addLink(v);
		}
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
		this._end = Date.now();
		return this._end;
	},

	duration: function() {
		return (this._end || Date.now()) - this._start;
	},

	durationString: function(format) {
		format = format || 'L'; // L | S
		var d = this.duration();

		var ms = d;
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

