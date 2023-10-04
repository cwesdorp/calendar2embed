var calendar = (function(lxn) {
    lxn.Settings.throwOnInvalid = true;

    // picked from https://coolors.co/gradient-palette/3347fd-f60000?number=7
    const colorScheme = ["#3347FD", "#D60C2A", "#95247F", "#533BD3", "#F60000"]

    const parseQuery = () => {
        return _parseQuery(document.location.search);
    }

    const render = () => {
        opts = parseQuery();
        return renderMonths(opts);
    }

    const renderMonths = (opts) => {
        let result = "";

        // calendars
        for (let m = 0; m < opts.length; m++) {
            let clear = (m % opts.width) === 0 ? `style="clear: left" ` : "";

            let month = opts.start.plus({month: m});
            result += `<div class="calendar_block" ${clear} >${renderMonth(month, opts)}</div>`;
        }

        // break
        result += `<div style="clear: both">`;

        //legend
        result += _renderLegend(opts);

        return result;
    }

    const renderMonth = (month, opts) => {
        let firstDayOfMonth = month.startOf("month");
        let firstDayToShow = firstDayOfMonth.startOf("week");

        let lastDayOfMonth = month.endOf("month");
        let lastDayToShow = lastDayOfMonth.endOf("week");

        let calendarStr = `<table class="calendar">`;
        calendarStr += `<tr><td colspan=7 class="monthName">${month.monthLong} ${month.year}</td></tr>`;
        calendarStr += `<tr class="dayNames"><td>Mon</td><td>Tue</td><td>Wed</td><td>Thu</td><td>Fri</td><td>Sat</td><td>Sun</td></tr>`;

        for (let day = firstDayToShow; day.diff(lastDayToShow, ["days"]).toObject().days <= 0; day = day.plus({day: 1})) {
            if (day.weekday == 1) {
                calendarStr += `<tr class="dayNumbers">`;
            }

            if (day.month == month.month) {
                let marked = _isMarked(day, opts);
                let td_style = marked != null ? `class="marked" style="background-color: ${marked.color}" ` : "";

                calendarStr += `<td ${td_style}>`
                calendarStr += `<span class="dayNumber ${marked != null ? " marked" : null}">${day.day}</span>`;
                calendarStr += "</td>";
            } else {
                calendarStr += "<td></td>"
            }

            if (day.weekday == 7) {
                calendarStr += "</tr>";
            }
        }
        calendarStr += "</table>";

        return calendarStr;
    }

    const _DT = (s) => {
        return lxn.DateTime.fromISO(s, {zone: "utc"});
    }

    const _now = () => {
        return lxn.DateTime.now().setZone("utc");
    }

    const _isMarked = (day, opts) => {
        for (let i = 0; i < opts.markers.length; i++) {
            if (opts.markers[i].f(day)) {
                return opts.markers[i];
            }
        };

        return null;
    }

    const _renderLegend = (opts) => {
        if (!opts.legend) return "";

        let legendStr = `<div class="legend_block"><table class="legend">`;
        for (let i = 0; i < opts.markers.length; i++) {
            legendStr += `<tr><td style="color: white; background-color: ${opts.markers[i].color}">${opts.markers[i].name}</td></tr>`
        }
        legendStr += "</table></div>";

        return legendStr;
    }

    // parse doc query url
    //  start           UTC date in which the month starts
    //  length          number of months to display
    //  width     number of calendars in horizontal
    //
    //  marker    <interval><unit>, required. eg
    //                      YYYY-MM-DD specify a specific date
    //                      1 a single number to specify the day. or the last
    //                         day of the month in case this value exceeds the month length
    //                      3D for once every 2 days
    //                      2W for two week intervals
    //                      1M for a one month interval
    //                      TUE for every Tuesday
    //                      FIRST for every first day of the month (equal to 1MON)
    //                      LAST for every last day of the month
    //  first     YYYY-MM-DD, defaults to first of month
    //  count     number of intervals, defaults to unlimited
    //  color     RGB color in HEX (without #)
    //  name      marker name
    //
    // marker parameters can be provided multiple times and are matched
    // in order as provided.
    const _parseQuery = (queryStr) => {
        let opts = {
            start: _now().startOf("month"),
            length: 1,
            width: 3,
            legend: true,
            markers: []
        };

        if (queryStr === undefined || queryStr[0] !== "?") {
            return opts;
        }

        let params = _queryAsObj(queryStr)
        if (params["start"] !== undefined) opts.start = _DT(params.getVar("start"));
        if (params["length"] !== undefined) opts.length = params.getVar("length");
        if (params["width"] !== undefined) opts.width = parseInt(params.getVar("width"));
        if (params["legend"] !== undefined) opts.legend = !(params["legend"] == "false")

        _parseMarkers(opts, params);

        return opts;
    }

    // based on https://stackoverflow.com/a/14368860
    const _queryAsObj = (function (d, x) {
        return (qs) => {
            // start bucket; can't cheat by setting it in scope declaration or it overwrites
            params = {};
            // remove preceding non-querystring, correct spaces, and split
            qs = qs.substring(qs.indexOf("?") + 1).replace(x, " ").split("&");
            // march and parse
            for (i = 0; i < qs.length; i++) {
                p = qs[i];
                // allow equals in value
                j = p.indexOf("=");
                prm = j === -1 ? p : p.substring(0, j);
                value = j === -1 ? null : p.substring(j + 1);
                // store as array in case of dubs
                if (params[prm] === undefined) params[prm] = value
                else params[prm] = [].concat(params[prm]).concat(value)
            }

            params.getVar = (p) => {
                if (typeof (params[p]) === "object") return null
                else return params[p]
            }

            params.getVars = (p) => {
                if (typeof (params[p]) === "object") return params[p]
                else if (params[p] === undefined) return []
                else return [params[p]]
            }

            return params;
        };
    })((decodeURIComponent, /\+/g));

    const _parseMarkers = (opts, queryObj) => {
        let markers = queryObj.getVars("marker")
        let firsts = queryObj.getVars("first")
        let colors = queryObj.getVars("color")
        let names = queryObj.getVars("name")
        let counts = queryObj.getVars("count")

        // interval is leading for setting markers
        for (let i = 0; i < markers.length; i++) {
            let first = firsts.length > i ? _DT(firsts[i]) : opts.start;
            let count = counts.length > i ? parseInt(counts[i]) : 32764;

            opts.markers.push({
                f: _parseMarker(markers[i], first, count),
                color: (colors.length > i) ? "#" + colors[i] : colorScheme[i % colorScheme.length],
                name: (names.length > i) ? decodeURI(names[i]) : "Serie " + (i + 1)
            });
        }
    }

    // i: interval
    // f: first marker
    // c: count
    const _parseMarker = (i, f, c) => {
        const diff = (l, r, unit) => {
            // return NaN for dates before f to fail calculations
            return (r = l.diff(r, [unit]).toObject()[unit]) >= 0 ? r : NaN;
        }

        let m;
        let delta;

        if (i === "LAST") return (d) => d.day === d.daysInMonth && diff(d, f, "months") < c;
        if ((m = i.match(/^([0-9]+)$/)) != null) return (d) => (d.day === parseInt(m[1]) || (parseInt(m[1]) > d.daysInMonth && d.day == d.daysInMonth)) && diff(d, f, "months") <= c;
        if ((m = i.match(/^([0-9]+)D$/)) != null) return (d) => (delta = diff(d, f, "days")) % m[1] === 0 && delta < c * m[1];
        if ((m = i.match(/^([0-9]+)W$/)) != null) return (d) => (delta = diff(d, f, "weeks")) % m[1] === 0 && delta < c * m[1];
        if ((m = i.match(/^([0-9]+)M$/)) != null) return (d) => (delta = diff(d, f, "months")) % m[1] === 0 && delta < c * m[1];
        if ((m = i.match(/^(MON|TUE|WED|THU|FRI|SAT|SUN)/)) != null) return (d) => d.weekdayShort.toUpperCase() === m[1] && diff(d, f, "weeks") < c;
        if ((m = i.match(/^([0-9]+)(MON|TUE|WED|THU|FRI|SAT|SUN)/)) != null) return (d) => d.weekdayShort.toUpperCase() === m[2] && (m[1] - 1) * 7 < d.day && d.day <= m[1] * 7 && diff(d, f, "months") < c;
        if ((m = i.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/) != null)) return (d) => {
            let diff = _DT(i).diff(d, ['days']).toObject();
            return diff.days === 0;
        }

        throw new Error(`Can't parse marker: '${i}'`)
    }

    return {
        parseQuery: parseQuery,
        render: render,
        renderMonths: renderMonths
    }
})(luxon);