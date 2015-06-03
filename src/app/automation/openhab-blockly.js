/**
 * blockly directive for AngularJS
 *
 * Author: Chris Jackson
 *
 * License: MIT
 */
angular.module("openhabBlockly", [])
    .provider("openhabBlockly", function () {
        this.options = {
            path: "assets/",
            trashcan: true,
            toolbox: []
        };

        this.$get = function () {
            var localOptions = this.options;
            return {
                getOptions: function () {
                    return localOptions;
                }
            };
        };

        this.setOptions = function (options) {
            this.options = options;
        };
    })

    .service('openhabBlockly', function ($timeout) {
        'use strict';
        var me = this;
        this.holdoffChanges = false;
        this.setWorkspace = function (workspace) {
            if (Blockly.getMainWorkspace() != null && Blockly.getMainWorkspace().topBlocks_.length != 0) {
                Blockly.getMainWorkspace().clear();
            }
            Blockly.Json.setWorkspace(Blockly.getMainWorkspace(), workspace);

            // Blockly sends an immediate change - we want to filter this out
            me.holdoffChanges = true;
        };

        this.clearWorkspace = function () {
            if (Blockly.getMainWorkspace() != null && Blockly.getMainWorkspace().topBlocks_.length != 0) {
                Blockly.getMainWorkspace().clear();
            }

            // Blockly sends an immediate change - we want to filter this out
            me.holdoffChanges = true;
        };

        this.getWorkspace = function () {
            return Blockly.Json.getWorkspace(Blockly.getMainWorkspace());
        };

        this.setToolbox = function (toolbox) {
            return Blockly.Json.getWorkspace(Blockly.getMainWorkspace());
        };

        this.onChange = function (callback) {
            $(Blockly.mainWorkspace.getCanvas()).bind("blocklyWorkspaceChange", function () {
                if (me.holdoffChanges === false) {
                    // Send a notification
                    callback();
                }
                else {
                    me.holdoffChanges = false;
                    console.log("Change, but on hold-off");
                }
            })
        };
    })

    .directive('ngBlockly', function ($window, $timeout, $rootScope, openhabBlockly) {
        return {
            restrict: 'E',
            scope: { // Isolate scope
            },
            template: '<div style="height:100%" class="ng-blockly"></div>',
            link: function ($scope, element, attrs) {
//                var options = openhabBlockly.getOptions();
                var options = {
                    pathToMedia: 'assets/',
                    sounds: false,
                    trashcan: true,
                    toolbox: '<xml>' +
                    '<category name="Control">' +
                    '<block type="controls_if"></block>' +
                    '</category>' +
                    '<category name="Logic">' +
                    '<block type="controls_if"></block>' +
                    '</category>' +
                    '<sep></sep>' +
                    '<category name="Variables" custom="VARIABLE"></category>' +
                    '</xml>'
                };
                Blockly.inject(element.children()[0], options);
            }
        };
    });
