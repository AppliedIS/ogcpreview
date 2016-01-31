/* --------------------------------
 Developed by Jonathan Meyer
 Applied Information Sciences
 7/8/2014
 ---------------------------------*/

angular.module('opApp.header').controller('opHeaderController',
    function ($scope, $rootScope, $location, $modal, $timeout, opConfig, opPopupWindow, opStateService, $log) {
        'use strict';

        $scope.classification = opConfig.classification;
        $scope.bamfLink = '';
        $scope.kmlLink = '';
        $scope.kmlEnabled = false;
        $scope.docLink = opConfig.docLink;
        $scope.announcementCount = 0;
        $scope.announcementsEnabled = false;
        $scope.servers = [];
        $scope.kmlServers = null;
        $scope.kmlSingleServer = false;
        $scope.KmlLayers = [];
        $scope.KmlServers = [];
        $scope.DEBUG = opStateService.isDebug();

        /**
         * Show the security banner popup
         */
        $scope.showSecurityBanner = function () {
            $modal.open({
                templateUrl: 'modules/header/opSecurityBanner.html'
            });
        };

        /**
         * Open the results popup
         */
        $scope.openResults = function (){
            opPopupWindow.showPopup('results.html');
        };

        /**
         * Get the bookmark URL and show it in a modal.
         */
        $scope.showBookmark = function () {
            $scope.bamfLink = opStateService.getPermalink();
            $modal.open({
                templateUrl: 'modules/header/opBookmark.html'
            });
        };

        /**
         * Show the KML link associated with each server
         */
        $scope.showKmlLink = function () {
            $scope.kmlLinks = [];
            var servers = [];
            var layers = [[]];
            layers[1] = [];

            // gross?
            var val = opStateService.getDatasets();
            for(var i = 0; i < val.length; i++) {
                var splitVals = val[i].split(':');
                var server = splitVals[0];
                var layer = splitVals[2];
                var serverIndex = servers.indexOf(server);
                if(serverIndex === -1) {
                    servers.push(server);
                    serverIndex = servers.indexOf(server);
                    layers[serverIndex].push(layer);
                } else {
                    layers[serverIndex].push(layer);
                }
            }

            $scope.KmlLayers = layers;
            $scope.KmlServers = servers;
            var serverCount = servers.length;
            for(var j = 0; j < serverCount; j++) {
                $scope.kmlLinks[j] = $scope.buildKmlLink($scope.KmlServers[j]);
            }
            $modal.open({
                templateUrl: 'modules/header/opKmlSelector.html'
            });
        };

        /**
         * Get all the layers associated with a server number
         * @param serverNum     number as defined in the opConfig
         * @returns {*}
         */
        $scope.getLayersForServer = function(serverNum) {
            return $scope.KmlLayers[serverNum];
        };

        /**
         * Force a refresh of a server's data
         * @param server    server to refresh
         */
        $scope.refreshServer = function(server) {
            var serverData = $scope.servers[server];
            $rootScope.$broadcast('refresh-server', serverData);
        };

        /**
         * Get the version number of the app
         */
        opConfig.getVersion().then(function (data){
            $scope.version = data;
        });

        /**
         * Create the KML link for a server
         * @param serverName    server name
         * @returns {string}
         */
        $scope.buildKmlLink = function(serverName) {
            var val = opStateService.getDatasets();

            var server = opStateService.getServer(serverName);
            var link = '';
            if (val !== null && val.length > 0) {
                $scope.kmlEnabled = true;
                link = server.url + '/wms/kml?layers=';
                var serverVals = [];
                for(var i = 0; i < val.length; i++) {
                    var splitVal = val[i].split(':');
                    // getting rid of server name as geoserver has no concept of this when querying for KML link
                    var layerVal = splitVal[1] + ':' + splitVal[2];
                    if(splitVal[0] === serverName) {
                        serverVals.push(layerVal);
                    }
                }
                link = link + serverVals.join(',');

                var timeFilter = opStateService.getTemporalFilter();

                var timeStr = null;
                var titleString = null;
                if (timeFilter !== null && timeFilter.type) {
                    if (timeFilter.type === 'duration') {
                        timeStr = 'P' + timeFilter.value + timeFilter.interval + '/present';
                        var timeLookup = {'h': 'Hour', 'd': 'Day', 'w': 'Week'};
                        titleString = 'OGC Last ' + timeFilter.value + ' ' + timeLookup[timeFilter.interval];
                        // Add s to make interval name plural if greater than 1
                        if (timeFilter.value !== 1) {
                            titleString += 's';
                        }
                    }
                    else if (timeFilter.type === 'range') {
                        timeStr = timeFilter.start.format('YYYY-MM-DDTHH:mm:ss\\Z') + '/' +
                          timeFilter.stop.format('YYYY-MM-DDTHH:mm:ss\\Z');
                        titleString = 'OGC between ' + timeFilter.start.format('YYYY-MM-DDTHH:mm:ss\\Z') + ' and ' +
                          timeFilter.stop.format('YYYY-MM-DDTHH:mm:ss\\Z');
                    }
                }

                if (timeStr !== null) {
                    link += '&time=' + timeStr;
                }
                if (titleString !== null) {
                    link += '&kmltitle=' + titleString;
                }
            }
            return link;
        };

        /**
         * Show the about modal
         */
        $scope.showAbout = function() {
            $modal.open({
                templateUrl: 'modules/header/opAbout.html',
                windowClass: 'small-modal'
            });
        };

        /**
         * Show the announcement bar
         */
        $scope.showAnnouncements = function () {
            $rootScope.$broadcast('showAnnouncements');
        };

        /**
         * Broadcast receiver for when announcements change
         */
        $scope.$on('announcementsChanged', function (e, messages, enabled) {
            $scope.announcementCount = messages.length;
            $scope.announcementsEnabled = enabled;
        });

        /**
         * Broadcast receiver for when the filters are updated
         */
        $scope.$on('filters-updated', function() {
            var val = opStateService.getDatasets();
            var serversActive = opStateService.getActiveServer();
            if(val.length > 0) {
                $scope.kmlEnabled = true;
            } else {
                $scope.kmlEnabled = false;
            }
            if(serversActive.length === 1) {
                $scope.kmlSingleServer = true;
                $scope.kmlLink = $scope.buildKmlLink(serversActive[0].name);
            } else {
                $scope.kmlSingleServer = false;
            }
        });

        /**
         * this is strictly here to toggle the CSS class when the servers are updated directly via
         * the URL params (so that we can toggle the tabs active or not)
         */
        $scope.$on('servers-updated', function(event, args) {
            var serversOn = args[0];
            var serversOff = args[1];
            var serversActive = opStateService.getActiveServer();
            if(serversActive.length === 1) {
                $scope.kmlSingleServer = true;
                $scope.kmlLink = $scope.buildKmlLink(serversActive[0].name);
            } else {
                $scope.kmlSingleServer = false;
            }

            serversOn.forEach(function(serverOn) {
                $scope.servers.forEach(function(server) {
                    if(serverOn.name === server.name) {
                        server.active = true;
                    }
                });
            });

            serversOff.forEach(function(serverOff) {
                $scope.servers.forEach(function(server) {
                    if (serverOff.name === server.name) {
                        server.active = false;
                    }
                });
            });
        });

        /**
         * Get our server names from the config
         */
        $scope.getServerNames = function() {
            $scope.servers = opConfig.servers;
            $scope.servers.forEach(function(server) {
                server.active = false;
                server.loaded = false;
            });
        };

        /**
         * Toggle a server on or off
         * @param server
         */
        $scope.toggleServer = function(server) {
            $scope.servers[server].active = !$scope.servers[server].active;
            $scope.updateStateService();
        };

        /**
         * Update the state service for when a server is on or off
         */
        $scope.updateStateService = function() {
            opStateService.setActiveServerData($scope.servers);
            $log.log('server changed, new data: ' + JSON.stringify($scope.servers));
        };

        $scope.getServerNames();
    });
