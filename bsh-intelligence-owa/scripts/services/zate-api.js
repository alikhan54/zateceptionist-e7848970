/**
 * BSH Intelligence OWA — Zate API client
 * Thin REST client for the 420 LangGraph brain (OMEGA + MEDICA + agent tools).
 */
angular.module('bshIntelligence').service('ZateAPI', ['$http', '$window', function($http, $window) {
  var BASE = $window.ZATE_API_BASE || 'https://ai.zatesystems.com/api';

  this.askOmega = function(tenantId, message, userId) {
    return $http.post(BASE + '/omega', {
      tenant_id: tenantId, message: message,
      user_identifier: userId, channel: 'owa'
    }, {withCredentials: true});
  };

  this.askMedica = function(tenantId, message, userId) {
    return $http.post(BASE + '/agent/medica', {
      tenant_id: tenantId, message: message,
      user_identifier: userId, channel: 'owa'
    }, {withCredentials: true});
  };

  this.getCriticalAlerts = function(tenantId) {
    return $http.get(BASE + '/metrics/aggregate', {
      params: {tenant_id: tenantId, metric: 'critical_alerts', period: 'today'},
      withCredentials: true
    });
  };

  this.getBedStatus = function(tenantId) {
    return $http.get(BASE + '/metrics/aggregate', {
      params: {tenant_id: tenantId, metric: 'bed_status', period: 'now'},
      withCredentials: true
    });
  };
}]);
