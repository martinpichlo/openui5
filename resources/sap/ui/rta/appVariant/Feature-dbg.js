/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define([
	"sap/ui/fl/Utils",
	"sap/ui/rta/appVariant/AppVariantUtils",
	"sap/ui/core/BusyIndicator",
	"sap/ui/thirdparty/jquery",
	"sap/base/util/UriParameters"
], function(
	FlexUtils,
	AppVariantUtils,
	BusyIndicator,
	jQuery,
	UriParameters
) {
	"use strict";

	var oAppVariantOverviewDialog,
		oAppVariantManager,
		oRootControlRunningApp,
		oCommandSerializer,
		oChosenAppVariantDescriptor,
		oDescriptorVariantSaveClosure,
		oDescriptorVariantDeleteClosure;

	var fnGetDescriptor = function() {
		return FlexUtils.getAppDescriptor(oRootControlRunningApp);
	};

	var fnTriggerCreateDescriptor = function(oAppVariantData) {
		// Based on the key user provided info, app variant descriptor is created
		return oAppVariantManager.createDescriptor(oAppVariantData);
	};

	var fnTriggerCreateDescriptorForDeletion = function(sAppVariantId) {
		// Based on the app id, the app variant descriptor for deleting the app variant is created
		return AppVariantUtils.createDeletion(sAppVariantId);
	};

	var fnTriggerSaveAppVariantToLREP = function(oDescriptorVariant) {
		if (oDescriptorVariant) {
			BusyIndicator.show();
			oDescriptorVariantSaveClosure = null;
			oDescriptorVariantSaveClosure = jQuery.extend({}, oDescriptorVariant);
			// App variant descriptor is saved to the layered repository
			return oAppVariantManager.saveAppVariantToLREP(oDescriptorVariant);
		}
		return Promise.reject();
	};

	var fnTriggerCatalogAssignment = function() {
		// In case of S/4HANA Cloud, trigger automatic catalog assignment
		return oAppVariantManager.triggerCatalogAssignment(oDescriptorVariantSaveClosure);
	};

	var fnTriggerCatalogUnAssignment = function(oDescriptorVariant) {
		if (oDescriptorVariant) {
			oDescriptorVariantDeleteClosure = null;
			oDescriptorVariantDeleteClosure = jQuery.extend({}, oDescriptorVariant);
			// In case of S/4HANA Cloud, trigger automatic catalog unassignment
			return oAppVariantManager.triggerCatalogUnAssignment(oDescriptorVariantDeleteClosure);
		}
		return Promise.reject();
	};

	var fnTriggerS4HanaAsynchronousCall = function(oResult) {
		if (oResult && oResult.response && oResult.response.IAMId) {
			// In case of S4 Hana Cloud, notify the key user to refresh the FLP Homepage manually
			return oAppVariantManager.notifyKeyUserWhenTileIsReady(oResult.response.IAMId, oDescriptorVariantSaveClosure.getId());
		}
		return Promise.resolve();
	};

	var fnTriggerPlatformDependentPolling = function(oResult) {
		// In case of S/4HANA Cloud, oResult is filled from catalog unassignment call, do polling until all catalogs are unpublished, then trigger deletion
		if (oResult && oResult.response && oResult.response.IAMId && oResult.response.inProgress) {
			AppVariantUtils.closeOverviewDialog();
			return this.onGetOverview(true).then(function() {
				return oAppVariantManager.notifyWhenUnpublishingIsReady(oResult.response.IAMId, oDescriptorVariantDeleteClosure.getId());
			});
		}
		return Promise.resolve();
	};

	sap.ui.getCore().getEventBus().subscribe("sap.ui.rta.appVariant.manageApps.controller.ManageApps", "navigate", function() {
		if (oAppVariantOverviewDialog) {
			oAppVariantOverviewDialog.destroy();
			oAppVariantOverviewDialog = null;
		}
	});

	return {
		// To see the overview of app variants, a key user has created from an app
		onGetOverview : function(bAsKeyUser) {
			var oDescriptor = fnGetDescriptor();

			return new Promise(function(resolve) {
				var fnCancel = function() {
					AppVariantUtils.closeOverviewDialog();
				};
				sap.ui.require(["sap/ui/rta/appVariant/AppVariantOverviewDialog"], function(AppVariantOverviewDialog) {
					if (!oAppVariantOverviewDialog) {
						oAppVariantOverviewDialog = new AppVariantOverviewDialog({
							idRunningApp: oDescriptor["sap.app"].id,
							isOverviewForKeyUser: bAsKeyUser
						});
					}

					oAppVariantOverviewDialog.attachCancel(fnCancel);

					oAppVariantOverviewDialog.oPopup.attachOpened(function() {
						resolve(oAppVariantOverviewDialog);
					});

					oAppVariantOverviewDialog.open();
				});
			});
		},
		/**
		 * @returns {boolean} Boolean value
		 * @description The app variant overview is modified to be shown for SAP developer and a key user.
		 * The calculation of which control (a button or a drop down menu button) should be shown on the UI is done here.
		 * This calculation is done with the help of a query parameter <code>sap-ui-xx-app-variant-overview-extended</code>.
		 * When this method returns <code>true</code> then a drop down menu button on the UI is shown where a user can choose app variant overview for either a key user or SAP developer.
		 * When this method returns <code>false</code>, an app variant overview is shown only for a key user.
		 */
		isOverviewExtended: function() {
			var oUriParams = new UriParameters(window.location.href);
			if (!oUriParams.get("sap-ui-xx-app-variant-overview-extended")) {
				return false;
			}

			var aMode = oUriParams.get("sap-ui-xx-app-variant-overview-extended", true);
			if (aMode && aMode.length) {
				var sMode = aMode[0].toLowerCase();
				return sMode === 'true';
			}
		},
		isManifestSupported: function() {
			var oDescriptor = fnGetDescriptor();
			return AppVariantUtils.getManifirstSupport(oDescriptor["sap.app"].id).then(function(oResult) {
				return oResult.response;
			}).catch(function(oError) {
				var oErrorInfo = AppVariantUtils.buildErrorInfo("MSG_APP_VARIANT_FEATURE_FAILED", oError);
				oErrorInfo.overviewDialog = true;
				return AppVariantUtils.showRelevantDialog(oErrorInfo, false);
			});
		},
		/**
		 * @param {object} oRootControl - Root control of an app (variant)
		 * @param {string} sCurrentLayer - Current working layer
		 * @param {object} oLrepSerializer - Layered repository serializer
		 * @returns {boolean} Boolean value
		 * @description App variant functionality is only supported in S/4HANA Cloud Platform & S/4HANA on Premise.
		 * App variant functionality should be available if the following conditions are met:
		 * When it is an FLP app.
		 * When the current layer is 'CUSTOMER'.
		 * When it is not a standalone app runing on Neo Cloud.
		 */
		isPlatFormEnabled : function(oRootControl, sCurrentLayer, oLrepSerializer) {
			oRootControlRunningApp = oRootControl;
			oCommandSerializer = oLrepSerializer;

			var oDescriptor = fnGetDescriptor();

			if (oDescriptor["sap.app"] && oDescriptor["sap.app"].id) {
				if (FlexUtils.getUshellContainer() && !AppVariantUtils.isStandAloneApp() && sCurrentLayer === "CUSTOMER") {
					var oInboundInfo;

					if (oDescriptor["sap.app"].crossNavigation && oDescriptor["sap.app"].crossNavigation.inbounds) {
						oInboundInfo = AppVariantUtils.getInboundInfo(oDescriptor["sap.app"].crossNavigation.inbounds);
					} else {
						oInboundInfo = AppVariantUtils.getInboundInfo();
					}

					if (oInboundInfo) {
						return true;
					}
				}
			}

			return false;
		},
		/**
		 * @param {object} oRootControl - Root control of an app (variant)
		 * @returns {Promise} Resolved promise with an app variant descriptor
		 * @description Getting here an app variant descriptor from the layered repository.
		 */
		getAppVariantDescriptor : function(oRootControl) {
			oRootControlRunningApp = oRootControl;
			var oDescriptor = fnGetDescriptor();
			if (oDescriptor["sap.app"] && oDescriptor["sap.app"].id) {
				return AppVariantUtils.getDescriptorFromLREP(oDescriptor["sap.app"].id);
			}
			return Promise.resolve(false);
		},
		/**
		 * @param {boolean} bSaveAsTriggeredFromRtaToolbar - Boolean value which tells if 'Save As' is triggered from the UI adaptation header bar
		 * @param {boolean} bCopyUnsavedChanges - Boolean value which tells if the UI changes needs to be copied
		 * @returns {Promise} Resolved promise
		 * @description Creates the app variant when 'Save As' is triggered from the UI adaptation header bar.
		 * When 'Save As' triggered from the UI adaptation header bar, we set both flags <code>bSaveAsTriggeredFromRtaToolbar</code> and <code>bCopyUnsavedChanges</code> equal to <code>true</code>.
		 */
		onSaveAsFromRtaToolbar : function(bSaveAsTriggeredFromRtaToolbar, bCopyUnsavedChanges) {
			var oDescriptor;

			if (bSaveAsTriggeredFromRtaToolbar) {
				oDescriptor = fnGetDescriptor();
			} else {
				oDescriptor = jQuery.extend(true, {}, oChosenAppVariantDescriptor);
				oChosenAppVariantDescriptor = null;
			}

			return new Promise(function(resolve) {
				var fnProcessSaveAsDialog = function() {
					return oAppVariantManager.processSaveAsDialog(oDescriptor, bSaveAsTriggeredFromRtaToolbar);
				};

				var fnTriggerCopyUnsavedChangesToLREP = function() {
					if (bCopyUnsavedChanges) {
						// If there are any unsaved changes, should be taken away for the new created app variant
						return oAppVariantManager.copyUnsavedChangesToLREP(oDescriptorVariantSaveClosure.getId(), bCopyUnsavedChanges);
					}
					return Promise.resolve();
				};

				var fnTriggerPlatformDependentFlow = function(oResult) {
					var oUshellContainer = FlexUtils.getUshellContainer();
					if (oUshellContainer && bCopyUnsavedChanges) {
						// Tell FLP that no UI change is booked for the currently adapting app
						oUshellContainer.setDirtyFlag(false);
					}
					// Shows the success message and closes the current app (if 'Save As' triggered from RTA toolbar) or opens the app variant overview list (if 'Save As' triggered from App variant overview List)
					return oAppVariantManager.showSuccessMessageAndTriggerActionFlow(oDescriptorVariantSaveClosure, bSaveAsTriggeredFromRtaToolbar).then(function() {
						return fnTriggerS4HanaAsynchronousCall(oResult).then(resolve);
					});
				};

				sap.ui.require(["sap/ui/rta/appVariant/AppVariantManager"], function(AppVariantManager) {
					if (!oAppVariantManager) {
						oAppVariantManager = new AppVariantManager({
							rootControl : oRootControlRunningApp,
							commandSerializer : oCommandSerializer
						});
					}

					// List of promises to be executed sequentially
					var aPromiseChain = [
						fnProcessSaveAsDialog,
						fnTriggerCreateDescriptor,
						fnTriggerSaveAppVariantToLREP,
						fnTriggerCopyUnsavedChangesToLREP,
						fnTriggerCatalogAssignment,
						fnTriggerPlatformDependentFlow
					];

					// Execute a list of Promises
					function processArray(aPromises) {
						return aPromises.reduce(function(pacc, fn) {
							return pacc.then(fn);
						}, Promise.resolve())
						.catch(function() {
							return Promise.resolve(false);
						});
					}

					processArray(aPromiseChain);
				});
			});
		},
		/**
		 * @param {object} oAppVariantDescriptor - Contains the app variant desciptor
		 * @param {boolean} bSaveAsTriggeredFromRtaToolbar - Boolean value which tells if 'Save As' is triggered from the UI adaptation header bar
		 * @returns {Promise} Resolved promise
		 * @description Creates the app variant when 'Save As' is triggered from the app variant overview dialog.
		 * When 'Save As' triggered from the app variant overview dialog, we set flag <code>bSaveAsTriggeredFromRtaToolbar</code> equal to <code>false</code>.
		 * The flag <code>bCopyUnsavedChanges</code> is <code>true</code> if a key user presses 'Save As' from the running app entry in the app variant overview dialog.
		 */
		onSaveAsFromOverviewDialog : function(oAppVariantDescriptor, bSaveAsTriggeredFromRtaToolbar) {
			var bCopyUnsavedChanges = false;

			var oDescriptor = fnGetDescriptor();

			if (oAppVariantDescriptor["sap.app"].id === oDescriptor["sap.app"].id) {
				bCopyUnsavedChanges = true;
			}

			oChosenAppVariantDescriptor = jQuery.extend(true, {}, oAppVariantDescriptor);
			oAppVariantDescriptor = null;

			return this.onSaveAsFromRtaToolbar(bSaveAsTriggeredFromRtaToolbar, bCopyUnsavedChanges);
		},
		/**
		 * @param {string} sAppVarId - Application variant ID
		 * @param {boolean} bIsRunningAppVariant - Boolean value which tells if the running application is an app variant
		 * @param {boolean} bCurrentlyAdapting - Boolean value which tells if the running application is currently being adapted
		 * @returns {Promise} Resolved promise
		 * @description Triggers a delete operation of the app variant.
		 */
		onDeleteFromOverviewDialog : function(sAppVarId, bIsRunningAppVariant, bCurrentlyAdapting) {
			return new Promise(function(resolve) {
				sap.ui.require(["sap/ui/rta/appVariant/AppVariantManager"], function(AppVariantManager) {
					if (!oAppVariantManager) {
						oAppVariantManager = new AppVariantManager({
							rootControl : oRootControlRunningApp,
							commandSerializer : oCommandSerializer
						});
					}

					var fnTriggerDeletion = function() {
						return AppVariantUtils.triggerDeleteAppVariantFromLREP(oDescriptorVariantDeleteClosure);
					};

					return fnTriggerCreateDescriptorForDeletion(sAppVarId)
						.then(fnTriggerCatalogUnAssignment)
						.then(fnTriggerPlatformDependentPolling.bind(this))
						.then(fnTriggerDeletion)
						.then(function() {
							if (bIsRunningAppVariant && bCurrentlyAdapting) {
								AppVariantUtils.navigateToFLPHomepage();
							} else {
								resolve();
							}
						})
						.catch(function() {
							return resolve(false);
						});
				}.bind(this));
			}.bind(this));
		}
	};
});