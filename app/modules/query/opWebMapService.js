/* --------------------------------
 Developed by Jonathan Meyer
 Applied Information Sciences
 7/8/2014
 ---------------------------------*/

angular.module('opApp.query')
    .service('opWebMapService',
    function ($q, $http, opConfig, opStateService) {
        'use strict';

        this.WMS_VERSION = opConfig.server.wmsVersion;
        this.AJAX_URL = opConfig.server.ajaxUrl + '/wms';

        /**
         * Perform a WMS GetCapabilities request against the configured data source
         *
         * @returns {*}
         */
        this.getCapabilities = function (serverName) {

            var deferred = $q.defer();
            //var version = this.WMS_VERSION;
            var server = opStateService.getServer(serverName);
            var version = server.wmsVersion;

            console.log('Requesting capabilities from server ' + server.name);
            var params = { version: version, request: 'GetCapabilities' };
            //var url = this.AJAX_URL;
            var url = server.ajaxUrl + '/wms';
            $http.get(url, { params: params }).then(function (result) {
                console.log('Successfully retrieved GetCapabilities result.');
                deferred.resolve(result);
            }, function (reason) {
                // error
                var error = 'Error retrieving GetCapabilities result: ' + reason.data;
                console.log(error);
                deferred.reject(reason);
            });

            return deferred.promise;
        };

        this.getLeafletWmsParams = function (serverName, name, workspace, params) {
            var server = opStateService.getServer(serverName);
            var workspacedLayer = workspace + ':' + name;
            return angular.extend(
                {
                    transparent: true,
                    format: 'image/png',
                    //version: this.WMS_VERSION,
                    version: server.wmsVersion,
                    layers: workspacedLayer,
                    maxfeatures: opConfig.wmsFeatureLimiter
                }, params);
        };

        this.getLeafletWmsBasemapParams = function (layerName, params) {
            return angular.extend(
                {
                    format: 'image/jpeg',
                    layers: layerName
                }, params);
        };

        this.getLegendGraphicUrl = function (serverName, layerName, legendOptions) {
            var server = opStateService.getServer(serverName);
            var options = angular.extend({
                forceLabels: 'on',
                fontName: 'Helvetica',
                fontAntiAliasing: true,
                fontSize: 12,
                fontColor: '0xFFFFFF'
            }, legendOptions);

            var optionsArray = [];
            angular.forEach(options, function(value, key) {
                optionsArray.push(key + ':' + value);
            });

            var params =
                {
                    //version: this.WMS_VERSION,
                    version: server.wmsVersion,
                    request: 'GetLegendGraphic',
                    format: 'image/png',
                    transparent: true,
                    layer: layerName,
                    /* jshint ignore:start */
                    legend_options: optionsArray.join(';')
                    /* jshint ignore:end */
                };

            var url = server.ajaxUrl + '/wms';
            return url + '?' + $.param(params);
        };
    });
