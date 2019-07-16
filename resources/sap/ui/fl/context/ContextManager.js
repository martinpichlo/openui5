/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["sap/ui/fl/LrepConnector","sap/ui/fl/Utils","sap/ui/fl/context/Context","sap/base/Log"],function(L,U,C,a){"use strict";var b;b={_oContext:new C({configuration:{device:"sap/ui/fl/context/DeviceContextProvider",switches:"sap/ui/fl/context/SwitchContextProvider"}}),_oLrepConnector:L.createConnector(),doesContextMatch:function(c,A){var s=c.context||"";if(!s){return true;}return A&&A.indexOf(s)!==-1;},getActiveContexts:function(c){var d=this._getContextIdsFromUrl();if(d.length===0){return this._getContextParametersFromAPI(c).then(this._getActiveContextsByAPIParameters.bind(this,c));}return Promise.resolve(this._getActiveContextsByUrlParameters(c,d));},_getContextParametersFromAPI:function(c){var r=[];c.forEach(function(o){o.parameters.forEach(function(d){var s=d.selector;if(r.indexOf(s)===-1){r.push(s);}});});return this._oContext.getValue(r);},_getActiveContextsByAPIParameters:function(c,r){var t=this;var A=[];c.forEach(function(o){if(t._isContextObjectActive(o,r)){A.push(o.id);}});return A;},_getActiveContextsByUrlParameters:function(c,d){var A=[];c.forEach(function(o){var e=((d?Array.prototype.indexOf.call(d,o.id):-1))!==-1;if(e){A.push(o.id);}});return A;},_isContextObjectActive:function(c,r){var t=this;var d=true;var p=c.parameters;p.every(function(P){d=d&&t._checkContextParameter(P,r);return d;});return d;},_getContextIdsFromUrl:function(){var c=U.getUrlParameter("sap-ui-flexDesignTimeContext");if(!c){return[];}return c.split(",");},_checkContextParameter:function(p,r){var s=p.selector;var o=p.operator;var v=p.value;switch(o){case"EQ":return this._checkEquals(s,v,r);case"NE":return!this._checkEquals(s,v,r);default:a.info("A context within a flexibility change with the operator '"+o+"' could not be verified");return false;}},_checkEquals:function(s,v,r){return r[s]===v;},createOrUpdateContextObject:function(p){if(!p.reference){throw new Error("no reference passed for the context object");}if(!p.namespace){throw new Error("no namespace passed for the context object");}var i=p.id||U.createDefaultFileName();p={id:i,fileName:i,title:p.title||"",description:p.description||"",parameters:p.parameters||[],fileType:"context",reference:p.reference||"",packageName:p.packageName||"",layer:p.layer||U.getCurrentLayer(false),namespace:p.namespace,creation:p.creation||"",originalLanguage:p.originalLanguage||U.getCurrentLanguage(),support:p.support||{generator:p.generator||"",service:"",user:""},validAppVersions:p.validAppVersions||{}};var u="/sap/bc/lrep/content/"+p.namespace+p.fileName+".context";u+="?layer="+p.layer;var m="PUT";return this._oLrepConnector.send(u,m,p,{});}};return b;},true);