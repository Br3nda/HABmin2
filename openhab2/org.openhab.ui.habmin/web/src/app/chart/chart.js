/**
 * HABmin - Home Automation User and Administration Interface
 * Designed for openHAB (www.openhab.com)
 *
 * This software is copyright of Chris Jackson under the GPL license.
 * Note that this licence may be changed at a later date.
 *
 * (c) 2014-2015 Chris Jackson (chris@cd-jackson.com)
 */
angular.module('HABmin.chart', [
    'ui.router',
    'ui.bootstrap',
    'ui.bootstrap.datepicker',
    'ngLocalize',
    'angular-growl',
    'HABmin.persistenceModel',
    'HABmin.itemModel',
    'HABmin.chartModel',
    'HABmin.chartSave',
    'HABmin.iconModel',
    'ngVis',
    'ngConfirmClick',
    'ResizePanel',
    'SidepanelService',
    'habminChart'
])

    .config(function config($stateProvider) {
        $stateProvider.state('chart', {
            url: '/chart',
            views: {
                "main": {
                    controller: 'ChartCtrl',
                    templateUrl: 'chart/chart.tpl.html'
                }
            },
            data: {pageTitle: 'Charting'},
            resolve: {
                // Make sure the localisation files are resolved before the controller runs
                localisations: function (locale) {
                    return locale.ready('common');
                }
            }
        });
    })

    .controller('ChartCtrl',
    function ChartCtrl($scope, $q, locale, ItemModel, PersistenceServiceModel, PersistenceItemModel, PersistenceDataModel, ChartModel, ChartSave, SidepanelService, growl, VisDataSet, $interval, $timeout) {
        var itemsLoaded = 0;
        var itemsLoading = 0;
        var newChart;
        var chartDef;

        var graph2d;

        $scope.graphLoaded = false;

        $scope.selectedView = "LOAD";
        $scope.selectedChart = undefined;

        $scope.chartsTotal = -1;
        $scope.charts = [];

        $scope.itemsTotal = -1;
        $scope.itemsSelected = 0;
        $scope.items = [];
        $scope.services = [];

        $scope.chartLoading = false;

        // ------------------------------------------------
        // Load model data
        var promises = [];

        // Load the list of items
        var pItems = $q.defer();
        promises.push(pItems.promise);
        PersistenceItemModel.get().then(
            function (items) {
                if (items == null) {
                    ItemModel.getList().then(
                        function (items) {
                            $scope.items = items;
                            if ($scope.items != null) {
                                $scope.itemsTotal = $scope.items.length;
                            }
                            pItems.resolve();
                        },
                        function (reason) {
                            // handle failure
                            growl.warning(locale.getString('habmin.chartErrorGettingItems'));
                            pItems.resolve();
                        }
                    );

                    return;
                }

                $scope.items = items;
                if ($scope.items != null) {
                    $scope.itemsTotal = $scope.items.length;
                }

                pItems.resolve();
            },
            function (reason) {
                // handle failure
                growl.warning(locale.getString('habmin.chartErrorGettingItems'));
                pItems.resolve();
            }
        );

        // Load the list of charts
        var pCharts = $q.defer();
        promises.push(pCharts.promise);
        ChartModel.getList().then(
            function (charts) {
                $scope.charts = charts;
                if ($scope.charts != null) {
                    $scope.chartsTotal = $scope.charts.length;
                }
                else {
                    $scope.charts = 0;
                }
                pCharts.resolve();
            },
            function (reason) {
                // handle failure
                growl.warning(locale.getString('habmin.chartErrorGettingCharts'));
                $scope.chartsTotal = 0;
                pCharts.resolve();
            }
        );

        // Load the list of persistence services
        var pServices = $q.defer();
        promises.push(pServices.promise);
        PersistenceServiceModel.getList().then(
            function (data) {
                $scope.services = data;
                if ($scope.services.length > 0) {
                    $scope.services[0].selected = true;
                    $scope.selectedService = $scope.services[0].name;
                }
                pServices.resolve();
            },
            function (reason) {
                // handle failure
                growl.warning(locale.getString('habmin.chartErrorGettingServices'));
                pServices.resolve();
            }
        );

        // Wait for all the promises to complete
        $q.all(promises).then(
            function() {
                if ($scope.services == null || $scope.services.length == 0) {
                    // If there's no services, then disable charting
                    $scope.selectedView = "ERROR";
                }
                else if ($scope.charts === null || $scope.charts.length == 0) {
                    // If there's no predefined charts, change to items view
                    $scope.selectedView = "ITEMS";
                }
                else {
                    $scope.selectedView = "CHART";
                }
            }
        );

        // ------------------------------------------------
        // Event Handlers

        $scope.doChart = function () {
            console.log("doChart button clicked");

            $scope.chartLoading = true;

            var items = [];
            angular.forEach($scope.items, function (item) {
                if (item.selected === true) {
                    var i = {};
                    i.item = item.name;
                    i.label = item.label;
                    i.axis = "left";
                    items.push(i);
                }
            });

            $scope.graphItems = items;
        };

        $scope.saveChart = function () {
            console.log("saveChart button clicked");
            var chart = {};
            chart.name = locale.getString('habmin.chartSaveNewName');
            chart.period = 86400;
            chart.items = [];

            angular.forEach($scope.items, function (item) {
                if (item.selected === true) {
                    var newItem = {};
                    newItem.item = item.name;
                    newItem.label = item.label;
                    chart.items.push(newItem);
                }
            });

            ChartSave.saveChart(chart);
        };

        $scope.editChart = function () {
            console.log("editChart button clicked");

            if ($scope.selectedChart === undefined) {
                return;
            }

            ChartSave.editChart($scope.selectedChart.id);
        };

        $scope.deleteChart = function () {
            console.log("deleteChart button clicked");

            if ($scope.selectedChart === undefined) {
                return;
            }

            ChartModel.deleteChart($scope.selectedChart.id).then(
                function () {
                    growl.success(locale.getString('habmin.chartDeleteOk', {name: $scope.selectedChart.name}));
                },
                function () {
                    growl.warning(locale.getString('habmin.chartDeleteError', {name: $scope.selectedChart.name}));
                }
            );
        };

        $scope.selectItem = function (parm) {
            parm.selected = !parm.selected;

            $scope.itemsSelected = 0;
            angular.forEach($scope.items, function (item) {
                if (item.selected === true) {
                    $scope.itemsSelected++;
                }
            });
        };

        $scope.selectChart = function (parm) {
            angular.forEach($scope.charts, function (chart) {
                chart.selected = 'no';
            });

            parm.selected = 'loading';
            $scope.chartLoading = true;

            // Make sure the directive detects the change - use copy
            $scope.newSelectedChart = angular.copy(parm);
            $scope.selectedChart = null;
            $timeout(function() {
                $scope.selectedChart = $scope.newSelectedChart;
            });
        };

        $scope.clearList = function () {
            console.log("clearList button clicked");
            $scope.itemsSelected = 0;
            angular.forEach($scope.items, function (item) {
                item.selected = false;
            });
        };

        $scope.selectService = function (sel) {
            angular.forEach($scope.services, function (service) {
                if (service.name == sel.name) {
                    service.selected = true;
                }
                else {
                    service.selected = false;
                }
            });
            $scope.selectedService = sel.name;
        };

        $scope.onLoaded = function (graphRef) {
            $scope.graphLoaded = true;
            $scope.chartLoading = false;
            console.log("graph loaded callback", graphRef);
            graph2d = graphRef;
            graph2d.setWindow($scope.startTime, $scope.stopTime);
            angular.forEach($scope.charts, function (chart) {
                if(chart.selected == 'loading') {
                    chart.selected = 'yes';
                }
            });
        };

        $scope.filterDefaultString = locale.getString('common.filter');

// This is what we will bind the filter to
        $scope.filter = {text: ''};
        $scope.filterFunction = function (element) {
            if ($scope.filter.text === "") {
                return true;
            }
            if (element.label == null) {
                return false;
            }
            return element.label.toLowerCase().indexOf($scope.filter.text.toLowerCase()) !== -1 ? true : false;
        };

        $scope.setWindow = function (window) {
            var periodStart = moment().subtract(1, window);
            $scope.timeNow = moment().valueOf();

            if (graph2d === undefined) {
                return;
            }

            graph2d.setOptions({max: $scope.timeNow});
            graph2d.setWindow(periodStart, $scope.timeNow);
        };

        $scope.setNow = function (direction) {
            var range = graph2d.getWindow();
            var interval = range.end - range.start;
            $scope.timeNow = moment().valueOf();

            if (graph2d === undefined) {
                return;
            }

            graph2d.setOptions({max: $scope.timeNow});
            graph2d.setWindow($scope.timeNow - interval, $scope.timeNow);
        };

        $scope.stepWindow = function (direction) {
            var percentage = (direction > 0) ? 0.2 : -0.2;
            var range = graph2d.getWindow();
            var interval = range.end - range.start;

            if (graph2d === undefined) {
                return;
            }

            graph2d.setWindow({
                start: range.start.valueOf() - interval * percentage,
                end: range.end.valueOf() - interval * percentage
            });
        };

        $scope.zoomWindow = function (percentage) {
            var range = graph2d.getWindow();
            var interval = range.end - range.start;

            if (graph2d === undefined) {
                return;
            }

            graph2d.setWindow({
                start: range.start.valueOf() - interval * percentage,
                end: range.end.valueOf() + interval * percentage
            });
        };

        $scope.setDateRange = function () {
            $scope.timeNow = moment().valueOf();

            if (graph2d === undefined) {
                return;
            }

            graph2d.setOptions({max: $scope.timeNow});
            graph2d.setWindow($scope.startTime, $scope.stopTime);
        };

        /**
         * Callback from the chart whenever the range is updated
         * This is called repeatedly during zooming and scrolling
         * @param period
         */
        $scope.onRangeChange = function (period) {
            console.log("Range changing", period);
            function splitDate(date) {
                var m = moment(date);
                return {
                    year: m.get('year'),
                    month: {
                        number: m.get('month'),
                        name: m.format('MMM')
                    },
                    week: m.format('w'),
                    day: {
                        number: m.get('date'),
                        name: m.format('ddd')
                    },
                    hour: m.format('HH'),
                    minute: m.format('mm'),
                    second: m.format('ss')
                };
            }

            var p = {
                s: splitDate(period.start),
                e: splitDate(period.end)
            };

            // Set the window for so the appropriate buttons are highlighted
            // We give some leeway to the interval -:
            // A day, +/- 1 minutes
            // A week, +/- 1 hour
            // A month is between 28 and 32 days
            var interval = period.end - period.start;
            if (interval > 86340000 && interval < 86460000) {
                $scope.graphWindow = 'day';
            }
            else if (interval > 601200000 && interval < 608400000) {
                $scope.graphWindow = 'week';
            }
            else if (interval > 2419200000 && interval < 2764800000) {
                $scope.graphWindow = 'month';
            }
            else {
                $scope.graphWindow = 'custom';
            }

            if (p.s.year == p.e.year) {
                $scope.graphTimeline =
                    p.s.day.name + ' ' + p.s.day.number + '-' + p.s.month.name + '  -  ' +
                    p.e.day.name + ' ' + p.e.day.number + '-' + p.e.month.name + ' ' + p.s.year;

                if (p.s.month.number == p.e.month.number) {
                    $scope.graphTimeline =
                        p.s.day.name + ' ' + p.s.day.number + '  -  ' +
                        p.e.day.name + ' ' + p.e.day.number + ' ' +
                        p.s.month.name + ' ' + p.s.year;

                    if (p.s.day.number == p.e.day.number) {
                        if (p.e.hour == 23 && p.e.minute == 59 && p.e.second == 59) {
                            p.e.hour = 24;
                            p.e.minute = '00';
                            p.e.second = '00';
                        }

                        $scope.graphTimeline =
                            p.s.hour + ':' + p.s.minute + '  -  ' +
                            p.e.hour + ':' + p.e.minute + ' ' +
                            p.s.day.name + ' ' + p.s.day.number + ' ' + p.s.month.name + ' ' + p.s.year;
                    }
                }
            }
            else {
                $scope.graphTimeline =
                    p.s.day.name + ' ' + p.s.day.number + '-' + p.s.month.name + ', ' + p.s.year + '  -  ' +
                    p.e.day.name + ' ' + p.e.day.number + '-' + p.e.month.name + ', ' + p.e.year;
            }

            // Call apply since this is updated in an event and angular may not know about the change!
            if (!$scope.$$phase) {
                $timeout(function () {
                    $scope.$apply();
                });
            }
        };

        $scope.graphEvents = {
            rangechange: $scope.onRangeChange,
            onload: $scope.onLoaded
        };


    })
;
