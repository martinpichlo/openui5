/*
 * ! OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define([
	"sap/ui/fl/ControlPersonalizationAPI"
], function(
	OldControlPersonalizationAPI
) {
	"use strict";

	/**
	 * Provides an API to handle specific functionality for personalized changes.
	 *
	 * @namespace
	 * @name sap.ui.fl.read.api.ControlVariantReadAPI
	 * @author SAP SE
	 * @experimental Since 1.67
	 * @since 1.67
	 * @version 1.67.1
	 * @public
	 */
	var ControlVariantReadAPI = {

		/**
		 *
		 * Clears URL technical parameter 'sap-ui-fl-control-variant-id' for control variants. Use this method in case you normally want
		 * the variant parameter in the URL, but have a few special navigation pattern, where you want to clear it. If you don't want that
		 * parameter in general, set updateVariantInURL parameter on your variant management control to false. SAP Fiori Elements use this
		 * method.
		 * If a variant management control is given as parameter, only parameters specific to that control are cleared.
		 *
		 * @param {sap.ui.base.ManagedObject} [oVariantManagementControl] - The variant management control for which the URL technical parameter has to be cleared
		 *
		 * @method sap.ui.fl.read.api.ControlVariantReadAPI.clearVariantParameterInURL
		 * @public
		 */
		clearVariantParameterInURL : function () {
			OldControlPersonalizationAPI.clearVariantParameterInURL.apply(OldControlPersonalizationAPI, arguments);
		},

		/**
		 *
		 * Activates the passed variant applicable to the passed control/component.
		 *
		 * @param {sap.ui.base.ManagedObject|string} vElement - The component or control (instance or ID) on which the variantModel is set
		 * @param {string} sVariantReference - The variant reference which needs to be activated
		 *
		 * @returns {Promise} Returns Promise that resolves after the variant is updated or rejects when an error occurs
		 *
		 * @method sap.ui.fl.read.api.ControlVariantReadAPI.activateVariant
		 * @public
		 */
		activateVariant : function() {
			return OldControlPersonalizationAPI.activateVariant.apply(OldControlPersonalizationAPI, arguments);
		},


		/**
		 * Determines the availability of an encompassing variant management control.
		 *
		 * @param {sap.ui.core.Element} oControl - The control which should be tested for an encompassing variant management control
		 *
		 * @returns {boolean} Returns true if a variant management control is encompassing the given control, else false
		 *
		 * @method sap.ui.fl.read.api.ControlVariantReadAPI.hasVariantManagement
		 * @public
		 */
		hasVariantManagement : function() {
			return OldControlPersonalizationAPI.hasVariantManagement.apply(OldControlPersonalizationAPI, arguments);
		}
	};
	return ControlVariantReadAPI;
}, true);
