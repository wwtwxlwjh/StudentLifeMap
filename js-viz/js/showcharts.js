/**
 * Created by fnokeke on 11/7/15.
 */


//===================================
// GENERAL TIPS:
//
// Date: unix timestamps should be used so that date is rendered properly
// Plot input format: Array of arrays where internal array is [x,y]; array of dictionaries also used
// TimeSeries data must be have sorted input for HighStocks Charts to show them.
// HighStock charts: 'selected: 1' means index 1 is selected from the list of rangeSelector buttons
//
//===================================

$(function () {

//===================================
//====== DATA FILTERING =============
//===================================
    $(document).ready(function () {
        console.time('loaddata'); //TODO: remove

        $.getJSON('dataset/FabianLocationHistory.json', function (data) {
            processingCharts(data);
        });
    });

    function processingCharts(data) {
        console.timeEnd('loaddata'); //TODO: remove
        console.time('processingCharts'); //TODO: remove

        data = data.locations;

        // get few data for test purposes @TODO: remove
        // data = _.sample(data, 8000);

        // convert columns to expected format and add other new columns
        data.forEach(function (row) {
            var timestamp = parseInt(row.timestampMs),
                rowDate = new Date(timestamp);

            row.latitudeE7 = row.latitudeE7 / 10e6;
            row.longitudeE7 = row.longitudeE7 / 10e6;
            row.timestampMs = timestamp;

            row.fullDate = rowDate;
            row.day = rowDate.getDay();
            row.date = extractDate(rowDate);
            row.time = extractTime(rowDate);
        });

        // sorted entire time once otherwise have to sort each value from groupby date keys
        data = _.sortBy(data, 'timestampMs');

        // ignore locations with accuracy over 1000m
        // ignore all locations outside CITY
        var CITY = [42.446594, -76.493736],
            cityLatMargin = 0.1,
            cityLonMargin = 1.0;

        data = data.filter(function (row) {
            return row.accuracy <= 1000 &&
                Math.abs(row.latitudeE7 - CITY[0]) <= cityLatMargin &&
                Math.abs(row.longitudeE7 - CITY[1]) <= cityLonMargin
        });

        // HOME = [42.4393512,-76.4979702] // Jean
        // HOME = [42.4526518, -76.4875169] // Mash
        // HOME = [42.4412221,-76.4765972] // Rifat

        // determine if location falls into specific location label such as home, work, etc
        var HOME = [42.446594, -76.493736], // Fabian Home
            WORK = [42.444877, -76.480814], //Gates Hall
            HOBBY = [42.4342860, -76.4631910]; // CTB
            HOBBY = [42.4444389, -76.4991059]; // Lot 10
            HOBBY = [42.4333261,-76.4709491]; // woodcrest

        var LAT_MARGIN = 0.00005,
            LON_MARGIN = 0.0005;

        data.forEach(function (row) {
            if (Math.abs(row.latitudeE7 - HOME[0]) < LAT_MARGIN &&
                Math.abs(row.longitudeE7 - HOME[1]) < LON_MARGIN) {
                row.locationLabel = 'home';
            } else if (Math.abs(row.latitudeE7 - WORK[0]) < LAT_MARGIN &&
                Math.abs(row.longitudeE7 - WORK[1]) < LON_MARGIN) {
                row.locationLabel = 'work';
            } else if (Math.abs(row.latitudeE7 - HOBBY[0]) < LAT_MARGIN &&
                Math.abs(row.longitudeE7 - HOBBY[1]) < LON_MARGIN) {
                row.locationLabel = 'hobby';
            }
            else {
                row.locationLabel = 'other';
            }
        });

        console.timeEnd('processingCharts');
        console.time('plots');


        //===================================
        //====== PLOTS BEGIN =============
        //===================================


        // ===============
        // Bar chart for number of hours spent per location
        // ===============
        var groupedData = _.groupBy(data, 'date'),
            date,
            locationsForDate,
            homeData = [],
            workData = [],
            hobbyData = [],
            timeSpent;

        for (var dateKey in groupedData) {

            date = new Date(dateKey).getTime();
            locationsForDate = groupedData[dateKey];

            timeSpent = getTimeSpentAtLocation(locationsForDate, HOME);
            homeData.push({'x': date, 'y': timeSpent});

            timeSpent = getTimeSpentAtLocation(locationsForDate, WORK);
            workData.push({'x': date, 'y': timeSpent});

            timeSpent = getTimeSpentAtLocation(locationsForDate, HOBBY);
            hobbyData.push({'x': date, 'y': timeSpent});
        }

        // sorted time is needed for HighStock plots
        // HighStock automatically formats the datetime for you
        homeData = _.sortBy(homeData, 'x');
        workData = _.sortBy(workData, 'x');
        hobbyData = _.sortBy(hobbyData, 'x');

        $('#timeSpentBar').highcharts("StockChart", {
            chart: {
                alignTicks: false,
                zoomType: 'x'
            },
            rangeSelector: {
                buttons: [{
                    type: 'week',
                    count: 1,
                    text: '1w'
                }, {
                    type: 'month',
                    count: 1,
                    text: '1m'
                }, {
                    type: 'month',
                    count: 3,
                    text: '3m'
                }, {
                    type: 'month',
                    count: 6,
                    text: '6m'
                }, {
                    type: 'year',
                    count: 1,
                    text: '1y'
                }, {
                    type: 'all',
                    text: 'All'
                }],
                selected: 1
            },
            yAxis: {
                title: {
                    text: 'hours'
                }
            },
            title: {
                text: "Avg Time (hours) at Location"
            },
            plotOptions: {
                column: {
                    stacking: 'normal',
                },
                series: {
                    point: {
                        events: {
                            dblclick: function () {
                                //var text = this.category + ': ' + this.y + ' was double-clicked';
                                var text = prompt("Briefly journal your thoughts");
                                var chart = this.series.chart;

                                if (!chart.lbl) {
                                    chart.lbl = chart.renderer.label(text, 200, 80)
                                        .attr({
                                            padding: 10,
                                            r: 5,
                                            fill: Highcharts.getOptions().colors[1],
                                            zIndex: 5
                                        })
                                        .css({
                                            color: '#FFFFFF'
                                        })
                                        .add();
                                } else {
                                    chart.lbl.attr({
                                        text: text
                                    });
                                }
                            }
                        }
                    }
                }
            },
            series: [{
                name: 'Home',
                type: 'column',
                data: homeData,
                dataGrouping: {
                    approximation: "average",
                }
            }, {
                name: 'Work',
                type: 'column',
                data: workData,
                dataGrouping: {
                    approximation: "average",
                }
            }, {
                name: 'Hobby',
                type: 'column',
                color: (0, 0, 233),
                data: hobbyData,
                dataGrouping: {
                    approximation: "average",
                }
            }]
        });

        // ===============
        // time left home and time returned home
        //
        // dataformat [[date, timeLeft, timeReturned],
        //             [date, timeLeft, timeReturned]]
        // date must be in unix time format so that it is automatically formatted in plot
        // ===============
        var leftReturnedData = [],
            arrayOfLocationObjects,
            timestampLeft,
            timestampReturned,
            date;

        for (var dateKey in groupedData) {
            arrayOfLocationObjects = groupedData[dateKey];
            timestampLeft = getTimeLeftHome(arrayOfLocationObjects);
            if (timestampLeft >= 0)
                timestampReturned = getTimeReturnedHome(arrayOfLocationObjects);
            if (timestampLeft >= 0 && timestampReturned >= 0) {
                date = new Date(dateKey).getTime();
                timestampLeft = extractTime(timestampLeft);
                timestampReturned = extractTime(timestampReturned);
                leftReturnedData.push([date, timestampLeft, timestampReturned]);
            }
        }

        var TIMELABEL = [];
        for (var i = 0; i < 25; i++) {
            if (i == 0 || i == 24) {
                TIMELABEL.push("Midnight");
            }
            else if (i == 12) {
                TIMELABEL.push("Noon");
            }
            else if (i < 12) {
                TIMELABEL.push(i + "am");
            }
            else {
                TIMELABEL.push(i % 12 + "pm");
            }
        }

        // labels for specific dates on x-axis
        var THANKSGIVING2014 = "11-27-2014",
            FALL2014BEGINS = "08-14-2014";

        THANKSGIVING2014 = new Date(THANKSGIVING2014).getTime();
        FALL2014BEGINS = new Date(FALL2014BEGINS).getTime();

        $(function () {
            $('#leftReturnedAreaSpline').highcharts('StockChart', {
                chart: {
                    type: 'arearange',
                    zoomType: 'x'
                },
                title: {
                    text: 'Time left home and returned back'
                },
                yAxis: {
                    title: {
                        text: 'time of day'
                    },
                    min: 0,
                    tickInterval: 2,
                    categories: TIMELABEL,
                },
                rangeSelector: {
                    selected: 2
                },
                tooltip: {
                    valueSuffix: ':00 hours', //@TODO: find better ways to show hours
                    valueDecimals: 0
                },
                series: [{
                    name: 'Left-Returned',
                    data: leftReturnedData
                }, {
                    type: 'flags',
                    name: 'Flags on axis',
                    data: [{
                        x: FALL2014BEGINS,
                        title: 'Fall 2014 Begins'
                    }, {
                        x: THANKSGIVING2014,
                        title: 'Thanksgiving 2014'
                    }],
                    shape: 'squarepin'
                }]
            });
        });

        // ===============
        // total time spent at each location for different time periods
        //
        // homedata format (home is index 0): [p1[0], p2[0], p3[0], p4[0]],
        // workdata format (work is index 1): [p1[1], p2[1], p3[1], p4[1]],
        // otherdata format (index 2): can also be accessed but not used in this plot
        //
        // p1, p2, p3, p4: refer to different parts of data with each part as range of date
        // ===============
        var fallBegins = "08-15-2013",
            fallBreak = "10-10-2014",
            thanksgiving2014 = "11-27-2014",
            lastClass2014 = "12-04-2014",
            endOfExam = "12-17-2014";

        var dateRange01 = fetchData(groupedData, fallBegins, fallBreak),
            dateRange02 = fetchData(groupedData, fallBreak, thanksgiving2014),
            dateRange03 = fetchData(groupedData, thanksgiving2014, lastClass2014),
            dateRange04 = fetchData(groupedData, lastClass2014, endOfExam);

        var totalArray = [dateRange01, dateRange02, dateRange03, dateRange04],
            homeData = getDateRangeData(totalArray, "home"),
            workData = getDateRangeData(totalArray, "work"),
            categories = [
                "Fall 2014 Begins - Fall Break",
                "Fall Break - Thanksgiving 2014",
                "Thanksgiving 2014 - Last Class",
                "Last Day of Class - Semester End"
            ];

        $(function () {
            $('#barTimeSpentCharts').highcharts({
                chart: {
                    type: 'column',
                    inverted: false
                },
                title: {
                    text: 'How time spent at location changes over time'
                },
                xAxis: {
                    categories: categories
                },
                yAxis: {
                    title: {
                        text: 'Percent(%) of total hours'
                    },
                    min: 0,
                },
                tooltip: {
                    valueSuffix: ' hours',
                },
                plotOptions: {
                    column: {
                        //stacking: 'percent',
                        dataLabels: {
                            enabled: true,
                            color: (Highcharts.theme && Highcharts.theme.dataLabelsColor) || 'white',
                            style: {
                                textShadow: '0 0 3px black',
                            }
                        }
                    }
                },
                series: [{
                    name: 'Home',
                    data: homeData
                }, {
                    name: 'Work',
                    data: workData
                }]
            });
        });


        // ===============
        // HeatMap for total time spent at each location for first half and second half
        // ===============

        var heatMapData = changeToHeatMapFormat([homeData, workData], 2);

        $(function () {
            $('#heatMapTimeSpent').highcharts({

                chart: {
                    type: 'heatmap',
                    marginTop: 40,
                    marginBottom: 80,
                    plotBorderWidth: 1
                },

                title: {
                    text: 'No of hours spent'
                },

                xAxis: {
                    categories: ['Home', 'Work']
                },

                yAxis: {
                    categories: categories,
                    title: null
                },

                colorAxis: {
                    min: 0,
                    minColor: '#FFFFFF',
                    maxColor: Highcharts.getOptions().colors[0]
                },

                legend: {
                    align: 'right',
                    layout: 'vertical',
                    margin: 0,
                    verticalAlign: 'top',
                    y: 25,
                    symbolHeight: 280
                },

                tooltip: {
                    formatter: function () {
                        return 'Spent ' +
                            '<b>' + this.point.value + '</b> hours at <br>' +
                            '<b>' + this.series.xAxis.categories[this.point.x] + '</b> during <br>' +
                            '<b>' + this.series.yAxis.categories[this.point.y] + '</b>';
                    }
                },
                series: [{
                    name: 'Time per location',
                    borderWidth: 1,
                    data: heatMapData,
                    dataLabels: {
                        enabled: true,
                        color: '#000000'
                    }
                }]

            });
        });


        // ===============
        // where are you by given dates
        // ===============

        var groupedLocLabel = _.groupBy(data, 'locationLabel');

        var homeGrp = groupedLocLabel['home'];
        var workGrp = groupedLocLabel['work'];

        homeGrp = _.map(homeGrp, function (row) {
            return [row.timestampMs, row.time];
        });
        workGrp = _.map(workGrp, function (row) {
            return [row.timestampMs, row.time];
        });

        var RADIUS = 2; // determine radius of scatter plot circles

        $('#dateTimeWorkChart').highcharts({
            chart: {
                type: 'scatter',
                zoomType: 'x'
            },
            title: {
                text: 'Time at Work'
            },
            subtitle: {
                text: document.ontouchstart === undefined ?
                    'Click and drag in the plot area to zoom in' : 'Pinch the chart to zoom in'
            },
            xAxis: {
                type: 'datetime',
                tickInterval: 30 * 24 * 36e5, // 24 * 36e5 === 1 day
                labels: {
                    format: '{value: %a %d %b %Y}',
                },
                title: {
                    text: 'date',
                },
            },
            yAxis: {
                title: {
                    text: 'time of day'
                },
                min: 0,
                tickInterval: 2,
                categories: TIMELABEL,
            },
            plotOptions: {
                series: {
                    marker: {
                        radius: RADIUS,
                        symbol: 'square'
                    }
                }
            },
            series: [{
                name: 'Work',
                color: 'rgba(223, 83, 83, .5)',
                data: workGrp
            }],
        });


        // ===============
        // where are you by weekday
        // ===============

        //
        // use last n days of data for weekday charts
        //
        var lastDay = data[data.length - 1],
            lastDayTimestamp = lastDay.timestampMs,
            dateOfLastDay = new Date(lastDayTimestamp),
            noOfDays = 30,
            nDaysAgoTimestamp = dateOfLastDay.setDate(dateOfLastDay.getDate() - noOfDays);

        var nDaysData = data.filter(function (row) {
            return row.timestampMs >= nDaysAgoTimestamp &&
                row.timestampMs <= lastDayTimestamp;
        });

        var groupedLocLabel = _.groupBy(nDaysData, 'locationLabel');

        homeGrp = groupedLocLabel['home'];
        workGrp = groupedLocLabel['work'];

        homeGrp = _.map(homeGrp, function (row) {
            return [row.day, row.time];
        });
        workGrp = _.map(workGrp, function (row) {
            return [row.day, row.time];
        });

        var WEEKDAY = ["Sun", "Mon", "Tues", "Wed", "Thur", "Fri", "Sat"];
        $('#weekdayChart').highcharts({
            chart: {
                type: 'scatter',
            },
            title: {
                text: 'Time at Location (Last ' + noOfDays + ' days)'
            },
            xAxis: {
                title: {
                    text: 'Weekday',
                },
                categories: WEEKDAY,
            },
            yAxis: {
                title: {
                    text: 'Time'
                },
                categories: TIMELABEL,
            },
            plotOptions: {
                series: {
                    marker: {
                        radius: RADIUS,
                        symbol: 'square'
                    }
                }
            },
            series: [{
                name: 'Home',
                color: 'rgba(83, 223, 83, .5)',
                data: homeGrp
            },
                {
                    name: 'Work',
                    data: workGrp
                }]
        });

        console.timeEnd('plots');


        //
        // highcharts capture double click
        //
        $(function () {
            var lastUpdate = +new Date(),
                timeout = 3000;

            function reloadFlash() {
                $("#flash").fadeIn();
                lastUpdate = +new Date();
                setTimeout(hideFlash, timeout);
            }

            function hideFlash() {
                var now = +new Date();
                if (now >= lastUpdate + timeout) {
                    $("#flash").fadeOut();
                }
            }

        });

//===================================
//===== UTILITY FUNCTIONS ===========
//===================================

        function changeToHeatMapFormat(arrayOfData, noOfCategories) {
            var len = arrayOfData[0].length;
            var result = [],
                element;

            for (var i = 0; i < len; i++) {
                for (var j = 0; j < noOfCategories; j++) {
                    element = arrayOfData[j][i];
                    result.push([j, i, element]);
                }
            }
            return result;
        }

        function extractDate(date) {
            if (!(date instanceof Date))
                date = new Date(date);

            return ("0" + (date.getMonth() + 1)).slice(-2) + "-" + ("0" + date.getDate()).slice(-2) + "-" +
                date.getFullYear();
        }

        function extractTime(date) {
            if (!(date instanceof Date))
                date = new Date(date);
            return roundToTwoDP(date.getHours() + date.getMinutes() / 60.0);
        }

        function fetchData(groupedData, fromDate, toDate) {
            var result = {};
            for (var dateKey in groupedData) {
                if (dateKey >= fromDate && dateKey <= toDate)
                    result[dateKey] = groupedData[dateKey];
            }
            return result;
        }

        function getAllDwellTime(arrayOfLocObjects) {
            var homeDwell = 0,
                workDwell = 0,
                otherDwell = 0,
                homeLastTimestamp = -1,
                workLastTimestamp = -1,
                otherLastTimestamp = -1,
                CONVERTER = 1000 * 60 * 60;

            for (var i = 0; i < arrayOfLocObjects.length; i++) {
                var locationObject = arrayOfLocObjects[i],
                    currentTimeStamp = locationObject.timestampMs;

                if (locationObject.locationLabel == 'home') {
                    workLastTimestamp = -1;
                    otherLastTimestamp = -1;

                    if (homeLastTimestamp != -1) {
                        homeDwell += currentTimeStamp - homeLastTimestamp
                    }
                    homeLastTimestamp = currentTimeStamp;
                }

                else if (locationObject.locationLabel == 'work') {
                    homeLastTimestamp = -1;
                    otherLastTimestamp = -1;

                    if (workLastTimestamp != -1) {
                        workDwell += currentTimeStamp - workLastTimestamp
                    }
                    workLastTimestamp = currentTimeStamp;
                }

                else if (locationObject.locationLabel == 'other') {
                    homeLastTimestamp = -1;
                    workLastTimestamp = -1;

                    if (otherLastTimestamp != -1) {
                        otherDwell += currentTimeStamp - otherLastTimestamp
                    }
                    otherLastTimestamp = currentTimeStamp;

                }
            }

            // original value is in milliseconds
            // seconds = milliseconds/1000
            homeDwell /= CONVERTER;
            workDwell /= CONVERTER;
            otherDwell /= CONVERTER;

            return [homeDwell, workDwell, otherDwell];
        }

        function getTimeSpentAtLocation(locationsForDate, location) {
            var dwellTime = 0,
                lastTimeStamp = -1,
                CONVERTER = 1000 * 60 * 60;

            for (var i = 0; i < locationsForDate.length; i++) {
                var row = locationsForDate[i],
                    currentTimeStamp = row.timestampMs;

                if (Math.abs(row.latitudeE7 - location[0]) < LAT_MARGIN &&
                    Math.abs(row.longitudeE7 - location[1]) < LON_MARGIN) {

                    if (lastTimeStamp != -1) {
                        dwellTime += currentTimeStamp - lastTimeStamp;
                    }
                    lastTimeStamp = currentTimeStamp;
                }
                else {
                    lastTimeStamp = -1;
                }

            }

            // original value is in milliseconds
            // seconds = milliseconds/1000
            dwellTime /= CONVERTER;
            return roundToTwoDP(dwellTime);
        }

        function getDateRangeData(arrayOfData, label) {
            var result = [],
                totalTimeArray = [];
            if (label === 'home') {
                arrayOfData.forEach(function (data) {
                    totalTimeArray = getTotalTimeSpent(data);
                    result.push(totalTimeArray[0]);
                });
            }
            else if (label === 'work') {
                arrayOfData.forEach(function (data) {
                    totalTimeArray = getTotalTimeSpent(data);
                    result.push(totalTimeArray[1]);
                });
            }
            return result;
        }

        function getHomeStatus(labelArray) {
            var status = 0;
            if (labelArray.length == 0) // no location data
                status = -1;
            else if (_.uniq(labelArray).indexOf('home') === -1) //no home label recorded
                status = -2;
            else if (_.uniq(labelArray).length === 1) //maybe stayed in one location all day
                status = -3;
            return status;
        }

        function getTimeLeftHome(arrayOfLocationObject) {
            var timeArray = _.map(arrayOfLocationObject, 'timestampMs'),
                labelArray = _.map(arrayOfLocationObject, 'locationLabel'),
                homeStatus = getHomeStatus(labelArray),
                leftHome = 0;

            if (homeStatus < 0) {
                leftHome = homeStatus;
            }
            else {
                var startIndex = labelArray.indexOf('home'),
                    workIndex = labelArray.indexOf('work', startIndex),
                    otherIndex = labelArray.indexOf('other', startIndex),
                    LARGE = 999999;

                workIndex = workIndex === -1 ? LARGE : workIndex;
                otherIndex = otherIndex === -1 ? LARGE : workIndex;

                var leftHomeIndex = Math.min(workIndex, otherIndex);
                if (leftHomeIndex == LARGE) // no record of work or other
                    leftHome = -4;
                else
                    leftHome = timeArray[leftHomeIndex];
            }
            return leftHome;
        }

        function getTimeReturnedHome(locArray) {
            var timeArray = _.map(locArray, 'timestampMs'),
                labelArray = _.map(locArray, 'locationLabel'),
                homeStatus = getHomeStatus(labelArray),
                returnedHome = 0;

            if (homeStatus < 0) {
                returnedHome = homeStatus;
            }
            else {
                var startIndex = labelArray.lastIndexOf('home'),
                    workIndex = labelArray.lastIndexOf('work', startIndex),
                    otherIndex = labelArray.lastIndexOf('other', startIndex),
                    SMALL = -999999;

                workIndex = workIndex === -1 ? SMALL : workIndex;
                otherIndex = otherIndex === -1 ? SMALL : workIndex;

                var returnedHomeIndex = Math.max(workIndex, otherIndex);
                if (returnedHomeIndex == SMALL)
                    returnedHome = -4;
                else
                    returnedHome = timeArray[returnedHomeIndex];
            }
            return returnedHome;
        }

        function getTotalTimeSpent(mGroupedDate) {

            var homeArray = [],
                workArray = [],
                otherArray = [];

            for (var dateKey in mGroupedDate) {
                var arraylocObj = mGroupedDate[dateKey],
                    arrayDate = new Date(dateKey).getTime(),
                    allDwellDuration = getAllDwellTime(arraylocObj);

                homeArray.push([arrayDate, allDwellDuration[0]]);
                workArray.push([arrayDate, allDwellDuration[1]]);
                otherArray.push([arrayDate, allDwellDuration[2]]);
            }

            var homeSum = 0;
            for (var i = 0; i < homeArray.length; i++) {
                homeSum += homeArray[i][1];
            }

            var workSum = 0;
            for (var i = 0; i < workArray.length; i++) {
                workSum += workArray[i][1];
            }

            var otherSum = 0;
            for (var i = 0; i < otherArray.length; i++) {
                otherSum += otherArray[i][1];
            }

            homeSum = Math.round(homeSum);
            workSum = Math.round(workSum);
            otherSum = Math.round(otherSum);
            return [homeSum, workSum, otherSum]
        }

        function roundToTwoDP(num) {
            return +(Math.round(num + "e+2") + "e-2");
        }

    }


});